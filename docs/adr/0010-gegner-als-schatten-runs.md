# 0010: Gegner sind Schatten-Runs

Datum: 2026-11-07 · Status: Angenommen (Cockpit q14)

## Kontext

Gegnertürme wurden bisher zufällig gebaut: 2 Felder plus eines je Stunde, Stufen, die schnell wachsen. Ab Stunde 5 stand fast jeder Raum auf Stufe IV. Ein Spieler mit vielen Räumen auf Stufe I und II sah drüben nur „IV“. Das wirkte unfair, auch wenn die Siegquoten stimmten. Später (M8) sollen Geister-Türme anderer Spieler die Gegner stellen.

## Entscheidung

- Ein Gegner ist ein Schatten-Run: ein eigener Run mit eigenem Seed, der von Stunde 1 bis zur Stunde des Kampfs nur die Werkstatt spielt, ohne Kämpfe und Vorzeichen. Laden, Preise, Einkommen, Reihen und Rezepte folgen denselben Regeln wie beim Spieler.
- Gespielt wird er vom **Baumeister**, einem Bot mit Faustregeln statt Probekämpfen. Er wählt zuerst Rezepte, dann Aufwertungen, dann Räume der eigenen Hauptzunft neben Räumen derselben Zunft. Passt nichts, würfelt er bis zu zweimal neu. Er gibt alles aus.
- Weil die Schatten-Runs kein Vorzeichen-Gold bekommen, erhalten sie 3 Gold je Stunde extra (`RASTER.rivalGold`, `RIVAL_GOLD`).
- Die Integrität bleibt wie bisher: Spieler-Integrität der Stunde mal Schwierigkeit des Vorzeichens.
- Labor (`generateRival` in `lab/src/raster/run.ts`) und Port (`UhrRasterRun.generate_rival`) rechnen gleich. Die Raster-Runs der Golden-Vektoren decken das ab.

## Folgen

- Gegnertürme sehen aus wie Spielertürme: gemischte Stufen, volle Reihen, Rezepte.
- Kosten: In GDScript braucht ein Gegner in Stunde 12 etwa 0,15 s (headless), einmal pro Kampf.
- Der Schritt zu Geister-Türmen (M8) ist klein: Ein Geist ersetzt den Schatten-Run.
- Messung: `docs/balance/2026-11-07-gegner-als-runs.md`.
