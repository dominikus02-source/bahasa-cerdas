#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/bahasacerdas/apps/bahasa-cerdas}"
GITHUB_REPO="${GITHUB_REPO:-dominikus02-source/bahasa-cerdas}"

cd "$REPO_DIR"

git fetch --quiet origin main
target="$(git rev-parse FETCH_HEAD)"
current="$(git rev-parse HEAD)"

if [[ "$target" == "$current" ]]; then
  exit 0
fi

checks="$(curl -fsS --max-time 15 \
  -H 'Accept: application/vnd.github+json' \
  "https://api.github.com/repos/$GITHUB_REPO/commits/$target/check-runs?per_page=100")"

state="$(jq -r '
  [.check_runs[] | select(.name == "build")] as $b
  | if ($b | length) == 0 then "missing"
    elif any($b[]; .status == "completed" and .conclusion == "success") then "success"
    elif any($b[]; .status != "completed") then "pending"
    else "failed"
    end
' <<<"$checks")"

case "$state" in
  success)
    echo "[autodeploy] CI green for $target; deploying"
    DEPLOY_BRANCH=main \
    ENABLE_REALTIME=1 \
    ENABLE_AGENT=1 \
    ENABLE_EDGE=1 \
    ENABLE_CRON=1 \
    bash ops/vps/deploy.sh
    ;;
  pending|missing)
    echo "[autodeploy] CI not ready for $target ($state); waiting"
    ;;
  *)
    echo "[autodeploy] CI failed for $target; refusing deploy" >&2
    ;;
esac
