#!/usr/bin/env bash
# Simulates the VPS docker state with a fake `docker` on PATH and checks that
# deploy-web.sh / lib-prev-image.sh keep a rollback image even when the running
# container's image ID vanished (deploy failure of 3 Nov 2026), and that the
# ops scripts never prune tagged images. No real docker, DB or network used.
# shellcheck disable=SC2016  # single-quoted bash -c bodies use their own "$1"
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "  ok   $*"; }
bad() { fail=$((fail+1)); echo "  FAIL $*"; }
check() { local d="$1"; shift; if "$@"; then ok "$d"; else bad "$d"; fi; }

mkdir -p "$T/bin"
# Fake docker. State via env: RUN_ID (running image id, "" = no container),
# RUNNING (true/false), IMG_EXISTS (1/0), COMMIT_OK (1/0), PREV_TAGS (lines),
# HEALTH (healthy/unhealthy). Every call is appended to $DOCKER_LOG.
cat > "$T/bin/docker" <<'FAKE'
#!/usr/bin/env bash
echo "docker $*" >> "$DOCKER_LOG"
case "$1" in
  inspect)
    [[ -n "${RUN_ID:-}" ]] || exit 1
    case "$3" in
      '{{.Image}}') echo "$RUN_ID" ;;
      '{{.State.Running}}') echo "${RUNNING:-true}" ;;
      *Health*) echo "${HEALTH:-healthy}" ;;
      *) echo "" ;;
    esac ;;
  image)
    case "$2" in
      inspect) [[ "${IMG_EXISTS:-1}" == 1 ]] ;;
      ls) printf '%s\n' local ${PREV_TAGS:-} pre-jumpa-20991231t000000z stable-abc ;;
      *) exit 0 ;;
    esac ;;
  commit) [[ "${COMMIT_OK:-1}" == 1 ]] ;;
  tag) [[ "$2" != sha256:* || "${IMG_EXISTS:-1}" == 1 ]] || { echo "Error response from daemon: No such image: $2" >&2; exit 1; } ;;
  logs|compose) exit 0 ;;
  *) exit 0 ;;
esac
FAKE
cat > "$T/bin/curl" <<'FAKE'
#!/usr/bin/env bash
[[ "${HEALTH:-healthy}" == healthy ]] || exit 22
echo '{"status":"ok","db":"up"}'
FAKE
chmod +x "$T/bin/docker" "$T/bin/curl"
export PATH="$T/bin:$PATH" DOCKER_LOG="$T/docker.log"

run_lib() {  # prints PREV_REF on stdout (last line)
  : > "$DOCKER_LOG"
  bash -c 'set -Eeuo pipefail; source "$1"; keep_previous_image c bahasacerdas/web 20261103T030000Z 2>/dev/null >/dev/null; echo "$PREV_REF"' _ "$ROOT/ops/vps/lib-prev-image.sh"
}
logged() { grep -qF -- "$1" "$DOCKER_LOG"; }

echo "lib-prev-image.sh"
r="$(RUN_ID=sha256:aaa RUNNING=true IMG_EXISTS=1 run_lib)"
check "image present -> tag prev-<stamp>" [ "$r" = bahasacerdas/web:prev-20261103T030000Z ]
check "image present -> docker tag of running id" logged "docker tag sha256:aaa bahasacerdas/web:prev-20261103T030000Z"
check "image present -> no commit" bash -c '! grep -q "docker commit" "$1"' _ "$DOCKER_LOG"

r="$(RUN_ID=sha256:52b1 RUNNING=true IMG_EXISTS=0 run_lib)"
check "image missing + running -> commit to prev-<stamp>" [ "$r" = bahasacerdas/web:prev-20261103T030000Z ]
check "commit never pauses prod" logged "docker commit --pause=false"
check "image missing -> no docker tag of vanished id" bash -c '! grep -q "docker tag sha256:52b1" "$1"' _ "$DOCKER_LOG"

r="$(RUN_ID=sha256:52b1 RUNNING=false IMG_EXISTS=0 PREV_TAGS=$'prev-20261102T130937Z\nprev-20261103T015632Z\nprev-20261102T214857Z' run_lib)"
check "not running -> newest prev-* tag" [ "$r" = bahasacerdas/web:prev-20261103T015632Z ]
check "not running -> no commit" bash -c '! grep -q "docker commit" "$1"' _ "$DOCKER_LOG"

