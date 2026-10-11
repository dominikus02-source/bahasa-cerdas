#!/usr/bin/env bash
set -euo pipefail

CONFIG_DIR="${BC_STAGING_CONFIG_DIR:-/opt/bahasacerdas/config/staging}"
mkdir -p "$CONFIG_DIR"
umask 077

if [[ ! -f "$CONFIG_DIR/stack.env" ]]; then
  printf 'REDIS_PASSWORD=%s\n' "$(openssl rand -hex 32)" > "$CONFIG_DIR/stack.env"
fi

chmod 600 "$CONFIG_DIR/stack.env"
[[ -f "$CONFIG_DIR/web.env" ]] && chmod 600 "$CONFIG_DIR/web.env"

echo "Staging config directory ready: $CONFIG_DIR"
