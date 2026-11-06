# Uhrturm

Sequenzieller Auto Battler fürs Handy im Hochformat. Ein Funke läuft durch den Turm des Spielers und löst Raum für Raum aus, der Build ist der Loop. Inspiriert von The Bazaar und Loop Hero. Doku auf Deutsch, Code und Kommentare auf Englisch.

## Pflichtlektüre

- `docs/DESIGN.md`: Spielkonzept, Run-Struktur, Hochkant-UI. Bei Unsicherheit über eine Mechanik hier nachsehen, nicht raten.
- `docs/adr/`: Grundentscheidungen. Eine Grundentscheidung ändern heißt ein neues ADR schreiben.
- `docs/balance/`: Messungen. Die jüngste Messung ist der Stand.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `lab/` | Labor in TypeScript: Kampf-Engine, Run-Logik, Bots, Simulation, Browser-Viewer. Die Referenz für alle Regeln. |
| `game/` | Godot-4.7-Projekt. `game/core/` ist der Port der Regeln, `game/scenes/` und `game/scripts/` die Oberfläche. |
| `game/data/content.json` | Alle Räume, Verschmelzungen und Legierungen. Labor und Spiel lesen diese Datei (ADR 0006, `docs/content-format.md`). |
| `tests/golden/` | Golden-Vektoren aus dem Labor. Das Spiel muss sie exakt treffen. |
| `deploy/` | Container und Caddyfile für den vServer. |
| `scripts/` | Godot-Installation, Web-Build, Hooks. |

## Befehle

```sh
cd lab && npm ci                    # einmalig: TypeScript für die Typprüfung
cd lab && npm test                  # Labor-Tests
cd lab && npm run typecheck         # Typprüfung mit tsc
cd lab && npm run golden            # Golden-Vektoren neu erzeugen
cd lab && npm run sim:smoke         # schnelle Simulation mit Blowout- und Determinismus-Prüfung
cd lab && npm run sim -- --runs 300 # volle Simulation, Bericht in lab/sim/output/report.md
cd lab && npm run viewer            # Labor-Viewer: http://localhost:5173/lab/viewer/
cd lab && node tools/replay.ts UHR1.…  # Fehler-Code aus dem Spiel nachspielen
./scripts/install-godot.sh          # Godot 4.7.2 nach ~/.local/bin/godot
godot --headless --path game --script res://tests/run_tests.gd   # Godot-Tests
./scripts/build-web.sh              # Web-Export nach build/web/
```

## Architekturregeln

- Das Labor ist die Referenz. Eine Regel entsteht dort, wird getestet und gemessen und erst dann nach `game/core/` portiert (ADR 0003).
- Alles in der Spiellogik ist deterministisch. Zufall nur über den seedbaren RNG (`lab/src/rng.js`, `game/core/rng.gd`). Keine Systemzeit, kein `Math.random`, kein `randi()`.
- Keine Rechenoperationen, die zwischen JavaScript und GDScript abweichen können: keine Potenzen, Logarithmen oder Exponentialfunktionen in der Spiellogik. Kurven als Tabellen.
- Golden-Vektoren speichern Kommazahlen als exakte Ganzzahlen, weil JSON-Parser die letzten Bits unterschiedlich lesen.
- Gleitkomma-Ausdrücke haben in Labor und Port dieselbe Reihenfolge der Operationen. Runden immer mit `floor(x + 0.5)`.
- Neue Räume aus bekannten Bausteinen sind reine Datenänderungen. Neue Ops oder Terme ändern beide Interpreter und brauchen einen Golden-Fall.
- Ein Run ist Seed plus Aktionsfolge (ADR 0007). Spieler, Bots und Oberfläche ändern ihn nur über `act()` und ziehen nie Zufall aus `run.rng`.
- `game/core/` kennt keine Nodes und keine Zeit. Die Oberfläche zeigt an und leitet Eingaben weiter, sie rechnet keine Regeln.
- Nichts darf den Web-Export brechen: keine Threads, keine GDExtensions, kein C# (ADR 0002).
- Jede Mechanik wird in der Simulation gemessen, bevor sie in die Oberfläche kommt.
- Oberflächenänderungen werden vor dem Merge im emulierten Handy-Browser geprüft (Agent `playtest`).

