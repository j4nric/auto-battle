// Raster prototype simulation (ADR 0008): plays tinkerer runs on the 3-wide grid and answers the
// prototype questions. Usage: node sim/raster.ts [--runs 150] [--seed 1] [--out raster.md]
import { writeFileSync, mkdirSync } from 'node:fs';
import { hashSeed, Rng } from '../src/rng.ts';
import { RASTER_ROOMS } from '../src/raster/content.ts';
import * as G from '../src/raster/tower.ts';
import * as R from '../src/raster/run.ts';
import { RasterTinker, score, scramble } from '../src/raster/bots.ts';

const args: Record<string, string> = {};
process.argv.slice(2).forEach((a, i, all) => { if (a.startsWith('--')) args[a.slice(2)] = all[i + 1]; });
const RUNS = Number(args.runs ?? 150);
const SEED = Number(args.seed ?? 1);
const TICK = 0.6;
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)} %` : '–');
const t0 = Date.now();

function batch(rebuild: boolean, runs: number) {
  const pool: R.GhostPool = {};
  const bot = new RasterTinker({ rebuild });
  return Array.from({ length: runs }, (_, i) => R.playRun(hashSeed(SEED, i), bot, { ghostPool: pool }));
}
const main = batch(true, RUNS);
const tMain = (Date.now() - t0) / 1000;
const noRebuild = batch(false, Math.round(RUNS / 2));

const out: string[] = [];
const line = (s = '') => out.push(s);
const fights = main.flatMap((r) => r.fights.filter((f) => !f.skipped));
line(`# Raster-Prototyp: Simulation`);
line();
line(`Tüftler, ${RUNS} Runs, Seed ${SEED}, Integrität × ${R.RASTER.hpMult}, Laufzeit ${tMain.toFixed(0)} s (${(tMain / RUNS).toFixed(2)} s pro Run).`);
line();
line(`| Kennzahl | Wert |`);
line(`|---|---|`);
line(`| Mitternacht | ${pct(main.filter((r) => r.midnight).length, RUNS)} |`);
line(`| Mitternacht ohne Umbau | ${pct(noRebuild.filter((r) => r.midnight).length, noRebuild.length)} |`);
line(`| Ø Kampfdauer | ${((fights.reduce((s, f) => s + (f.ticks ?? 0), 0) / fights.length) * TICK).toFixed(1)} s |`);
line(`| Kämpfe nach höchstens 5 Takten | ${fights.filter((f) => (f.ticks ?? 99) <= 5).length} |`);
line(`| Kämpfe im Zeitzerfall (> 30 Takte) | ${pct(fights.filter((f) => (f.ticks ?? 0) > 30).length, fights.length)} |`);
line();
line(`Siegquote je Stunde: ` + Array.from({ length: 12 }, (_, h) => {
  const fs = fights.filter((f) => f.hour === h + 1);
  return `${h + 1}: ${pct(fs.filter((f) => f.won).length, fs.length)}`;
}).join(' · '));
line();
line(`Belegte Felder je Stunde (Anteil am Turm): ` + Array.from({ length: 12 }, (_, h) => {
  const fs = main.flatMap((r) => r.fights).filter((f) => f.hour === h + 1 && f.fill != null);
  return `${h + 1}: ${pct(fs.reduce((s, f) => s + f.fill!, 0), fs.length)}`;
}).join(' · '));
line();

// Does the layout matter? Optimised end towers against compact random rearrangements.
const rng = new Rng(hashSeed('scramble', SEED));
let worse = 0, total = 0, loss = 0;
for (const r of main.slice(0, 80)) {
  if (r.tower.rooms.length < 3) continue;
  const base = score({ seed: r.seed, hour: 12 }, r.tower, 12);
  for (let k = 0; k < 5; k++) {
    const s = score({ seed: r.seed, hour: 12 }, scramble(r.tower, rng), 12);
    total++;
    loss += base - s;
    if (base - s > 0.1) worse++;
  }
}
line(`## Zählt die Anordnung?`);
line();
line(`End-Türme gegen je 5 zufällige, kompakte Umbauten (Bewertung Stunde 12, Bilanz −1 bis +1,5): Ø Verlust ${(loss / total).toFixed(2)}, spürbar schlechter ${pct(worse, total)}.`);
line();

// Diversity.
const sets = new Set(main.map((r) => r.tower.rooms.map((x) => x.id).sort().join(',')));
const layouts = new Set(main.map((r) => G.picture(r.tower)));
line(`## Vielfalt`);
line();
line(`${sets.size} verschiedene Raum-Kombinationen und ${layouts.size} verschiedene Anordnungen bei ${RUNS} End-Türmen.`);
line();

// Guild share and rooms.
const guildRuns = new Map<string, number>(), guildCells = new Map<string, number>(), roomRuns = new Map<string, number>();
let cells = 0;
for (const r of main) {
  for (const g of r.guilds) guildRuns.set(g, (guildRuns.get(g) ?? 0) + 1);
  for (const x of r.tower.rooms) {
    const d = RASTER_ROOMS[x.id];
    guildCells.set(d.guild, (guildCells.get(d.guild) ?? 0) + G.area(x.id));
    cells += G.area(x.id);
  }
  for (const id of new Set(r.tower.rooms.map((x) => x.id))) roomRuns.set(id, (roomRuns.get(id) ?? 0) + 1);
}
line(`## Zünfte und Räume`);
line();
line(`Etagen-Anteil je aktiver Zunft (100 % = fair): ` + [...guildRuns].sort().map(([g, n]) => `${g} ${pct((guildCells.get(g) ?? 0) / n, cells / RUNS / 3)}`).join(' · '));
line();
line(`| Raum | Form | Aufnahme bei aktiver Zunft |`);
line(`|---|---|---|`);
for (const [id, n] of [...roomRuns].sort((a, b) => b[1] / (guildRuns.get(RASTER_ROOMS[b[0]].guild) ?? 1) - a[1] / (guildRuns.get(RASTER_ROOMS[a[0]].guild) ?? 1))) {
  line(`| ${RASTER_ROOMS[id].name} | ${G.area(id)} Felder | ${pct(n, guildRuns.get(RASTER_ROOMS[id].guild) ?? 0)} |`);
}
line();
line(`Verschmelzungen gefunden: ` + ['zeitschleife', 'hoellenkueche'].map((f) => `${RASTER_ROOMS[f].name} ${pct(main.filter((r) => r.fusionsFound.includes(f)).length, RUNS)}`).join(' · '));
line();
line(`## Beispiel-Türme (Mitternacht erreicht)`);
for (const r of main.filter((x) => x.midnight).slice(0, 4)) {
  line();
  line('```');
  line(G.picture(r.tower));
  line('```');
}
mkdirSync(new URL('./output/', import.meta.url), { recursive: true });
writeFileSync(new URL(`./output/${args.out ?? 'raster.md'}`, import.meta.url), out.join('\n') + '\n');
console.log(out.join('\n'));
