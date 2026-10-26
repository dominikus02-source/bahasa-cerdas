#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/bahasacerdas/apps/bahasa-cerdas-staging}"
CONFIG_DIR="${BC_STAGING_CONFIG_DIR:-/opt/bahasacerdas/config/staging}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

exec 9>/tmp/bahasacerdas-staging-deploy.lock
if ! flock -n 9; then
  echo "Another staging deploy is already running" >&2
  exit 1
fi

cd "$REPO_DIR"
git fetch --prune origin
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

bash ops/vps/prepare-staging-config.sh

if [[ ! -f "$CONFIG_DIR/web.env" ]]; then
  echo "Missing $CONFIG_DIR/web.env" >&2
  exit 1
fi

cd ops/vps
COMPOSE=(docker compose --env-file "$CONFIG_DIR/stack.env" -f docker-compose.staging.yml)

"${COMPOSE[@]}" build web
"${COMPOSE[@]}" up -d redis web

for i in {1..40}; do
  if curl -fsS --max-time 5 http://127.0.0.1:3020/api/health \
    | jq -e '.status == "ok" and .db == "up"' >/dev/null; then
    echo "Staging health OK"
    "${COMPOSE[@]}" ps
    exit 0
  fi
  sleep 3
done

"${COMPOSE[@]}" ps
exit 1
