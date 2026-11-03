#!/usr/bin/env bash
# Safe web release, called by deploy.sh from ops/vps (deploy lock already held).
#   1. keep the running image as bahasacerdas/web:prev-<stamp> (lib-prev-image.sh:
#      if its ID vanished, commit the running container; else newest prev-*)
#   2. build the new image
#   3. pg_dump --schema-only backup
#   4. prisma migrate deploy (only when the ledger has no gaps) — BEFORE the swap
#   5. up -d --force-recreate web, health check (same check as bcrollback.sh)
#   6. unhealthy → re-tag + recreate the previous image, exit 1
# Migrations must stay additive: an image rollback never reverts the schema.
set -Eeuo pipefail
export LC_ALL=C
CONFIG_DIR="${BC_CONFIG_DIR:-/opt/bahasacerdas/config}"
REPO_DIR="${REPO_DIR:-$(cd ../.. && pwd)}"
CONTAINER="${BC_WEB_CONTAINER:-bahasacerdas-prod-web-1}"
IMAGE="bahasacerdas/web"
DB_CONTAINER="${BC_DB_CONTAINER:-supabase-db}"
BACKUP_DIR="${BC_DEPLOY_BACKUP_DIR:-/opt/bahasacerdas/backups/deploy}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TAG="${IMAGE_TAG:-$(grep -m1 '^IMAGE_TAG=' "$CONFIG_DIR/stack.env" 2>/dev/null | cut -d= -f2- | tr -d "\"' " || true)}"
TAG="${TAG:-local}"
COMPOSE=(docker compose --env-file "$CONFIG_DIR/stack.env")
die() { echo "STOP: $*" >&2; exit 1; }

# DB connection = what the running web uses (DIRECT_URL preferred), else web.env.
db_url() {
  local env
  env="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$CONTAINER" 2>/dev/null || cat "$CONFIG_DIR/web.env")"
  { grep -m1 '^DIRECT_URL=' <<<"$env" || grep -m1 '^DATABASE_URL=' <<<"$env"; } | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}
