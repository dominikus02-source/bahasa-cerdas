#!/usr/bin/env bash
# Kompetensi HTTP E2E runner — starts a disposable Next dev server, waits for
# readiness, runs the requested E2E script(s), then always kills the server.
#
# Usage: bash scripts/run-kompetensi-e2e.sh <e2e-script-1> [e2e-script-2 ...]
#   e.g. bash scripts/run-kompetensi-e2e.sh test-tka-http-submit-e2e.ts test-ukbi-http-submit-e2e.ts
#
# ENV SOURCES (verified preflight, values never printed):
#   - DATABASE_URL / DIRECT_URL: .env.local (scripts/load-env convention)
#   - NEXT_PUBLIC_SUPABASE_URL / ANON_KEY: extracted from the production bundle
#     by scripts/e2e-pub-env.mjs into a 0600 temp file (public-by-design values)
#     — used only when .env.local does not already provide them.
#
# Exits non-zero if any E2E script fails. Server always torn down.
set -u
cd "$(dirname "$0")/.."

PORT="${E2E_PORT:-3457}"
BASE="http://localhost:${PORT}"

if [ "$#" -lt 1 ]; then
  echo "usage: bash scripts/run-kompetensi-e2e.sh <e2e-script.ts> [more.ts ...]" >&2
  exit 2
fi

# ── Preflight: DATABASE_URL must exist (load-env reads .env.local) ──
if ! grep -q '^DATABASE_URL=..' .env.local 2>/dev/null; then
  echo "MISSING_REQUIRED_ENV: DATABASE_URL (expected in .env.local — see scripts/load-env.ts)" >&2
  exit 2
fi

# ── Public Supabase env: prefer .env.local values; else extract from prod bundle ──
PUBENV="$(mktemp /tmp/bc-e2e-pub.XXXXXX)"
chmod 600 "$PUBENV"
trap 'rm -f "$PUBENV"; [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null' EXIT

has_pub_url=$(awk -F= '/^NEXT_PUBLIC_SUPABASE_URL=/{print ($2 !~ /\[SENSITIVE\]/ && length($2) > 10) ? "yes" : "no"}' .env.local 2>/dev/null)
has_pub_key=$(awk -F= '/^NEXT_PUBLIC_SUPABASE_ANON_KEY=/{print ($2 !~ /\[SENSITIVE\]/ && length($2) > 10) ? "yes" : "no"}' .env.local 2>/dev/null)
if [ "$has_pub_url" != "yes" ] || [ "$has_pub_key" != "yes" ]; then
  node scripts/e2e-pub-env.mjs "$PUBENV" || exit 2
fi

# ── Start dev server on a disposable port ──
ENV_FRAGMENT=""
if [ "$has_pub_url" != "yes" ] || [ "$has_pub_key" != "yes" ]; then
  # shellcheck disable=SC1090
  set -a; . "$PUBENV"; set +a
fi

npx next dev -p "$PORT" > /tmp/bc-e2e-server.log 2>&1 &
SERVER_PID=$!

READY=0
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null --max-time 3 "$BASE"; then READY=1; break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then break; fi
  sleep 1
done
if [ "$READY" != "1" ]; then
  echo "E2E dev server failed to become ready on :${PORT} — tail of log:" >&2
  tail -20 /tmp/bc-e2e-server.log >&2
  exit 2
fi

# ── Run the E2E scripts ──
# BASE_URL must point at the disposable server started above — scripts default
# to :3000 when unset, which would silently bypass this runner's server.
export BASE_URL="$BASE"
RC=0
for SCRIPT in "$@"; do
  echo "═══ E2E: $SCRIPT ═══"
  npx tsx --env-file=.env.local "scripts/$SCRIPT" || RC=1
  echo
done

exit $RC
