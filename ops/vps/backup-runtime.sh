#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${BC_BASE_DIR:-/opt/bahasacerdas}"
CONFIG_DIR="${BC_CONFIG_DIR:-$BASE_DIR/config}"
BACKUP_DIR="${BC_BACKUP_DIR:-$BASE_DIR/backups}"
RETENTION_DAYS="${BC_BACKUP_RETENTION_DAYS:-14}"
REDIS_CONTAINER="${REDIS_CONTAINER:-bahasacerdas-prod-redis-1}"

umask 077
mkdir -p "$BACKUP_DIR"

ts="$(date +%Y%m%d-%H%M%S)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

echo "[backup] snapshot config"
tar -C "$BASE_DIR" -czf "$work/config-$ts.tgz" config

if docker ps --format '{{.Names}}' | grep -qx "$REDIS_CONTAINER"; then
  echo "[backup] snapshot redis"
  docker exec "$REDIS_CONTAINER" sh -lc 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli SAVE >/dev/null'
  docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$work/redis-$ts.rdb"
fi

echo "[backup] checksums"
(
  cd "$work"
  sha256sum * > SHA256SUMS
)

archive="$BACKUP_DIR/bahasacerdas-runtime-$ts.tar"
tar -C "$work" -cf "$archive" .
chmod 600 "$archive"

find "$BACKUP_DIR" -type f -name 'bahasacerdas-runtime-*.tar' -mtime "+$RETENTION_DAYS" -delete

echo "[backup] ready: $archive"
