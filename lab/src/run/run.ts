// A run: 12 hours. Each hour = workshop (shop) → omen (choose the opponent) → fight.
import { Rng, hashSeed, round } from '../rng.ts';
import { ROOMS, SHOP_ROOMS, GUILDS, FUSIONS, ALLOY_IDS, type RoomDef } from '../content.ts';
import { fight, type Frame, type RoomStats } from '../engine/combat.ts';
import * as T from '../engine/tower.ts';

export const HOURS = 12;
export const LIVES = 3;
export const ACTIVE_GUILDS = 3; // of 4 guilds, 3 are in the pool per run

export interface Omen {
  id: string;
  name: string;
  diff?: number;
  gold: number;
  alloy?: boolean;
  fight?: boolean;
  merchant?: number;
}

export const OMENS: Record<string, Omen> = {
  schwach: { id: 'schwach', name: 'Streunende Rostwölfe', diff: 0.8, gold: 2 },
  normal: { id: 'normal', name: 'Uhrwerk-Wächter', diff: 1.0, gold: 5 },
  elite: { id: 'elite', name: 'Elite: Rostende Ruine', diff: 1.2, gold: 7, alloy: true },
  haendler: { id: 'haendler', name: 'Wandernder Händler', fight: false, gold: 3, merchant: 2 },
  boss: { id: 'boss', name: 'Mitternacht', diff: 1.3, gold: 0 },
};

// Integrity grows faster than linearly because damage grows multiplicatively through tiers and
// synergies. A table (from 80 + 180 · h^1.4), because powers may differ between JS and GDScript.
export const HP_TABLE: readonly number[] = [80, 260, 555, 918, 1334, 1793, 2291, 2824, 3388, 3981, 4601, 5247, 5916, 6608];
export const playerHp = (hour: number): number => HP_TABLE[Math.min(hour, HP_TABLE.length - 1)];
export const income = (hour: number): number => 9 + Math.ceil(hour / 2);
export const price = (id: string, tier = 0): number => ROOMS[id].height * 3 * (tier + 1);
const MONSTER_NAMES: Record<string, string> = {
  wehr: 'Belagerungsturm', uhrwerk: 'Zeitdiebe', glocke: 'Totenglocke', alchemie: 'Giftmischer',
};

export interface Offer {
  id: string;
  tier: number;
  price: number;
}

export interface FightEntry {
  hour: number;
  omen: string;
  skipped?: boolean;
  opponent?: string;
  ghost?: boolean;
  won?: boolean;
  ticks?: number;
  roomStats?: Array<{ id: string } & RoomStats>;
  tower?: T.FullTower;
  oppTower?: T.Tower;
  hp?: number;
  oppHp?: number;
  frames?: Frame[] | null;
  alloy?: string;
}

/** Ghost towers by hour, shared between runs of one simulation. */
export type GhostPool = Record<number, T.FullTower[]>;

export interface Run {
  seed: number;
  rng: Rng;
  guilds: string[];
  ghostPool: GhostPool | null;
  hour: number;
  gold: number;
  lives: number;
  wins: number;
  tower: T.FullTower;
  offers: Offer[];
  rerollCost: number;
  merchant: number;
  fusionsFound: string[];
  fights: FightEntry[];
  over: boolean;
  midnight: boolean;
}

export interface Bot {
  name: string;
  contributesGhosts: boolean;
  shop(run: Run): void;
  chooseOmen(run: Run, omens: Omen[]): Omen;
  chooseAlloyTarget?(run: Run, alloy: string): number;
}

export interface Opponent {
  name: string;
  tower: T.Tower;
  hp: number;
  ghost: boolean;
}

export function createRun(seed: number, { ghostPool = null }: { ghostPool?: GhostPool | null } = {}): Run {
  const rng = new Rng(hashSeed('run', seed));
  const guilds = rng.shuffle(Object.keys(GUILDS)).slice(0, ACTIVE_GUILDS);
  return {
    seed, rng, guilds, ghostPool,
    hour: 0, gold: 0, lives: LIVES, wins: 0,
    tower: T.emptyTower(),
    offers: [], rerollCost: 1, merchant: 0,
    fusionsFound: [], fights: [], over: false, midnight: false,
  };
}

