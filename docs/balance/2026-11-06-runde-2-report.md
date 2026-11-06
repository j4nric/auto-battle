# Simulationsbericht Uhrturm-Prototyp

Runs pro Bot: 300, Seed 1, leere Etage kostet 0.5 Tempo, fehlende Rezept-Teile im Shop 4× so häufig, Takt = 0.6 s.

## 1. Bots im Vergleich

| Bot | Ø Siege | Ø Stunden | Mitternacht | Ø Kampfdauer | Blowouts ≤ 5 Takte | Kämpfe im Zeitzerfall | Ø Etagen belegt |
|---|---|---|---|---|---|---|---|
| zufall | 0.9 | 5.0 | 0 % | 22.1 s | 0 % | 87 % | 7.9 |
| tüftler | 6.0 | 8.9 | 27 % | 17.9 s | 0 % | 54 % | 7.9 |
| ohne-reihenfolge | 4.9 | 8.1 | 20 % | 19.1 s | 0 % | 63 % | 7.7 |
| kompakt-5 | 4.9 | 8.1 | 13 % | 18.5 s | 0 % | 59 % | 5.0 |
| kodex | 5.9 | 8.9 | 22 % | 18.0 s | 0 % | 55 % | 7.9 |

## 2. Schwierigkeitskurve (Tüftler)

| Stunde | Kämpfe | Siegquote | davon Geister | Ø Dauer | Blowouts ≤ 5 Takte |
|---|---|---|---|---|---|
| 1 | 247 | 71 % | 0 % | 20.0 s | 0 % |
| 2 | 264 | 80 % | 0 % | 20.2 s | 0 % |
| 3 | 263 | 78 % | 0 % | 19.6 s | 0 % |
| 4 | 296 | 63 % | 0 % | 20.6 s | 0 % |
| 5 | 265 | 67 % | 46 % | 17.6 s | 0 % |
| 6 | 247 | 68 % | 50 % | 17.1 s | 0 % |
| 7 | 214 | 69 % | 50 % | 16.3 s | 1 % |
| 8 | 189 | 74 % | 49 % | 16.4 s | 0 % |
| 9 | 168 | 70 % | 54 % | 15.2 s | 0 % |
| 10 | 143 | 73 % | 51 % | 15.2 s | 2 % |
| 11 | 125 | 74 % | 42 % | 15.1 s | 1 % |
| 12 | 116 | 69 % | 46 % | 16.1 s | 0 % |

## 3. Räume in End-Türmen (Tüftler)

Aufnahmequote = Anteil der Runs, in denen die Zunft aktiv war und der Raum im End-Turm steht. Beitrag = gewichteter Anteil an Schaden, Status, Schild und Heilung pro Kampf, in dem der Raum steckt. Mitternacht-Quote gesamt: 27 %.

