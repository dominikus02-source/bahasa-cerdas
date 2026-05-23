#!/bin/bash
# Deploy game server to VPS
# Usage: bash scripts/deploy-game-server.sh

set -e

VPS_IP="***REMOVED-VPS-IP***"
VPS_USER="root"
VPS_PASS="***REMOVED-SSH-PASSWORD***"
VPS_PATH="/var/www/game-server/game-server"
LOCAL_PATH="$(dirname "$0")/.."

echo "=== Building game server ==="
cd "$LOCAL_PATH/game-server"
npx tsc
echo "Build OK"

echo "=== Copying to VPS ==="
sshpass -p "$VPS_PASS" rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  "$LOCAL_PATH/game-server/" "$VPS_USER@$VPS_IP:$VPS_PATH/"

echo "=== Installing deps on VPS ==="
sshpass -p "$VPS_PASS" ssh "$VPS_USER@$VPS_IP" "cd $VPS_PATH && npm install"

echo "=== Restarting PM2 ==="
sshpass -p "$VPS_PASS" ssh "$VPS_USER@$VPS_IP" "pm2 restart game-server"
sshpass -p "$VPS_PASS" ssh "$VPS_USER@$VPS_IP" "pm2 save"

echo "=== Done! Server deployed ==="