## Git-Workflow

- `main` ist der Standard-Branch und wird nie direkt beschrieben. Jede Änderung läuft über einen Branch und einen PR gegen `main` (ADR 0005).
- Claude erstellt den PR und mergt ihn selbst per Squash, sobald die CI grün ist. Der Nutzer liest mit.
- Jeder Push auf `main` deployt auf den vServer: https://uhrturm-62-83-23-90.sslip.io (ADR 0004, `deploy/README.md`).
- Kleine Commits, Nachrichten auf Englisch. Tests gehören in denselben Commit wie das Feature.
- Der Commit-Hook blockiert Commits, solange Labor- oder Godot-Tests rot sind.
- Agenten in `.claude/agents/`: Regeln und Simulation an `lab-dev`, Spiel und Oberfläche an `godot-dev`, Zahlen an `balance`, Inhalte an `content`, Prüfung auf dem Handy an `playtest`.

## Autonomie

- Claude entscheidet alles innerhalb des Design-Dokuments selbst und dokumentiert es im Cockpit-Verlauf.
- Gefragt wird nur, wenn eine Grundentscheidung aus einem ADR kippen müsste oder eine Designfrage offen ist. Die Frage kommt ins Cockpit, die Arbeit geht an anderer Stelle weiter.

## Cockpit (Artefakt)

Der Nutzer verfolgt die Entwicklung mobil über das Cockpit: https://claude.ai/artifact/NLLit2ZxYBEUZgYWUtR1JT

Es ist eine Seite mit Datenbank (`ArtifactData`). Pflicht nach jedem Arbeitsschritt:

- **Zu Beginn jeder Session**: `questions` mit `status == answered` und `claudeAck != true` lesen, umsetzen, dann `claudeAck: true` setzen. Ebenso `ideas` mit neuer `vote` und `claudeAck == false`.
- **Spieltest-Notizen**: `playtests` mit `claudeAck != true` lesen (`ts`, `text`, `build`). Daraus Aufgaben machen, dann `claudeAck: true` und eine kurze `reply` setzen. Ist es umgesetzt, `status: done` und die Antwort ergänzen.
- **Läuft gerade**: `tasks` mit `title`, `status` (running | blocked | done), `startedAt`, `updatedAt`, `note`, `steps` (`label`, `done`) aktuell halten.
- **Verlauf**: Eintrag in `log` (`ts`, `kind`: commit | pr | merge | deploy | decision | note, `title`, `body`, optional `url`). Ids sortierbar: `JJJJMMTT-HHMM-stichwort`.
- **Meilensteine**: `milestones/M0..M8` mit `status` (done | active | planned) und kurzer `note`.
- **Fragen**: Entscheidungen des Nutzers als Dokument in `questions` (`order`, `area`, `title`, `context`, `recommendation`, `options`, `status: open`). Nicht im Chat fragen, wenn es im Cockpit beantwortet werden kann.
- **Raum-Wiki**: Nach jeder Änderung an `content.json` `node lab/tools/wiki.ts` laufen lassen und die Dateien aus `lab/sim/output/wiki/rooms/` in `rooms` schreiben. Notizen in `roomNotes` (`room`, `text`, `ts`) mit `claudeAck != true` wie Spieltest-Notizen behandeln.
- **Simulation**: Jede aussagekräftige Messung als Dokument in `sims` (`ts`, `area`, `title`, `summary`, `columns`, `rows`, optional `note`, `cmd`, `url`). Zahlen als Text mit deutschem Komma.
- **meta/project**: `branch`, `lastCommit`, `openPr`, `serverUrl`, `serverLive`, `build`, `updatedAt` nach jedem Merge und Deploy aktualisieren.
- Agenten haben keinen Cockpit-Zugriff. Claude überträgt ihre Ergebnisse.
