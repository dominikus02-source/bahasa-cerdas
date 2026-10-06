#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /opt/bahasacerdas/backups/supabase-platform/<timestamp>" >&2
  exit 1
fi

DUMP_DIR="$1"
SUPABASE_ROOT="${SUPABASE_ROOT:-/opt/bahasacerdas/apps/supabase-bc-prod}"
BC_REPO="${BC_REPO:-/opt/bahasacerdas/apps/bahasa-cerdas}"
OVERRIDE_FILE="$BC_REPO/ops/supabase-selfhost/docker-compose.shadow.yml"

for f in roles.sql schema.sql data.sql SHA256SUMS; do
  [[ -f "$DUMP_DIR/$f" ]] || { echo "Missing $DUMP_DIR/$f" >&2; exit 1; }
done

(cd "$DUMP_DIR" && sha256sum -c SHA256SUMS)

cd "$SUPABASE_ROOT/docker"
compose=(docker compose -f docker-compose.yml -f "$OVERRIDE_FILE")

"${compose[@]}" up -d --wait db

docker exec supabase-db mkdir -p /tmp/bc-platform-restore
for f in roles.sql schema.sql data.sql; do
  docker cp "$DUMP_DIR/$f" "supabase-db:/tmp/bc-platform-restore/$f"
done

docker exec supabase-db psql -U postgres -d postgres \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file /tmp/bc-platform-restore/roles.sql \
  --file /tmp/bc-platform-restore/schema.sql \
  --command 'SET session_replication_role = replica' \
  --file /tmp/bc-platform-restore/data.sql

docker exec supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'VACUUM ANALYZE;'
echo "Shadow database restore completed."
