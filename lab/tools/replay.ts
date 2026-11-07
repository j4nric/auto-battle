// Replays a bug report code from the game ("Fehler melden") and prints the run hour by hour.
// Usage: node tools/replay.ts UHR2.eyJ2Ijoy...   (or pass a file containing the code)
// UHR2 codes are grid runs (ADR 0008), UHR1 codes the old single column.
import { readFileSync, existsSync } from 'node:fs';
import { createRun, act, type Action } from '../src/run/run.ts';
import { describe } from '../src/engine/tower.ts';
import * as RR from '../src/raster/run.ts';
import { picture } from '../src/raster/tower.ts';

const arg = process.argv[2] ?? '';
const code = (existsSync(arg) ? readFileSync(arg, 'utf8') : arg).trim();
const prefix = code.slice(0, 5);
if (prefix !== 'UHR1.' && prefix !== 'UHR2.') {
  console.error('Expected a code starting with UHR2. (copied from "Fehler melden" in the game)');
  process.exit(1);
}
const data = JSON.parse(Buffer.from(code.slice(5), 'base64').toString('utf8')) as {
  v: number; build: string; seed: number; hour: number; wins: number; actions: unknown[];
};
console.log(`Build ${data.build}, seed ${data.seed}, ${data.actions.length} actions, saved at hour ${data.hour}`);
const rejected = (i: number, a: unknown) => {
  console.log(`\nAction ${i} was rejected by this version of the rules: ${JSON.stringify(a)}`);
  console.log('The game build and this lab differ, or the save is corrupt.');
  process.exit(2);
};
const fightLine = (f: { hour: number; skipped?: boolean; won?: boolean; opponent?: string; ticks?: number }, id: string) =>
  `Stunde ${f.hour}: ${id}, ${f.skipped ? 'kein Kampf' : `${f.won ? 'Sieg' : 'Niederlage'} gegen ${f.opponent} nach ${f.ticks} Takten`}`;

if (prefix === 'UHR2.') {
  const run = RR.createRun(data.seed);
  for (const [i, a] of (data.actions as RR.Action[]).entries()) {
    if (!RR.act(run, a)) rejected(i, a);
    const f = run.fights[run.fights.length - 1];
    if (a.t === 'omen' && f) console.log(fightLine(f, a.id));
  }
  console.log(`\nStand: Phase ${run.phase}, Stunde ${run.hour}, Gold ${run.gold}, Leben ${run.lives}, Siege ${run.wins}`);
  console.log('Turm (oben zuerst):\n' + picture(run.tower));
  if (run.offers.length && run.phase === 'shop') console.log(`Angebote: ${run.offers.map((o) => `${o.id}(${o.tier}) ${o.price}`).join(', ')}`);
} else {
  const run = createRun(data.seed);
  for (const [i, a] of (data.actions as Action[]).entries()) {
    if (!act(run, a)) rejected(i, a);
    const f = run.fights[run.fights.length - 1];
    if (a.t === 'omen' && f) console.log(fightLine(f, a.id));
  }
  console.log(`\nStand: Phase ${run.phase}, Stunde ${run.hour}, Gold ${run.gold}, Leben ${run.lives}, Siege ${run.wins}`);
  console.log(`Turm: ${describe(run.tower) || '(leer)'}`);
}
