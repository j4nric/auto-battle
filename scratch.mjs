import { playRun } from './src/run/run.js';
import { TinkerBot, RandomBot } from './src/run/bots.js';
import { describe } from './src/engine/tower.js';
const pool = {};
let t0 = performance.now();
for (let s = 1; s <= 4; s++) {
  const run = playRun(s, new TinkerBot(), { ghostPool: pool });
  console.log(s, run.guilds.join(','), 'h', run.hour, 'wins', run.wins, 'mid', run.midnight, run.fusionsFound, '\n  ', describe(run.tower));
  console.log('  ', run.fights.map(f => f.skipped ? 'H' : (f.won ? 'W' : 'L') + f.ticks).join(' '));
}
console.log('ms/run', (performance.now()-t0)/4);
for (let s = 1; s <= 3; s++) { const run = playRun(s, new RandomBot()); console.log('rnd', run.hour, run.wins, describe(run.tower)); }
