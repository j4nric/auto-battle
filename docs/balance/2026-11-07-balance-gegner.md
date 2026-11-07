# Balance-Runde nach Schatten-Runs und Nachbarn

Datum: 2026-11-07 · `node sim/raster.ts --runs 150|200 --seed 1|2` · Bericht Seed 1: `2026-11-07-balance-gegner-report.md`

## Versuche (150 Runs, Seeds 1 und 2)

| Versuch | Mitternacht | Stunde 1 | Stunden 3–4 | Uhrwerk | Echokammer |
|---|---|---|---|---|---|
| Ausgang (q14) | 26–34 % | 58–63 % | 82–86 % | 124–129 % | 80–82 % |
| Gegner +6 Startgold, Echo 20 % | 22–23 % | 39–40 % | 79–81 % | 117–132 % | 75–79 % |
| Gegner-Integrität ×1,15 in Std. 3–4, Echo 15 % | 21–26 % | 59–63 % | 79–82 % | 122–126 % | 72–79 % |

Startgold macht die ersten Stunden viel zu schwer und ändert an den Stunden 3 und 4 kaum etwas. Mehr Integrität für Gegner in diesen Stunden wirkt ebenfalls kaum. Die Gegnertürme sind dort genauso voll wie die des Tüftlers (85 bis 95 % der Felder). Sie haben aber niedrigere Stufen (Ø 0,25 bis 0,38) und weniger durchdachte Nachbarschaften.

## Entscheidung

- Keine Sonderregel für die Stunden 3 und 4. Der Tüftler-Bot bewertet jeden Kauf mit Probekämpfen und spielt damit vermutlich deutlich stärker als ein Mensch. Ob die Stunden zu leicht sind, sollen echte Spieltests zeigen.
- Echokammer: 20 % Wirkung (+10 % je Stufe) statt 25 %.

## Ergebnis (200 Runs)

| Kennzahl | Seed 1 | Seed 2 |
|---|---|---|
| Mitternacht | 28 % | 33 % |
| Kämpfe nach höchstens 5 Takten | 0 | 1 |
| Zufälliger Umbau spürbar schlechter | 43 % | 48 % |
| Alchemie / Glocke / Uhrwerk / Wehr | 101 / 84 / 133 / 82 % | 101 / 94 / 125 / 81 % |
| Echokammer genommen | 82 % | 79 % |

## Offen

- Die Echokammer bleibt beliebt, weil sie billig ist, nur ein Feld braucht und jede Lücke füllt. Ideen für später: Echo nur auf Räume derselben Zunft oder ein Rezept, das Echokammern bindet.
- Das Uhrwerk liegt um 130 %, unter der Warnschwelle der nächtlichen Simulation (140 %).
