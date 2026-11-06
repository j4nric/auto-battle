---
name: sim
description: Simulation im Labor laufen lassen und das Ergebnis als Tabelle zusammenfassen. Aufruf mit optionaler Run-Zahl und Seed, z. B. /sim 300 1.
---

1. Argumente lesen: erstes Argument Runs pro Bot (Standard 200), zweites Seed (Standard 1). `$ARGUMENTS`
2. Ausführen: `cd lab && node sim/simulate.js --runs <runs> --seed <seed>`
3. Bericht liegt danach in `lab/sim/output/report.md`. Daraus die Tabellen „Bots im Vergleich“ und „Schwierigkeitskurve“ zeigen.
4. Wenn es in `docs/balance/` einen früheren Bericht gibt, die wichtigsten Unterschiede mit Vorzeichen nennen.
5. Nur Befehl und Tabellen ausgeben. Interpretation ist Aufgabe des Agenten `balance`.
