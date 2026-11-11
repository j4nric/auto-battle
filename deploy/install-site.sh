#!/bin/sh
# Installs deploy/site.caddy as our entry in the front Caddy (ADR 0011). Runs on the
# vServer from $DEPLOY_PATH after `docker compose up -d`; the deploy job calls it.
#
# Check the entry on its own, keep the previous one as .prev (no .caddy ending, so it
# is not imported), put the new one into the shared volume, then let the front Caddy
# check its whole configuration and reload without a restart. If that check fails,
# the previous entry goes back and the deploy fails; the front Caddy keeps running
# with the configuration it had.
set -eu
cd "$(dirname "$0")"

SITE_IMAGE=caddy:2.8-alpine
SITE_NAME=uhrturm.caddy

docker network inspect edge >/dev/null 2>&1 || docker network create edge >/dev/null
docker volume inspect caddy-sites >/dev/null 2>&1 || docker volume create caddy-sites >/dev/null

docker run --rm -v caddy-sites:/sites -v "$PWD/site.caddy:/new.caddy:ro" "$SITE_IMAGE" sh -euc "
  caddy validate --config /new.caddy --adapter caddyfile >/dev/null 2>&1 || { caddy validate --config /new.caddy --adapter caddyfile; exit 1; }
  if [ -f /sites/$SITE_NAME ]; then cp /sites/$SITE_NAME /sites/$SITE_NAME.prev; else rm -f /sites/$SITE_NAME.prev; fi
  cp /new.caddy /sites/$SITE_NAME
"

front=$(docker ps -q --filter label=edge.caddy=true | head -n 1)
if [ -z "$front" ]; then
  echo "::warning::No front Caddy with label edge.caddy=true yet; site entry stored in caddy-sites and picked up when it starts."
elif docker exec "$front" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  docker exec "$front" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
  echo "front Caddy: site entry loaded"
else
  docker exec "$front" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile || true
  docker run --rm -v caddy-sites:/sites "$SITE_IMAGE" sh -euc "
    if [ -f /sites/$SITE_NAME.prev ]; then mv /sites/$SITE_NAME.prev /sites/$SITE_NAME; else rm -f /sites/$SITE_NAME; fi
  "
  echo "::error::The front Caddy refused deploy/site.caddy (see above); the previous entry is back in place."
  exit 1
fi
