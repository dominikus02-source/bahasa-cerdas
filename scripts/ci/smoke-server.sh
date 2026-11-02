#!/usr/bin/env bash
# Start the production build (`next start`) and fail on ANY 5xx or dead route.
# Catches whole-app failures such as the 30 Oct outage (conflicting dynamic
# slugs → every request 500) before they reach the VPS.
#   usage: scripts/ci/smoke-server.sh            (after `npm run build`)
#   env:   SMOKE_PORT (3100)  SMOKE_ROUTES (space-separated, overrides list)
set -uo pipefail
PORT="${SMOKE_PORT:-3100}"
BASE="http://127.0.0.1:$PORT"
LOG="${SMOKE_LOG:-/tmp/bc-smoke-server.log}"
read -r -a ROUTES <<<"${SMOKE_ROUTES:-/ /api/health /login /fitur /faq /tentang /artikel /kamus /jumpa /umum /robots.txt /sitemap.xml /api/me /dashboard /guru /murid /admin /aku-sastrawan /__smoke_not_found}"

npx next start -p "$PORT" >"$LOG" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null; wait "$PID" 2>/dev/null' EXIT

up=0
for _ in $(seq 1 60); do
  kill -0 "$PID" 2>/dev/null || { echo "server exited during startup"; cat "$LOG"; exit 1; }
  [[ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$BASE/api/health")" != 000 ]] && { up=1; break; }
  sleep 1
done
(( up )) || { echo "server not reachable on $BASE after 60s"; cat "$LOG"; exit 1; }

fail=0
for r in "${ROUTES[@]}"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$BASE$r")"
  if [[ "$code" == 000 || "$code" -ge 500 ]]; then echo "FAIL $code $r"; fail=$((fail+1)); else echo "ok   $code $r"; fi
done
health="$(curl -s --max-time 5 "$BASE/api/health")"
echo "/api/health body: $health"
if [[ "${SMOKE_REQUIRE_DB:-1}" == 1 ]] && ! jq -e '.status == "ok" and .db == "up"' >/dev/null <<<"$health"; then
  echo "FAIL /api/health is not ok/db up"; fail=$((fail+1))
fi
if (( fail )); then echo "SMOKE FAILED: $fail problem(s). Server log tail:"; tail -60 "$LOG"; exit 1; fi
echo "SMOKE OK: ${#ROUTES[@]} routes, 0 5xx"
