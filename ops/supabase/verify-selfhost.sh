#!/usr/bin/env bash
set -euo pipefail

STACK_DIR="${STACK_DIR:-/opt/bahasacerdas/supabase/prod}"
cd "$STACK_DIR"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.bc.yml)

echo "==> Containers"
"${COMPOSE[@]}" ps

echo "==> Database"
docker exec supabase-db psql -U postgres -d postgres -Atc \
  "select 'postgres=' || current_setting('server_version'); select 'auth.users=' || count(*) from auth.users; select 'storage.objects=' || count(*) from storage.objects;"

echo "==> Auth"
curl -fsS --max-time 10 http://127.0.0.1:8000/auth/v1/health >/dev/null
echo "auth=ok"

echo "==> REST"
ANON_KEY="$(grep '^ANON_KEY=' .env | head -n1 | cut -d= -f2-)"
curl -fsS --max-time 10 http://127.0.0.1:8000/rest/v1/ \
  -H "apikey: $ANON_KEY" >/dev/null
unset ANON_KEY
echo "rest=ok"

echo "==> Resource snapshot"
free -h
df -h /
