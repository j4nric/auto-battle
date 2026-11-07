# Raster-Balance (M5)

Grundlage: [Simulationsbericht](2026-11-07-raster-balance-report.md), je 200 Runs auf Seed 1 und 2,
`npm run sim:raster`. Ausgangslage: alle 32 Räume im Raster mit den Werten des Spaltenturms
([Bericht](2026-11-07-raster-alle-raeume-report.md)). Ab hier hat das Raster eigene Werte.

## Änderungen

| Raum | vorher | nachher | Warum |
|---|---|---|---|
| Zahnradgetriebe | alle Nachbarn +25 % | +15 % | Im Raster hat ein Raum bis zu vier Nachbarn statt zwei. |
| Schmiede | Räume direkt darüber +50 % (+25 % je Stufe) | angrenzende Waffen-Räume +40 % (+20 % je Stufe) | Kaum gebaut (12 %). Jetzt Herz der Wehr. Mit +60 % gab es Blowouts (zwei Schmieden an einer Ballista IV). |
| Waffenkammer | Schaden 18 | 22 | Wehr zu schwach (56–60 %). |
| Wachturm | 10 + 10 je Waffe | 14 + 12 je Waffe | dito, kaum gebaut (9 %). |
| Turmuhr | L-Form, 3 Felder, 8 + 10 je Glocke | 1×2, 2 Felder, 12 + 16 je Glocke | Fast nie gebaut (1 %). In der Spalte war sie 2 Etagen hoch. |
| Pendelkammer | Öl 2 (+1 je Stufe) | Öl 1 (+1 je Stufe) | Uhrwerk zu stark, Pendel in 61 % der Türme. |

Verworfen: Rostkammer mit Rost 1 statt 2. Senkte Mitternacht auf 16 bis 20 %.

## Ergebnis

| Kennzahl | vorher | nachher |
|---|---|---|
| Etagen-Anteil Alchemie | 109–124 % | 109–119 % |
| Etagen-Anteil Uhrwerk | 137–147 % | 120–122 % |
| Etagen-Anteil Glocken | 75–89 % | 85–101 % |
| Etagen-Anteil Wehr | 56–60 % | 70–74 % |
| Mitternacht Tüftler | 22–28 % | 18–22 % |
| Kämpfe ≤ 5 Takte (400 Runs) | 0 | 1 |
| Schmiede / Wachturm / Turmuhr gebaut | 12 / 9 / 1 % | 22 / 23 / 15 % |

## Offen

- Mitternacht liegt etwas unter dem Spaltenturm (27 %). Beobachten, wenn Menschen spielen.
- Die Rostkammer steht in gut 80 % der Türme mit Alchemie: billig, ein Feld, bremst den Gegner.
- Säurebad (7 %) und Antriebswerk (Dreier-Rezept, selten gefunden) bleiben Randfiguren.
