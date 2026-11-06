# 0002: Godot als Spiel-Engine, Web als Testkanal

Datum: 2026-11-06 · Status: Angenommen

## Kontext

Das Spiel soll aufwendige Animationen erlauben und später in die App-Stores. Getestet wird während der Entwicklung im Browser auf dem Handy. Im Skat-Projekt wurde Godot verworfen, weil es in der Cloud-Umgebung nicht installiert war und Claude Oberflächen nicht prüfen konnte (dort ADR 0009).

## Entscheidung

- Godot 4.7 mit GDScript und Compatibility-Renderer.
- Der Web-Export (single-threaded, ohne GDExtensions) ist der Testkanal auf dem vServer. Die Veröffentlichung läuft später über die Stores.
- Ein SessionStart-Hook installiert Godot in jeder Cloud-Session (`scripts/hooks/session-start.sh`). So kann Claude Godot-Tests ausführen, fürs Web exportieren und im emulierten Handy-Browser prüfen.

Vom Nutzer entschieden am 06.11.2026.

## Alternativen

- Web-Stack mit Svelte und PixiJS: besser im Handy-Browser, aber Animationen über mehrere Werkzeuge statt in einem Editor.
- C#: schneller, lässt sich mit Godot 4 aber nicht fürs Web exportieren.
- Rust als GDExtension: im Web-Export experimentell.

## Folgen

- Gemessen in der Cloud: Export headless möglich, WASM komprimiert etwa 10 MB, Start im emulierten Handy-Browser funktioniert.
- Safari hat laut Godot-Doku WebGL-Eigenheiten. iPhones sind deshalb ein Kompromiss im Testkanal, nicht im späteren Store-Build.
- GDScript ist für Simulationen etwa 120-mal langsamer als Node. Daraus folgt ADR 0003.
