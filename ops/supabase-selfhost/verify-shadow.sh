#!/usr/bin/env bash
set -euo pipefail

SUPABASE_ROOT="${SUPABASE_ROOT:-/opt/bahasacerdas/apps/supabase-bc-prod}"
BC_REPO="${BC_REPO:-/opt/bahasacerdas/apps/bahasa-cerdas}"
OVERRIDE_FILE="$BC_REPO/ops/supabase-selfhost/docker-compose.shadow.yml"

cd "$SUPABASE_ROOT/docker"

docker compose -f docker-compose.yml -f "$OVERRIDE_FILE" ps

echo "==> Gateway"
curl -fsS --max-time 10 http://127.0.0.1:54380/rest/v1/ >/dev/null

echo "==> Auth health"
curl -fsS --max-time 10 http://127.0.0.1:54380/auth/v1/health

echo
echo "==> Database"
docker compose -f docker-compose.yml -f "$OVERRIDE_FILE" exec -T db \
  psql -U postgres -d postgres -Atc "select current_setting('server_version_num');"

echo "Shadow Supabase core health OK."
