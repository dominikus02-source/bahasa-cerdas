#!/usr/bin/env bash
set -euo pipefail

SOURCE_ENV="${SOURCE_ENV:-/opt/bahasacerdas/config/web.env}"
OUT_DIR="${OUT_DIR:-/opt/bahasacerdas/backups/supabase-migration/prod-shadow}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is required" >&2
  exit 1
fi
if [[ ! -f "$SOURCE_ENV" ]]; then
  echo "Source env not found: $SOURCE_ENV" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"

DB_URL="$(grep '^DIRECT_URL=' "$SOURCE_ENV" | head -n1 | cut -d= -f2-)"
DB_URL="${DB_URL%\"}"
DB_URL="${DB_URL#\"}"
if [[ -z "$DB_URL" ]]; then
  echo "DIRECT_URL is missing" >&2
  exit 1
fi

echo "==> Export roles"
supabase db dump --db-url "$DB_URL" -f "$OUT_DIR/roles.sql" --role-only

echo "==> Export schema"
supabase db dump --db-url "$DB_URL" -f "$OUT_DIR/schema.sql"

echo "==> Export data"
supabase db dump --db-url "$DB_URL" -f "$OUT_DIR/data.sql" --use-copy --data-only

unset DB_URL
chmod 600 "$OUT_DIR"/*.sql
sha256sum "$OUT_DIR"/*.sql > "$OUT_DIR/SHA256SUMS"
chmod 600 "$OUT_DIR/SHA256SUMS"

echo "==> Export complete"
wc -c "$OUT_DIR"/roles.sql "$OUT_DIR"/schema.sql "$OUT_DIR"/data.sql
