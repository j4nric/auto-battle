// Bots that play the prototype. The "tinkerer" rates candidates by simulating test fights against
// reference monsters of the current hour (without knowing the real opponent).
import { hashSeed } from '../rng.ts';
import { fight, margin } from '../engine/combat.ts';
import { FUSIONS } from '../content.ts';
import * as T from '../engine/tower.ts';
import * as R from './run.ts';

const BENCH = 3;
const benchCache = new Map<string, R.Opponent[]>();
function benchmarks(seed: number, hour: number): R.Opponent[] {
  const key = `${seed}:${hour}`;
  let list = benchCache.get(key);
  if (!list) {
    if (benchCache.size > 5000) benchCache.clear();
    list = Array.from({ length: BENCH }, (_, k) => R.generateMonster(hashSeed('bench', seed, k), hour, 1));
    benchCache.set(key, list);
  }
  return list;
}

/** Mean fight balance of a tower against the hour's reference monsters. */
export function score(run: { seed: number; hour: number }, tower: T.Tower, hour = run.hour): number {
  const t = T.applyFusions(tower).tower;
  const hp = R.playerHp(hour);
  let s = 0;
  for (const m of benchmarks(run.seed, Math.min(R.HOURS, hour))) s += margin(fight(t, hp, m.tower, m.hp));
  return s / BENCH;
}

export class RandomBot implements R.Bot {
  name = 'zufall';
  contributesGhosts = false;

  shop(run: R.Run): void {
    for (let guard = 0; guard < 10; guard++) {
      const options = run.offers.map((_, i) => i).filter((i) => run.offers[i].price <= run.gold);
      if (!options.length) break;
      const i = run.rng.pick(options);
      if (!R.buy(run, i, run.rng.int(run.tower.rooms.length + 1), run.rng.chance(0.7))) run.offers.splice(i, 1);
    }
  }

  chooseOmen(run: R.Run, omens: R.Omen[]): R.Omen {
    return run.rng.pick(omens);
  }
}

export interface TinkerOptions {
  name?: string;
  /** Caps the tower height (tempo experiment). */
  maxFloors?: number | null;
  /** Optimises the order of rooms after shopping. */
  reorder?: boolean;
  /** Always places new rooms on top instead of searching the best position. */
  placeTop?: boolean;
  /** Knows the fusion recipes and builds towards them. */
  knowsRecipes?: boolean;
}

interface Candidate {
  i: number;
  pos: number;
  upgrade?: boolean;
  sell?: number;
  tower: T.FullTower;
}

export class TinkerBot implements R.Bot {
  name: string;
  maxFloors: number | null;
  reorder: boolean;
  placeTop: boolean;
  knowsRecipes: boolean;
  contributesGhosts = true;

  constructor({ name = 'tüftler', maxFloors = null, reorder = true, placeTop = false, knowsRecipes = false }: TinkerOptions = {}) {
    this.name = name;
    this.maxFloors = maxFloors;
    this.reorder = reorder;
    this.placeTop = placeTop;
    this.knowsRecipes = knowsRecipes;
  }

  /** Whoever knows the codex values started recipes (e.g. two bells in a row) as anticipation. */
  evaluate(run: R.Run, tower: T.Tower, hour?: number): number {
    const s = score(run, tower, hour);
    if (!this.knowsRecipes) return s;
    let bonus = 0;
    const ids = tower.rooms.map((r) => r.id);
    for (const f of FUSIONS) {
      for (let len = f.pattern.length - 1; len >= 2; len--) {
        const prefix = f.pattern.slice(0, len).join(',');
        if (ids.some((_, i) => ids.slice(i, i + len).join(',') === prefix)) {
          bonus += 0.12 * len;
          break;
        }
      }
    }
    return s + bonus;
  }

