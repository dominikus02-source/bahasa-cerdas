#!/usr/bin/env bash
set -euo pipefail

PINNED_SUPABASE_COMMIT="${PINNED_SUPABASE_COMMIT:-d2ffd76395c0b1b9cf9feb25ac9843010bd0ccf5}"
SUPABASE_ROOT="${SUPABASE_ROOT:-/opt/bahasacerdas/apps/supabase-bc-prod}"
BC_REPO="${BC_REPO:-/opt/bahasacerdas/apps/bahasa-cerdas}"
OVERRIDE_FILE="$BC_REPO/ops/supabase-selfhost/docker-compose.shadow.yml"

if [[ ! -d "$SUPABASE_ROOT/.git" ]]; then
  git clone --filter=blob:none --no-checkout https://github.com/supabase/supabase.git "$SUPABASE_ROOT"
  git -C "$SUPABASE_ROOT" sparse-checkout init --cone
  git -C "$SUPABASE_ROOT" sparse-checkout set docker
fi

git -C "$SUPABASE_ROOT" fetch origin "$PINNED_SUPABASE_COMMIT"
git -C "$SUPABASE_ROOT" checkout --detach "$PINNED_SUPABASE_COMMIT"

cd "$SUPABASE_ROOT/docker"

if [[ ! -f .env ]]; then
  cp .env.example .env
  sh utils/generate-keys.sh --update-env >/dev/null
  sh utils/add-new-auth-keys.sh --update-env >/dev/null
fi

set_env() {
  local key="$1"
  local value="$2"
  local tmp
  tmp="$(mktemp)"
  awk -v key="$key" -v val="$value" '
    BEGIN { found = 0 }
    index($0, key "=") == 1 { print key "=" val; found = 1; next }
    { print }
    END { if (!found) print key "=" val }
  ' .env > "$tmp"
  mv "$tmp" .env
}

set_env DASHBOARD_USERNAME bcstudio
dashboard_password="$(grep -m1 '^DASHBOARD_PASSWORD=' .env | cut -d= -f2-)"
set_env DASHBOARD_PASSWORD "Bc${dashboard_password}"
set_env SUPABASE_PUBLIC_URL http://127.0.0.1:54380
set_env API_EXTERNAL_URL http://127.0.0.1:54380/auth/v1
set_env SITE_URL https://www.bahasacerdas.com
set_env ADDITIONAL_REDIRECT_URLS "https://www.bahasacerdas.com/**,https://bahasacerdas.com/**,https://game.bahasacerdas.com/**"
set_env STUDIO_DEFAULT_ORGANIZATION BahasaCerdas
set_env STUDIO_DEFAULT_PROJECT "BahasaCerdas Production"
set_env ENABLE_PHONE_SIGNUP false
set_env ENABLE_PHONE_AUTOCONFIRM false
set_env ENABLE_EMAIL_SIGNUP true
set_env ENABLE_EMAIL_AUTOCONFIRM false
set_env POSTGRES_PORT 5432
set_env POOLER_PROXY_PORT_TRANSACTION 6543

chmod 600 .env

docker compose -f docker-compose.yml -f "$OVERRIDE_FILE" config >/tmp/supabase-bc-prod-compose.yml

echo "Supabase shadow configuration prepared."
echo "Pinned upstream commit: $(git -C "$SUPABASE_ROOT" rev-parse --short HEAD)"
echo "Gateway: 127.0.0.1:54380"
echo "Session pooler: 127.0.0.1:54382"
echo "Transaction pooler: 127.0.0.1:54383"
