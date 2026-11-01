#!/usr/bin/env bash
# One-time repair of the observed GoTrue search_path ledger split. Staging only.
set -Eeuo pipefail
umask 077
ROOT=/opt/bahasacerdas/staging/auth
DB=jumpa-auth-db-staging
API=jumpa-auth-staging
die(){ echo "STOP: $*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || die 'Run as root.'
[[ ! -L "$ROOT" && -d "$ROOT" ]] || die 'Staging Auth directory missing or symlinked.'
[[ "$(docker inspect -f '{{.Config.Image}}' "$API")" == supabase/gotrue:v2.196.0 ]] || die 'Unexpected Auth image; review before repair.'
[[ "$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' "$DB")" == jumpa_auth_staging_db ]] || die 'Unexpected Auth DB volume; no changes made.'
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DIR="$ROOT/history-repair-$STAMP"
mkdir -m 700 "$DIR"
# Stop the failing migration loop before snapshot and reconciliation.
docker stop --time 30 "$API" >/dev/null
docker exec -u postgres "$DB" pg_dump -U gotrue -d gotrue -Fc > "$DIR/before.dump"
[[ -s "$DIR/before.dump" ]] || die 'Backup empty; Auth left stopped.'
sha256sum "$DIR/before.dump" | tee "$DIR/SHA256SUMS"
# Only reconcile the exact observed version set, never synthesize versions or
# replay DDL. Keep both ledgers, every table, every account and the backup.
docker exec -i -u postgres "$DB" psql -X -v ON_ERROR_STOP=1 -U gotrue -d gotrue <<'SQL' | tee "$DIR/repair.log"
BEGIN;
LOCK TABLE public.schema_migrations, auth.schema_migrations IN ACCESS EXCLUSIVE MODE;
DO $$
DECLARE source_count integer; target_count integer;
BEGIN
  SELECT count(*) INTO source_count FROM public.schema_migrations;
  SELECT count(*) INTO target_count FROM auth.schema_migrations;
  IF source_count <> 70 OR target_count NOT IN (55, 70) THEN
    RAISE EXCEPTION 'Unexpected ledger counts: public %, auth %. Review required.', source_count, target_count;
  END IF;
  IF EXISTS (SELECT version FROM auth.schema_migrations EXCEPT SELECT version FROM public.schema_migrations) THEN
    RAISE EXCEPTION 'Auth contains versions absent from source; refusing reconciliation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '20260625000000') THEN
    RAISE EXCEPTION 'Expected latest applied source migration missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='auth' AND table_name='oauth_clients' AND column_name='token_endpoint_auth_method')
     OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='auth' AND table_name='oauth_clients' AND column_name='client_id') THEN
    RAISE EXCEPTION 'OAuth schema does not match the observed completed migrations';
  END IF;
END $$;
INSERT INTO auth.schema_migrations (version)
SELECT p.version FROM public.schema_migrations p
WHERE NOT EXISTS (SELECT 1 FROM auth.schema_migrations a WHERE a.version = p.version);
DO $$ BEGIN
  IF EXISTS (SELECT version FROM public.schema_migrations EXCEPT SELECT version FROM auth.schema_migrations)
     OR EXISTS (SELECT version FROM auth.schema_migrations EXCEPT SELECT version FROM public.schema_migrations) THEN
    RAISE EXCEPTION 'Ledger comparison failed';
  END IF;
END $$;
COMMIT;
SELECT 'public' AS ledger, count(*), min(version), max(version) FROM public.schema_migrations
UNION ALL
SELECT 'auth', count(*), min(version), max(version) FROM auth.schema_migrations;
SQL
# If SQL/backup fails, set -e leaves Auth stopped for investigation.
docker start "$API" >/dev/null
for i in $(seq 1 60); do
  if curl -fsS --max-time 5 https://auth-staging.bahasacerdas.com/auth/v1/health > "$DIR/health.json"; then
    echo 'PASS: existing applied migration versions reconciled; public history retained; Auth health is green.'
    echo "EVIDENCE=$DIR"
    exit 0
  fi
  sleep 2
done
die "Auth health still failing; inspect logs. Backup and evidence: $DIR"
