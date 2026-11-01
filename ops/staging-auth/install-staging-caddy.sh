#!/usr/bin/env bash
# Installs only the auth-staging host route into the shared Caddy ingress.
# Existing production site blocks are not edited.
set -Eeuo pipefail
APP_DIR="/opt/bahasacerdas/staging/jumpa/app"
CONFIG_DIR="/opt/bahasacerdas/config/caddy.d"
CADDY_CONTAINER="bahasacerdas-prod-caddy-1"
SOURCE="$APP_DIR/ops/staging-auth/Caddyfile.staging.snippet"
TARGET="$CONFIG_DIR/auth-staging.caddy"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="$TARGET.bak.$STAMP"

[[ -f "$SOURCE" ]] || { echo "STOP: staging Caddy snippet missing"; exit 1; }
docker inspect "$CADDY_CONTAINER" >/dev/null 2>&1 || { echo "STOP: shared Caddy container missing"; exit 1; }
docker exec "$CADDY_CONTAINER" test -f /etc/caddy/Caddyfile || { echo "STOP: Caddyfile missing"; exit 1; }
grep -q 'import /etc/caddy/conf.d/\\*.caddy' /opt/bahasacerdas/config/Caddyfile 2>/dev/null || \
  docker exec "$CADDY_CONTAINER" grep -q 'import /etc/caddy/conf.d/\\*.caddy' /etc/caddy/Caddyfile || {
    echo "STOP: Caddy does not import the staging snippet directory"; exit 1;
  }

mkdir -p "$CONFIG_DIR"
if [[ -f "$TARGET" ]]; then cp -a "$TARGET" "$BACKUP"; fi
install -m 644 "$SOURCE" "$TARGET"

if ! docker exec "$CADDY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
  if [[ -f "$BACKUP" ]]; then cp -a "$BACKUP" "$TARGET"; else rm -f "$TARGET"; fi
  echo "STOP: invalid Caddy config; previous route restored"; exit 1
fi

if ! docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
  if [[ -f "$BACKUP" ]]; then cp -a "$BACKUP" "$TARGET"; else rm -f "$TARGET"; fi
  docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile || true
  echo "STOP: Caddy reload failed; previous route restored"; exit 1
fi

echo "PASS: staging-only Auth/Storage host route installed."
echo "Production site blocks were not modified."
