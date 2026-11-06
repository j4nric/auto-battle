---
name: adr
description: Neues Architecture Decision Record in docs/adr/ anlegen. Aufruf mit Titel, z. B. /adr Speichern im Browser.
---

1. Nächste freie Nummer in `docs/adr/` bestimmen.
2. Datei `docs/adr/NNNN-titel-in-kleinbuchstaben.md` nach `docs/adr/0000-vorlage.md` anlegen. Titel: `$ARGUMENTS`
3. Kontext, Entscheidung, Alternativen, Folgen ausfüllen. Status „Vorgeschlagen“, außer der Nutzer hat entschieden.
4. Ersetzt das ADR ein älteres, im älteren den Status auf „Ersetzt durch NNNN“ setzen.
5. In `docs/adr/README.md` die Liste ergänzen.
