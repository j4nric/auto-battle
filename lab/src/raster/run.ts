// Run state machine for the raster prototype (ADR 0008). Same economy, omens and rivals as the
// single-column run (src/run/run.ts); the tower is a grid that grows by one row every two hours.
import { Rng, hashSeed, round } from '../rng.ts';
import { GUILDS, ALLOY_IDS, type Omen } from '../content.ts';
import { fight, type GridTower, type GridRoom, type FightResult } from '../engine/combat.ts';
import { HOURS, LIVES, ACTIVE_GUILDS, income, omensFor, rivalName, playerHp as columnHp } from '../run/run.ts';
import { RASTER_ROOMS, RASTER_SHOP, RASTER_FUSIONS } from './content.ts';
import * as G from './tower.ts';

export { HOURS };
/** Integrity relative to the single column; rivalGold: extra gold per hour for shadow-run rivals. */
export const RASTER = { hpMult: 2, rivalGold: 3 };
export const playerHp = (hour: number): number => round(columnHp(hour) * RASTER.hpMult);
export const price = (id: string, tier = 0): number => G.area(id) * 3 * (tier + 1);
export const sellPrice = (id: string, tier = 0): number => Math.floor(price(id, tier) / 2);

export interface Offer { id: string; tier: number; price: number }
export interface Opponent { name: string; tower: GridTower; hp: number; ghost: boolean }
export interface FightEntry { hour: number; omen: string; skipped?: boolean; ghost?: boolean; won?: boolean; ticks?: number; opponent?: string; fill?: number }
export type GhostPool = Record<number, GridTower[]>;
export type Phase = 'shop' | 'omen' | 'alloy' | 'over';
export type Action =
  | { t: 'buy'; offer: number; upgrade: boolean; x: number; y: number; rot: number }
  | { t: 'sell'; idx: number }
  | { t: 'move'; idx: number; x: number; y: number; rot: number }
  | { t: 'reroll' }
  | { t: 'endShop' }
  | { t: 'omen'; id: string }
  | { t: 'alloy'; idx: number };

export interface Run {
  seed: number;
  rng: Rng;
  guilds: string[];
  ghostPool: GhostPool | null;
  phase: Phase;
  hour: number;
  gold: number;
  lives: number;
  wins: number;
  tower: GridTower;
  offers: Offer[];
  rerollCost: number;
  merchant: number;
  omens: Omen[];
  pendingAlloy: string | null;
  fusionsFound: string[];
  fights: FightEntry[];
  actions: Action[];
  over: boolean;
  midnight: boolean;
}

export interface Bot {
  name: string;
  contributesGhosts: boolean;
  shop(run: Run): void;
  chooseOmen(run: Run, omens: Omen[]): Omen;
  chooseAlloyTarget(run: Run, alloy: string): number;
}

export function createRun(seed: number, { ghostPool = null }: { ghostPool?: GhostPool | null } = {}): Run {
  const rng = new Rng(hashSeed('run', seed));
  const guilds = rng.shuffle(Object.keys(GUILDS)).slice(0, ACTIVE_GUILDS);
  const run: Run = {
    seed, rng, guilds, ghostPool, phase: 'shop', hour: 0, gold: 0, lives: LIVES, wins: 0,
    tower: G.emptyGrid(G.rowsFor(1)), offers: [], rerollCost: 1, merchant: 0, omens: [], pendingAlloy: null,
    fusionsFound: [], fights: [], actions: [], over: false, midnight: false,
  };
  startHour(run);
  return run;
}

// ---------------------------------------------------------------- workshop
function rollTier(rng: Rng, hour: number): number {
  const r = rng.float();
  if (hour >= 9 && r < 0.25) return 2;
  if (hour >= 5 && r < 0.45) return 1;
  return 0;
}

/** A recipe part in the tower calls its partner into the shop. */
function calledRooms(t: GridTower): Set<string> {
  const ids = new Set(t.rooms.map((r) => r.id));
  const called = new Set<string>();
  for (const f of RASTER_FUSIONS) {
    if (f.parts.some((p) => ids.has(p.id))) for (const p of f.parts) if (!ids.has(p.id)) called.add(p.id);
  }
  return called;
}

function rollOffers(run: Run): void {
  const pool = RASTER_SHOP.filter((r) => run.guilds.includes(r.guild));
  const called = calledRooms(run.tower);
  const n = 3 + run.merchant;
  run.offers = Array.from({ length: n }, () => {
    const total = pool.reduce((s, d) => s + (called.has(d.id) ? 4 : 1), 0);
    let r = run.rng.float() * total;
    let def = pool[pool.length - 1];
    for (const d of pool) if ((r -= called.has(d.id) ? 4 : 1) < 0) { def = d; break; }
    const tier = rollTier(run.rng, run.hour);
    return { id: def.id, tier, price: round(price(def.id, tier) * (run.merchant ? 0.75 : 1)) };
  });
}

