import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, CONFIG } from '../src/engine/combat.ts';
import { applyFusions } from '../src/engine/tower.ts';
import { playRun } from '../src/run/run.ts';
import { makeBots } from '../src/run/bots.ts';

const tower = (...ids) => ({ maxFloors: 8, rooms: ids.map((id) => (typeof id === 'string' ? { id, tier: 0 } : id)) });
const dummy = tower('bollwerk'); // greift nicht an

test('Kampf ist deterministisch', () => {
  const a = fight(tower('feder', 'brennofen', 'ballista'), 500, tower('kleineGlocke', 'grosseGlocke'), 500);
  const b = fight(tower('feder', 'brennofen', 'ballista'), 500, tower('kleineGlocke', 'grosseGlocke'), 500);
  assert.deepEqual(a, b);
});

test('Echokammer löst den Raum darunter erneut aus', () => {
  const res = fight(tower('waffenkammer', 'echo'), 9999, dummy, 9999);
  const [waffe, echo] = res.roomStats.a;
  assert.ok(waffe.activations > echo.activations, 'Waffenkammer feuert öfter als die Echokammer');
});

test('Verschmelzung: Brennofen unter Giftküche wird zur Höllenküche', () => {
  const { tower: t, fused } = applyFusions(tower('waffenkammer', 'brennofen', 'giftkueche'));
  assert.deepEqual(fused, ['hoellenkueche']);
  assert.deepEqual(t.rooms.map((r) => r.id), ['waffenkammer', 'hoellenkueche']);
  // Umgekehrte Reihenfolge verschmilzt nicht.
  assert.equal(applyFusions(tower('giftkueche', 'brennofen')).fused.length, 0);
});

test('Kleine Glocke schlägt jede zweite Auslösung', () => {
  const res = fight(tower('kleineGlocke'), 9999, dummy, 9999, { record: true });
  const fires = res.frames!.flatMap((f) => f.events).filter((e) => e.side === 'a' && e.type === 'fire').length;
  const strikes = res.frames!.flatMap((f) => f.events).filter((e) => e.side === 'a' && e.type === 'strike').length;
  assert.equal(strikes, Math.floor(fires / 2));
});

test('Leere Etagen kosten den Funken Zeit', () => {
  const saved = CONFIG.emptyFloorCost;
  CONFIG.emptyFloorCost = 1;
  const slow = fight(tower('waffenkammer'), 9999, dummy, 9999).roomStats.a[0].activations;
  CONFIG.emptyFloorCost = 0;
  const fast = fight(tower('waffenkammer'), 9999, dummy, 9999).roomStats.a[0].activations;
  CONFIG.emptyFloorCost = saved;
  assert.ok(fast > slow * 4, `ohne Kosten ${fast}, mit Kosten ${slow}`);
});

test('Rost verlangsamt den gegnerischen Funken', () => {
  const plain = fight(dummy, 9999, tower('waffenkammer', 'waffenkammer'), 9999).roomStats.b[0].activations;
  const rusted = fight(tower('rostkammer'), 9999, tower('waffenkammer', 'waffenkammer'), 9999).roomStats.b[0].activations;
  assert.ok(rusted < plain, `mit Rost ${rusted}, ohne ${plain}`);
});

test('Ein ganzer Run ist mit gleichem Seed reproduzierbar', () => {
  const bots = makeBots();
  const a = playRun(42, bots['tüftler']());
  const b = playRun(42, bots['tüftler']());
  assert.deepEqual(a.tower, b.tower);
  assert.equal(a.wins, b.wins);
  assert.ok(a.hour >= 1);
});

test('Echo-Räume wiederholen keine anderen Echo-Räume (keine exponentiellen Ketten)', () => {
  const res = fight(tower('feder', 'zeitschleife', 'zeitschleife', 'zeitschleife'), 99999, dummy, 99999, { record: true });
  const first = res.frames!.find((f) => f.events.some((e) => e.side === 'a' && e.idx === 3 && e.type === 'fire'));
  const federFires = first!.events.filter((e) => e.side === 'a' && e.idx === 0 && e.type === 'fire').length;
  assert.ok(federFires <= 2, `Feder feuerte ${federFires}× durch eine Zeitschleife`);
});

test('Kupfer erzeugt über den Umlauf keine Endlosschleife', () => {
  const combo = { maxFloors: 8, rooms: [
    { id: 'quecksilber', tier: 0, alloy: 'kupfer' }, { id: 'zeitschleife', tier: 0 }, { id: 'antriebswerk', tier: 1, alloy: 'kupfer' },
  ] };
  const res = fight(combo, 5000, tower('bollwerk', 'bollwerk', 'bollwerk', 'bollwerk'), 5000);
  assert.ok(res.ticks > 5, `Kampf endete nach ${res.ticks} Takten`);
});
