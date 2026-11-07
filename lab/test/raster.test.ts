import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, snakeOrder, type GridTower } from '../src/engine/combat.ts';
import { RASTER_ROOMS, RASTER_FUSIONS, cellsOf } from '../src/raster/content.ts';
import { ROOMS } from '../src/content.ts';
import * as G from '../src/raster/tower.ts';
import * as R from '../src/raster/run.ts';
import { RasterTinker } from '../src/raster/bots.ts';

test('raster rooms: shape size matches height, fusion results fit their pattern', () => {
  for (const r of Object.values(RASTER_ROOMS)) assert.equal(cellsOf(r).length, r.height, r.id);
  for (const f of RASTER_FUSIONS) {
    const union = new Set(f.parts.flatMap((p) => p.cells.map(([x, y]) => `${x},${y}`)));
    for (const [x, y] of cellsOf(RASTER_ROOMS[f.result])) assert.ok(union.has(`${x},${y}`), `${f.result} must lie within its parts`);
    for (const p of f.parts) {
      const rots = [0, 1, 2, 3].map((r) => cellsOf(RASTER_ROOMS[p.id], r).map(String).join(';'));
      const min = (cs: Array<[number, number]>) => [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1]))];
      const [mx, my] = min(p.cells);
      const norm = p.cells.map(([x, y]) => [x - mx, y - my] as [number, number]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      assert.ok(rots.includes(norm.map(String).join(';')), `${f.result}: part ${p.id} cells must be a rotation of its shape`);
    }
    assert.deepEqual(f.parts[0].cells[0], [0, 0], `${f.result}: first cell of the first part is the anchor`);
  }
  // Every room of the column game exists on the grid with the same effects.
  for (const id of Object.keys(ROOMS)) {
    assert.ok(RASTER_ROOMS[id], `${id} missing in raster.json`);
    assert.deepEqual(RASTER_ROOMS[id].on, ROOMS[id].on, `${id}: effects differ from content.json`);
  }
});

test('snake order alternates direction row by row', () => {
  assert.deepEqual(snakeOrder(3, 2), [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1]]);
});

test('rotation turns an L shape and keeps it in the positive quadrant', () => {
  const ball = RASTER_ROOMS.ballista;
  assert.deepEqual(cellsOf(ball, 0), [[0, 0], [1, 0], [0, 1]]);
  assert.deepEqual(cellsOf(ball, 1), [[0, 0], [0, 1], [1, 1]]);
  assert.equal(G.rotations('ballista').length, 4);
  assert.equal(G.rotations('bollwerk').length, 2);
  assert.equal(G.rotations('waffenkammer').length, 1);
});

test('placement rejects overlaps and cells outside the tower', () => {
  let t = G.emptyGrid(3);
  assert.ok(G.canPlace(t, 'ballista', 0, 0, 0));
  t = G.place(t, { id: 'ballista', x: 0, y: 0, rot: 0 });
  assert.ok(!G.canPlace(t, 'waffenkammer', 1, 0, 0), 'overlap');
  assert.ok(G.canPlace(t, 'waffenkammer', 1, 1, 0));
  assert.ok(!G.canPlace(t, 'bollwerk', 2, 0, 0), 'out of bounds');
  assert.ok(!G.canPlace(t, 'grosseGlocke', 2, 2, 0), 'out of bounds at the top');
});

test('pattern recipe: echo right on top of quecksilber fuses into a 1x2 zeitschleife', () => {
  let t = G.emptyGrid(3);
  t = G.place(t, { id: 'quecksilber', tier: 1, x: 1, y: 0, rot: 0 });
  t = G.place(t, { id: 'echo', tier: 2, x: 1, y: 1, rot: 0 });
  const { tower, fused } = G.applyFusions(t);
  assert.deepEqual(fused, ['zeitschleife']);
  assert.deepEqual(tower.rooms, [{ id: 'zeitschleife', tier: 2, alloy: null, x: 1, y: 0, rot: 0 }]);
  // Three parts: Kleine Glocke and Glockenseil side by side, the Große Glocke lying on top.
  let g = G.emptyGrid(4);
  g = G.place(g, { id: 'kleineGlocke', tier: 0, x: 1, y: 1, rot: 0 });
  g = G.place(g, { id: 'glockenseil', tier: 1, x: 2, y: 1, rot: 0 });
  g = G.place(g, { id: 'grosseGlocke', tier: 0, x: 1, y: 2, rot: 1 });
  const gs = G.applyFusions(g);
  assert.deepEqual(gs.fused, ['glockenspiel']);
  assert.deepEqual(gs.tower.rooms, [{ id: 'glockenspiel', tier: 1, alloy: null, x: 1, y: 1, rot: 0 }]);
  // Side by side does not fuse.
  let s = G.emptyGrid(3);
  s = G.place(s, { id: 'quecksilber', x: 0, y: 0, rot: 0 });
  s = G.place(s, { id: 'echo', x: 1, y: 0, rot: 0 });
  assert.deepEqual(G.applyFusions(s).fused, []);
});

test('the tower grows from 3x3 to 3x8', () => {
  assert.deepEqual([1, 2, 3, 5, 9, 11, 12].map(G.rowsFor), [3, 3, 4, 5, 7, 8, 8]);
});

test('grid fights are deterministic and an aura reaches every touching room', () => {
  const t: GridTower = {
    kind: 'grid', width: 3, rows: 3,
    rooms: [
      { id: 'waffenkammer', x: 0, y: 0 }, { id: 'zahnrad', x: 1, y: 0 }, { id: 'waffenkammer', x: 2, y: 0 },
      { id: 'waffenkammer', x: 1, y: 1 },
    ],
  };
  const foe: GridTower = { kind: 'grid', width: 3, rows: 3, rooms: [{ id: 'bollwerk', x: 0, y: 0, rot: 0 }] };
  const a = fight(t, 500, foe, 500, { record: true });
  const b = fight(t, 500, foe, 500, { record: true });
  assert.deepEqual(a.roomStats, b.roomStats);
  // All three Waffenkammern touch the Zahnrad and deal +25 %: 18 × 1.25 ≈ 23 per hit.
  const hits = a.frames!.flatMap((f) => f.events).filter((e) => e.side === 'a' && e.type === 'dmg');
  assert.ok(hits.length > 0);
  for (const h of hits) assert.equal(h.n, 23);
});

test('raster runs replay from their actions and stay deterministic', () => {
  const run = R.playRun(7, new RasterTinker());
  const again = R.createRun(7);
  for (const a of run.actions) assert.ok(R.act(again, a), JSON.stringify(a));
  assert.deepEqual(again.tower, run.tower);
  assert.equal(again.wins, run.wins);
});
