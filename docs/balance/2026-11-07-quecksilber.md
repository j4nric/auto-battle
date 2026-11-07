# Quecksilber-Ketten unterbunden

Neue Regel: Betritt der Funke einen Raum mit Rabatt, gibt dieser Raum keinen Rabatt weiter.
Eine einzelne Quecksilberhemmung macht den nächsten Raum weiterhin einen Takt billiger, eine Kette
aus Quecksilberhemmungen löst aber nicht mehr alle Räume im selben Takt aus (vorher bis zu 8 pro
Takt, jetzt höchstens 2). Gilt für Spalte und Raster, beide Interpreter, Golden-Fall
`hazard:quecksilber-chain`.

Messung mit `npm run sim:quick -- --runs 400` (Seed 1 und 2) und `npm run sim:raster -- --runs 150`:

| Kennzahl | vorher | nachher |
|---|---|---|
| Spalte: Etagen-Anteil Uhrwerk | 134 % | 126 % |
| Spalte: Mitternacht Tüftler (Seed 1 / 2) | 22 / 24 % | 24 / 22 % |
| Raster: Etagen-Anteil Uhrwerk | 140 % | 111 % |
| Raster: Etagen-Anteil Glocken / Wehr | 70 / 69 % | 81 / 76 % |
| Raster: Mitternacht Tüftler | 20 % | 25 % |
| Raster: Quecksilberhemmung in End-Türmen | 78 % | 71 % |
| Kämpfe nach höchstens 5 Takten | 0 | 0 |
