// Writes golden vectors to tests/golden/. The Godot port must reproduce them exactly.
// Run: npm run golden (in lab/). CI fails if the committed files are stale.
import { writeFileSync, mkdirSync } from 'node:fs';
import { Rng, hashSeed } from '../src/rng.ts';
import { ROOMS, ALLOY_IDS } from '../src/content.ts';
import { fight, type Tower, type GridTower } from '../src/engine/combat.ts';
import { RASTER_ROOMS } from '../src/raster/content.ts';
import * as G from '../src/raster/tower.ts';
import * as RR from '../src/raster/run.ts';
import { RasterTinker } from '../src/raster/bots.ts';
import { applyFusions, BASE_FLOORS } from '../src/engine/tower.ts';
import { HP_TABLE, createRun, act, playRun, type Run, type Action } from '../src/run/run.ts';
import { TinkerBot } from '../src/run/bots.ts';

const out = new URL('../../tests/golden/', import.meta.url);
mkdirSync(out, { recursive: true });
const write = (name: string, data: unknown): void => {
  writeFileSync(new URL(name, out), JSON.stringify(data, null, 1) + '\n');
};

// ------------------------------------------------------------------ RNG
{
  const hashes = [
    ['run', 1], ['run', 42], ['monster', 7, 3], ['bench', 99, 2], ['omen', 123456, 12], [''], ['Uhrturm', 'Mitternacht'],
  ].map((parts) => ({ parts, hash: hashSeed(...parts) }));
  const streams = [0, 1, 42, 2147483647, 4294967295].map((seed) => {
    const rng = new Rng(seed);
    // Floats as exact uint32 numerators (float * 2^32): JSON parsers differ in the last bits of
    // decimal fractions, integers are exact everywhere.
    const floats = Array.from({ length: 8 }, () => rng.float() * 4294967296);
    const ints = Array.from({ length: 8 }, () => rng.int(1000));
    return { seed, floats, ints };
  });
  write('rng.json', { generator: 'lab/tools/golden.ts', hashes, streams });
  console.log(`tests/golden/rng.json: ${hashes.length} hashes, ${streams.length} streams`);
}

// ------------------------------------------------------------------ fights
const allIds = Object.keys(ROOMS);

function randomTower(rng: Rng, floors: number, alloyChance: number): Tower {
  const rooms: Tower['rooms'] = [];
  let used = 0;
  for (let tries = 0; tries < 30 && used < floors; tries++) {
    const id = rng.pick(allIds);
    if (used + ROOMS[id].height > floors) continue;
    rooms.push({ id, tier: rng.int(4), alloy: rng.chance(alloyChance) ? rng.pick(ALLOY_IDS) : null });
    used += ROOMS[id].height;
  }
  return { rooms, maxFloors: BASE_FLOORS };
}

interface Case {
  name: string;
  a: Tower;
  hpA: number;
  b: Tower;
  hpB: number;
}

const cases: Case[] = [];
const dummy: Tower = { rooms: [{ id: 'bollwerk', tier: 0 }, { id: 'waffenkammer', tier: 0 }], maxFloors: BASE_FLOORS };

// Every room alone with a weapon, at tier 1, against a plain opponent: each effect is exercised.
for (const id of allIds) {
  cases.push({ name: `room:${id}`, a: { rooms: [{ id, tier: 1 }, { id: 'waffenkammer', tier: 0 }], maxFloors: BASE_FLOORS }, hpA: 918, b: dummy, hpB: 918 });
}
// Every alloy on a room that profits from it.
for (const alloy of ALLOY_IDS) {
  cases.push({
    name: `alloy:${alloy}`,
    a: { rooms: [{ id: 'feder', tier: 0 }, { id: 'ballista', tier: 1, alloy }, { id: 'echo', tier: 0 }], maxFloors: BASE_FLOORS },
    hpA: 1334, b: dummy, hpB: 1334,
  });
}
// Known chain hazards from the simulation: must stay bounded.
cases.push({
  name: 'hazard:copper-loop',
  a: { rooms: [{ id: 'quecksilber', tier: 0, alloy: 'kupfer' }, { id: 'zeitschleife', tier: 0 }, { id: 'antriebswerk', tier: 1, alloy: 'kupfer' }], maxFloors: BASE_FLOORS },
  hpA: 2291, b: dummy, hpB: 2291,
});
cases.push({
  name: 'hazard:bell-ping-pong',
  a: { rooms: [{ id: 'glockenseil', tier: 0, alloy: 'gold' }, { id: 'glockenspiel', tier: 0 }, { id: 'glockenspiel', tier: 2, alloy: 'glas' }], maxFloors: BASE_FLOORS },
  hpA: 2291, b: dummy, hpB: 2291,
});
cases.push({
  name: 'hazard:quecksilber-chain',
  a: { rooms: Array.from({ length: 8 }, () => ({ id: 'quecksilber', tier: 0 })), maxFloors: BASE_FLOORS },
  hpA: 1334, b: dummy, hpB: 1334,
});
// Random towers of all sizes, tiers and alloys.
const rng = new Rng(hashSeed('golden', 'fights'));
for (let i = 0; i < 160; i++) {
  const hour = 1 + rng.int(12);
  cases.push({
    name: `random:${i}`,
    a: randomTower(rng, 2 + rng.int(7), 0.25),
    hpA: HP_TABLE[hour],
    b: randomTower(rng, 2 + rng.int(7), 0.25),
    hpB: Math.floor(HP_TABLE[hour] * (0.8 + rng.int(5) / 10)),
  });
}

