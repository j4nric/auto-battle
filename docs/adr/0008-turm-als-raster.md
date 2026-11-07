# 0008: Der Turm wird ein Raster, drei Felder breit

Datum: 2026-11-07 · Status: Angenommen, umgesetzt in M5 (seit 07.11.2026 das Hauptspiel)

## Kontext

Bisher ist der Turm eine Spalte: Räume sind 1 bis 3 Etagen hoch, der Funke läuft von unten nach oben. Jan möchte mehr Build-Potenzial durch Formen, die man wie bei Tetris in einen breiteren Turm setzt, und den Turm jederzeit umbauen können. Die Designfragen dazu sind im Cockpit beantwortet (q07 bis q12, 07.11.2026).

## Entscheidung

- **Raster:** Der Turm ist 3 Felder breit und wächst mit dem Run: 3 Reihen in Stunde 1 und 2, danach alle zwei Stunden eine Reihe mehr bis 3×8 ab Stunde 11.
- **Funkenweg Schlange:** Ein Funke läuft Reihe für Reihe von unten nach oben, in der untersten Reihe von links nach rechts, in der nächsten von rechts nach links und so weiter. Am Ende springt er zurück zum Fundament (eine Runde).
- **Tempo:** Ein Raumfeld kostet 1 Tempo, ein leeres Feld 0,5. Der Funke gewinnt pro Takt so viel Tempo, wie der Turm breit ist, also etwa eine Reihe pro Takt. Eine Runde dauert damit ungefähr so lange wie im alten 8-Etagen-Turm.
- **Auslösen:** Ein Raum löst einmal pro Runde aus, sobald der Funke sein erstes zusammenhängendes Stück Felder durchlaufen hat. Weitere Felder desselben Raums kosten nur Tempo.
- **Nachbarn:** Räume, die sich eine Kante teilen, sind Nachbarn. „Darüber“ heißt: ein Feld liegt direkt über einem Feld des anderen Raums. Aus „der Raum darunter“ wird „der Raum davor auf dem Funkenweg“.
- **Formen:** Rechtecke und einige L-Formen. Drehen ist erlaubt. Der Preis richtet sich nach der Zahl der Felder (3 Gold je Feld und Stufe), so wie bisher nach der Höhe.
- **Rezepte als Muster:** Zum Start zwei Muster aus zwei Einzelfeldern übereinander, die zu einem 1×2-Raum verschmelzen.
- **Umbauen:** außerhalb des Kampfs jederzeit und kostenlos (Werkstatt und Vorzeichen-Wahl).
- **Kampfansicht:** beide Türme nebeneinander, Räume nur als Symbole mit Gildenfarbe und einer Kennzahl.
- **Eine Engine für beide Formen:** Die Kampf-Engine liest Weg, Nachbarn und Vorgänger aus einem Layout. Die alte Spalte ist der Sonderfall mit Breite 1 und rechnet bitgenau wie vorher (Golden-Vektoren unverändert).

## Folgen

- Raum-Effekte bleiben Daten (ADR 0006). Prototyp-Inhalte stehen in `game/data/raster.json`: 16 Räume mit Formen und 2 Muster-Rezepte. Die übrigen Räume folgen, wenn das Spiel umgestellt ist.
- Das Labor ist die Referenz (ADR 0003): `lab/src/raster/` mit Turm, Run und Bot, `npm run sim:raster` misst den Prototyp.
- Für das Spiel braucht es den Port nach `game/core/`, neue Golden-Fälle für Raster-Kämpfe und Raster-Runs, eine neue Werkstatt mit Drehen und Platzieren und eine neue Kampfansicht. Das ist M5. Juice rückt dahinter, weil jede Animation vom Turm abhängt.
- Spielstände aus dem Spaltenturm lassen sich nach der Umstellung nicht mehr fortsetzen.
- Messung des Prototyps: `docs/balance/2026-11-07-raster-prototyp.md`.