| Raum | Zunft | Höhe | Aufnahme | Mitternacht mit Raum | Ø Beitrag |
|---|---|---|---|---|---|
| Zeitschleife (Verschmelzung) | Uhrwerk | 2 | 77 % | 36 % (n=170) | 0 % |
| Schmiede | Wehr | 1 | 48 % | 30 % (n=105) | 1 % |
| Quecksilberhemmung | Uhrwerk | 1 | 44 % | 35 % (n=97) | 3 % |
| Höllenküche (Verschmelzung) | Alchemie | 2 | 41 % | 18 % (n=96) | 62 % |
| Rostkammer | Alchemie | 1 | 27 % | 38 % (n=63) | 0 % |
| Große Glocke | Glocken | 2 | 26 % | 34 % (n=59) | 73 % |
| Kleine Glocke | Glocken | 1 | 24 % | 36 % (n=53) | 31 % |
| Salamanderhorst | Alchemie | 2 | 23 % | 24 % (n=55) | 46 % |
| Lazarett | Wehr | 2 | 23 % | 14 % (n=50) | 27 % |
| Zahnradgetriebe | Uhrwerk | 1 | 23 % | 44 % (n=50) | 0 % |
| Ballista | Wehr | 3 | 21 % | 37 % (n=46) | 81 % |
| Waffenkammer | Wehr | 1 | 21 % | 18 % (n=45) | 22 % |
| Glockenseil | Glocken | 1 | 20 % | 39 % (n=44) | 0 % |
| Katalysator | Alchemie | 1 | 19 % | 14 % (n=44) | 3 % |
| Echokammer | Uhrwerk | 1 | 19 % | 27 % (n=41) | 0 % |
| Bollwerk | Wehr | 2 | 18 % | 15 % (n=39) | 32 % |
| Destille | Alchemie | 2 | 18 % | 12 % (n=42) | 39 % |
| Doppelhemmung | Uhrwerk | 4 | 15 % | 24 % (n=33) | 1 % |
| Glockenspiel (Verschmelzung) | Glocken | 3 | 12 % | 33 % (n=27) | 69 % |
| Phiolenlager | Alchemie | 2 | 10 % | 43 % (n=23) | 53 % |
| Giftküche | Alchemie | 1 | 7 % | 6 % (n=16) | 23 % |
| Wachturm | Wehr | 2 | 5 % | 17 % (n=12) | 46 % |
| Aufzugfeder | Uhrwerk | 1 | 5 % | 33 % (n=12) | 54 % |
| Brennofen | Alchemie | 1 | 5 % | 25 % (n=12) | 13 % |
| Säurebad | Alchemie | 2 | 5 % | 0 % (n=11) | 31 % |
| Glockengießerei | Glocken | 3 | 4 % | 10 % (n=10) | 25 % |
| Läutwerk | Glocken | 1 | 3 % | 43 % (n=7) | 17 % |
| Pendelkammer | Uhrwerk | 2 | 2 % | 0 % (n=5) | 14 % |
| Resonanzraum | Glocken | 2 | 2 % | 20 % (n=5) | 16 % |
| Turmuhr | Glocken | 2 | 1 % | 33 % (n=3) | 41 % |
| Antriebswerk (Verschmelzung) | Uhrwerk | 3 | 1 % | 50 % (n=2) | 95 % |
| Unruh | Uhrwerk | 2 | 0 % | – | 33 % |

## 4. Zunft-Kombinationen (Tüftler)

| Aktive Zünfte | Runs | Ø Siege | Mitternacht |
|---|---|---|---|
| Alchemie + Glocken + Uhrwerk | 81 | 7.1 | 37 % |
| Alchemie + Glocken + Wehr | 79 | 5.1 | 13 % |
| Alchemie + Uhrwerk + Wehr | 77 | 6.0 | 21 % |
| Glocken + Uhrwerk + Wehr | 63 | 5.7 | 38 % |

## 5. Verschmelzungen und Legierungen

| Verschmelzung | Rezept | gefunden Zufall | gefunden Tüftler | gefunden Kodex-Bot | Mitternacht Kodex-Bot mit Rezept |
|---|---|---|---|---|---|
| Glockenspiel | Glockenseil unter Kleine Glocke unter Große Glocke | 0 % | 10 % | 15 % | 32 % (n=44) |
| Antriebswerk | Zahnradgetriebe unter Aufzugfeder unter Unruh | 0 % | 1 % | 5 % | 75 % (n=12) |
| Höllenküche | Brennofen unter Giftküche | 6 % | 41 % | 40 % | 13 % (n=82) |
| Zeitschleife | Quecksilberhemmung unter Echokammer | 3 % | 60 % | 57 % | 31 % (n=158) |

Variante: Wie stark ruft ein angefangenes Rezept das fehlende Teil in den Shop? (100 Runs je Wert)

| Gewicht fehlendes Rezept-Teil | Dreier-Rezept gefunden Tüftler | Dreier-Rezept gefunden Kodex-Bot | Mitternacht Kodex-Bot |
|---|---|---|---|
| 1× | 8 % | 16 % | 18 % |
| 4× | 9 % | 20 % | 11 % |
| 8× | 9 % | 24 % | 19 % |

