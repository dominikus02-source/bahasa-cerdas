#!/usr/bin/env bash
# BahasaCerdas safe, image-based rollback. No Git reset, migrations, or volume changes.
set -Eeuo pipefail
REPO="${BC_REPO:-/opt/bahasacerdas/apps/bahasa-cerdas}"
CONFIG="${BC_CONFIG_DIR:-/opt/bahasacerdas/config}"
STATE="${BC_ROLLBACK_DIR:-/opt/bahasacerdas/rollback}"
CONTAINER="bahasacerdas-prod-web-1"
IMAGE="bahasacerdas/web"
[[ $(id -u) -eq 0 ]] || { echo "Run as root" >&2; exit 1; }
for cmd in docker flock curl; do command -v "$cmd" >/dev/null || { echo "Missing $cmd" >&2; exit 1; }; done
[[ -f "$REPO/ops/vps/docker-compose.yml" && -f "$CONFIG/stack.env" ]] || { echo "Missing deployment files" >&2; exit 1; }
install -d -m 700 "$STATE"
exec 9>/tmp/bahasacerdas-deploy.lock
flock -n 9 || { echo "Another deployment/rollback is running" >&2; exit 1; }
cd "$REPO/ops/vps"
compose() { IMAGE_TAG="$1" docker compose --env-file "$CONFIG/stack.env" "${@:2}"; }
ready() {
  local i
  for i in $(seq 1 24); do
    if [[ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$CONTAINER" 2>/dev/null)" == healthy ]] &&
       curl -fsS --max-time 5 http://127.0.0.1:3000/api/health >/dev/null &&
       curl -fsS --max-time 8 http://127.0.0.1:3000/ >/dev/null; then return 0; fi
    sleep 5
  done
  return 1
}
case "${1:-}" in
  --mark-stable)
    # Promotion is explicit; do this only after login, reset and major pages pass.
    ready || { echo "Web is not healthy; refusing to mark stable" >&2; exit 1; }
    sha=$(runuser -u bcadmin -- git -C "$REPO" rev-parse --short=12 HEAD)
    [[ "$sha" =~ ^[a-f0-9]{12}$ ]] || exit 1
    tag="stable-$sha"
    current=$(docker inspect -f '{{.Image}}' "$CONTAINER")
    docker tag "$current" "$IMAGE:$tag"
    printf '%s\n' "$tag" > "$STATE/stable.tmp"
    chmod 600 "$STATE/stable.tmp"
    mv -f "$STATE/stable.tmp" "$STATE/stable"
    echo "Promoted verified image: $IMAGE:$tag"
    ;;
  "")
    [[ -s "$STATE/stable" ]] || { echo "No verified stable image. First run bcrollback --mark-stable after full manual smoke tests." >&2; exit 2; }
    tag=$(cat "$STATE/stable")
    [[ "$tag" =~ ^stable-[a-f0-9]{12}$ ]] || { echo "Invalid stable marker" >&2; exit 2; }
    docker image inspect "$IMAGE:$tag" >/dev/null || { echo "Stable Docker image unavailable. Aborting without changes." >&2; exit 2; }
    old=$(docker inspect -f '{{.Image}}' "$CONTAINER")
    backup="rescue-$(date +%Y%m%d%H%M%S)"
    docker tag "$old" "$IMAGE:$backup"
    echo "Switching web to verified image $IMAGE:$tag"
    if compose "$tag" up -d --no-deps --no-build --force-recreate web && ready; then
      echo "ROLLBACK OK: container healthy, /api/health and / return HTTP 2xx"
    else
      echo "Rollback check failed; restoring previous image" >&2
      compose "$backup" up -d --no-deps --no-build --force-recreate web || true
      ready || echo "ALERT: previous image also unhealthy; operator intervention required" >&2
      exit 1
    fi
    ;;
  *)
    echo "Usage: bcrollback [--mark-stable]" >&2; exit 2
    ;;
esac
