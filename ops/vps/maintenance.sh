#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/bahasacerdas/apps/bahasa-cerdas}"
CONFIG_DIR="${BC_CONFIG_DIR:-/opt/bahasacerdas/config}"

cd "$REPO_DIR/ops/vps"
COMPOSE=(docker compose --env-file "$CONFIG_DIR/stack.env")

echo "=== $(date --iso-8601=seconds) VPS MAINTENANCE ==="
df -h /
free -h

echo "=== health ==="
curl -fsS --max-time 10 http://127.0.0.1:3000/api/health | jq -e '.status == "ok" and .db == "up"' >/dev/null
curl -fsS --max-time 10 http://127.0.0.1:3001/health | jq -e '.status == "ok" and .db == "up"' >/dev/null
curl -fsS --max-time 15 https://www.bahasacerdas.com/api/health | jq -e '.status == "ok" and .db == "up"' >/dev/null
curl -fsS --max-time 15 https://game.bahasacerdas.com/health | jq -e '.status == "ok" and .db == "up"' >/dev/null

# Novelify now runs on the same VPS. Check the web surface and a harmless
# database-backed endpoint so maintenance catches both proxy/runtime and DB
# regressions without creating application data.
curl -fsS --max-time 10 http://127.0.0.1:3010/ >/dev/null
curl -fsS --max-time 15 https://novelify.online/ >/dev/null
curl -fsS --max-time 15 'https://novelify.online/api/affiliate/validate-code?code=__vps_maintenance_probe__'   | jq -e '.valid == false' >/dev/null

echo "=== containers ==="
"${COMPOSE[@]}" --profile scheduler --profile realtime --profile agent ps
docker ps --filter name=novelify-prod-novelify-1 --format '{{.Names}} {{.Status}}'

echo "=== docker cleanup ==="
docker container prune -f --filter until=168h
docker image prune -f --filter until=168h
# BuildKit cache can grow quickly during image-heavy VPS deploys. Keep only
# the last 24 hours of cache; deployed images and running containers are not
# removed by this command.
docker builder prune -af --filter until=24h

echo "=== docker usage ==="
docker system df

echo "=== maintenance OK ==="
