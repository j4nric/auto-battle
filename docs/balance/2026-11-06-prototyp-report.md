# Simulationsbericht Uhrturm-Prototyp

Runs pro Bot: 300, Seed 1, leere Etage kostet 0.5 Tempo, fehlende Rezept-Teile im Shop 4× so häufig, Takt = 0.6 s.

## 1. Bots im Vergleich

| Bot | Ø Siege | Ø Stunden | Mitternacht | Ø Kampfdauer | Blowouts ≤ 5 Takte | Kämpfe im Zeitzerfall | Ø Etagen belegt |
|---|---|---|---|---|---|---|---|
| zufall | 1.3 | 5.4 | 0 % | 23.0 s | 0 % | 88 % | 8.0 |
| tüftler | 7.2 | 9.9 | 32 % | 16.5 s | 0 % | 37 % | 7.8 |
| ohne-reihenfolge | 6.8 | 9.6 | 26 % | 17.5 s | 0 % | 44 % | 7.5 |
| kompakt-5 | 7.1 | 9.7 | 26 % | 16.4 s | 0 % | 36 % | 4.9 |
| kodex | 7.3 | 9.9 | 34 % | 16.5 s | 0 % | 37 % | 7.8 |

## 2. Schwierigkeitskurve (Tüftler)

| Stunde | Kämpfe | Siegquote | davon Geister | Ø Dauer | Blowouts ≤ 5 Takte |
|---|---|---|---|---|---|
| 1 | 254 | 70 % | 0 % | 22.4 s | 0 % |
| 2 | 283 | 84 % | 0 % | 20.6 s | 0 % |
| 3 | 286 | 87 % | 0 % | 19.0 s | 0 % |
| 4 | 295 | 90 % | 0 % | 18.2 s | 0 % |
| 5 | 289 | 73 % | 48 % | 15.1 s | 0 % |
| 6 | 276 | 75 % | 50 % | 15.1 s | 0 % |
| 7 | 267 | 67 % | 52 % | 14.4 s | 0 % |
| 8 | 240 | 68 % | 52 % | 14.2 s | 0 % |
| 9 | 210 | 65 % | 51 % | 13.8 s | 0 % |
| 10 | 183 | 72 % | 55 % | 13.4 s | 0 % |
| 11 | 158 | 70 % | 53 % | 13.4 s | 0 % |
| 12 | 135 | 71 % | 53 % | 14.4 s | 0 % |

## 3. Räume in End-Türmen (Tüftler)

Aufnahmequote = Anteil der Runs, in denen die Zunft aktiv war und der Raum im End-Turm steht. Beitrag = gewichteter Anteil an Schaden, Status, Schild und Heilung pro Kampf, in dem der Raum steckt. Mitternacht-Quote gesamt: 32 %.

