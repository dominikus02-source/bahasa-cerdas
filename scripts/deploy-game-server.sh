#!/bin/bash
# Deploy game server to VPS
# Usage: bash scripts/deploy-game-server.sh
# Credentials sourced from .env.vps (gitignored) or env vars:
#   VPS_IP, VPS_USER, VPS_PASS

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.vps"

if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
fi

VPS_IP="${VPS_IP:?Set VPS_IP in .env.vps or env}"
VPS_USER="${VPS_USER:-root}"
VPS_PASS="${VPS_PASS:?Set VPS_PASS in .env.vps or env}"
VPS_PATH="/var/www/game-server/game-server"

echo "=== Building game server ==="
cd "$SCRIPT_DIR/../game-server"
npx tsc
echo "Build OK"

echo "=== Copying to VPS ==="
sshpass -p "$VPS_PASS" rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'pnpm-lock.yaml' \
  "$SCRIPT_DIR/../game-server/" "$VPS_USER@$VPS_IP:$VPS_PATH/"

echo "=== Installing deps on VPS ==="
sshpass -p "$VPS_PASS" ssh "$VPS_USER@$VPS_IP" "cd $VPS_PATH && npm install"

echo "=== Restarting PM2 (ecosystem) ==="
sshpass -p "$VPS_PASS" ssh "$VPS_USER@$VPS_IP" "cd $VPS_PATH && pm2 startOrReload ecosystem.config.cjs --update-env && pm2 save"

echo "=== Done! Server deployed ==="
