// Simulation: lässt Bots viele Runs spielen und schreibt einen Balance-Bericht.
// Aufruf: node sim/simulate.js [--runs 200] [--seed 1]
import { writeFileSync, mkdirSync } from 'node:fs';
import { ROOMS, GUILDS, FUSIONS } from '../src/content/rooms.js';
import { ALLOYS } from '../src/content/alloys.js';
import { CONFIG, DECAY_START } from '../src/engine/combat.js';
import * as T from '../src/engine/tower.js';
import { playRun, HOURS, SHOP } from '../src/run/run.js';
import { makeBots, score } from '../src/run/bots.js';
import { Rng, hashSeed } from '../src/rng.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const RUNS = Number(args.runs ?? 200);
const SEED = Number(args.seed ?? 1);
const TICK_SECONDS = 0.6;
const costRunsFor = (n) => Math.max(20, Math.round(n / 3));

const pct = (x) => `${(100 * x).toFixed(0)} %`;
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const fmt = (x, d = 1) => x.toFixed(d);
const table = (head, rows) =>
  [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const out = [];
const say = (s = '') => {
  out.push(s);
  console.log(s);
};
const t0 = performance.now();

// ------------------------------------------------------------------ Hauptlauf
function runBatch(botNames, runs, seedBase, ghostPool = {}) {
  const bots = makeBots();
  const results = Object.fromEntries(botNames.map((b) => [b, []]));
  for (let i = 0; i < runs; i++) {
    for (const b of botNames) {
      const run = playRun(hashSeed(seedBase, i), bots[b](), { ghostPool });
      results[b].push(summarize(run));
    }
  }
  return results;
}

function summarize(run) {
  const fights = run.fights.filter((f) => !f.skipped);
  return {
    seed: run.seed,
    guilds: run.guilds.slice().sort(),
    wins: run.wins,
    hours: run.hour,
    midnight: run.midnight,
    tower: run.tower,
    fusions: run.fusionsFound,
    fights: fights.map((f) => ({
      hour: f.hour, won: f.won, ticks: f.ticks, ghost: f.ghost, omen: f.omen,
      stats: f.roomStats,
    })),
    omens: run.fights.map((f) => f.omen),
  };
}

say(`# Simulationsbericht Uhrturm-Prototyp`);
say();
say(`Runs pro Bot: ${RUNS}, Seed ${SEED}, leere Etage kostet ${CONFIG.emptyFloorCost} Tempo, fehlende Rezept-Teile im Shop ${SHOP.recipePull}× so häufig, Takt = ${TICK_SECONDS} s.`);
say();

const main = runBatch(['zufall', 'tüftler', 'ohne-reihenfolge', 'kompakt-5', 'kodex'], RUNS, SEED);

say(`## 1. Bots im Vergleich`);
say();
say(
  table(
    ['Bot', 'Ø Siege', 'Ø Stunden', 'Mitternacht', 'Ø Kampfdauer', 'Blowouts ≤ 5 Takte', 'Kämpfe im Zeitzerfall', 'Ø Etagen belegt'],
    Object.entries(main).map(([b, rs]) => {
      const fights = rs.flatMap((r) => r.fights);
      return [
        b,
        fmt(avg(rs.map((r) => r.wins))),
        fmt(avg(rs.map((r) => r.hours))),
        pct(avg(rs.map((r) => (r.midnight ? 1 : 0)))),
        `${fmt(avg(fights.map((f) => f.ticks)) * TICK_SECONDS)} s`,
        pct(avg(fights.map((f) => (f.ticks <= 5 ? 1 : 0)))),
        pct(avg(fights.map((f) => (f.ticks > DECAY_START ? 1 : 0)))),
        fmt(avg(rs.map((r) => T.floorsUsed(r.tower)))),
      ];
    }),
  ),
);
say();

const tk = main['tüftler'];
say(`## 2. Schwierigkeitskurve (Tüftler)`);
say();
const byHour = Array.from({ length: HOURS }, (_, h) => tk.flatMap((r) => r.fights.filter((f) => f.hour === h + 1)));
say(
  table(
    ['Stunde', 'Kämpfe', 'Siegquote', 'davon Geister', 'Ø Dauer', 'Blowouts ≤ 5 Takte'],
    byHour.map((fs, h) => [
      h + 1, fs.length, pct(avg(fs.map((f) => (f.won ? 1 : 0)))),
      pct(avg(fs.map((f) => (f.ghost ? 1 : 0)))), `${fmt(avg(fs.map((f) => f.ticks)) * TICK_SECONDS)} s`,
      pct(avg(fs.map((f) => (f.ticks <= 5 ? 1 : 0)))),
    ]),
  ),
);
say();

// ------------------------------------------------------------------ Räume
say(`## 3. Räume in End-Türmen (Tüftler)`);
say();
const baseMid = avg(tk.map((r) => (r.midnight ? 1 : 0)));
const roomRows = Object.values(ROOMS).map((def) => {
  const offered = tk.filter((r) => r.guilds.includes(def.guild));
  const withRoom = tk.filter((r) => r.tower.rooms.some((x) => x.id === def.id));
  const shares = [];
  for (const r of tk) {
    for (const f of r.fights) {
      const total = f.stats.reduce((s, x) => s + x.dmg + x.burn * 2.5 + x.poison * 8 + x.shield * 0.6 + x.heal * 0.6, 0);
      if (!total) continue;
      const mine = f.stats.filter((x) => x.id === def.id).reduce((s, x) => s + x.dmg + x.burn * 2.5 + x.poison * 8 + x.shield * 0.6 + x.heal * 0.6, 0);
      if (f.stats.some((x) => x.id === def.id)) shares.push(mine / total);
    }
  }
  return {
    def,
    pick: offered.length ? withRoom.length / offered.length : 0,
    mid: withRoom.length ? avg(withRoom.map((r) => (r.midnight ? 1 : 0))) : null,
    share: avg(shares),
    n: withRoom.length,
  };
});
roomRows.sort((a, b) => b.pick - a.pick);
say(`Aufnahmequote = Anteil der Runs, in denen die Zunft aktiv war und der Raum im End-Turm steht. Beitrag = gewichteter Anteil an Schaden, Status, Schild und Heilung pro Kampf, in dem der Raum steckt. Mitternacht-Quote gesamt: ${pct(baseMid)}.`);
say();
say(
  table(
    ['Raum', 'Zunft', 'Höhe', 'Aufnahme', 'Mitternacht mit Raum', 'Ø Beitrag'],
    roomRows.map((r) => [
      r.def.name + (r.def.fusion ? ' (Verschmelzung)' : ''), GUILDS[r.def.guild].name, r.def.height, pct(r.pick),
      r.mid == null ? '–' : `${pct(r.mid)} (n=${r.n})`, pct(r.share),
    ]),
  ),
);
say();

say(`## 4. Zunft-Kombinationen (Tüftler)`);
say();
const combos = {};
for (const r of tk) (combos[r.guilds.map((g) => GUILDS[g].name).join(' + ')] ??= []).push(r);
say(
  table(
    ['Aktive Zünfte', 'Runs', 'Ø Siege', 'Mitternacht'],
    Object.entries(combos).sort().map(([k, rs]) => [k, rs.length, fmt(avg(rs.map((r) => r.wins))), pct(avg(rs.map((r) => (r.midnight ? 1 : 0))))]),
  ),
);
say();

say(`## 5. Verschmelzungen und Legierungen`);
say();
say(
  table(
    ['Verschmelzung', 'Rezept', 'gefunden Zufall', 'gefunden Tüftler', 'gefunden Kodex-Bot', 'Mitternacht Kodex-Bot mit Rezept'],
    FUSIONS.map((f) => {
      const found = (rs) => pct(avg(rs.map((r) => (r.fusions.includes(f.result) ? 1 : 0))));
      const kx = main.kodex.filter((r) => r.tower.rooms.some((x) => x.id === f.result));
      return [
        ROOMS[f.result].name, f.pattern.map((p) => ROOMS[p].name).join(' unter '),
        found(main.zufall), found(tk), found(main.kodex),
        kx.length ? `${pct(avg(kx.map((r) => (r.midnight ? 1 : 0))))} (n=${kx.length})` : '–',
      ];
    }),
  ),
);
say();
const alloyRows = Object.values(ALLOYS).map((a) => {
  const rs = tk.filter((r) => r.tower.rooms.some((x) => x.alloy === a.id));
  return [a.name, a.text, rs.length, rs.length ? pct(avg(rs.map((r) => (r.midnight ? 1 : 0)))) : '–'];
});
const recipeRows = [];
for (const w of [1, 4, 8]) {
  SHOP.recipePull = w;
  const res = runBatch(['tüftler', 'kodex'], costRunsFor(RUNS), SEED + 2000);
  const any3 = (rs) => pct(avg(rs.map((r) => (r.fusions.includes('glockenspiel') || r.fusions.includes('antriebswerk') ? 1 : 0))));
  recipeRows.push([`${w}×`, any3(res['tüftler']), any3(res.kodex), pct(avg(res.kodex.map((r) => (r.midnight ? 1 : 0))))]);
}
SHOP.recipePull = 4;
say(`Variante: Wie stark ruft ein angefangenes Rezept das fehlende Teil in den Shop? (${costRunsFor(RUNS)} Runs je Wert)`);
say();
say(table(['Gewicht fehlendes Rezept-Teil', 'Dreier-Rezept gefunden Tüftler', 'Dreier-Rezept gefunden Kodex-Bot', 'Mitternacht Kodex-Bot'], recipeRows));
say();
say(table(['Legierung', 'Wirkung', 'Runs mit Legierung im End-Turm', 'Mitternacht'], alloyRows));
say();

// ------------------------------------------------------------------ Reihenfolge
say(`## 6. Spielt die Reihenfolge eine Rolle?`);
say();
const deltas = [];
const worse = [];
const rngShuffle = new Rng(hashSeed(SEED, 'shuffle'));
for (const r of tk.filter((r) => r.tower.rooms.length >= 3).slice(0, 80)) {
  const fake = { seed: r.seed, hour: HOURS };
  const base = score(fake, r.tower);
  const shuffled = Array.from({ length: 5 }, () => score(fake, { ...r.tower, rooms: rngShuffle.shuffle(r.tower.rooms) }));
  deltas.push(base - avg(shuffled));
  worse.push(avg(shuffled.map((s) => (s < base - 0.05 ? 1 : 0))));
}
say(`Für ${deltas.length} End-Türme des Tüftlers wurde die optimierte Reihenfolge mit je 5 zufälligen Umsortierungen verglichen (Bewertung: Testkämpfe Stunde 12, Bilanz −1 bis +1,5).`);
say();
say(table(['Kennzahl', 'Wert'], [
  ['Ø Verlust an Kampfbilanz durch Umsortieren', fmt(avg(deltas), 2)],
  ['Anteil Umsortierungen, die spürbar schlechter sind', pct(avg(worse))],
  ['Mitternacht mit Reihenfolge-Optimierung', pct(baseMid)],
  ['Mitternacht ohne (neue Räume immer oben)', pct(avg(main['ohne-reihenfolge'].map((r) => (r.midnight ? 1 : 0))))],
]));
say();

// ------------------------------------------------------------------ Tempo
say(`## 7. Tempo: kompakt gegen breit`);
say();
const byFloors = {};
for (const r of [...tk, ...main['kompakt-5']]) (byFloors[T.floorsUsed(r.tower)] ??= []).push(r);
say(table(
  ['Belegte Etagen im End-Turm', 'Runs', 'Mitternacht'],
  Object.entries(byFloors).sort((a, b) => a[0] - b[0]).map(([k, rs]) => [k, rs.length, pct(avg(rs.map((r) => (r.midnight ? 1 : 0))))]),
));
say();

const costRuns = costRunsFor(RUNS);
const costRows = [];
for (const c of [0, 0.5, 1]) {
  CONFIG.emptyFloorCost = c;
  const res = runBatch(['tüftler', 'kompakt-5'], costRuns, SEED + 1000);
  costRows.push([
    c,
    pct(avg(res['tüftler'].map((r) => (r.midnight ? 1 : 0)))),
    pct(avg(res['kompakt-5'].map((r) => (r.midnight ? 1 : 0)))),
    fmt(avg(res['tüftler'].map((r) => T.floorsUsed(r.tower)))),
  ]);
}
CONFIG.emptyFloorCost = 0.5;
say(`Variante: Was kostet eine leere Etage den Funken? (${costRuns} Runs je Wert)`);
say();
say(table(['Kosten leere Etage', 'Mitternacht Tüftler (8 Etagen)', 'Mitternacht kompakt-5', 'Ø belegte Etagen Tüftler'], costRows));
say();

// ------------------------------------------------------------------ Vielfalt
say(`## 8. Vielfalt der Builds (Tüftler)`);
say();
const keyRooms = (t) => t.rooms.map((r) => r.id).sort().join(',');
const uniq = new Set(tk.map((r) => keyRooms(r.tower)));
const guildDom = {};
for (const r of tk) {
  const cnt = {};
  for (const x of r.tower.rooms) cnt[ROOMS[x.id].guild] = (cnt[ROOMS[x.id].guild] ?? 0) + ROOMS[x.id].height;
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'leer';
  guildDom[top] = (guildDom[top] ?? 0) + 1;
}
say(table(['Kennzahl', 'Wert'], [
  ['Verschiedene Raum-Kombinationen in End-Türmen', `${uniq.size} von ${tk.length}`],
  ...Object.entries(guildDom).map(([g, n]) => [`Turm dominiert von ${GUILDS[g]?.name ?? g}`, pct(n / tk.length)]),
]));
say();
say(`Beispiel-Türme, die Mitternacht erreicht haben (von unten nach oben):`);
say();
for (const r of tk.filter((r) => r.midnight).slice(0, 8)) say(`- ${T.describe(r.tower)}`);
say();
say(`_Laufzeit ${fmt((performance.now() - t0) / 1000, 0)} s._`);

mkdirSync(new URL('./output/', import.meta.url), { recursive: true });
writeFileSync(new URL('./output/report.md', import.meta.url), out.join('\n') + '\n');