const fights = cases.map((c) => {
  const r = fight(c.a, c.hpA, c.b, c.hpB, { record: true });
  const stats = (side: 'a' | 'b') => r.roomStats[side].map((s) => [s.dmg, s.shield, s.heal, s.burn, s.poison, s.activations]);
  return {
    name: c.name,
    a: c.a, hpA: c.hpA, b: c.b, hpB: c.hpB,
    winner: r.winner,
    ticks: r.ticks,
    // Per tick: [hpA, shieldA, hpB, shieldB], so a mismatch shows the first tick that diverges.
    trace: r.frames!.slice(1).map((f) => [f.a.hp, f.a.shield, f.b.hp, f.b.shield]),
    statsA: stats('a'),
    statsB: stats('b'),
  };
});
write('combat.json', {
  generator: 'lab/tools/golden.ts',
  statsColumns: ['dmg', 'shield', 'heal', 'burn', 'poison', 'activations'],
  fights,
});
console.log(`tests/golden/combat.json: ${fights.length} fights`);

// ------------------------------------------------------------------ raster (ADR 0008)
// Grid towers: snake path, neighbours by shared edges, shapes and rotations.
{
  const grng = new Rng(hashSeed('golden', 'raster'));
  const ids = Object.keys(RASTER_ROOMS);
  const randomGrid = (rows: number, fill: number): GridTower => {
    let t = G.emptyGrid(rows);
    for (let k = 0; k < 30 && G.usedCells(t) < fill; k++) {
      const id = grng.pick(ids);
      const spots = G.allSpots(t, id);
      if (!spots.length) continue;
      const s = grng.pick(spots);
      t = G.place(t, { id, tier: grng.int(4), alloy: grng.chance(0.2) ? grng.pick(ALLOY_IDS) : null, ...s });
    }
    return t;
  };
  const dummyGrid: GridTower = { kind: 'grid', width: 3, rows: 3, rooms: [{ id: 'bollwerk', tier: 0, alloy: null, x: 0, y: 0, rot: 0 }] };
  const rcases: Array<{ name: string; a: GridTower; hpA: number; b: GridTower; hpB: number }> = [];
  for (const id of ids) {
    rcases.push({ name: `raster-room:${id}`, a: { kind: 'grid', width: 3, rows: 3, rooms: [{ id, tier: 1, alloy: null, x: 0, y: 0, rot: 0 }, { id: 'waffenkammer', tier: 0, alloy: null, x: 2, y: 2, rot: 0 }] }, hpA: 1836, b: dummyGrid, hpB: 1836 });
  }
  for (let i = 0; i < 80; i++) {
    const hour = 1 + grng.int(12);
    const rows = G.rowsFor(hour);
    rcases.push({
      name: `raster-random:${i}`,
      a: randomGrid(rows, 2 + grng.int(rows * 3 - 1)),
      hpA: HP_TABLE[hour] * 2,
      b: randomGrid(rows, 2 + grng.int(rows * 3 - 1)),
      hpB: Math.floor(HP_TABLE[hour] * 2 * (0.8 + grng.int(5) / 10)),
    });
  }
  const rfights = rcases.map((c) => {
    const r = fight(c.a, c.hpA, c.b, c.hpB, { record: true });
    const stats = (side: 'a' | 'b') => r.roomStats[side].map((s) => [s.dmg, s.shield, s.heal, s.burn, s.poison, s.activations]);
    return {
      name: c.name, a: c.a, hpA: c.hpA, b: c.b, hpB: c.hpB, winner: r.winner, ticks: r.ticks,
      trace: r.frames!.slice(1).map((f) => [f.a.hp, f.a.shield, f.b.hp, f.b.shield]),
      statsA: stats('a'), statsB: stats('b'),
    };
  });
  const rfusions = Array.from({ length: 40 }, () => {
    const t = randomGrid(3 + grng.int(6), 30);
    const res = G.applyFusions(t);
    return { input: t, output: res.tower, fused: res.fused };
  });
  // Grid runs: seed + actions, state after every action (like runs.json).
  const rdigest = (r: RR.Run) => ({
    phase: r.phase, hour: r.hour, gold: r.gold, lives: r.lives, wins: r.wins, rerollCost: r.rerollCost, merchant: r.merchant,
    rows: r.tower.rows,
    tower: r.tower.rooms.map((x) => [x.id, x.tier ?? 0, x.alloy ?? null, x.x, x.y, x.rot ?? 0]),
    offers: r.offers.map((o) => [o.id, o.tier, o.price]),
    omens: r.omens.map((o) => o.id),
    pendingAlloy: r.pendingAlloy,
    fusions: [...r.fusionsFound],
    fights: r.fights.map((f) => (f.skipped ? [f.omen] : [f.omen, f.opponent, f.won ? 1 : 0, f.ticks])),
    midnight: r.midnight,
  });
  const chaosGrid = (seed: number): RR.Run => {
    const run = RR.createRun(seed);
    const prng = new Rng(hashSeed('golden-raster-player', seed));
    for (let guard = 0; guard < 500 && run.phase !== 'over'; guard++) {
      if (run.phase === 'omen') { RR.act(run, { t: 'omen', id: prng.pick(run.omens).id }); continue; }
      if (run.phase === 'alloy') { RR.act(run, { t: 'alloy', idx: prng.int(run.tower.rooms.length) }); continue; }
      if (prng.chance(0.2) || guard % 11 === 10) { RR.act(run, { t: 'endShop' }); continue; }
      const n = run.tower.rooms.length;
      const list: RR.Action[] = [];
      run.offers.forEach((_, offer) => {
        list.push({ t: 'buy', offer, upgrade: prng.chance(0.3), x: prng.int(3), y: prng.int(run.tower.rows), rot: prng.int(4) });
        const spots = G.dropSpots(run.tower, run.offers[offer].id);
        if (spots.length) list.push({ t: 'buy', offer, upgrade: false, ...prng.pick(spots) });
      });
      if (n && prng.chance(0.25)) list.push({ t: 'sell', idx: prng.int(n) });
      if (n && prng.chance(0.4)) list.push({ t: 'move', idx: prng.int(n), x: prng.int(3), y: prng.int(run.tower.rows), rot: prng.int(4) });
      if (prng.chance(0.3)) list.push({ t: 'reroll' });
      RR.act(run, prng.pick(list.length ? list : [{ t: 'endShop' } as RR.Action]));
    }
    return run;
  };
  const gridRuns: Array<{ seed: number; kind: string; run: RR.Run }> = [];
  for (let k = 0; k < 8; k++) gridRuns.push({ seed: 2000 + k, kind: 'chaos', run: chaosGrid(2000 + k) });
  for (const seed of [7, 42]) gridRuns.push({ seed, kind: 'tinkerer', run: RR.playRun(seed, new RasterTinker()) });
  const rruns = gridRuns.map(({ seed, kind, run }) => {
    const r = RR.createRun(seed);
    const states = [rdigest(r)];
    for (const a of run.actions) {
      if (!RR.act(r, a)) throw new Error(`golden raster replay rejected ${JSON.stringify(a)}`);
      states.push(rdigest(r));
    }
    return { seed, kind, actions: run.actions, states };
  });
  write('raster.json', { generator: 'lab/tools/golden.ts', statsColumns: ['dmg', 'shield', 'heal', 'burn', 'poison', 'activations'], fights: rfights, fusions: rfusions, runs: rruns });
  console.log(`tests/golden/raster.json: ${rfights.length} fights, ${rfusions.length} fusion cases, ${rruns.length} runs with ${rruns.reduce((n, r) => n + r.actions.length, 0)} actions`);
}

