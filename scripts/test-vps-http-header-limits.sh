#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for config in ops/vps/Caddyfile ops/vps/Caddyfile.test ops/vps/Caddyfile.cutover; do
  if ! grep -Eq '^[[:space:]]*max_header_size 32KiB[[:space:]]*$' "$config"; then
    echo "FAIL: $config must set Caddy max_header_size to 32KiB" >&2
    exit 1
  fi
done

compose="ops/vps/docker-compose.yml"
node_limit_count="$(grep -Fc 'NODE_OPTIONS: "--max-http-header-size=32768"' "$compose" || true)"
if [[ "$node_limit_count" -ne 2 ]]; then
  echo "FAIL: web and realtime game services must both use Node's 32 KiB header cap (found $node_limit_count)" >&2
  exit 1
fi

if ! grep -Fq 'image: caddy:2.11.7-alpine' "$compose"; then
  echo "FAIL: Caddy image must be version-pinned to the tested 2.11.7 release" >&2
  exit 1
fi

deploy="ops/vps/deploy.sh"
for marker in 'pull caddy' 'caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile' 'caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile' 'HTTP header-size smoke (20 KiB Cookie)'; do
  if ! grep -Fq "$marker" "$deploy"; then
    echo "FAIL: deployment must include: $marker" >&2
    exit 1
  fi
done

echo "PASS: Caddy and Node header limits are aligned at 32 KiB; deploy validates/reloads Caddy and probes a 20 KiB Cookie."
