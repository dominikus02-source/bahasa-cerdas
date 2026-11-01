#!/usr/bin/env bash
# Creates a point-in-time backup of staging GoTrue + Storage metadata and objects.
# This script never references production containers, databases or volumes.
set -Eeuo pipefail
umask 077

ROOT="/opt/bahasacerdas/staging"
APP_DIR="$ROOT/jumpa/app"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_ROOT="$ROOT/backups/jumpa-auth-storage"
BACKUP_DIR="$BACKUP_ROOT/$STAMP"

die(){ echo "STOP: $*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || die "Run as root."
command -v docker >/dev/null || die "Docker is required."
command -v sha256sum >/dev/null || die "sha256sum is required."
docker info >/dev/null 2>&1 || die "Docker daemon is unavailable."

for container in jumpa-auth-db-staging jumpa-storage-db-staging jumpa-storage-staging; do
  docker inspect "$container" >/dev/null 2>&1 || die "Missing staging container: $container"
  state="$(docker inspect -f '{{.State.Status}}' "$container")"
  [[ "$state" == "running" ]] || die "$container is not running."
done

for volume in jumpa_auth_staging_db jumpa_storage_staging_db jumpa_storage_staging_files; do
  docker volume inspect "$volume" >/dev/null 2>&1 || die "Missing staging volume: $volume"
done

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_ROOT" "$BACKUP_DIR"

docker exec jumpa-auth-db-staging pg_dump -U gotrue -d gotrue -Fc > "$BACKUP_DIR/auth-db.dump"
[[ -s "$BACKUP_DIR/auth-db.dump" ]] || die "Auth database dump is empty."

docker exec jumpa-storage-db-staging pg_dump -U postgres -d storage -Fc > "$BACKUP_DIR/storage-db.dump"
[[ -s "$BACKUP_DIR/storage-db.dump" ]] || die "Storage database dump is empty."

docker run --rm --network none \
  -v jumpa_storage_staging_files:/data:ro \
  -v "$BACKUP_DIR:/backup" \
  alpine:3.20 sh -ec 'tar -czf /backup/storage-files.tar.gz -C /data .'
[[ -s "$BACKUP_DIR/storage-files.tar.gz" ]] || die "Storage files archive is empty."

GIT_SHA="unknown"
if [[ -d "$APP_DIR/.git" ]]; then GIT_SHA="$(git -C "$APP_DIR" rev-parse HEAD)"; fi
cat > "$BACKUP_DIR/backup-manifest.txt" <<EOF
created_utc=$STAMP
staging_git_sha=$GIT_SHA
auth_database=jumpa-auth-db-staging/gotrue
storage_database=jumpa-storage-db-staging/storage
storage_files_volume=jumpa_storage_staging_files
auth_database_dump=auth-db.dump
storage_database_dump=storage-db.dump
storage_files_archive=storage-files.tar.gz
EOF

(
  cd "$BACKUP_DIR"
  sha256sum auth-db.dump storage-db.dump storage-files.tar.gz backup-manifest.txt > SHA256SUMS
  sha256sum -c SHA256SUMS
)
chmod -R go-rwx "$BACKUP_DIR"
echo "PASS: staging Auth/Storage backup created and checksummed."
echo "BACKUP_DIR=$BACKUP_DIR"
