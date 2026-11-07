# 0009: Nachbar-Wirkungen laufen über Kanten

Datum: 2026-11-07 · Status: Angenommen (Cockpit q15), ersetzt den Punkt „Nachbarn“ aus ADR 0008 für Wirkungen, die vorher „der Raum davor auf dem Funkenweg“ hießen

## Kontext

ADR 0008 hat zwei Arten von Nachbarschaft eingeführt: Auren wirken auf Räume mit gemeinsamer Kante, Wirkungen aus dem alten Spaltenturm („der Raum darunter“) auf den Raum davor auf dem Funkenweg. Im Raster sieht man Kanten sofort, den Funkenweg muss man im Kopf nachlaufen. Spieler würden die beiden Regeln verwechseln.

## Entscheidung

- Im Raster gibt es nur noch eine Nachbarschaft: Räume, die sich eine Kante teilen.
- **Echokammer:** löst alle angrenzenden Räume erneut aus, mit 25 % Wirkung (+10 % je Stufe).
- **Zeitschleife:** löst alle angrenzenden Räume einmal erneut aus, mit 50 % Wirkung (+15 % je Stufe).
- **Echo-Wirkungen überspringen Glocken und Glockenseile** (`skipTags`). Ein Glockenzähler springt auch bei geringer Wirkung voll weiter. Mehrere Echokammern zwischen Glocken und Seilen erzeugten deshalb Ketten von Glockenschlägen (3 Blowouts in 200 Runs).
- **Salamanderhorst:** doppelter Brand, wenn ein Nachbar ein Feuer-Raum ist.
- **Kupfer:** löst im Raster alle Nachbarn mit halber Wirkung aus.
- Die Quecksilberhemmung bleibt beim Funkenweg („der nächste Raum braucht 1 Takt weniger“), weil sie das Tempo des Funkens betrifft, nicht einen Nachbarn.
- Der alte Spaltenturm rechnet unverändert (Golden-Vektoren der Spalte gleich).

## Folgen

- Die Engine fragt Nachbar-Wirkungen über `adjacent()` ab (Labor und Port), `retrigger` kennt `skipTags`.
- Messung: `docs/balance/2026-11-07-nachbarn.md`.
