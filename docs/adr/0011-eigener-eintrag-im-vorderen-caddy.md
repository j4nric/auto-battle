# 0011: Eigener Eintrag im vorderen Caddy

Datum: 2026-11-11 · Status: Angenommen · Ergänzt 0004

## Kontext

Nach ADR 0004 hängt Uhrturm hinter dem Caddy der Haushalt-App, der die Ports 80 und 443 des Servers belegt. Site-Block und Netzwerk standen dort im Repo `j4nric/haushalt-app`. Jede Änderung an Adresse oder Weiterleitung hieß: PR im fremden Repo. Für alle Apps auf dem Server wird das umgestellt (Stammtisch ADR 0024, Haushalt-PR j4nric/haushalt-app#63).

## Entscheidung

- Der vordere Caddy liest jede Datei `*.caddy` aus dem gemeinsamen Docker-Volume `caddy-sites` (`import /etc/caddy/sites/*.caddy`), trägt das Label `edge.caddy=true` und erreicht alle Apps über das gemeinsame Netzwerk `edge`.
- Unser Eintrag steht in `deploy/site.caddy`. Der Deploy-Job ruft auf dem Server `deploy/install-site.sh` auf: Netzwerk `edge` und Volume `caddy-sites` anlegen, falls sie fehlen, Eintrag einzeln prüfen (`caddy validate`), als `uhrturm.caddy` ins Volume legen (vorige Fassung als `.prev`), den vorderen Caddy die ganze Konfiguration prüfen lassen und ohne Neustart neu laden (`caddy reload`). Lehnt er ab, kommt der vorige Eintrag zurück und der Deploy schlägt fehl; der vordere Caddy läuft mit dem alten Stand weiter. Gibt es noch keinen Caddy mit dem Label, bleibt der Eintrag nur gespeichert und der Deploy warnt.
- Der Container `web` hängt im Netzwerk `edge` mit dem Alias `uhrturm-web`, bis der alte Block im Haushalt-Caddy entfernt ist auch weiter in `uhrturm-proxy`.
- Die CI prüft `deploy/site.caddy` bei jedem PR mit dem Caddy-Image.

## Alternativen

- Weiter alles im Haushalt-Repo: genau das, was wegfallen soll.
- caddy-docker-proxy (Einträge als Labels an den Containern): braucht vorne ein anderes Caddy-Image und ändert alle bestehenden Einträge.

## Folgen

- Adresse und Weiterleitung von Uhrturm ändern sich mit einem PR in diesem Repo.
- Jeder Host-Name darf auf dem ganzen Server nur einmal vorkommen. Der Eintrag enthält genau den Host des alten Blocks; ein späterer Haushalt-PR löscht den alten Block, sobald alle Apps ihren Eintrag ausgerollt haben. Danach können Netzwerk `uhrturm-proxy` und sein Eintrag in `deploy/docker-compose.yml` weg.
- Der Deploy-Nutzer braucht keine neuen Rechte: Er bedient Docker schon.