// ------------------------------------------------------------------ fusions
{
  const frng = new Rng(hashSeed('golden', 'fusions'));
  const parts = ['glockenseil', 'kleineGlocke', 'grosseGlocke', 'zahnrad', 'feder', 'unruh', 'brennofen', 'giftkueche', 'quecksilber', 'echo', 'waffenkammer'];
  const fusions = Array.from({ length: 60 }, () => {
    const t: Tower = { rooms: Array.from({ length: 2 + frng.int(7) }, () => ({ id: frng.pick(parts), tier: frng.int(4), alloy: frng.chance(0.2) ? frng.pick(ALLOY_IDS) : null })) };
    const res = applyFusions(t);
    return { input: t.rooms, output: res.tower.rooms, fused: res.fused };
  });
  write('fusions.json', { generator: 'lab/tools/golden.ts', fusions });
  console.log(`tests/golden/fusions.json: ${fusions.length} cases`);
}

// ------------------------------------------------------------------ runs
// A run is seed + actions. The port replays the actions and must reach the same state after
// every single action.
{
  const digest = (r: Run) => ({
    phase: r.phase, hour: r.hour, gold: r.gold, lives: r.lives, wins: r.wins,
    rerollCost: r.rerollCost, merchant: r.merchant,
    tower: r.tower.rooms.map((x) => [x.id, x.tier ?? 0, x.alloy ?? null]),
    offers: r.offers.map((o) => [o.id, o.tier, o.price]),
    omens: r.omens.map((o) => o.id),
    pendingAlloy: r.pendingAlloy,
    fusions: [...r.fusionsFound],
    fights: r.fights.map((f) => (f.skipped ? [f.omen] : [f.omen, f.opponent, f.won ? 1 : 0, f.ticks])),
    midnight: r.midnight,
  });

  /** A chaotic player with its own randomness: buys, sells, moves, rerolls, picks anything. */
  function chaosRun(seed: number): Run {
    const run = createRun(seed);
    const prng = new Rng(hashSeed('golden-player', seed));
    const options = (): Action[] => {
      const n = run.tower.rooms.length;
      if (run.phase === 'omen') return run.omens.map((o) => ({ t: 'omen', id: o.id }));
      if (run.phase === 'alloy') return Array.from({ length: n }, (_, idx) => ({ t: 'alloy', idx }));
      const list: Action[] = [];
      run.offers.forEach((_, offer) => {
        list.push({ t: 'buy', offer, pos: prng.int(n + 1), upgrade: prng.chance(0.5) });
        list.push({ t: 'buy', offer, pos: prng.int(n + 1), upgrade: false });
      });
      if (n && prng.chance(0.25)) list.push({ t: 'sell', idx: prng.int(n) });
      if (n > 1 && prng.chance(0.4)) list.push({ t: 'move', from: prng.int(n), to: prng.int(n) });
      if (prng.chance(0.3)) list.push({ t: 'reroll' });
      return list;
    };
    for (let guard = 0; guard < 400 && run.phase !== 'over'; guard++) {
      if (run.phase === 'shop' && (prng.chance(0.25) || guard % 9 === 8)) {
        act(run, { t: 'endShop' });
        continue;
      }
      const list = options();
      if (list.length) act(run, prng.pick(list));
      else if (run.phase === 'shop') act(run, { t: 'endShop' });
    }
    return run;
  }

  const finished: Array<{ seed: number; run: Run; kind: string }> = [];
  for (let k = 0; k < 10; k++) finished.push({ seed: 1000 + k, run: chaosRun(1000 + k), kind: 'chaos' });
  for (const seed of [7, 42]) finished.push({ seed, run: playRun(seed, new TinkerBot()), kind: 'tinkerer' });

  const runs = finished.map(({ seed, run, kind }) => {
    // Replay step by step to record the state after each action.
    const r = createRun(seed);
    const states = [digest(r)];
    for (const a of run.actions) {
      if (!act(r, a)) throw new Error(`golden replay rejected ${JSON.stringify(a)}`);
      states.push(digest(r));
    }
    return { seed, kind, actions: run.actions, states };
  });
  write('runs.json', { generator: 'lab/tools/golden.ts', runs });
  console.log(`tests/golden/runs.json: ${runs.length} runs, ${runs.reduce((s, r) => s + r.actions.length, 0)} actions`);
}
