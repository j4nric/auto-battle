// Replays a bug report code from the game ("Fehler melden") and prints the run hour by hour.
// Usage: node tools/replay.ts UHR1.eyJ2Ijox...   (or pass a file containing the code)
import { readFileSync, existsSync } from 'node:fs';
import { createRun, act, type Action } from '../src/run/run.ts';
import { describe } from '../src/engine/tower.ts';

const arg = process.argv[2] ?? '';
const code = (existsSync(arg) ? readFileSync(arg, 'utf8') : arg).trim();
if (!code.startsWith('UHR1.')) {
  console.error('Expected a code starting with UHR1. (copied from "Fehler melden" in the game)');
  process.exit(1);
}
const data = JSON.parse(Buffer.from(code.slice(5), 'base64').toString('utf8')) as {
  v: number; build: string; seed: number; hour: number; wins: number; actions: Action[];
};
console.log(`Build ${data.build}, seed ${data.seed}, ${data.actions.length} actions, saved at hour ${data.hour}`);

const run = createRun(data.seed);
let lastHour = 0;
for (const [i, a] of data.actions.entries()) {
  if (!act(run, a)) {
    console.log(`\nAction ${i} was rejected by this version of the rules: ${JSON.stringify(a)}`);
    console.log('The game build and this lab differ, or the save is corrupt.');
    process.exit(2);
  }
  const f = run.fights[run.fights.length - 1];
  if (a.t === 'omen' && f) {
    const result = f.skipped ? 'kein Kampf' : `${f.won ? 'Sieg' : 'Niederlage'} gegen ${f.opponent} nach ${f.ticks} Takten`;
    console.log(`Stunde ${f.hour}: ${a.id}, ${result}`);
  }
  if (run.hour !== lastHour) lastHour = run.hour;
}
console.log(`\nStand: Phase ${run.phase}, Stunde ${run.hour}, Gold ${run.gold}, Leben ${run.lives}, Siege ${run.wins}`);
console.log(`Turm: ${describe(run.tower) || '(leer)'}`);
if (run.offers.length && run.phase === 'shop') console.log(`Angebote: ${run.offers.map((o) => `${o.id}(${o.tier}) ${o.price}`).join(', ')}`);
