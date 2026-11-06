# 0005: Git-Workflow wie bei Stammtisch

Datum: 2026-11-06 · Status: Angenommen

## Entscheidung

- `main` ist der Standard-Branch und wird nur über PRs geändert.
- Claude erstellt PRs und mergt selbst per Squash, sobald die CI grün ist.
- Jeder Push auf `main` deployt.
- Keine Vorschau-Adresse pro PR: vom Nutzer im Cockpit abgelehnt.

Vom Nutzer entschieden über das Cockpit am 06.11.2026.
