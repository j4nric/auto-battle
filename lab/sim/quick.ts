// Quick balance check: only the Tüftler bot, only the key figures. For iterating on numbers;
// the full report (sim/simulate.ts) is the reference.
// Usage: node sim/quick.ts [--runs 150] [--seed 1]
import { ROOMS } from '../src/content.ts';
import { playRun, HOURS, type GhostPool } from '../src/run/run.ts';
import { makeBots } from '../src/run/bots.ts';
import { hashSeed } from '../src/rng.ts';

const args: Record<string, string> = {};
process.argv.slice(2).forEach((a, i, all) => { if (a.startsWith('--')) args[a.slice(2)] = all[i + 1]; });
const RUNS = Number(args.runs ?? 150);
const SEED = Number(args.seed ?? 1);
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)} %` : '–');

const pool: GhostPool = {};
const bot = makeBots()['tüftler'];
const hours = Array.from({ length: HOURS + 1 }, () => ({ n: 0, won: 0 }));
const combos = new Map<string, { n: number; mid: number }>();
const rooms = new Map<string, { n: number; mid: number }>();
const guildRuns = new Map<string, number>();
let mid = 0;
const floorShare = new Map<string, number>();
let floorsTotal = 0;
for (let i = 0; i < RUNS; i++) {
  const run = playRun(hashSeed(SEED, i), bot(), { ghostPool: pool });
  if (run.midnight) mid++;
  for (const f of run.fights) if (!f.skipped) { hours[f.hour].n++; if (f.won) hours[f.hour].won++; }
  for (const r of run.tower.rooms) { const h = ROOMS[r.id].height; floorShare.set(ROOMS[r.id].guild, (floorShare.get(ROOMS[r.id].guild) ?? 0) + h); floorsTotal += h; }
  const key = [...run.guilds].sort().join('+');
  const c = combos.get(key) ?? { n: 0, mid: 0 }; c.n++; if (run.midnight) c.mid++; combos.set(key, c);
  for (const g of run.guilds) guildRuns.set(g, (guildRuns.get(g) ?? 0) + 1);
  for (const id of new Set(run.tower.rooms.map((r) => r.id))) {
    const e = rooms.get(id) ?? { n: 0, mid: 0 }; e.n++; if (run.midnight) e.mid++; rooms.set(id, e);
  }
}
console.log(`Tüftler, ${RUNS} Runs, Seed ${SEED}: Mitternacht ${pct(mid, RUNS)}`);
console.log('Siegquote je Stunde: ' + hours.slice(1).map((h, i) => `${i + 1}:${pct(h.won, h.n)}`).join('  '));
const gm = new Map<string, number>();
for (const [k, c] of combos) for (const g of k.split('+')) gm.set(g, (gm.get(g) ?? 0) + c.mid);
console.log('Mitternacht je aktiver Zunft: ' + [...guildRuns].sort().map(([g, n]) => `${g} ${pct(gm.get(g) ?? 0, n)}`).join('  '));
console.log('Etagen-Anteil je Zunft (je aktivem Run normiert): ' + [...guildRuns].sort().map(([g, n]) => `${g} ${pct((floorShare.get(g) ?? 0) / n, (floorsTotal / RUNS) / 3)}`).join('  '));
console.log('Zunft-Kombinationen:');
for (const [k, c] of [...combos].sort()) console.log(`  ${k.padEnd(28)} n=${String(c.n).padStart(3)}  Mitternacht ${pct(c.mid, c.n)}`);
console.log('Räume (Aufnahme bei aktiver Zunft, Mitternacht mit Raum):');
for (const [id, e] of [...rooms].sort((a, b) => b[1].n / (guildRuns.get(ROOMS[b[0]].guild) ?? 1) - a[1].n / (guildRuns.get(ROOMS[a[0]].guild) ?? 1))) {
  console.log(`  ${ROOMS[id].name.padEnd(22)} ${ROOMS[id].guild.padEnd(9)} ${pct(e.n, guildRuns.get(ROOMS[id].guild) ?? 0).padStart(5)}  ${pct(e.mid, e.n).padStart(5)} (n=${e.n})`);
}
