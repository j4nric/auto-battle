# 0003: Regeln zweimal, Labor als Referenz, Golden-Vektoren als Vertrag

Datum: 2026-11-06 · Status: Angenommen

## Kontext

Balancing braucht tausende simulierte Runs. Derselbe Kampf-Workload braucht in GDScript 14,2 s, in Node 0,12 s. Die volle Simulation würde in GDScript Stunden statt Minuten dauern.

## Entscheidung

- Die Regeln existieren zweimal: im Labor (`lab/`, JavaScript, später TypeScript) und im Spiel (`game/core/`, GDScript).
- Das Labor ist die Referenz. Regeln entstehen dort, werden getestet, gemessen und dann portiert.
- Golden-Vektoren in `tests/golden/` sind der Vertrag. Das Labor erzeugt sie, das Spiel muss sie exakt treffen. Die CI prüft beides: Vektoren aktuell und Godot-Tests grün.
- Ab M1 sind Inhalte gemeinsame Daten, damit nur der Regel-Interpreter doppelt existiert.
- Kommazahlen stehen in den Vektoren als exakte Ganzzahlen. Godots JSON-Parser liest Dezimalbrüche in den letzten Bits anders als JavaScript (gemessen beim RNG-Port).

Vom Nutzer entschieden über das Cockpit am 06.11.2026.

## Alternativen

- Alles in GDScript: eine Codebasis, aber Balancing in Stunden statt Minuten.
- Alles in C#: schnell, aber ohne Web-Testkanal.

## Folgen

- Keine Rechenoperationen in der Spiellogik, die zwischen den Sprachen abweichen können.
- Die Doppelpflege trägt Claude. Jede Regeländerung umfasst Labor, Vektoren und Port.
- Erster Vertrag: `tests/golden/rng.json` für den Zufallsgenerator.
