#!/usr/bin/env bash
# JUMPA Fase 2 — salin sertifikat TURN dari Caddy ke LiveKit.
#
# Caddy memperbarui sertifikat domain TURN otomatis (caddy/jumpa-turn.caddy).
# Script ini menyalin crt+key dari volume Caddy ke
# ${BC_CONFIG_DIR}/livekit-turn/ (0600, root) dan me-restart LiveKit HANYA
# bila sertifikat berubah. Aman dijalankan berulang (cron harian dari
# jumpa-setup.sh --enable-turn, dan dari deploy.sh).
#
#   bash ops/vps/jumpa-turn-cert-sync.sh [--wait SEC] [--no-restart]
set -euo pipefail

CONFIG_DIR="${BC_CONFIG_DIR:-/opt/bahasacerdas/config}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAIT=0
RESTART=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --wait) WAIT="${2:?}"; shift 2 ;;
    --no-restart) RESTART=0; shift ;;
    *) echo "Opsi tidak dikenal: $1" >&2; exit 2 ;;
  esac
done

getv() { grep -m1 "^$1=" "$CONFIG_DIR/stack.env" 2>/dev/null | cut -d= -f2- | sed "s/^[\"']//; s/[\"']\$//" || true; }
DOMAIN="$(getv JUMPA_TURN_DOMAIN)"; DOMAIN="${DOMAIN:-turn.bahasacerdas.com}"
[[ "$DOMAIN" =~ ^[a-z0-9.-]+$ ]] || { echo "JUMPA_TURN_DOMAIN tidak valid" >&2; exit 1; }
DEST="$CONFIG_DIR/livekit-turn"
COMPOSE=(docker compose --env-file "$CONFIG_DIR/stack.env")
cd "$SCRIPT_DIR"

# Lokasi standar Caddy v2 (Let's Encrypt, lalu ZeroSSL sebagai cadangan).
find_cert() {
  "${COMPOSE[@]}" exec -T caddy sh -c "ls -1 /data/caddy/certificates/*/$DOMAIN/$DOMAIN.crt 2>/dev/null | head -n1" 2>/dev/null || true
}

crt_path=""
deadline=$(( $(date +%s) + WAIT ))
while :; do
  crt_path="$(find_cert)"
  [[ -n "$crt_path" ]] && break
  if (( $(date +%s) >= deadline )); then
    echo "Sertifikat untuk $DOMAIN belum ada di Caddy (DNS 'DNS only' ke server ini? port 80 terbuka?)." >&2
    exit 3
  fi
  sleep 5
done
key_path="${crt_path%.crt}.key"

umask 077
install -d -m 700 "$DEST"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
"${COMPOSE[@]}" exec -T caddy cat "$crt_path" > "$tmp/tls.crt"
"${COMPOSE[@]}" exec -T caddy cat "$key_path" > "$tmp/tls.key"
[[ -s "$tmp/tls.crt" && -s "$tmp/tls.key" ]] || { echo "Gagal membaca sertifikat dari Caddy" >&2; exit 1; }

if cmp -s "$tmp/tls.crt" "$DEST/tls.crt" 2>/dev/null && cmp -s "$tmp/tls.key" "$DEST/tls.key" 2>/dev/null; then
  echo "Sertifikat TURN tidak berubah."
  exit 0
fi
install -m 600 "$tmp/tls.crt" "$DEST/tls.crt"
install -m 600 "$tmp/tls.key" "$DEST/tls.key"
echo "Sertifikat TURN diperbarui di $DEST"

BC_CONFIG_DIR="$CONFIG_DIR" bash "$SCRIPT_DIR/render-livekit-config.sh"
if (( RESTART )) && docker ps --format '{{.Names}}' | grep -q livekit; then
  "${COMPOSE[@]}" -f docker-compose.yml -f docker-compose.jumpa-turn.yml --profile jumpa up -d --force-recreate livekit
  echo "LiveKit di-restart dengan sertifikat baru."
fi
