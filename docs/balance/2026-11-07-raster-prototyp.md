# Raster-Prototyp (ADR 0008)

Grundlage: [Simulationsbericht](2026-11-07-raster-prototyp-report.md), 150 Runs des Tüftlers, Seed 1.
Neu erzeugen mit `cd lab && npm run sim:raster -- --runs 150`. Zum Vergleich der Spaltenturm aus
[Runde 2](2026-11-06-runde-2.md).

## Antworten

| Frage | Raster | Spalte (Runde 2) |
|---|---|---|
| Zählt die Anordnung? | Ja. 59 % der zufälligen Umbauten fertiger Türme sind spürbar schlechter, Ø Verlust 0,37 | 83 %, Ø Verlust 0,36 |
| Sind Türme verschieden? | 150 von 150 verschiedene Raum-Kombinationen, alle Anordnungen verschieden | 256 von 300 |
| Endlos-Kombos? | Keine Kämpfe unter 6 Takten | keine |
| Kampfdauer | Ø 15,2 s | Ø 17,9 s |
| Mitternacht Tüftler | 20 % | 27 % |
| Ist der Platz knapp? | In den Stunden 3 bis 10 sind 74 bis 86 % der Felder belegt, am Ende 70 % | – |
| Rechenzeit | 0,13 s pro Run | ähnlich |

## Was eingestellt wurde

- **Tempo:** Der Funke gewinnt pro Takt Tempo in Höhe der Breite. Ohne das dauert eine Runde
  durch 24 Felder dreimal so lange, und jeder Raum löst nur ein- bis zweimal pro Kampf aus.
- **Integrität × 2** gegenüber der Spalte. Mit × 1 dauerten Kämpfe 10 s und es gab 11 Kämpfe
  unter 6 Takten, mit × 2,5 lief ein Drittel der Kämpfe in den Zeitzerfall.
- **Rivalen** bekommen dasselbe Budget wie in der Spalte (2 + Stunde Felder). Mit „anteilig am
  Raster“ waren die Stunden 3 bis 5 mit 23 bis 35 % Siegen viel zu schwer.

## Befunde

- **Uhrwerk dominiert** (Etagen-Anteil 140 %). Echokammer und Quecksilberhemmung stehen in
  rund 80 % der Türme, weil „der Raum davor auf dem Funkenweg“ im Raster flexibel ist.
- **Quecksilber-Ketten:** Ein Turm mit neun Quecksilberhemmungen hat Mitternacht erreicht. Jede
  macht die nächste kostenlos. Derselbe Exploit wie in der Spalte, im Raster leichter zu bauen.
  Vorschlag: Ein Raum, der kostenlos war, gibt keinen Rabatt weiter. Das ist eine Regeländerung
  für beide Interpreter.
- **Schwache Formen:** Turmuhr (L-Form, 3 Felder) kommt in 2 % der Türme vor, die Schmiede in 15 %.
  Die Schmiede wirkt nur auf Räume direkt darüber. Im Raster wäre „alle Nachbarn“ stärker,
  aber dann gleicht sie dem Zahnrad.
- **Umbauen** bringt dem Bot wenig (20 % gegen 19 % Mitternacht), weil er schon beim Kaufen die
  beste Stelle wählt. Für Menschen ist Umbauen trotzdem wichtig, weil sie nicht jede Stelle
  durchprobieren.
- **Wachstum** überholt am Ende das Gold. Eine Reihe weniger (bis 3×7) oder mehr Gold in den
  späten Stunden würde den Platz knapper halten.

## Entscheidung

Der Prototyp trägt: Anordnung zählt, Türme sind verschieden, keine Endlos-Kombos, die Rechenzeit
reicht für Simulationen. Das Raster wird übernommen (ADR 0008). Nächster Schritt ist M5: Port nach
Godot, neue Werkstatt und Kampfansicht, danach alle Räume umstellen.
