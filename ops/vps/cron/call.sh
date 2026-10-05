#!/bin/sh
set -eu

path="${1:?cron path required}"

if [ -z "${CRON_SECRET:-}" ]; then
  echo "[cron] CRON_SECRET missing" >&2
  exit 1
fi

body_file="/tmp/bc-cron-$$.json"
trap 'rm -f "$body_file"' EXIT

code="$(
  curl -sS     --max-time 90     -o "$body_file"     -w '%{http_code}'     -H "Authorization: Bearer ${CRON_SECRET}"     "http://web:3000${path}"   || true
)"

body="$(cat "$body_file" 2>/dev/null || true)"
now="$(date -Iseconds)"

case "$code" in
  2??)
    echo "[cron] $now $path HTTP $code $body"
    ;;
  *)
    echo "[cron] $now $path HTTP ${code:-000} $body" >&2
    exit 1
    ;;
esac