  candidates(run: R.Run): Candidate[] {
    const out: Candidate[] = [];
    const cap = this.maxFloors ?? run.tower.maxFloors;
    run.offers.forEach((o, i) => {
      if (o.price > run.gold) return;
      const dup = run.tower.rooms.some((r) => r.id === o.id);
      const n = run.tower.rooms.length;
      if (dup) {
        const t = R.previewBuy(run, i, 0, true);
        if (t) out.push({ i, pos: 0, upgrade: true, tower: t });
      }
      const positions = this.placeTop ? [n] : Array.from({ length: n + 1 }, (_, p) => p);
      for (const pos of positions) {
        const t = R.previewBuy(run, i, pos, false);
        if (t && T.floorsUsed(t) <= cap) out.push({ i, pos, upgrade: false, tower: t });
      }
      // Tower full: consider replacing an existing room.
      if (!T.fits({ ...run.tower, maxFloors: cap }, o.id)) {
        run.tower.rooms.forEach((_, j) => {
          const removed = T.remove(run.tower, j);
          if (!T.fits({ ...removed, maxFloors: cap }, o.id)) return;
          const t = T.insert(removed, { id: o.id, tier: o.tier, alloy: null }, j);
          out.push({ i, sell: j, pos: j, tower: t });
        });
      }
    });
    return out;
  }

  shop(run: R.Run): void {
    let current = this.evaluate(run, run.tower);
    for (let guard = 0; guard < 12; guard++) {
      let best: (Candidate & { gain: number }) | null = null;
      for (const c of this.candidates(run)) {
        const gain = this.evaluate(run, c.tower) - current;
        if (gain > 0.02 && (!best || gain > best.gain)) best = { ...c, gain };
      }
      if (best) {
        if (best.sell != null) {
          const o = run.offers[best.i];
          R.sell(run, best.sell);
          run.offers.splice(best.i, 1);
          run.gold -= o.price;
          R.setTower(run, T.insert(run.tower, { id: o.id, tier: o.tier, alloy: null }, best.pos));
        } else R.buy(run, best.i, best.pos, best.upgrade);
        current = this.evaluate(run, run.tower);
        continue;
      }
      if (run.gold >= run.rerollCost + 3 && guard < 8) {
        R.reroll(run);
        continue;
      }
      break;
    }
    if (this.reorder) this.optimizeOrder(run);
  }

  optimizeOrder(run: R.Run): void {
    let tower = run.tower;
    let cur = this.evaluate(run, tower);
    // Hill climbing: move one room to another position as long as that improves the tower.
    for (let step = 0; step < 12; step++) {
      let best: { t: T.FullTower; s: number } | null = null;
      for (let i = 0; i < tower.rooms.length; i++) {
        for (let j = 0; j < tower.rooms.length; j++) {
          if (i === j) continue;
          const t = T.move(tower, i, j);
          const s = this.evaluate(run, t);
          if (s > cur + 0.01 && (!best || s > best.s)) best = { t, s };
        }
      }
      if (!best) break;
      tower = T.applyFusions(best.t).tower;
      cur = this.evaluate(run, tower);
    }
    R.setTower(run, tower);
  }

  chooseOmen(run: R.Run, omens: R.Omen[]): R.Omen {
    if (omens.length === 1) return omens[0];
    const strength = this.evaluate(run, run.tower, run.hour + 1);
    const by = (id: string) => omens.find((o) => o.id === id);
    if (strength > 0.6 && by('elite')) return by('elite')!;
    if (strength < 0.15 && by('schwach')) return by('schwach')!;
    if (strength < 0.15 && by('haendler')) return by('haendler')!;
    return by('normal') ?? by('schwach') ?? omens[0];
  }

  chooseAlloyTarget(run: R.Run, alloy: string): number {
    let best = 0;
    let bestS = -Infinity;
    run.tower.rooms.forEach((_, i) => {
      const s = this.evaluate(run, T.setRoom(run.tower, i, { alloy }));
      if (s > bestS) [best, bestS] = [i, s];
    });
    return best;
  }
}

export function makeBots(): Record<string, () => R.Bot> {
  return {
    zufall: () => new RandomBot(),
    'tüftler': () => new TinkerBot({ name: 'tüftler' }),
    'ohne-reihenfolge': () => new TinkerBot({ name: 'ohne-reihenfolge', reorder: false, placeTop: true }),
    'kompakt-5': () => new TinkerBot({ name: 'kompakt-5', maxFloors: 5 }),
    kodex: () => new TinkerBot({ name: 'kodex', knowsRecipes: true }),
  };
}
