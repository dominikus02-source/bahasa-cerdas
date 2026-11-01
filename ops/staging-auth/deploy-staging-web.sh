#!/usr/bin/env bash
# Build and replace only jumpa-web-staging. The existing image/env are backed up.
set -Eeuo pipefail
APP_DIR="/opt/bahasacerdas/staging/jumpa/app"
WEB_ENV="/opt/bahasacerdas/staging/jumpa/web.env"
FRAGMENT="/opt/bahasacerdas/staging/auth/web.env.fragment"
COMPOSE_FILE="$APP_DIR/ops/staging-auth/docker-compose.web.yml"
ROOT="/opt/bahasacerdas/staging/auth"
PROJECT="jumpa-staging-web"
IMAGE="bahasacerdas/jumpa-web:staging"
STAMP="$(date +%Y%m%d%H%M%S)"
ENV_BACKUP="$WEB_ENV.bak.$STAMP"
BACKUP_TAG="bahasacerdas/jumpa-web:rollback-$STAMP"
DEPLOYED=0

die(){ echo "STOP: $*" >&2; exit 1; }
restore_env(){ [[ -f "$ENV_BACKUP" ]] && cp -a "$ENV_BACKUP" "$WEB_ENV"; }
on_error(){
  rc=$?
  if [[ "$DEPLOYED" != "1" ]]; then restore_env; fi
  exit "$rc"
}
trap on_error ERR

[[ $EUID -eq 0 ]] || die "Jalankan sebagai root."
[[ "$APP_DIR" == /opt/bahasacerdas/staging/* ]] || die "App path is not staging."
[[ -d "$APP_DIR/.git" ]] || die "Staging Git checkout missing."
[[ -f "$WEB_ENV" && -f "$FRAGMENT" && -f "$COMPOSE_FILE" ]] || die "Web env, fragment or Compose file missing."
[[ "$(git -C "$APP_DIR" branch --show-current)" == "staging/jumpa-auth-storage-split-20261101" ]] || die "Checkout branch staging/jumpa-auth-storage-split-20261101 first."
docker inspect jumpa-web-staging >/dev/null 2>&1 || die "Existing staging web container missing."
command -v curl >/dev/null && command -v jq >/dev/null || die "curl and jq are required."
curl -fsS --max-time 8 http://127.0.0.1:13000/api/health | jq -e '.status == "ok" and .db == "up"' >/dev/null || die "Current staging web health is not green; refusing replacement."

cp -a "$WEB_ENV" "$ENV_BACKUP"
python3 - "$WEB_ENV" "$FRAGMENT" <<'PY'
import sys
from pathlib import Path
env_path, fragment_path = map(Path, sys.argv[1:])
updates={}
for line in fragment_path.read_text().splitlines():
    if line and not line.lstrip().startswith("#") and "=" in line:
        k,v=line.split("=",1); updates[k]=v
lines=[]
for line in env_path.read_text().splitlines():
    key=line.split("=",1)[0] if "=" in line and not line.lstrip().startswith("#") else None
    if key not in updates:
        lines.append(line)
lines.extend(f"{k}={v}" for k,v in updates.items())
env_path.write_text("\n".join(lines)+"\n")
PY
chmod 600 "$WEB_ENV"

OLD_IMAGE_ID="$(docker inspect -f '{{.Image}}' jumpa-web-staging)"
docker tag "$OLD_IMAGE_ID" "$BACKUP_TAG"

export STAGING_APP_DIR="$APP_DIR"
export STAGING_WEB_ENV_FILE="$WEB_ENV"
export STAGING_DOCKER_NETWORK="jumpa-staging-net"
export WEB_BUILD_FINGERPRINT="$STAMP"

docker compose --project-name "$PROJECT" --env-file "$ROOT/.env" -f "$COMPOSE_FILE" build web

# Replace only the staging web container after the image has built successfully.
docker rm -f jumpa-web-staging >/dev/null
if ! docker compose --project-name "$PROJECT" --env-file "$ROOT/.env" -f "$COMPOSE_FILE" up -d --no-build web; then
  restore_env
  docker tag "$BACKUP_TAG" "$IMAGE"
  docker compose --project-name "$PROJECT" --env-file "$ROOT/.env" -f "$COMPOSE_FILE" up -d --no-build --force-recreate web || true
  die "Staging web start failed; previous image/env restored."
fi

for i in $(seq 1 40); do
  if curl -fsS --max-time 5 http://127.0.0.1:13000/api/health | jq -e '.status == "ok" and .db == "up"' >/dev/null; then
    DEPLOYED=1
    trap - ERR
    echo "PASS: jumpa-web-staging health is green."
    echo "Previous image backup: $BACKUP_TAG"
    echo "Previous env backup: $ENV_BACKUP"
    exit 0
  fi
  sleep 3
done

echo "Health check failed; restoring previous staging image/env." >&2
docker rm -f jumpa-web-staging >/dev/null 2>&1 || true
restore_env
docker tag "$BACKUP_TAG" "$IMAGE"
docker compose --project-name "$PROJECT" --env-file "$ROOT/.env" -f "$COMPOSE_FILE" up -d --no-build --force-recreate web || true
die "New staging web failed health check; previous image/env restored."
