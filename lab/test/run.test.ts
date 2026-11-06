import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, act, replay, playRun, HOURS } from '../src/run/run.ts';
import { makeBots } from '../src/run/bots.ts';

const state = (r: ReturnType<typeof createRun>) => ({
  phase: r.phase, hour: r.hour, gold: r.gold, lives: r.lives, wins: r.wins, tower: r.tower,
  offers: r.offers, fusions: r.fusionsFound, midnight: r.midnight,
});

test('Ein Bot-Run lässt sich aus Seed und Aktionen exakt nachspielen', () => {
  const bots = makeBots();
  for (const name of ['zufall', 'tüftler']) {
    for (const seed of [3, 17]) {
      const run = playRun(seed, bots[name]());
      const again = replay(seed, run.actions);
      assert.deepEqual(state(again), state(run), `${name} seed ${seed}`);
      assert.equal(run.phase, 'over');
    }
  }
});

test('Unerlaubte Aktionen werden abgelehnt und ändern nichts', () => {
  const run = createRun(5);
  const before = JSON.stringify(state(run));
  assert.equal(act(run, { t: 'omen', id: 'normal' }), false, 'omen in the workshop');
  assert.equal(act(run, { t: 'alloy', idx: 0 }), false, 'alloy in the workshop');
  assert.equal(act(run, { t: 'sell', idx: 0 }), false, 'sell from an empty tower');
  assert.equal(act(run, { t: 'move', from: 0, to: 1 }), false, 'move in an empty tower');
  assert.equal(act(run, { t: 'buy', offer: 99, pos: 0, upgrade: false }), false, 'unknown offer');
  assert.equal(JSON.stringify(state(run)), before);
  assert.equal(run.actions.length, 0);
});

test('Phasen: Werkstatt, Vorzeichen, Kampf, nächste Stunde', () => {
  const run = createRun(8);
  assert.equal(run.phase, 'shop');
  assert.equal(run.hour, 1);
  assert.ok(act(run, { t: 'buy', offer: 0, pos: 0, upgrade: false }));
  assert.ok(act(run, { t: 'endShop' }));
  assert.equal(run.phase, 'omen');
  assert.ok(run.omens.length >= 1 && run.omens.length <= 3);
  assert.ok(act(run, { t: 'omen', id: run.omens[0].id }));
  assert.ok(run.phase === 'shop' || run.phase === 'alloy' || run.phase === 'over');
  if (run.phase === 'shop') assert.equal(run.hour, 2);
  assert.ok(HOURS === 12);
});
