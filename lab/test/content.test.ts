import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS, FUSIONS, ALLOYS, GUILDS, type Op, type Term } from '../src/content.ts';

const OPS = new Set(['damage', 'shield', 'heal', 'burn', 'poison', 'rust', 'oil', 'breakShield', 'addCharge',
  'chargeOthers', 'retrigger', 'freeNext', 'firstTime', 'spawnSpark', 'advanceCounter', 'advanceAllBells']);
const TERMS = new Set(['scaled', 'scaledPerTag', 'flat', 'tier', 'charge', 'myOil', 'foeBurn']);
const TRIGGERS = new Set(['activate', 'strike', 'strikeEvent', 'loopEvent']);

function checkTerms(where: string, terms: Term[] | undefined): void {
  assert.ok(Array.isArray(terms) && terms.length, `${where}: value must be a non-empty list of terms`);
  for (const t of terms!) {
    const keys = Object.keys(t);
    assert.equal(keys.length, 1, `${where}: a term has exactly one key, got ${keys.join(',')}`);
    assert.ok(TERMS.has(keys[0]), `${where}: unknown term ${keys[0]}`);
  }
}

function checkOps(where: string, ops: Op[]): void {
  for (const op of ops) {
    assert.ok(OPS.has(op.op), `${where}: unknown op ${op.op}`);
    if ('value' in op) checkTerms(`${where}.${op.op}`, op.value);
    if (op.op === 'retrigger') checkTerms(`${where}.retrigger`, op.bonus);
    if (op.op === 'firstTime') {
      checkOps(`${where}.then`, op.then);
      checkOps(`${where}.else`, op.else);
    }
  }
}

test('Jeder Raum nutzt nur bekannte Bausteine und gültige Felder', () => {
  for (const r of Object.values(ROOMS)) {
    assert.ok(GUILDS[r.guild], `${r.id}: unknown guild ${r.guild}`);
    assert.ok(Number.isInteger(r.height) && r.height >= 1 && r.height <= 4, `${r.id}: height ${r.height}`);
    assert.ok(r.name && r.text, `${r.id}: name and text required`);
    for (const [trigger, ops] of Object.entries(r.on)) {
      assert.ok(TRIGGERS.has(trigger), `${r.id}: unknown trigger ${trigger}`);
      checkOps(`${r.id}.${trigger}`, ops!);
    }
    if (r.on.strike) assert.ok((r.counterMax ?? 0) >= 1, `${r.id}: strike needs counterMax`);
    if (r.aura) checkTerms(`${r.id}.aura`, r.aura.value);
  }
});

test('Verschmelzungen bestehen aus verschiedenen, existierenden Räumen und sparen keine Etagen zu viel', () => {
  for (const f of FUSIONS) {
    assert.ok(ROOMS[f.result]?.fusion, `${f.result}: result must be a fusion room`);
    for (const p of f.pattern) assert.ok(ROOMS[p] && !ROOMS[p].fusion, `${f.result}: part ${p} must be a shop room`);
    assert.equal(new Set(f.pattern).size, f.pattern.length, `${f.result}: parts must differ (simulation finding)`);
    const partsHeight = f.pattern.reduce((s, p) => s + ROOMS[p].height, 0);
    assert.ok(ROOMS[f.result].height <= partsHeight, `${f.result}: must not need more floors than its parts`);
  }
});

test('Legierungen haben Namen und Wirkung', () => {
  for (const a of Object.values(ALLOYS)) assert.ok(a.name && a.text, `${a.id}: name and text required`);
});
