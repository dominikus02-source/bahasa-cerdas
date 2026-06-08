#!/usr/bin/env bash
set -euo pipefail

# ============================================
# PgBouncer Setup Script — BahasaCerdas
# Run on VPS (***REMOVED-VPS-IP***) as root or with sudo
# ============================================

PGBOUNCER_CONF="/etc/pgbouncer/pgbouncer.ini"
PGBOUNCER_USERLIST="/etc/pgbouncer/userlist.txt"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_SRC="$SCRIPT_DIR/pgbouncer.ini"

echo "==> Installing PgBouncer..."
apt-get update -qq
apt-get install -y -qq pgbouncer

echo "==> Stopping PgBouncer if running..."
systemctl stop pgbouncer 2>/dev/null || true

echo "==> Copying configuration..."
cp "$CONFIG_SRC" "$PGBOUNCER_CONF"
chmod 644 "$PGBOUNCER_CONF"
chown pgbouncer:pgbouncer "$PGBOUNCER_CONF"

echo "==> Configuring user credentials..."
# Generate MD5 password hash for PgBouncer auth
# Format: md5<md5(password + username)>
PASSWORD="***REMOVED-DB-PASSWORD***"
USER="bahasa"
HASH=$(echo -n "${PASSWORD}${USER}" | md5sum | awk '{print $1}')
echo "\"$USER\" \"md5$HASH\"" > "$PGBOUNCER_USERLIST"
chmod 640 "$PGBOUNCER_USERLIST"
chown pgbouncer:pgbouncer "$PGBOUNCER_USERLIST"

echo "==> Creating log directory..."
mkdir -p /var/log/pgbouncer
chown pgbouncer:pgbouncer /var/log/pgbouncer

echo "==> Enabling PgBouncer on boot..."
systemctl enable pgbouncer

echo "==> Starting PgBouncer..."
systemctl start pgbouncer

echo "==> Waiting for PgBouncer to be ready..."
sleep 2

echo "==> Verifying PgBouncer is running..."
if systemctl is-active --quiet pgbouncer; then
    echo "  ✓ PgBouncer service is active"
else
    echo "  ✗ PgBouncer service failed to start"
    systemctl status pgbouncer --no-pager
    exit 1
fi

echo "==> Checking listening port..."
if ss -tlnp | grep -q ':6543'; then
    echo "  ✓ PgBouncer is listening on port 6543"
    ss -tlnp | grep ':6543'
else
    echo "  ✗ Port 6543 is not listening"
    echo "  Check logs: journalctl -u pgbouncer --no-pager"
    exit 1
fi

echo ""
echo "===== PgBouncer Setup Complete ====="
echo "  Port:     6543"
echo "  Database: bahasacerdas"
echo "  User:     bahasa"
echo "  Pool:     transaction mode, 20 default / 100 max"
echo "  Status:   $(systemctl is-active pgbouncer)"
echo ""
echo "Test connection with:"
echo "  psql -h 127.0.0.1 -p 6543 -U bahasa -d bahasacerdas"
echo ""
echo "Update your .env DATABASE_URL:"
echo "  DATABASE_URL_POOLED=\"postgresql://bahasa:***REMOVED-DB-PASSWORD***@***REMOVED-VPS-IP***:6543/bahasacerdas\""