// ---------------------------------------------------------------- workshop
function rollTier(rng: Rng, hour: number): number {
  const r = rng.float();
  if (hour >= 9 && r < 0.25) return 2;
  if (hour >= 5 && r < 0.45) return 1;
  return 0;
}

// ownedWeight: rooms already in the tower show up more often.
// recipePull: when a recipe is complete except for one part (consecutive, in order), the tower
// "calls" the missing part and it shows up that much more often.
export const SHOP = { ownedWeight: 1, recipePull: 4 };

function calledRooms(tower: T.Tower): Set<string> {
  const ids = tower.rooms.map((r) => r.id);
  const called = new Set<string>();
  for (const f of FUSIONS) {
    const L = f.pattern.length;
    for (let miss = 0; miss < L; miss++) {
      const rest = f.pattern.filter((_, k) => k !== miss).join(',');
      for (let i = 0; i + L - 1 <= ids.length; i++) {
        if (ids.slice(i, i + L - 1).join(',') === rest) called.add(f.pattern[miss]);
      }
    }
  }
  return called;
}

function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (x: T) => number): T {
  const total = items.reduce((s, x) => s + weight(x), 0);
  let r = rng.float() * total;
  for (const x of items) if ((r -= weight(x)) < 0) return x;
  return items[items.length - 1];
}

export function rollOffers(run: Run): void {
  const pool = SHOP_ROOMS.filter((r) => run.guilds.includes(r.guild));
  const owned = new Set(run.tower.rooms.map((r) => r.id));
  const called = calledRooms(run.tower);
  const n = 3 + run.merchant;
  run.offers = Array.from({ length: n }, () => {
    const def = pickWeighted(run.rng, pool, (d: RoomDef) => (owned.has(d.id) ? SHOP.ownedWeight : 1) * (called.has(d.id) ? SHOP.recipePull : 1));
    const tier = rollTier(run.rng, run.hour);
    return { id: def.id, tier, price: round(price(def.id, tier) * (run.merchant ? 0.75 : 1)) };
  });
}

export function startHour(run: Run): void {
  run.hour++;
  run.gold += income(run.hour);
  run.rerollCost = 1;
  rollOffers(run);
  run.merchant = 0;
}

function commit(run: Run, tower: T.FullTower): string[] {
  const { tower: t, fused } = T.applyFusions(tower);
  run.tower = t;
  for (const f of fused) if (!run.fusionsFound.includes(f)) run.fusionsFound.push(f);
  return fused;
}

/**
 * The tower after a purchase, without performing it (for bots and UI previews).
 * upgrade=true: a duplicate upgrades the room already in the tower. Otherwise it is built as a
 * separate room.
 */
export function previewBuy(run: Run, offerIdx: number, pos: number, upgrade = true): T.FullTower | null {
  const o = run.offers[offerIdx];
  if (!o || o.price > run.gold) return null;
  const dup = run.tower.rooms.findIndex((r) => r.id === o.id);
  if (dup >= 0 && upgrade) {
    const cur = run.tower.rooms[dup].tier ?? 0;
    if (cur >= 3) return null;
    return T.setRoom(run.tower, dup, { tier: Math.min(3, Math.max(cur, o.tier) + 1) });
  }
  if (!T.fits(run.tower, o.id)) return null;
  return T.insert(run.tower, { id: o.id, tier: o.tier, alloy: null }, pos);
}

export function buy(run: Run, offerIdx: number, pos: number, upgrade = true): boolean {
  const t = previewBuy(run, offerIdx, pos, upgrade);
  if (!t) return false;
  run.gold -= run.offers[offerIdx].price;
  run.offers.splice(offerIdx, 1);
  commit(run, t);
  return true;
}

export function sell(run: Run, idx: number): void {
  const r = run.tower.rooms[idx];
  run.gold += Math.floor(price(r.id, r.tier) / 2);
  run.tower = T.remove(run.tower, idx);
}

export function reroll(run: Run): boolean {
  if (run.gold < run.rerollCost) return false;
  run.gold -= run.rerollCost;
  run.rerollCost++;
  rollOffers(run);
  return true;
}

export function setTower(run: Run, tower: T.FullTower): void {
  commit(run, tower);
}

// ---------------------------------------------------------------- omens and opponents
export function omensFor(run: Run): Omen[] {
  if (run.hour === HOURS) return [OMENS.boss];
  if (run.hour === 4 || run.hour === 8) return [OMENS.elite];
  const rng = new Rng(hashSeed(run.seed, 'omen', run.hour));
  return rng.shuffle(['schwach', 'normal', 'elite', 'haendler']).slice(0, 3).map((k) => OMENS[k]);
}

