#!/usr/bin/env bash
set -euo pipefail

DUMP_DIR="${DUMP_DIR:-/opt/bahasacerdas/backups/supabase-migration/prod-shadow}"
DB_CONTAINER="${DB_CONTAINER:-supabase-db}"

for f in roles.sql schema.sql data.sql SHA256SUMS; do
  [[ -f "$DUMP_DIR/$f" ]] || { echo "Missing $DUMP_DIR/$f" >&2; exit 1; }
done

(cd "$DUMP_DIR" && sha256sum -c SHA256SUMS)

docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || {
  echo "Target database container is not running: $DB_CONTAINER" >&2
  exit 1
}

for f in roles.sql schema.sql data.sql; do
  docker cp "$DUMP_DIR/$f" "$DB_CONTAINER:/tmp/$f"
done

echo "==> Restore roles, schema, and data"
docker exec "$DB_CONTAINER" psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --username postgres \
  --dbname postgres \
  --file /tmp/roles.sql \
  --file /tmp/schema.sql \
  --command 'SET session_replication_role = replica' \
  --file /tmp/data.sql

echo "==> Refresh planner statistics"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'VACUUM ANALYZE;'

echo "==> Verification counts"
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -Atc \
  "select 'auth.users=' || count(*) from auth.users; select 'storage.objects=' || count(*) from storage.objects; select 'public.User=' || count(*) from public.\"User\";"

docker exec "$DB_CONTAINER" rm -f /tmp/roles.sql /tmp/schema.sql /tmp/data.sql
echo "==> Restore complete"
