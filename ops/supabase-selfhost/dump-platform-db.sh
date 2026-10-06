#!/usr/bin/env bash
set -euo pipefail

SUPABASE_CLI="${SUPABASE_CLI:-/opt/bahasacerdas/bin/supabase}"
SOURCE_ENV="${SOURCE_ENV:-/opt/bahasacerdas/config/web.env}"
BACKUP_ROOT="${BACKUP_ROOT:-/opt/bahasacerdas/backups/supabase-platform}"

if [[ ! -x "$SUPABASE_CLI" ]]; then
  echo "Supabase CLI not found: $SUPABASE_CLI" >&2
  exit 1
fi
if [[ ! -f "$SOURCE_ENV" ]]; then
  echo "Source env not found: $SOURCE_ENV" >&2
  exit 1
fi

read_env_value() {
  local key="$1"
  local value
  value="$(grep -m1 "^${key}=" "$SOURCE_ENV" | cut -d= -f2- || true)"
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"
  printf '%s' "$value"
}

SOURCE_DB_URL="$(read_env_value DIRECT_URL)"
if [[ -z "$SOURCE_DB_URL" ]]; then
  SOURCE_DB_URL="$(read_env_value DATABASE_URL)"
fi
if [[ -z "$SOURCE_DB_URL" ]]; then
  echo "Neither DIRECT_URL nor DATABASE_URL is available" >&2
  exit 1
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
dest="$BACKUP_ROOT/$stamp"
mkdir -p "$dest"
chmod 700 "$BACKUP_ROOT" "$dest"

"$SUPABASE_CLI" db dump --db-url "$SOURCE_DB_URL" -f "$dest/roles.sql" --role-only
"$SUPABASE_CLI" db dump --db-url "$SOURCE_DB_URL" -f "$dest/schema.sql"
"$SUPABASE_CLI" db dump --db-url "$SOURCE_DB_URL" -f "$dest/data.sql" --use-copy --data-only

chmod 600 "$dest"/*.sql
sha256sum "$dest"/*.sql > "$dest/SHA256SUMS"
chmod 600 "$dest/SHA256SUMS"

echo "$dest"
