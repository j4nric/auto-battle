// Bots for the raster prototype. Same idea as src/run/bots.ts: the tinkerer rates candidates by
// test fights against reference rivals. Placements are tried as low as possible per column and
// rotation; after shopping it rebuilds the tower as long as a single move improves it.
import { hashSeed, Rng } from '../rng.ts';
import { fight, margin, type GridTower } from '../engine/combat.ts';
import type { Omen } from '../content.ts';
import * as G from './tower.ts';
import * as R from './run.ts';

const BENCH = 3;
const benchCache = new Map<string, R.Opponent[]>();
function benchmarks(seed: number, hour: number): R.Opponent[] {
  const key = `${seed}:${hour}`;
  let list = benchCache.get(key);
  if (!list) {
    if (benchCache.size > 5000) benchCache.clear();
    list = Array.from({ length: BENCH }, (_, k) => R.generateRival(hashSeed('bench', seed, k), hour, 1));
    benchCache.set(key, list);
  }
  return list;
}

export function score(run: { seed: number; hour: number }, tower: GridTower, hour = run.hour): number {
  const t = G.applyFusions(tower).tower;
  const h = Math.min(R.HOURS, hour);
  // Benchmarks of a later hour have more rows; the own tower grows with them.
  const own = t.rows < G.rowsFor(h) ? { ...t, rows: G.rowsFor(h) } : t;
  let s = 0;
  for (const m of benchmarks(run.seed, h)) s += margin(fight(own, R.playerHp(h), m.tower, m.hp));
  return s / BENCH;
}

interface Candidate { i: number; upgrade: boolean; spot: G.Spot; sell?: number; tower: GridTower }

export class RasterTinker implements R.Bot {
  name: string;
  rebuild: boolean;
  contributesGhosts = true;

  constructor({ name = 'tüftler', rebuild = true }: { name?: string; rebuild?: boolean } = {}) {
    this.name = name;
    this.rebuild = rebuild;
  }

  candidates(run: R.Run): Candidate[] {
    const out: Candidate[] = [];
    run.offers.forEach((o, i) => {
      if (o.price > run.gold) return;
      const up = R.previewBuy(run, i, true);
      if (up) out.push({ i, upgrade: true, spot: { x: 0, y: 0, rot: 0 }, tower: up });
      const spots = G.dropSpots(run.tower, o.id);
      for (const s of spots) {
        const t = R.previewBuy(run, i, false, s.x, s.y, s.rot);
        if (t) out.push({ i, upgrade: false, spot: s, tower: t });
      }
      // Full tower: consider replacing a room.
      if (!spots.length) {
        run.tower.rooms.forEach((_, j) => {
          const removed = G.remove(run.tower, j);
          for (const s of G.dropSpots(removed, o.id)) {
            out.push({ i, upgrade: false, sell: j, spot: s, tower: G.place(removed, { id: o.id, tier: o.tier, alloy: null, ...s }) });
          }
        });
      }
    });
    return out;
  }

  shop(run: R.Run): void {
    let current = score(run, run.tower);
    for (let guard = 0; guard < 12; guard++) {
      let best: (Candidate & { gain: number }) | null = null;
      for (const c of this.candidates(run)) {
        const gain = score(run, c.tower) - current;
        if (gain > 0.02 && (!best || gain > best.gain)) best = { ...c, gain };
      }
      if (best) {
        if (best.sell != null) R.act(run, { t: 'sell', idx: best.sell });
        R.act(run, { t: 'buy', offer: best.i, upgrade: best.upgrade, ...best.spot });
        current = score(run, run.tower);
        continue;
      }
      if (run.gold >= run.rerollCost + 3 && guard < 8) {
        R.act(run, { t: 'reroll' });
        continue;
      }
      break;
    }
    if (this.rebuild) this.optimize(run);
  }

  /** Hill climbing: move one room to any free spot as long as that improves the tower. */
  optimize(run: R.Run): void {
    let cur = score(run, run.tower);
    for (let step = 0; step < 8; step++) {
      let best: { idx: number; spot: G.Spot; s: number } | null = null;
      run.tower.rooms.forEach((r, idx) => {
        for (const spot of G.dropSpots(run.tower, r.id, idx)) {
          if (spot.x === r.x && spot.y === r.y && spot.rot === (r.rot ?? 0)) continue;
          const s = score(run, G.moveRoom(run.tower, idx, spot));
          if (s > cur + 0.01 && (!best || s > best.s)) best = { idx, spot, s };
        }
      });
      if (!best) break;
      const b = best as { idx: number; spot: G.Spot; s: number };
      R.act(run, { t: 'move', idx: b.idx, ...b.spot });
      cur = score(run, run.tower);
    }
  }

  chooseOmen(run: R.Run, omens: Omen[]): Omen {
    if (omens.length === 1) return omens[0];
    const strength = score(run, run.tower, run.hour + 1);
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
      const s = score(run, G.setRoom(run.tower, i, { alloy }));
      if (s > bestS) [best, bestS] = [i, s];
    });
    return best;
  }
}

/** Random placements: for the "does layout matter" test and as a weak baseline. */
export function scramble(t: GridTower, rng: Rng): GridTower {
  let out = G.emptyGrid(t.rows);
  const rooms = rng.shuffle(t.rooms.slice());
  for (const r of rooms) {
    const spots = G.dropSpots(out, r.id);
    if (!spots.length) return t;
    const s = rng.pick(spots);
    out = G.place(out, { ...r, ...s });
  }
  return out;
}
