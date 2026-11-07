// Run state machine for the raster prototype (ADR 0008). Same economy, omens and rivals as the
// single-column run (src/run/run.ts); the tower is a grid that grows by one row every two hours.
import { Rng, hashSeed, round } from '../rng.ts';
import { GUILDS, ALLOY_IDS, type Omen } from '../content.ts';
import { fight, type GridTower, type GridRoom, type FightResult } from '../engine/combat.ts';
import { HOURS, LIVES, ACTIVE_GUILDS, income, omensFor, rivalName, playerHp as columnHp } from '../run/run.ts';
import { RASTER_ROOMS, RASTER_SHOP, RASTER_FUSIONS } from './content.ts';
import * as G from './tower.ts';

export { HOURS };
/** Integrity relative to the single column; tuned so fights last about as long. */
export const RASTER = { hpMult: 2, rivalTierDiv: 1.25 };
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
    if (ids.has(f.pattern[0])) called.add(f.pattern[1]);
    if (ids.has(f.pattern[1])) called.add(f.pattern[0]);
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
export function generateRival(seed: number, hour: number, diff = 1): Opponent {
  const rng = new Rng(hashSeed('raster-rival', seed, hour));
  const guild = rng.pick(Object.keys(GUILDS));
  const pool = RASTER_SHOP.filter((r) => r.guild === guild);
  let t = G.emptyGrid(G.rowsFor(hour));
  const cap = t.width * t.rows;
  // Same budget as the single column: one cell per floor the rival would have there.
  const target = Math.min(cap, 2 + hour);
  const base = (hour - 1) / RASTER.rivalTierDiv;
  for (let tries = 0; tries < 60 && G.usedCells(t) < target; tries++) {
    const def = rng.chance(0.6) ? rng.pick(pool) : rng.pick(RASTER_SHOP);
    if (G.usedCells(t) + G.area(def.id) > target) continue;
    const spots = G.dropSpots(t, def.id);
    if (!spots.length) continue;
    const s = rng.pick(spots);
    const tier = Math.min(3, Math.floor(base + rng.float()));
    const alloy = hour >= 7 && rng.chance(0.15) ? rng.pick(ALLOY_IDS) : null;
    t = G.place(t, { id: def.id, tier, alloy, x: s.x, y: s.y, rot: s.rot });
  }
  t = G.applyFusions(t).tower;
  return { name: rivalName(guild), tower: t, hp: round(playerHp(hour) * diff), ghost: false };
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