export function generateMonster(seed: number, hour: number, diff = 1): Opponent {
  const rng = new Rng(hashSeed('monster', seed, hour));
  const guild = rng.pick(Object.keys(GUILDS));
  const pool = SHOP_ROOMS.filter((r) => r.guild === guild);
  const all = SHOP_ROOMS;
  const target = Math.min(T.BASE_FLOORS, 2 + hour);
  let tower = T.emptyTower();
  const base = (hour - 1) / 3;
  for (let tries = 0; tries < 40 && T.floorsUsed(tower) < target; tries++) {
    const def = rng.chance(0.6) ? rng.pick(pool) : rng.pick(all);
    if (T.floorsUsed(tower) + def.height > target) continue;
    const tier = Math.min(3, Math.floor(base + rng.float()));
    const alloy = hour >= 7 && rng.chance(0.15) ? rng.pick(ALLOY_IDS) : null;
    tower = T.insert(tower, { id: def.id, tier, alloy }, tower.rooms.length);
  }
  tower = T.applyFusions(tower).tower;
  return { name: MONSTER_NAMES[guild], tower, hp: round(playerHp(hour) * diff), ghost: false };
}

function opponentFor(run: Run, omen: Omen): Opponent {
  const pool = run.ghostPool?.[run.hour];
  if (run.hour >= 5 && pool?.length && run.rng.chance(0.5)) {
    const g = run.rng.pick(pool);
    return { name: 'Geister-Turm', tower: g, hp: round(playerHp(run.hour) * (omen.diff ?? 1)), ghost: true };
  }
  return generateMonster(hashSeed(run.seed, omen.id), run.hour, omen.diff);
}

export interface ResolveOptions {
  record?: boolean;
  chooseAlloyTarget?: (run: Run, alloy: string) => number;
}

export function resolveHour(run: Run, omen: Omen, { record = false, chooseAlloyTarget }: ResolveOptions = {}): FightEntry | null {
  run.gold += omen.gold ?? 0;
  if (omen.fight === false) {
    run.merchant = omen.merchant ?? 0;
    run.fights.push({ hour: run.hour, omen: omen.id, skipped: true });
    return null;
  }
  const opp = opponentFor(run, omen);
  const res = fight(run.tower, playerHp(run.hour), opp.tower, opp.hp, { record });
  const won = res.winner === 'a';
  const entry: FightEntry = {
    hour: run.hour, omen: omen.id, opponent: opp.name, ghost: opp.ghost, won,
    ticks: res.ticks, roomStats: res.roomStats.a, tower: run.tower, oppTower: opp.tower,
    hp: playerHp(run.hour), oppHp: opp.hp, frames: res.frames,
  };
  run.fights.push(entry);
  if (won) {
    run.wins++;
    if (omen.alloy && run.tower.rooms.length) {
      const alloy = run.rng.pick(ALLOY_IDS);
      const idx = chooseAlloyTarget ? chooseAlloyTarget(run, alloy) : run.rng.int(run.tower.rooms.length);
      if (idx != null && idx >= 0) run.tower = T.setRoom(run.tower, idx, { alloy });
      entry.alloy = alloy;
    }
    if (run.hour === HOURS) run.midnight = true;
  } else {
    run.lives--;
    if (run.lives <= 0) run.over = true;
  }
  if (run.hour >= HOURS) run.over = true;
  return entry;
}

export function recordGhost(run: Run): void {
  if (!run.ghostPool) return;
  const list = (run.ghostPool[run.hour] ??= []);
  list.push(run.tower);
  if (list.length > 150) list.shift();
}

/** Plays a whole run with a bot. */
export function playRun(seed: number, bot: Bot, opts: { ghostPool?: GhostPool | null; record?: boolean } = {}): Run {
  const run = createRun(seed, opts);
  while (!run.over) {
    startHour(run);
    bot.shop(run);
    if (bot.contributesGhosts) recordGhost(run);
    const omen = bot.chooseOmen(run, omensFor(run));
    resolveHour(run, omen, { record: opts.record, chooseAlloyTarget: bot.chooseAlloyTarget?.bind(bot) });
  }
  return run;
}
