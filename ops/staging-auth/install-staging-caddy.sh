#!/usr/bin/env bash
# Installs the staging Auth/Storage route ONLY into a dedicated staging Caddy.
# This script deliberately refuses the production/shared Caddy container.
set -Eeuo pipefail
umask 077

APP_DIR="/opt/bahasacerdas/staging/jumpa/app"
STAGING_ROOT="/opt/bahasacerdas/staging"
SOURCE="$APP_DIR/ops/staging-auth/Caddyfile.staging.snippet"

die(){ echo "STOP: $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Jalankan sebagai root."
[[ -f "$SOURCE" ]] || die "Staging Caddy snippet missing."

: "${STAGING_CADDY_CONTAINER:?Set STAGING_CADDY_CONTAINER to the dedicated staging Caddy container}"
: "${STAGING_CADDY_CONFIG_DIR:?Set STAGING_CADDY_CONFIG_DIR under /opt/bahasacerdas/staging}"
: "${STAGING_CADDYFILE_PATH:?Set STAGING_CADDYFILE_PATH to the Caddyfile inside the staging container}"
: "${STAGING_DOCKER_NETWORK:?Set STAGING_DOCKER_NETWORK to the verified JUMPA staging network}"

[[ "$STAGING_CADDY_CONTAINER" == *staging* ]] || die "Container name must explicitly identify staging."
[[ "$STAGING_CADDY_CONTAINER" != *prod* ]] || die "Production Caddy is forbidden."
[[ "$STAGING_CADDY_CONFIG_DIR" == "$STAGING_ROOT"/* ]] || die "Caddy config directory must be inside the staging root."
[[ "$STAGING_CADDYFILE_PATH" == /* ]] || die "Container Caddyfile path must be absolute."

docker inspect "$STAGING_CADDY_CONTAINER" >/dev/null 2>&1 || die "Dedicated staging Caddy container not found."
docker network inspect "$STAGING_DOCKER_NETWORK" >/dev/null 2>&1 || die "Staging Docker network not found."
NETWORKS="$(docker inspect -f '{{range $name, $cfg := .NetworkSettings.Networks}}{{println $name}}{{end}}' "$STAGING_CADDY_CONTAINER")"
printf '%s\n' "$NETWORKS" | grep -Fxq "$STAGING_DOCKER_NETWORK" || die "Dedicated staging Caddy is not attached to the verified staging network."

docker exec "$STAGING_CADDY_CONTAINER" test -f "$STAGING_CADDYFILE_PATH" || die "Staging Caddyfile missing inside container."
IMPORT_LINE="import $STAGING_CADDY_CONFIG_DIR/*.caddy"
docker exec "$STAGING_CADDY_CONTAINER" grep -Fq "$IMPORT_LINE" "$STAGING_CADDYFILE_PATH" || die "Staging Caddyfile does not import the staging-only snippet directory."

mkdir -p "$STAGING_CADDY_CONFIG_DIR"
TARGET="$STAGING_CADDY_CONFIG_DIR/auth-staging.caddy"
STAMP="$(date +%Y%m%d%H%M%S)"
BACKUP="$TARGET.bak.$STAMP"
[[ ! -f "$TARGET" ]] || cp -a "$TARGET" "$BACKUP"
install -m 600 "$SOURCE" "$TARGET"

if ! docker exec "$STAGING_CADDY_CONTAINER" caddy validate --config "$STAGING_CADDYFILE_PATH" --adapter caddyfile; then
  if [[ -f "$BACKUP" ]]; then cp -a "$BACKUP" "$TARGET"; else rm -f "$TARGET"; fi
  die "Staging Caddy validation failed; previous staging route restored."
fi

if ! docker exec "$STAGING_CADDY_CONTAINER" caddy reload --config "$STAGING_CADDYFILE_PATH" --adapter caddyfile; then
  if [[ -f "$BACKUP" ]]; then cp -a "$BACKUP" "$TARGET"; else rm -f "$TARGET"; fi
  docker exec "$STAGING_CADDY_CONTAINER" caddy reload --config "$STAGING_CADDYFILE_PATH" --adapter caddyfile || true
  die "Staging Caddy reload failed; previous staging route restored."
fi

echo "PASS: Auth/Storage route installed on dedicated staging Caddy only."
echo "Production Caddy container and production ingress configuration were not accessed."
