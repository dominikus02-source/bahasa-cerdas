#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${BC_CONFIG_DIR:-/opt/bahasacerdas/config}"
REPO_DIR="${REPO_DIR:-/opt/bahasacerdas/apps/bahasa-cerdas}"

cd "$REPO_DIR/ops/vps"
COMPOSE=(docker compose --env-file "$CONFIG_DIR/stack.env")

echo "=== INTERNAL WEB ==="
curl -fsS http://127.0.0.1:3000/api/health | jq -e '.status == "ok" and .db == "up"'

echo "=== INTERNAL GAME ==="
curl -fsS http://127.0.0.1:3001/health | jq -e '.status == "ok" and .db == "up"'

echo "=== TEST WEB ==="
curl -fsSI https://vps.bahasacerdas.com/ | head -n 1

echo "=== TEST GAME ==="
curl -fsS https://game-vps.bahasacerdas.com/health | jq -e '.status == "ok" and .db == "up"'

if getent hosts www.bahasacerdas.com | grep -q '103\.242\.10\.81'; then
  echo "=== PRODUCTION WEB DNS CUT OVER ==="
  curl -fsSI https://www.bahasacerdas.com/ | head -n 1
  curl -fsS https://www.bahasacerdas.com/api/health | jq -e '.status == "ok" and .db == "up"'
else
  echo "=== PRODUCTION WEB DNS NOT YET ON VPS ==="
fi

if getent hosts game.bahasacerdas.com | grep -q '103\.242\.10\.81'; then
  echo "=== PRODUCTION GAME DNS CUT OVER ==="
  curl -fsS https://game.bahasacerdas.com/health | jq -e '.status == "ok" and .db == "up"'
else
  echo "=== PRODUCTION GAME DNS NOT YET ON VPS ==="
fi

echo "=== CONTAINERS ==="
"${COMPOSE[@]}" --profile scheduler --profile realtime --profile agent ps