DB_URL="${BC_DB_URL:-$(db_url)}"
[[ "$DB_URL" =~ ^postgres(ql)?:// ]] || die "no DIRECT_URL/DATABASE_URL found"
mapfile -t DBP < <(python3 -c 'import sys;from urllib.parse import urlparse,unquote;u=urlparse(sys.argv[1]);print(unquote(u.username or "postgres"));print(unquote(u.password or ""));print(u.hostname or "")' "$DB_URL")
DB_USER="${DBP[0]}" DB_PASS="${DBP[1]}" DB_HOST="${DBP[2]}"
export PGPASSWORD="$DB_PASS" DATABASE_URL="$DB_URL" DIRECT_URL="$DB_URL"
# Overridable for local tests only; production uses the DB container like jumpa-production-schema.sh.
if [[ -n "${BC_PSQL:-}" ]]; then read -r -a PSQL <<<"$BC_PSQL"; else PSQL=(docker exec -i -e PGPASSWORD "$DB_CONTAINER" psql -X -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1); fi
if [[ -n "${BC_PG_DUMP:-}" ]]; then read -r -a PG_DUMP <<<"$BC_PG_DUMP"; else PG_DUMP=(docker exec -e PGPASSWORD "$DB_CONTAINER" pg_dump -U "$DB_USER" -d postgres --schema-only); fi
sql() { "${PSQL[@]}" -Atc "$1"; }

ready() {  # bcrollback.sh check + the old deploy.sh db==up check
  local _
  for _ in $(seq 1 "${BC_READY_TRIES:-24}"); do
    if [[ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$CONTAINER" 2>/dev/null)" == healthy ]] &&
       curl -fsS --max-time 5 http://127.0.0.1:3000/api/health | jq -e '.status == "ok" and .db == "up"' >/dev/null &&
       curl -fsS --max-time 8 http://127.0.0.1:3000/ >/dev/null; then return 0; fi
    sleep "${BC_READY_SLEEP:-5}"
  done
  return 1
}

echo "==> Keeping previous web image"
# shellcheck source=ops/vps/lib-prev-image.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib-prev-image.sh"
keep_previous_image "$CONTAINER" "$IMAGE" "$STAMP"
PREV="$PREV_REF"

echo "==> Building web"
"${COMPOSE[@]}" build web

echo "==> Schema backup"
install -d -m 700 "$BACKUP_DIR"
"${PG_DUMP[@]}" > "$BACKUP_DIR/schema-$STAMP.sql" || die "pg_dump failed; web not swapped"
[[ -s "$BACKUP_DIR/schema-$STAMP.sql" ]] || die "empty schema backup; web not swapped"
echo "schema backup: $BACKUP_DIR/schema-$STAMP.sql"

echo "==> Database migrations"
[[ "$(sql "select to_regclass('public._prisma_migrations') is not null")" == t ]] || die "_prisma_migrations missing; baseline the ledger first"
[[ "$(sql "select count(*) from _prisma_migrations where finished_at is null and rolled_back_at is null")" == 0 ]] || die "unfinished migration in ledger; inspect before deploying"
APPLIED="$(sql "select migration_name from _prisma_migrations where finished_at is not null and rolled_back_at is null")"
LAST="$(sort <<<"$APPLIED" | tail -1)"
[[ -n "$LAST" ]] || die "_prisma_migrations is empty; baseline the ledger first (prisma migrate resolve --applied ...)"
PENDING=()
for d in "$REPO_DIR"/prisma/migrations/*/; do
  m="$(basename "$d")"; [[ -f "$d/migration.sql" ]] || continue   # skips prisma/migrations/manual (loose SQL, not Prisma migrations)
  grep -qxF "$m" <<<"$APPLIED" && continue
  [[ "$m" > "$LAST" ]] || die "migration $m is older than the last applied ($LAST) but missing from the ledger; baseline/resolve it manually, nothing was changed"
  PENDING+=("$m")
done
if (( ${#PENDING[@]} )); then
  echo "pending: ${PENDING[*]}"
  WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
  cp -r "$REPO_DIR/prisma" "$WORK/prisma"
  rm -rf "$WORK/prisma/migrations/manual"   # Prisma treats it as a migration dir (P3015)
  if [[ -n "${BC_PRISMA:-}" ]]; then
    (cd "$WORK" && $BC_PRISMA migrate deploy --schema prisma/schema.prisma) || die "prisma migrate deploy failed; web not swapped (backup: $BACKUP_DIR/schema-$STAMP.sql)"
  else
    case "$DB_HOST" in
      127.0.0.1|localhost|103.242.10.81) NET=host ;;
      *) NET="$(docker inspect -f '{{range $n, $_ := .NetworkSettings.Networks}}{{println $n}}{{end}}' "$DB_CONTAINER" | grep -xF -f <(docker inspect -f '{{range $n, $_ := .NetworkSettings.Networks}}{{println $n}}{{end}}' "$CONTAINER") | head -1)" ;;
    esac
    [[ -n "$NET" ]] || die "cannot find a docker network shared by $CONTAINER and $DB_CONTAINER"
    chmod -R a+rX "$WORK"
    docker run --rm --network "$NET" -e DATABASE_URL -e DIRECT_URL -v "$WORK/prisma:/work/prisma:ro" -w /work node:22-bookworm \
      npx --yes prisma@5.22.0 migrate deploy --schema prisma/schema.prisma \
      || die "prisma migrate deploy failed; web not swapped (backup: $BACKUP_DIR/schema-$STAMP.sql)"
  fi
else
  echo "no pending migrations"
fi

echo "==> Starting Redis + new web"
"${COMPOSE[@]}" up -d redis
"${COMPOSE[@]}" up -d --no-deps --no-build --force-recreate web
if ready; then
  echo "Web health OK"
  # Pin the image now live under its own tag: another build re-pointing
  # $IMAGE:$TAG can then never orphan it, and the next deploy can roll back.
  docker tag "$IMAGE:$TAG" "$IMAGE:prev-$STAMP-live" && echo "live image pinned: $IMAGE:prev-$STAMP-live" || echo "WARNING: could not pin live image tag" >&2
  exit 0
fi

echo "Web health check FAILED" >&2
"${COMPOSE[@]}" ps web >&2 || true
docker logs --tail 80 "$CONTAINER" >&2 || true
[[ -n "$PREV" ]] || die "no previous image to roll back to; operator intervention required"
echo "==> Rolling back web to $PREV" >&2
docker tag "$IMAGE:$TAG" "$IMAGE:failed-$STAMP" || true
docker tag "$PREV" "$IMAGE:$TAG"
"${COMPOSE[@]}" up -d --no-deps --no-build --force-recreate web || true
if ready; then echo "ROLLBACK OK: previous image healthy (failed image kept as $IMAGE:failed-$STAMP)" >&2
else echo "ALERT: previous image also unhealthy; operator intervention required" >&2; fi
exit 1
