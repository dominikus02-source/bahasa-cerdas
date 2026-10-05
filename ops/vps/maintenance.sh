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

echo "=== containers ==="
"${COMPOSE[@]}" --profile scheduler --profile realtime --profile agent ps

echo "=== docker cleanup ==="
docker container prune -f --filter until=168h
docker image prune -f --filter until=168h
docker builder prune -af --filter until=168h

echo "=== docker usage ==="
docker system df

echo "=== maintenance OK ==="
