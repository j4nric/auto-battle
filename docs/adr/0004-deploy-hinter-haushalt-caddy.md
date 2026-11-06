# 0004: Deploy auf den vServer hinter dem Caddy der Haushalt-App

Datum: 2026-11-06 · Status: Angenommen

## Kontext

Auf dem vServer laufen bereits mehrere Apps. Ports 80 und 443 gehören dem Caddy der Haushalt-App (`j4nric/haushalt-app`, `infra/production`). Vorlage ist der Deploy von Stammtisch.

## Entscheidung

- Adresse `https://uhrturm-62-83-23-90.sslip.io`, Ordner `/opt/uhrturm`, Netzwerk `uhrturm-proxy`, Container-Alias `uhrturm-web`.
- Die CI exportiert das Spiel, kopiert `site/`, `docker-compose.yml` und `Caddyfile` per rsync und startet einen kleinen Caddy-Container ohne eigene Ports.
- Der Haushalt-Caddy bekommt einen Site-Block und das Netzwerk per PR im Haushalt-Repo.

## Folgen

- Keine Build-Werkzeuge auf dem Server.
- Ein Fehler im Haushalt-Caddyfile legt alle Apps lahm. Änderungen dort bleiben minimal und werden vor dem PR mit `caddy validate` geprüft.
