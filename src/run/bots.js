// Bots, die den Prototyp spielen. Der "Tüftler" bewertet Kandidaten, indem er Testkämpfe gegen
// Referenz-Monster der aktuellen Stunde simuliert (ohne den echten Gegner zu kennen).
import { hashSeed } from '../rng.js';
import { fight, margin } from '../engine/combat.js';
import { FUSIONS } from '../content/rooms.js';
import * as T from '../engine/tower.js';
import * as R from './run.js';

const BENCH = 3;
const benchCache = new Map();
function benchmarks(seed, hour) {
  const key = `${seed}:${hour}`;
  if (!benchCache.has(key)) {
    if (benchCache.size > 5000) benchCache.clear();
    benchCache.set(key, Array.from({ length: BENCH }, (_, k) => R.generateMonster(hashSeed('bench', seed, k), hour, 1)));
  }
  return benchCache.get(key);
}

/** Mittlere Kampfbilanz eines Turms gegen Referenz-Monster der Stunde. */
export function score(run, tower, hour = run.hour) {
  const t = T.applyFusions(tower).tower;
  const hp = R.playerHp(hour);
  let s = 0;
  for (const m of benchmarks(run.seed, Math.min(R.HOURS, hour))) s += margin(fight(t, hp, m.tower, m.hp));
  return s / BENCH;
}

export class RandomBot {
  constructor() {
    this.name = 'zufall';
    this.contributesGhosts = false;
  }

  shop(run) {
    for (let guard = 0; guard < 10; guard++) {
      const options = run.offers.map((o, i) => i).filter((i) => run.offers[i].price <= run.gold);
      if (!options.length) break;
      const i = run.rng.pick(options);
      if (!R.buy(run, i, run.rng.int(run.tower.rooms.length + 1), run.rng.chance(0.7))) run.offers.splice(i, 1);
    }
  }

  chooseOmen(run, omens) {
    return run.rng.pick(omens);
  }
}

export class TinkerBot {
  /**
   * @param {object} o
   * @param {string} o.name
   * @param {number} [o.maxFloors] begrenzt die Turmhöhe (Tempo-Experiment)
   * @param {boolean} [o.reorder] optimiert die Reihenfolge der Räume
   * @param {boolean} [o.placeTop] setzt neue Räume immer oben drauf statt die beste Position zu suchen
   */
  constructor({ name = 'tüftler', maxFloors = null, reorder = true, placeTop = false, knowsRecipes = false } = {}) {
    Object.assign(this, { name, maxFloors, reorder, placeTop, knowsRecipes });
    this.contributesGhosts = true;
  }

  // Wer den Kodex kennt, bewertet angefangene Rezepte (z. B. zwei Glocken übereinander) als Vorfreude.
  evaluate(run, tower, hour) {
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

  candidates(run) {
    const out = [];
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
      // Turm voll: Ersetzen eines bestehenden Raums prüfen.
      if (!T.fits({ ...run.tower, maxFloors: cap }, o.id)) {
        run.tower.rooms.forEach((r, j) => {
          const removed = T.remove(run.tower, j);
          if (!T.fits({ ...removed, maxFloors: cap }, o.id)) return;
          const t = T.insert(removed, { id: o.id, tier: o.tier, alloy: null }, j);
          out.push({ i, sell: j, pos: j, tower: t });
        });
      }
    });
    return out;
  }

  shop(run) {
    let current = this.evaluate(run, run.tower);
    for (let guard = 0; guard < 12; guard++) {
      let best = null;
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

  optimizeOrder(run) {
    let tower = run.tower;
    let cur = this.evaluate(run, tower);
    // Hill-Climbing: einen Raum an eine andere Stelle verschieben, solange es besser wird.
    for (let step = 0; step < 12; step++) {
      let best = null;
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

  chooseOmen(run, omens) {
    if (omens.length === 1) return omens[0];
    const strength = this.evaluate(run, run.tower, run.hour + 1);
    const by = (id) => omens.find((o) => o.id === id);
    if (strength > 0.6 && by('elite')) return by('elite');
    if (strength < 0.15 && by('schwach')) return by('schwach');
    if (strength < 0.15 && by('haendler')) return by('haendler');
    return by('normal') ?? by('schwach') ?? omens[0];
  }

  chooseAlloyTarget(run, alloy) {
    let best = 0;
    let bestS = -Infinity;
    run.tower.rooms.forEach((r, i) => {
      const s = this.evaluate(run, T.setRoom(run.tower, i, { alloy }));
      if (s > bestS) [best, bestS] = [i, s];
    });
    return best;
  }
}

export function makeBots() {
  return {
    zufall: () => new RandomBot(),
    'tüftler': () => new TinkerBot({ name: 'tüftler' }),
    'ohne-reihenfolge': () => new TinkerBot({ name: 'ohne-reihenfolge', reorder: false, placeTop: true }),
    'kompakt-5': () => new TinkerBot({ name: 'kompakt-5', maxFloors: 5 }),
    kodex: () => new TinkerBot({ name: 'kodex', knowsRecipes: true }),
  };
}
