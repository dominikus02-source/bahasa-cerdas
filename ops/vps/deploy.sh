#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/bahasacerdas/apps/bahasa-cerdas}"
CONFIG_DIR="${BC_CONFIG_DIR:-/opt/bahasacerdas/config}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

exec 9>/tmp/bahasacerdas-deploy.lock
if ! flock -n 9; then
  echo "Another BahasaCerdas deploy is already running" >&2
  exit 1
fi

if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo "Repository not found: $REPO_DIR" >&2
  exit 1
fi

if [[ ! -f "$CONFIG_DIR/stack.env" || ! -f "$CONFIG_DIR/web.env" ]]; then
  echo "Missing stack.env or web.env in $CONFIG_DIR" >&2
  exit 1
fi

cd "$REPO_DIR"
git fetch --prune origin
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

chmod +x ops/vps/prepare-runtime-envs.sh
./ops/vps/prepare-runtime-envs.sh

cd ops/vps
COMPOSE=(docker compose --env-file "$CONFIG_DIR/stack.env")

echo "==> Building web"
"${COMPOSE[@]}" build web

echo "==> Starting Redis + web"
"${COMPOSE[@]}" up -d redis web

echo "==> Waiting for application readiness"
for i in {1..40}; do
  if curl -fsS --max-time 5 http://127.0.0.1:3000/api/health \
    | jq -e '.status == "ok" and .db == "up"' >/dev/null; then
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

echo "==> Pulling pinned Caddy edge image"
"${COMPOSE[@]}" pull caddy

echo "==> Validating Caddy config before applying"
"${COMPOSE[@]}" run --rm --no-deps --entrypoint caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

echo "==> Applying Caddy edge config"
"${COMPOSE[@]}" up -d caddy
reload_ok=0
for i in {1..10}; do
  if "${COMPOSE[@]}" exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
    reload_ok=1
    break
  fi
  sleep 2
done
if [[ "$reload_ok" -ne 1 ]]; then
  echo "Caddy config reload failed" >&2
  "${COMPOSE[@]}" ps caddy
  exit 1
fi

if [[ "${ENABLE_CRON:-0}" == "1" ]]; then
  echo "==> Building + starting VPS scheduler"
  "${COMPOSE[@]}" --profile scheduler build cron
  "${COMPOSE[@]}" --profile scheduler up -d cron
fi

if [[ "${ENABLE_REALTIME:-0}" == "1" ]]; then
  echo "==> Building + starting realtime game server"
  "${COMPOSE[@]}" --profile realtime build game
  "${COMPOSE[@]}" --profile realtime up -d game

  for i in {1..30}; do
    if curl -fsS --max-time 5 http://127.0.0.1:3001/health \
      | jq -e '.status == "ok" and .db == "up"' >/dev/null; then
      echo "Game health OK"
      break
    fi
    if [[ "$i" -eq 30 ]]; then
      echo "Game health check failed" >&2
      "${COMPOSE[@]}" --profile realtime ps
      exit 1
    fi
    sleep 2
  done
fi

if [[ "${ENABLE_AGENT:-0}" == "1" ]]; then
  echo "==> Building + starting BC Agent"
  "${COMPOSE[@]}" --profile agent build agent
  "${COMPOSE[@]}" --profile agent up -d agent
fi

echo "==> Runtime status"
"${COMPOSE[@]}" --profile scheduler --profile realtime --profile agent ps

echo "==> Production smoke"
curl -fsS --max-time 15 https://www.bahasacerdas.com/api/health \
  | jq -e '.status == "ok" and .db == "up"' >/dev/null
if [[ "${ENABLE_REALTIME:-0}" == "1" ]]; then
  curl -fsS --max-time 15 https://game.bahasacerdas.com/health \
    | jq -e '.status == "ok" and .db == "up"' >/dev/null
fi

echo "==> HTTP header-size smoke (20 KiB Cookie)"
header_probe="$(head -c 20480 /dev/zero | tr '\0' 'x')"
header_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 20 --header "Cookie: bc_header_probe=${header_probe}" https://www.bahasacerdas.com/login)"
unset header_probe
if [[ "$header_status" != "200" ]]; then
  echo "HTTP header-size smoke failed (status $header_status; expected 200)" >&2
  exit 1
fi
echo "HTTP header-size smoke OK"

echo "==> Trim build cache older than 7 days"
docker builder prune -af --filter until=168h >/dev/null || true

echo "==> Deploy complete"
