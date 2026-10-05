#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/bahasacerdas/apps/bahasa-cerdas}"
CONFIG_DIR="${BC_CONFIG_DIR:-/opt/bahasacerdas/config}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo "Repository not found: $REPO_DIR" >&2
  exit 1
fi

if [[ ! -f "$CONFIG_DIR/stack.env" ]]; then
  echo "Missing $CONFIG_DIR/stack.env" >&2
  exit 1
fi

cd "$REPO_DIR"
git fetch --prune origin
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

cd ops/vps

COMPOSE=(docker compose --env-file "$CONFIG_DIR/stack.env")

echo "==> Building web"
"${COMPOSE[@]}" build web

echo "==> Starting Redis + web"
"${COMPOSE[@]}" up -d redis web

echo "==> Waiting for web health"
for i in {1..40}; do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
    echo "Web health OK"
    break
  fi
  if [[ "$i" -eq 40 ]]; then
    echo "Web health check failed" >&2
    "${COMPOSE[@]}" ps
    exit 1
  fi
  sleep 3
done

if [[ "${ENABLE_REALTIME:-0}" == "1" ]]; then
  echo "==> Building + starting realtime game server"
  "${COMPOSE[@]}" --profile realtime build game
  "${COMPOSE[@]}" --profile realtime up -d game
fi

if [[ "${ENABLE_AGENT:-0}" == "1" ]]; then
  echo "==> Building + starting BC Agent"
  "${COMPOSE[@]}" --profile agent build agent
  "${COMPOSE[@]}" --profile agent up -d agent
fi

if [[ "${ENABLE_EDGE:-0}" == "1" ]]; then
  echo "==> Starting Caddy"
  "${COMPOSE[@]}" up -d caddy
fi

"${COMPOSE[@]}" ps