r="$(RUN_ID=sha256:52b1 RUNNING=true IMG_EXISTS=0 COMMIT_OK=0 PREV_TAGS=$'prev-20261101T000000Z\nprev-20261102T000000Z-live' run_lib)"
check "commit fails -> newest prev-* (incl. -live pin)" [ "$r" = bahasacerdas/web:prev-20261102T000000Z-live ]

r="$(RUN_ID='' RUNNING='' IMG_EXISTS=0 PREV_TAGS='' run_lib)"
check "nothing at all -> empty, no failure" [ -z "$r" ]

echo "deploy-web.sh end to end (fake docker/DB)"
mkdir -p "$T/config" "$T/backup"
echo IMAGE_TAG=local > "$T/config/stack.env"
# Fake psql: ledger table exists, nothing unfinished, every repo migration applied.
APPLIED="$(for d in "$ROOT"/prisma/migrations/*/; do if [[ -f "$d/migration.sql" ]]; then basename "$d"; fi; done)"
printf '%s\n' "$APPLIED" > "$T/applied"
cat > "$T/bin/fakepsql" <<FAKE
#!/usr/bin/env bash
q="\${*: -1}"
case "\$q" in
  *to_regclass*) echo t ;;
  *"count(*)"*) echo 0 ;;
  *) cat "$T/applied" ;;
esac
FAKE
chmod +x "$T/bin/fakepsql"
deploy() {
  : > "$DOCKER_LOG"
  (cd "$ROOT/ops/vps" && env BC_CONFIG_DIR="$T/config" REPO_DIR="$ROOT" BC_DEPLOY_BACKUP_DIR="$T/backup" \
     BC_DB_URL=postgresql://u:p@127.0.0.1:5432/postgres BC_PSQL="$T/bin/fakepsql" BC_PG_DUMP="echo -- schema" \
     BC_READY_TRIES=1 BC_READY_SLEEP=0 "$@" bash ./deploy-web.sh) > "$T/out" 2>&1
}
set +e
deploy RUN_ID=sha256:52b1 RUNNING=true IMG_EXISTS=0 HEALTH=healthy; rc=$?
set -e
check "missing image + healthy -> exit 0" [ "$rc" = 0 ]
check "missing image + healthy -> committed rollback" logged "docker commit --pause=false"
check "healthy -> live image pinned as prev-<stamp>-live" grep -qE "docker tag bahasacerdas/web:local bahasacerdas/web:prev-[0-9]{8}T[0-9]{6}Z-live" "$DOCKER_LOG"
check "warning logged" grep -q "WARNING: running web image sha256:52b1 no longer exists" "$T/out"

set +e
deploy RUN_ID=sha256:52b1 RUNNING=true IMG_EXISTS=0 HEALTH=unhealthy; rc=$?
set -e
check "unhealthy -> exit 1" [ "$rc" = 1 ]
check "unhealthy -> failed image kept" grep -qE "docker tag bahasacerdas/web:local bahasacerdas/web:failed-" "$DOCKER_LOG"
check "unhealthy -> rollback re-tags committed prev to :local" grep -qE "docker tag bahasacerdas/web:prev-[0-9]{8}T[0-9]{6}Z bahasacerdas/web:local" "$DOCKER_LOG"
check "unhealthy -> web recreated for rollback" bash -c '[ "$(grep -c "force-recreate web" "$1")" -ge 2 ]' _ "$DOCKER_LOG"
check "backup + migrate guard still run" bash -c 'grep -q "==> Schema backup" "$1" && grep -q "no pending migrations" "$1"' _ "$T/out"

echo "prune safety (static)"
for f in "$ROOT"/ops/vps/*.sh; do
  n="$(basename "$f")"
  check "$n: no 'image prune -a' / 'system prune'" bash -c '! grep -nE "image[[:space:]]+prune[^#]*(-a|--all)|system[[:space:]]+prune" "$1"' _ "$f"
  check "$n: no rmi / image rm of web tags" bash -c '! grep -nE "docker[[:space:]]+(rmi|image[[:space:]]+rm)" "$1"' _ "$f"
done

echo "deploy-web prev test: $pass passed, $fail failed"
[ "$fail" = 0 ]