| Raum | Zunft | Höhe | Aufnahme | Mitternacht mit Raum | Ø Beitrag |
|---|---|---|---|---|---|
| Zeitschleife (Verschmelzung) | Uhrwerk | 2 | 68 % | 38 % (n=150) | 0 % |
| Schmiede | Wehr | 1 | 61 % | 32 % (n=133) | 1 % |
| Katalysator | Alchemie | 1 | 51 % | 34 % (n=122) | 2 % |
| Höllenküche (Verschmelzung) | Alchemie | 2 | 48 % | 35 % (n=114) | 67 % |
| Doppelhemmung | Uhrwerk | 3 | 39 % | 39 % (n=87) | 2 % |
| Salamanderhorst | Alchemie | 2 | 38 % | 37 % (n=89) | 53 % |
| Quecksilberhemmung | Uhrwerk | 1 | 35 % | 37 % (n=78) | 3 % |
| Rostkammer | Alchemie | 1 | 35 % | 49 % (n=82) | 0 % |
| Destille | Alchemie | 2 | 33 % | 28 % (n=79) | 45 % |
| Echokammer | Uhrwerk | 1 | 27 % | 25 % (n=59) | 0 % |
| Phiolenlager | Alchemie | 2 | 21 % | 43 % (n=49) | 51 % |
| Zahnradgetriebe | Uhrwerk | 1 | 15 % | 21 % (n=34) | 0 % |
| Aufzugfeder | Uhrwerk | 1 | 14 % | 34 % (n=32) | 62 % |
| Brennofen | Alchemie | 1 | 14 % | 38 % (n=34) | 13 % |
| Große Glocke | Glocken | 2 | 14 % | 13 % (n=31) | 68 % |
| Lazarett | Wehr | 2 | 11 % | 20 % (n=25) | 16 % |
| Glockenseil | Glocken | 1 | 11 % | 8 % (n=25) | 0 % |
| Bollwerk | Wehr | 2 | 10 % | 14 % (n=22) | 21 % |
| Kleine Glocke | Glocken | 1 | 9 % | 5 % (n=20) | 28 % |
| Unruh | Uhrwerk | 2 | 7 % | 33 % (n=15) | 81 % |
| Ballista | Wehr | 3 | 6 % | 8 % (n=13) | 74 % |
| Waffenkammer | Wehr | 1 | 5 % | 33 % (n=12) | 17 % |
| Glockenspiel (Verschmelzung) | Glocken | 3 | 5 % | 17 % (n=12) | 79 % |
| Pendelkammer | Uhrwerk | 2 | 5 % | 9 % (n=11) | 14 % |
| Wachturm | Wehr | 2 | 2 % | 20 % (n=5) | 49 % |
| Glockengießerei | Glocken | 3 | 2 % | 20 % (n=5) | 25 % |
| Läutwerk | Glocken | 1 | 2 % | 0 % (n=4) | 15 % |
| Säurebad | Alchemie | 2 | 2 % | 0 % (n=4) | 34 % |
| Giftküche | Alchemie | 1 | 1 % | 0 % (n=2) | 26 % |
| Resonanzraum | Glocken | 2 | 0 % | 0 % (n=1) | 24 % |
| Turmuhr | Glocken | 2 | 0 % | 0 % (n=1) | 36 % |
| Antriebswerk (Verschmelzung) | Uhrwerk | 3 | 0 % | – | 0 % |

## 4. Zunft-Kombinationen (Tüftler)

| Aktive Zünfte | Runs | Ø Siege | Mitternacht |
|---|---|---|---|
| Alchemie + Glocken + Uhrwerk | 81 | 8.3 | 41 % |
| Alchemie + Glocken + Wehr | 79 | 7.1 | 24 % |
| Alchemie + Uhrwerk + Wehr | 77 | 8.1 | 47 % |
| Glocken + Uhrwerk + Wehr | 63 | 5.0 | 13 % |

## 5. Verschmelzungen und Legierungen

| Verschmelzung | Rezept | gefunden Zufall | gefunden Tüftler | gefunden Kodex-Bot | Mitternacht Kodex-Bot mit Rezept |
|---|---|---|---|---|---|
| Glockenspiel | Glockenseil unter Kleine Glocke unter Große Glocke | 0 % | 3 % | 8 % | 20 % (n=25) |
| Antriebswerk | Zahnradgetriebe unter Aufzugfeder unter Unruh | 0 % | 0 % | 4 % | 54 % (n=13) |
| Höllenküche | Brennofen unter Giftküche | 2 % | 50 % | 49 % | 31 % (n=113) |
| Zeitschleife | Quecksilberhemmung unter Echokammer | 3 % | 37 % | 37 % | 42 % (n=143) |

Variante: Wie stark ruft ein angefangenes Rezept das fehlende Teil in den Shop? (100 Runs je Wert)

| Gewicht fehlendes Rezept-Teil | Dreier-Rezept gefunden Tüftler | Dreier-Rezept gefunden Kodex-Bot | Mitternacht Kodex-Bot |
|---|---|---|---|
| 1× | 1 % | 6 % | 15 % |
| 4× | 4 % | 13 % | 33 % |
| 8× | 7 % | 16 % | 22 % |

