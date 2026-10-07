#!/usr/bin/env bash
set -euo pipefail

SUPABASE_ROOT="${SUPABASE_ROOT:-/opt/bahasacerdas/apps/supabase-bc-prod}"
BC_REPO="${BC_REPO:-/opt/bahasacerdas/apps/bahasa-cerdas}"
OVERRIDE_FILE="$BC_REPO/ops/supabase-selfhost/docker-compose.shadow.yml"

cd "$SUPABASE_ROOT/docker"
compose=(docker compose -f docker-compose.yml -f "$OVERRIDE_FILE")

"${compose[@]}" ps

anon_key="$(grep -m1 '^ANON_KEY=' .env | cut -d= -f2-)"
if [[ -z "$anon_key" ]]; then
  echo "ANON_KEY missing from self-hosted Supabase env" >&2
  exit 1
fi

echo "==> REST gateway"
curl -fsS --max-time 10 -H "apikey: $anon_key" http://127.0.0.1:54380/rest/v1/ >/dev/null

echo "==> Auth health"
curl -fsS --max-time 10 -H "apikey: $anon_key" http://127.0.0.1:54380/auth/v1/health

echo
echo "==> Database"
"${compose[@]}" exec -T db \
  psql -U postgres -d postgres -Atc "select current_setting('server_version_num');"

unset anon_key
echo "Shadow Supabase core health OK."