function startHour(run: Run): void {
  run.hour++;
  run.tower = { ...run.tower, rows: G.rowsFor(run.hour) };
  run.gold += income(run.hour);
  run.rerollCost = 1;
  rollOffers(run);
  run.merchant = 0;
  run.phase = 'shop';
}

function commit(run: Run, t: GridTower): void {
  const { tower, fused } = G.applyFusions(t);
  run.tower = tower;
  for (const f of fused) if (!run.fusionsFound.includes(f)) run.fusionsFound.push(f);
}

/** Tower after a purchase, or null if not possible. upgrade=true raises a duplicate's tier. */
export function previewBuy(run: Run, offer: number, upgrade: boolean, x = 0, y = 0, rot = 0): GridTower | null {
  const o = run.offers[offer];
  if (!o || o.price > run.gold) return null;
  if (upgrade) {
    const dup = run.tower.rooms.findIndex((r) => r.id === o.id);
    if (dup < 0) return null;
    const cur = run.tower.rooms[dup].tier ?? 0;
    if (cur >= 3) return null;
    return G.setRoom(run.tower, dup, { tier: Math.min(3, Math.max(cur, o.tier) + 1) });
  }
  if (!G.canPlace(run.tower, o.id, x, y, rot)) return null;
  return G.place(run.tower, { id: o.id, tier: o.tier, alloy: null, x, y, rot });
}

// ---------------------------------------------------------------- opponents
/**
 * Rivals are shadow runs (q14, 07.11.2026): same shop, same income, same rules as the player,
 * played by the builder from hour 1 up to the fight's hour, without fights. Cheap enough for the
 * game (no test fights), deterministic from the seed.
 */
export function generateRival(seed: number, hour: number, diff = 1): Opponent {
  const run = createRun(hashSeed('raster-rival', seed, hour));
  for (;;) {
    run.gold += RASTER.rivalGold;
    buildShop(run);
    if (run.hour >= hour) break;
    startHour(run);
  }
  return { name: rivalName(mainGuild(run)), tower: run.tower, hp: round(playerHp(hour) * diff), ghost: false };
}

/** Guild with the most cells in the tower; ties and empty towers go to the first run guild. */
function mainGuild(run: Run): string {
  let best = run.guilds[0];
  let most = -1;
  for (const g of run.guilds) {
    const n = run.tower.rooms.reduce((s, r) => s + (RASTER_ROOMS[r.id].guild === g ? G.area(r.id) : 0), 0);
    if (n > most) { most = n; best = g; }
  }
  return best;
}

/** Rooms of guild `guild` sharing an edge with the cells. */
function sameGuildNeighbours(t: GridTower, cells: Array<[number, number]>, guild: string, skip: number): number {
  let n = 0;
  t.rooms.forEach((r, i) => {
    if (i === skip || RASTER_ROOMS[r.id].guild !== guild) return;
    const near = G.cellsOfRoom(r).some(([x, y]) => cells.some(([cx, cy]) => Math.abs(x - cx) + Math.abs(y - cy) === 1));
    if (near) n++;
  });
  return n;
}

/**
 * The builder's shop: rule of thumb, no test fights. Each step takes the best scored purchase:
 * recipes first, then upgrades, then placements of the main guild next to their own guild.
 * Rerolls up to twice when nothing fits. Spends everything.
 */
function buildShop(run: Run): void {
  let rerolls = 0;
  for (let guard = 0; guard < 24; guard++) {
    const main = mainGuild(run);
    let best: { a: Action; score: number } | null = null;
    run.offers.forEach((o, i) => {
      if (o.price > run.gold) return;
      const guild = RASTER_ROOMS[o.id].guild;
      const own = guild === main ? 4 : 0;
      const up = previewBuy(run, i, true);
      if (up) {
        const score = 8 + own;
        if (!best || score > best.score) best = { a: { t: 'buy', offer: i, upgrade: true, x: 0, y: 0, rot: 0 }, score };
      }
      for (const sp of G.dropSpots(run.tower, o.id)) {
        const t = previewBuy(run, i, false, sp.x, sp.y, sp.rot);
        if (!t) continue;
        const fused = G.applyFusions(t).fused.length;
        const cells = G.cellsOfRoom({ id: o.id, tier: o.tier, alloy: null, ...sp });
        const score = 5 + own + 20 * fused + sameGuildNeighbours(run.tower, cells, guild, -1);
        if (!best || score > best.score) best = { a: { t: 'buy', offer: i, upgrade: false, ...sp }, score };
      }
    });
    if (best) {
      act(run, (best as { a: Action }).a);
      continue;
    }
    if (rerolls < 2 && run.gold >= run.rerollCost + 3 && G.usedCells(run.tower) < run.tower.width * run.tower.rows) {
      act(run, { t: 'reroll' });
      rerolls++;
      continue;
    }
    break;
  }
}

