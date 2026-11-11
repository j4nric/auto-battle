# Deployment auf den vServer

Jeder Push auf `main` testet, exportiert das Spiel fürs Web und spielt es auf den vServer. Auf dem Server läuft nur ein kleiner Caddy-Container, der die Dateien ausliefert.

Adresse: **https://uhrturm-62-83-23-90.sslip.io**

```
Browser ──HTTPS──▶ haushalt-prod-caddy-1 ──Netzwerk edge──▶ uhrturm-web
                   (liest caddy-sites/uhrturm.caddy)
```

| Was | Wo |
|---|---|
| Unser Eintrag im vorderen Caddy | `deploy/site.caddy`, auf dem Server als `uhrturm.caddy` im Volume `caddy-sites` (ADR 0011) |
| Einspielen und Neuladen | `deploy/install-site.sh`, vom Deploy-Job aufgerufen |
| Netzwerk `edge`, Volume `caddy-sites` | gemeinsam für alle Apps, legt der Deploy an, falls sie fehlen |
| Netzwerk `uhrturm-proxy` | alter Weg (ADR 0004), bleibt, bis der alte Block im Haushalt-Caddy gelöscht ist |
| Container mit Alias `uhrturm-web` | `deploy/docker-compose.yml`, in `edge` und `uhrturm-proxy` |

## Einrichtung (erledigt am 06.11.2026)

- Ordner `/opt/uhrturm`, Besitzer `deploy`.
- Schlüsselpaar auf dem Mac erzeugt, öffentlicher Teil in `/home/deploy/.ssh/authorized_keys`.
- Secrets im Repo: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`.

## Ablauf (`.github/workflows/ci.yml`, Job `deploy`)

1. Labor-Tests, Golden-Vektoren, Simulations-Smoke.
2. Godot installieren (gecacht), Godot-Tests, Web-Export mit Build-Info.
3. `site/`, `docker-compose.yml`, `Caddyfile`, `site.caddy` und `install-site.sh` per rsync nach `/opt/uhrturm`.
4. Netzwerke anlegen, falls sie fehlen, `docker compose up -d`, eigenen Caddy neu laden.
5. `install-site.sh`: Eintrag einzeln prüfen, als `uhrturm.caddy` ins Volume `caddy-sites` legen (vorige Fassung als `uhrturm.caddy.prev`), den vorderen Caddy (Label `edge.caddy=true`) die ganze Konfiguration prüfen lassen und neu laden. Lehnt er ab, kommt die vorige Fassung zurück und der Deploy schlägt fehl. Gibt es noch keinen Caddy mit dem Label, bleibt der Eintrag nur gespeichert (Warnung im Log).

Jeder Host-Name darf auf dem ganzen Server nur einmal vorkommen. Eine neue Domain für Uhrturm gehört in `deploy/site.caddy`, nicht ins Haushalt-Repo.

## Fehlersuche

```
cd /opt/uhrturm && docker compose ps
cd /opt/uhrturm && docker compose logs --tail 50
docker network inspect edge --format '{{range .Containers}}{{.Name}} {{end}}'
docker run --rm -v caddy-sites:/sites caddy:2.8-alpine ls -l /sites
```

Das Netzwerk `edge` muss `uhrturm-web-1` und `haushalt-prod-caddy-1` zeigen. Fehlt der Caddy, ist der Haushalt-PR (j4nric/haushalt-app#63) noch nicht ausgerollt; bis dahin läuft der Weg über `uhrturm-proxy`.
