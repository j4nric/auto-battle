# Deployment auf den vServer

Jeder Push auf `main` testet, exportiert das Spiel fürs Web und spielt es auf den vServer. Auf dem Server läuft nur ein kleiner Caddy-Container, der die Dateien ausliefert.

Adresse: **https://uhrturm-62-83-23-90.sslip.io**

```
Browser ──HTTPS──▶ haushalt-prod-caddy-1 ──Netzwerk uhrturm-proxy──▶ uhrturm-web
```

| Was | Wo |
|---|---|
| Netzwerk `uhrturm-proxy` | auf dem Server, am 06.11.2026 angelegt |
| Site-Block und Netzwerk im Haushalt-Caddy | `j4nric/haushalt-app`, `infra/production/Caddyfile` und `docker-compose.yml` |
| Container mit Alias `uhrturm-web` | `deploy/docker-compose.yml` |

## Einrichtung (erledigt am 06.11.2026)

- Ordner `/opt/uhrturm`, Besitzer `deploy`.
- Schlüsselpaar auf dem Mac erzeugt, öffentlicher Teil in `/home/deploy/.ssh/authorized_keys`.
- Secrets im Repo: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`.

## Ablauf (`.github/workflows/ci.yml`, Job `deploy`)

1. Labor-Tests, Golden-Vektoren, Simulations-Smoke.
2. Godot installieren (gecacht), Godot-Tests, Web-Export mit Build-Info.
3. `site/`, `docker-compose.yml` und `Caddyfile` per rsync nach `/opt/uhrturm`.
4. Netzwerk anlegen, falls es fehlt, `docker compose up -d`, Caddy neu laden.

## Fehlersuche

```
cd /opt/uhrturm && docker compose ps
cd /opt/uhrturm && docker compose logs --tail 50
docker network inspect uhrturm-proxy --format '{{range .Containers}}{{.Name}} {{end}}'
```

Der letzte Befehl muss `uhrturm-web-1` und `haushalt-prod-caddy-1` zeigen. Fehlt der Caddy, ist der Haushalt-PR noch nicht ausgerollt.
