---
name: playtest
description: Spiel fürs Web exportieren und im emulierten Handy-Browser prüfen. Liefert Screenshots. Aufruf ohne Argumente oder mit einer Szene, z. B. /playtest kampf.
---

1. `./scripts/build-web.sh`
2. `build/web` auf einem freien Port ausliefern und mit Playwright (Gerät `Pixel 7`, Chromium mit `--use-angle=swiftshader --enable-unsafe-swiftshader`) öffnen, 12 s warten.
3. Screenshot mit `deviceScaleFactor` des Geräts in den Scratchpad, bei Bedarf weitere nach Klicks auf Koordinaten (Bezugsgröße 390 × 844). Fokus: `$ARGUMENTS`
4. Konsolenfehler und Auffälligkeiten auflisten, Screenshot zeigen.
5. Server wieder beenden.