function opponentFor(run: Run, omen: Omen): Opponent {
  const pool = run.ghostPool?.[run.hour];
  if (run.hour >= 5 && pool?.length && run.rng.chance(0.5)) {
    return { name: 'Turm eines anderen Spielers', tower: run.rng.pick(pool), hp: round(playerHp(run.hour) * (omen.diff ?? 1)), ghost: true };
  }
  return generateRival(hashSeed(run.seed, omen.id), run.hour, omen.diff);
}

function nextHour(run: Run): void {
  if (run.over) run.phase = 'over';
  else startHour(run);
}

function resolveOmen(run: Run, omen: Omen): void {
  run.gold += omen.gold ?? 0;
  if (omen.fight === false) {
    run.merchant = omen.merchant ?? 0;
    run.fights.push({ hour: run.hour, omen: omen.id, skipped: true, fill: G.usedCells(run.tower) / (run.tower.width * run.tower.rows) });
    if (run.hour >= HOURS) run.over = true;
    nextHour(run);
    return;
  }
  const opp = opponentFor(run, omen);
  const res: FightResult = fight(run.tower, playerHp(run.hour), opp.tower, opp.hp);
  const won = res.winner === 'a';
  run.fights.push({ hour: run.hour, omen: omen.id, ghost: opp.ghost, won, ticks: res.ticks, opponent: opp.name, fill: G.usedCells(run.tower) / (run.tower.width * run.tower.rows) });
  if (won) {
    run.wins++;
    if (run.hour === HOURS) run.midnight = true;
  } else if (--run.lives <= 0) run.over = true;
  if (run.hour >= HOURS) run.over = true;
  if (won && omen.alloy && run.tower.rooms.length) {
    run.pendingAlloy = run.rng.pick(ALLOY_IDS);
    run.phase = 'alloy';
  } else nextHour(run);
}

export function act(run: Run, a: Action): boolean {
  if (!applyAction(run, a)) return false;
  run.actions.push(a);
  return true;
}

function applyAction(run: Run, a: Action): boolean {
  if (run.phase === 'shop') {
    switch (a.t) {
      case 'buy': {
        const t = previewBuy(run, a.offer, a.upgrade, a.x, a.y, a.rot);
        if (!t) return false;
        run.gold -= run.offers[a.offer].price;
        run.offers.splice(a.offer, 1);
        commit(run, t);
        return true;
      }
      case 'sell': {
        const r = run.tower.rooms[a.idx];
        if (!r) return false;
        run.gold += sellPrice(r.id, r.tier);
        run.tower = G.remove(run.tower, a.idx);
        return true;
      }
      case 'move': {
        const r = run.tower.rooms[a.idx];
        if (!r || !G.canPlace(run.tower, r.id, a.x, a.y, a.rot, a.idx)) return false;
        commit(run, G.moveRoom(run.tower, a.idx, a));
        return true;
      }
      case 'reroll':
        if (run.gold < run.rerollCost) return false;
        run.gold -= run.rerollCost++;
        rollOffers(run);
        return true;
      case 'endShop':
        run.omens = omensFor(run as never);
        run.phase = 'omen';
        return true;
      default:
        return false;
    }
  }
  if (run.phase === 'omen') {
    if (a.t !== 'omen') return false;
    const omen = run.omens.find((o) => o.id === a.id);
    if (!omen) return false;
    run.omens = [];
    resolveOmen(run, omen);
    return true;
  }
  if (run.phase === 'alloy') {
    if (a.t !== 'alloy' || !run.tower.rooms[a.idx] || !run.pendingAlloy) return false;
    run.tower = G.setRoom(run.tower, a.idx, { alloy: run.pendingAlloy });
    run.pendingAlloy = null;
    nextHour(run);
    return true;
  }
  return false;
}

export function playRun(seed: number, bot: Bot, opts: { ghostPool?: GhostPool | null } = {}): Run {
  const run = createRun(seed, opts);
  while (run.phase !== 'over') {
    if (run.phase === 'shop') {
      bot.shop(run);
      if (bot.contributesGhosts && run.ghostPool) {
        const list = (run.ghostPool[run.hour] ??= []);
        list.push(run.tower);
        if (list.length > 150) list.shift();
      }
      act(run, { t: 'endShop' });
    } else if (run.phase === 'omen') act(run, { t: 'omen', id: bot.chooseOmen(run, run.omens).id });
    else if (run.phase === 'alloy') act(run, { t: 'alloy', idx: bot.chooseAlloyTarget(run, run.pendingAlloy!) });
  }
  return run;
}

export { RASTER_ROOMS };
export type { GridRoom };
