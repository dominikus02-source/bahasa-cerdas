#!/usr/bin/env bash
# Safe operator-gated release for BahasaCerdas. Default: read-only preflight.
set -Eeuo pipefail
REPO="${BC_REPO:-/opt/bahasacerdas/apps/bahasa-cerdas}"
CONFIG="${BC_CONFIG_DIR:-/opt/bahasacerdas/config}"
BACKUPS="${BC_BACKUP_DIR:-/opt/bahasacerdas/backups}"
MODE="${1:---check}"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || { echo "Usage: bcpushtoupdate [--check|--apply]"; exit 2; }
[[ $(id -u) -eq 0 ]] || { echo "Run as root" >&2; exit 1; }
for cmd in git docker jq curl python3 pg_dump pg_restore npx runuser flock; do
  command -v "$cmd" >/dev/null || { echo "Missing dependency: $cmd" >&2; exit 1; }
done
[[ -f "$REPO/.git/HEAD" && -f "$CONFIG/web.env" && -f "$CONFIG/stack.env" ]] || { echo "Missing repo/config" >&2; exit 1; }
[[ -x /usr/local/bin/bcrollback ]] || { echo "bcrollback not installed" >&2; exit 1; }
[[ -s /opt/bahasacerdas/rollback/stable ]] || { echo "No verified stable image; run bcrollback --mark-stable after manual verification" >&2; exit 1; }
gitbc() { runuser -u bcadmin -- git -C "$REPO" "$@"; }
[[ -z "$(gitbc status --porcelain)" ]] || { echo "Dirty checkout: stop" >&2; exit 1; }
gitbc fetch origin main
[[ "$(gitbc branch --show-current)" == "main" ]] || { echo "Checkout must be main" >&2; exit 1; }
HEAD="$(gitbc rev-parse HEAD)"
TARGET="$(gitbc rev-parse origin/main)"
[[ "$HEAD" == "$TARGET" ]] || { echo "Local main differs from origin/main; stop (no implicit pull)" >&2; exit 1; }
[[ -n "${BC_APPROVED_SHA:-}" && "$TARGET" == "$BC_APPROVED_SHA" ]] || { echo "Set BC_APPROVED_SHA to reviewed origin/main full SHA" >&2; exit 1; }
[[ "$TARGET" =~ ^[a-f0-9]{40}$ ]] || exit 1
# Require GitHub CLI authenticated for checks. Never assume a green old commit means green main.
command -v gh >/dev/null || { echo "gh CLI required for CI verification" >&2; exit 1; }
RUNS="$(gh api "repos/dominikus02-source/bahasa-cerdas/actions/runs?head_sha=$TARGET&per_page=100")"
jq -e '[.workflow_runs[] | select(.head_sha == $sha)] | length > 0' --arg sha "$TARGET" <<<"$RUNS" >/dev/null ||
  { echo "No workflow runs for exact main SHA" >&2; exit 1; }
jq -e '[.workflow_runs[] | select(.head_sha == $sha)] | all(.status == "completed" and .conclusion == "success")' --arg sha "$TARGET" <<<"$RUNS" >/dev/null ||
  { echo "CI not fully green for exact main SHA" >&2; exit 1; }
# Refuse automatic migration unless schema tools and a real backup target exist.
[[ -f "$REPO/prisma/schema.prisma" ]] || exit 1
[[ -f "$REPO/node_modules/.bin/prisma" ]] || { echo "Host Prisma CLI missing; prepare dependencies outside production first" >&2; exit 1; }
[[ -f "$REPO/ops/vps/deploy.sh" ]] || exit 1
echo "PRECHECK PASS: main=$TARGET, CI=success, stable rollback image exists"
if [[ "$MODE" == "--check" ]]; then
  echo "DRY RUN ONLY. To release later: BC_APPROVED_SHA=$TARGET BC_MAINTENANCE_CONFIRMED=1 bcpushtoupdate --apply"
  exit 0
fi
[[ "${BC_MAINTENANCE_CONFIRMED:-0}" == "1" ]] || { echo "Explicit maintenance approval required" >&2; exit 1; }
[[ "${BC_BACKUP_VERIFIED:-0}" == "1" ]] || { echo "Operator must verify a restorable backup plan (BC_BACKUP_VERIFIED=1)" >&2; exit 1; }
# Backup is taken BEFORE migration; never auto-restore PostgreSQL on failure.
install -d -m 700 "$BACKUPS"
BACKUP="$BACKUPS/bc-predeploy-$(date -u +%Y%m%dT%H%M%SZ)-${TARGET:0:12}.dump"
python3 - "$CONFIG/web.env" "$BACKUP" <<'PY'
import os,sys,subprocess
from urllib.parse import urlsplit,urlunsplit,parse_qsl,urlencode
path,out=sys.argv[1:]
vals={}
for line in open(path):
    line=line.strip()
    if not line or line.startswith("#") or "=" not in line: continue
    k,v=line.split("=",1)
    vals[k.strip()]=v.strip().strip('"').strip("'")
url=vals.get("DIRECT_URL") or vals.get("DATABASE_URL")
if not url: raise SystemExit("Missing DIRECT_URL/DATABASE_URL")
parts=urlsplit(url)
if parts.scheme not in ("postgres","postgresql"): raise SystemExit("Not a PostgreSQL URL")
query=urlencode([(k,v) for k,v in parse_qsl(parts.query) if k not in ("schema","pgbouncer")])
clean=urlunsplit((parts.scheme,parts.netloc,parts.path,query,parts.fragment))
subprocess.run(["pg_dump","--format=custom","--file",out,"--dbname",clean],check=True)
subprocess.run(["pg_restore","--list",out],check=True,stdout=subprocess.DEVNULL)
print("Backup archive created and structurally readable:",out)
PY
chmod 600 "$BACKUP"
# Prisma runs with DB connection string from protected env file, without shell-sourcing secrets.
python3 - "$CONFIG/web.env" "$REPO" <<'PY'
import os,sys,subprocess
env=os.environ.copy()
for line in open(sys.argv[1]):
    line=line.strip()
    if not line or line.startswith("#") or "=" not in line: continue
    k,v=line.split("=",1)
    env[k.strip()]=v.strip().strip('"').strip("'")
subprocess.run(["./node_modules/.bin/prisma","migrate","deploy"],cwd=sys.argv[2],env=env,check=True)
PY
echo "Migration applied. Deploying app; database changes are NOT automatically reversible."
if ! (cd "$REPO" && bash ops/vps/deploy.sh); then
  echo "DEPLOY FAILED; attempting web-image rollback only" >&2
  /usr/local/bin/bcrollback || true
  echo "Manual DB compatibility review required; backup at $BACKUP" >&2
  exit 1
fi
if ! curl -4 -fsS --max-time 15 https://www.bahasacerdas.com/api/health | jq -e '.status == "ok" and .db == "up"' >/dev/null; then
  echo "Post-deploy web health failed; attempting web rollback" >&2
  /usr/local/bin/bcrollback || true
  exit 1
fi
echo "DEPLOY OK; manual JUMPA health, LiveKit media and user flows still required. Backup: $BACKUP"
