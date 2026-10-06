#!/usr/bin/env bash
set -euo pipefail

SUPABASE_ROOT="${SUPABASE_ROOT:-/opt/bahasacerdas/apps/supabase-bc-prod}"
BC_REPO="${BC_REPO:-/opt/bahasacerdas/apps/bahasa-cerdas}"
OVERRIDE_FILE="$BC_REPO/ops/supabase-selfhost/docker-compose.shadow.yml"

cd "$SUPABASE_ROOT/docker"
compose=(docker compose -f docker-compose.yml -f "$OVERRIDE_FILE")

"${compose[@]}" exec -T db psql -U postgres -d postgres -P pager=off -c "
select
  pg_size_pretty(pg_database_size(current_database())) as db_size,
  (select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE') as public_tables,
  (select count(*) from auth.users) as auth_users,
  (select count(*) from storage.buckets) as storage_buckets,
  (select count(*) from storage.objects) as storage_objects;
"

"${compose[@]}" exec -T db psql -U postgres -d postgres -P pager=off -c "
select extname, extversion from pg_extension order by extname;
"