| Legierung | Wirkung | Runs mit Legierung im End-Turm | Mitternacht |
|---|---|---|---|
| Gold | Löst zweimal aus | 130 | 48 % |
| Silber | Gibt bei Auslösung zusätzlich 3 Schild je Etage | 121 | 36 % |
| Quecksilber | Der Funke durchquert den Raum doppelt so schnell | 114 | 46 % |
| Kupfer | Löst auch den Raum darunter aus | 138 | 46 % |
| Rost | Doppelte Wirkung, verfällt nach 6 Auslösungen | 109 | 43 % |
| Glas | Dreifache Wirkung, zerbricht beim ersten Treffer auf die Integrität | 26 | 38 % |

## 6. Spielt die Reihenfolge eine Rolle?

Für 80 End-Türme des Tüftlers wurde die optimierte Reihenfolge mit je 5 zufälligen Umsortierungen verglichen (Bewertung: Testkämpfe Stunde 12, Bilanz −1 bis +1,5).

| Kennzahl | Wert |
|---|---|
| Ø Verlust an Kampfbilanz durch Umsortieren | 0.36 |
| Anteil Umsortierungen, die spürbar schlechter sind | 83 % |
| Mitternacht mit Reihenfolge-Optimierung | 32 % |
| Mitternacht ohne (neue Räume immer oben) | 26 % |

## 7. Tempo: kompakt gegen breit

| Belegte Etagen im End-Turm | Runs | Mitternacht |
|---|---|---|
| 4 | 21 | 29 % |
| 5 | 280 | 26 % |
| 6 | 1 | 0 % |
| 7 | 41 | 22 % |
| 8 | 257 | 34 % |

Variante: Was kostet eine leere Etage den Funken? (100 Runs je Wert)

| Kosten leere Etage | Mitternacht Tüftler (8 Etagen) | Mitternacht kompakt-5 | Ø belegte Etagen Tüftler |
|---|---|---|---|
| 0 | 30 % | 38 % | 7.0 |
| 0.5 | 27 % | 25 % | 7.9 |
| 1 | 29 % | 26 % | 7.9 |

## 8. Vielfalt der Builds (Tüftler)

| Kennzahl | Wert |
|---|---|
| Verschiedene Raum-Kombinationen in End-Türmen | 256 von 300 |
| Turm dominiert von Alchemie | 50 % |
| Turm dominiert von Uhrwerk | 38 % |
| Turm dominiert von Glocken | 8 % |
| Turm dominiert von Wehr | 4 % |

Beispiel-Türme, die Mitternacht erreicht haben (von unten nach oben):

- Brennofen⁴[rost] → Zeitschleife[kupfer] → Phiolenlager[gold] → Zeitschleife → Schmiede⁴
- Zeitschleife²[gold] → Unruh³[kupfer] → Echokammer[quecksilber] → Doppelhemmung²[silber]
- Glockenseil[silber] → Glockenseil[gold] → Zeitschleife²[quecksilber] → Schmiede³ → Große Glocke⁴[rost] → Zahnradgetriebe²
- Rostkammer[gold] → Doppelhemmung²[quecksilber] → Schmiede²[gold] → Höllenküche⁴[rost] → Zahnradgetriebe²
- Zeitschleife²[gold] → Quecksilberhemmung² → Quecksilberhemmung² → Quecksilberhemmung³ → Zahnradgetriebe⁴ → Höllenküche[gold]
- Salamanderhorst⁴[rost] → Katalysator³[kupfer] → Rostkammer³ → Bollwerk²[rost] → Schmiede²[kupfer]
- Salamanderhorst³[rost] → Katalysator⁴[kupfer] → Quecksilberhemmung² → Rostkammer²[silber] → Schmiede³[kupfer] → Höllenküche[silber]
- Glockenseil²[gold] → Glockenseil[kupfer] → Kleine Glocke⁴ → Schmiede⁴ → Große Glocke⁴[silber] → Große Glocke³

_Laufzeit 143 s._
