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
# Direktori snippet Caddy opsional (mis. JUMPA). Kosong = tidak ada situs
# tambahan; dibuat di sini agar bind mount caddy tidak pernah gagal.
install -d -m 755 "$CONFIG_DIR/caddy.d"

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

if [[ "${ENABLE_JUMPA:-0}" == "1" ]]; then
  echo "==> Starting JUMPA media server (LiveKit)"
  if ! grep -q '^LIVEKIT_KEYS=' "$CONFIG_DIR/livekit.env" 2>/dev/null; then
    echo "LIVEKIT_API_KEY/LIVEKIT_API_SECRET missing in web.env — cannot start JUMPA" >&2
    exit 1
  fi
  "${COMPOSE[@]}" --profile jumpa pull livekit
  "${COMPOSE[@]}" --profile jumpa up -d livekit

  for i in {1..30}; do
    if curl -fsS --max-time 5 http://127.0.0.1:7880/ >/dev/null; then
      echo "LiveKit health OK"
      break
    fi
    if [[ "$i" -eq 30 ]]; then
      echo "LiveKit health check failed" >&2
      "${COMPOSE[@]}" --profile jumpa ps
      exit 1
    fi
    sleep 2
  done

  # Situs Caddy JUMPA hanya dipasang saat diaktifkan (hindari ACME untuk
  # domain yang DNS-nya belum siap).
  install -d -m 755 "$CONFIG_DIR/caddy.d"
  install -m 644 ./caddy/jumpa.caddy "$CONFIG_DIR/caddy.d/jumpa.caddy"
  # Recreate (bukan reload): Caddyfile di-bind-mount sebagai file tunggal, jadi
  # container lama tidak melihat isi baru hasil git pull maupun mount conf.d.
  "${COMPOSE[@]}" up -d --force-recreate caddy
fi

if [[ "${ENABLE_AGENT:-0}" == "1" ]]; then
  echo "==> Building + starting BC Agent"
  "${COMPOSE[@]}" --profile agent build agent
  "${COMPOSE[@]}" --profile agent up -d agent
fi

if [[ "${ENABLE_EDGE:-0}" == "1" ]]; then
  echo "==> Recreating Caddy with current edge config"
  "${COMPOSE[@]}" up -d --force-recreate caddy
fi

echo "==> Runtime status"
"${COMPOSE[@]}" --profile scheduler --profile realtime --profile agent --profile jumpa ps

echo "==> Production smoke"
curl -fsS --max-time 15 https://www.bahasacerdas.com/api/health \
  | jq -e '.status == "ok" and .db == "up"' >/dev/null
if [[ "${ENABLE_REALTIME:-0}" == "1" ]]; then
  curl -fsS --max-time 15 https://game.bahasacerdas.com/health \
    | jq -e '.status == "ok" and .db == "up"' >/dev/null
fi

if [[ "${ENABLE_JUMPA:-0}" == "1" ]]; then
  curl -fsS --max-time 15 "https://${JUMPA_DOMAIN:-jumpa.bahasacerdas.com}/" >/dev/null
fi

echo "==> Trim build cache older than 7 days"
docker builder prune -af --filter until=168h >/dev/null || true

echo "==> Deploy complete"