| Legierung | Wirkung | Runs mit Legierung im End-Turm | Mitternacht |
|---|---|---|---|
| Gold | Löst zweimal aus | 96 | 57 % |
| Silber | Gibt bei Auslösung zusätzlich 3 Schild je Etage | 74 | 35 % |
| Quecksilber | Der Funke durchquert den Raum doppelt so schnell | 98 | 45 % |
| Kupfer | Löst auch den Raum darunter aus | 106 | 49 % |
| Rost | Doppelte Wirkung, verfällt nach 6 Auslösungen | 72 | 44 % |
| Glas | Dreifache Wirkung, zerbricht beim ersten Treffer auf die Integrität | 15 | 53 % |

## 6. Spielt die Reihenfolge eine Rolle?

Für 80 End-Türme des Tüftlers wurde die optimierte Reihenfolge mit je 5 zufälligen Umsortierungen verglichen (Bewertung: Testkämpfe Stunde 12, Bilanz −1 bis +1,5).

| Kennzahl | Wert |
|---|---|
| Ø Verlust an Kampfbilanz durch Umsortieren | 0.32 |
| Anteil Umsortierungen, die spürbar schlechter sind | 62 % |
| Mitternacht mit Reihenfolge-Optimierung | 27 % |
| Mitternacht ohne (neue Räume immer oben) | 20 % |

## 7. Tempo: kompakt gegen breit

| Belegte Etagen im End-Turm | Runs | Mitternacht |
|---|---|---|
| 3 | 1 | 0 % |
| 4 | 13 | 0 % |
| 5 | 286 | 14 % |
| 6 | 2 | 0 % |
| 7 | 30 | 27 % |
| 8 | 268 | 27 % |

Variante: Was kostet eine leere Etage den Funken? (100 Runs je Wert)

| Kosten leere Etage | Mitternacht Tüftler (8 Etagen) | Mitternacht kompakt-5 | Ø belegte Etagen Tüftler |
|---|---|---|---|
| 0 | 22 % | 25 % | 6.7 |
| 0.5 | 23 % | 11 % | 7.9 |
| 1 | 35 % | 12 % | 8.0 |

## 8. Vielfalt der Builds (Tüftler)

| Kennzahl | Wert |
|---|---|
| Verschiedene Raum-Kombinationen in End-Türmen | 249 von 300 |
| Turm dominiert von Alchemie | 28 % |
| Turm dominiert von Uhrwerk | 33 % |
| Turm dominiert von Wehr | 20 % |
| Turm dominiert von Glocken | 19 % |

Beispiel-Türme, die Mitternacht erreicht haben (von unten nach oben):

- Quecksilberhemmung²[kupfer] → Katalysator³ → Katalysator⁴ → Höllenküche³ → Zeitschleife²[silber]
- Zeitschleife³ → Bollwerk³[glas] → Schmiede⁴ → Ballista⁴[rost]
- Zeitschleife[kupfer] → Kleine Glocke²[silber] → Waffenkammer³ → Schmiede² → Glockenspiel³[quecksilber]
- Schmiede³[kupfer] → Ballista⁴[gold] → Zeitschleife²[quecksilber] → Quecksilberhemmung[gold]
- Zeitschleife[gold] → Quecksilberhemmung[kupfer] → Quecksilberhemmung → Phiolenlager → Salamanderhorst⁴[silber]
- Wachturm⁴[gold] → Wachturm[kupfer] → Waffenkammer → Waffenkammer → Rostkammer³ → Schmiede⁴
- Quecksilberhemmung → Bollwerk³[quecksilber] → Schmiede⁴[kupfer] → Ballista³[rost] → Zahnradgetriebe⁴[silber]
- Kleine Glocke⁴[rost] → Glockenseil[gold] → Zeitschleife[quecksilber] → Glockenseil → Große Glocke⁴[rost] → Zahnradgetriebe

_Laufzeit 91 s._
