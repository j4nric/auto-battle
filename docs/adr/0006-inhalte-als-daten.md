# 0006: Inhalte als Daten mit Effekt-Bausteinen

Datum: 2026-11-06 · Status: Angenommen

## Kontext

Nach ADR 0003 existieren die Regeln zweimal, im Labor und im Spiel. Waren die Effekte der Räume Funktionen, müsste jeder neue Raum zweimal programmiert werden. Das ist fehleranfällig und skaliert schlecht mit wachsendem Inhalt.

## Entscheidung

- Räume, Verschmelzungen und Legierungen stehen in `game/data/content.json`. Labor und Spiel lesen dieselbe Datei.
- Effekte sind eine Liste von Bausteinen (Ops) mit Werten aus Termen. Format: `docs/content-format.md`.
- Nur der Interpreter existiert zweimal: `lab/src/engine/combat.ts` und `game/core/combat.gd`.
- Die Datei liegt im Godot-Projekt, damit sie im Web-Export enthalten ist.
- Das Labor ist jetzt TypeScript. Node führt es ohne Build-Schritt aus, der Viewer-Server entfernt die Typen beim Ausliefern. `tsc` prüft die Typen in der CI.

## Alternativen

- Effekte als Code in beiden Sprachen: jeder Raum doppelt.
- Effekte als Code nur im Spiel: dann gibt es keine schnelle Simulation (ADR 0003).
- Inhalt in einem eigenen Ordner neben `game/`: müsste vor jedem Export kopiert werden.

## Folgen

- Ein neuer Raum aus bekannten Bausteinen ist eine reine Datenänderung.
- Eine neue Op oder ein neuer Term ist eine Regeländerung in beiden Interpretern, mit neuen Golden-Vektoren.
- Gemessen beim Port: alle 200 Kampf-Vektoren und 60 Verschmelzungsfälle stimmen auf Anhieb bitgenau. Eine Abweichung von 0,001 im Tempo fällt sofort auf.
