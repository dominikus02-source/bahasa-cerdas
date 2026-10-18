#!/usr/bin/env bash
set -euo pipefail
bcCaddyContainer=bahasacerdas-prod-caddy-1
bcConfigSource=/opt/bahasacerdas/apps/bahasa-cerdas/ops/vps/Caddyfile.cutover
# Read the host file explicitly: a single-file bind mount can retain an old inode.
test -s "$bcConfigSource"
docker exec -i "$bcCaddyContainer" caddy adapt --config - --adapter caddyfile --validate < "$bcConfigSource" > /dev/null
docker exec -i "$bcCaddyContainer" caddy reload --config - --adapter caddyfile < "$bcConfigSource"
