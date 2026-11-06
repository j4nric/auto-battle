// Writes golden vectors to tests/golden/. The Godot port must reproduce them exactly.
// Run: npm run golden (in lab/). CI fails if the committed files are stale.
import { writeFileSync, mkdirSync } from 'node:fs';
import { Rng, hashSeed } from '../src/rng.ts';
import { ROOMS, ALLOY_IDS } from '../src/content.ts';
import { fight, type Tower } from '../src/engine/combat.ts';
import { applyFusions, BASE_FLOORS } from '../src/engine/tower.ts';
import { HP_TABLE } from '../src/run/run.ts';

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
