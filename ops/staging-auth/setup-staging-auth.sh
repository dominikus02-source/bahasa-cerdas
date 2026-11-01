#!/usr/bin/env bash
# One-time, staging-only GoTrue bootstrap. No production files/services are read or changed.
set -Eeuo pipefail
umask 077
ROOT="${STAGING_AUTH_DIR:-/opt/bahasacerdas/staging/auth}"
REPO_DIR="${STAGING_AUTH_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
COMPOSE="$REPO_DIR/ops/staging-auth/docker-compose.yml"
ENV_FILE="$REPO_DIR/ops/staging-auth/.env"
AUTH_ENV="$REPO_DIR/ops/staging-auth/auth.env"
DOMAIN="auth-staging.bahasacerdas.com"

die(){ echo "STOP: $*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || die "Jalankan sebagai root."
command -v docker >/dev/null || die "Docker tidak ditemukan."
docker info >/dev/null 2>&1 || die "Docker daemon tidak aktif."
docker inspect jumpa-web-staging >/dev/null 2>&1 || die "Container jumpa-web-staging tidak ditemukan."
NETWORKS="$(docker inspect -f '{{range $name, $cfg := .NetworkSettings.Networks}}{{println $name}}{{end}}' jumpa-web-staging | grep -i staging || true)"
[[ -n "$NETWORKS" ]] || die "Tidak menemukan network staging pada jumpa-web-staging."
[[ "$(printf '%s\\n' "$NETWORKS" | wc -l | tr -d ' ')" == "1" ]] || die "Lebih dari satu network staging; set STAGING_DOCKER_NETWORK secara eksplisit."
STAGING_DOCKER_NETWORK="$(printf '%s' "$NETWORKS" | head -1)"
export STAGING_DOCKER_NETWORK
docker network inspect "$STAGING_DOCKER_NETWORK" >/dev/null 2>&1 || die "Network staging tidak tersedia."
[[ -f "$COMPOSE" ]] || die "Compose file tidak ditemukan: $COMPOSE"
mkdir -p "$ROOT"
chmod 700 "$ROOT"
# Keep secrets outside the Git checkout and outside the web.env production config.
ENV_FILE="$ROOT/.env"
AUTH_ENV="$ROOT/auth.env"
if [[ -e "$ENV_FILE" || -e "$AUTH_ENV" ]]; then
  echo "Konfigurasi sudah ada; tidak menimpa secret."
  [[ -s "$ENV_FILE" && -s "$AUTH_ENV" ]] || die "Konfigurasi parsial. Periksa manual."
else
  command -v openssl >/dev/null || die "openssl dibutuhkan."
  DB_PASS="$(openssl rand -hex 32)"
  JWT_SECRET="$(openssl rand -hex 48)"
  read -r -s -p "Masukkan Resend SMTP API key (input tersembunyi): " SMTP_PASS
  echo
  [[ -n "$SMTP_PASS" ]] || die "SMTP key kosong."
  cat >"$ENV_FILE" <<EOF
AUTH_DB_PASSWORD=$DB_PASS
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=$SMTP_PASS
SMTP_SENDER=noreply@bahasacerdas.com
EOF
  # GoTrue JWT secret is private; derive anon and service_role JWTs locally.
  python3 - "$JWT_SECRET" "$AUTH_ENV" <<'PY'
import base64, hashlib, hmac, json, sys, time
secret, path = sys.argv[1], sys.argv[2]
def b64(v): return base64.urlsafe_b64encode(v).rstrip(b"=").decode()
def jwt(role):
    now=int(time.time())
    header=b64(b'{"alg":"HS256","typ":"JWT"}')
    payload=b64(json.dumps({"iss":"gotrue","ref":"jumpa-auth-staging","role":role,"aud":"authenticated","iat":now,"exp":now+10*365*86400},separators=(",",":")).encode())
    msg=f"{header}.{payload}".encode()
    sig=b64(hmac.new(secret.encode(),msg,hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"
with open(path,"w") as f:
    f.write("GOTRUE_JWT_SECRET="+secret+"\n")
    f.write("AUTH_JWT_SECRET="+secret+"\n")
    f.write("GOTRUE_JWT_EXP=3600\n")
    f.write("GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated\n")
    f.write("STAGING_ANON_KEY="+jwt("anon")+"\n")
    f.write("STAGING_SERVICE_ROLE_KEY="+jwt("service_role")+"\n")
PY
  cat "$ENV_FILE" >> "$AUTH_ENV"
  chmod 600 "$ENV_FILE" "$AUTH_ENV"
fi
# Prepare a dedicated Storage metadata database inside the existing staging
# Postgres container. This creates a new DB/role only; jumpa_staging is untouched.
DB_CONTAINER="jumpa-db-staging"
docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || die "Database staging container tidak ditemukan."
PGUSER="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$DB_CONTAINER" | sed -n 's/^POSTGRES_USER=//p' | head -1)"
PGUSER="${PGUSER:-postgres}"
if ! grep -q '^STORAGE_DB_PASSWORD=' "$ENV_FILE"; then
  STORAGE_DB_PASSWORD="$(openssl rand -hex 32)"
  printf 'STORAGE_DB_PASSWORD=%s\n' "$STORAGE_DB_PASSWORD" >> "$ENV_FILE"
fi
STORAGE_DB_PASSWORD="$(sed -n 's/^STORAGE_DB_PASSWORD=//p' "$ENV_FILE" | head -1)"
[[ -n "$STORAGE_DB_PASSWORD" ]] || die "STORAGE_DB_PASSWORD kosong."
docker exec "$DB_CONTAINER" psql -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 \\
  -c "DO \\$\\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='jumpa_storage') THEN CREATE ROLE jumpa_storage LOGIN PASSWORD '$STORAGE_DB_PASSWORD'; END IF; END \\$\\$;" \\
  -c "ALTER ROLE jumpa_storage WITH LOGIN PASSWORD '$STORAGE_DB_PASSWORD';" >/dev/null
if ! docker exec "$DB_CONTAINER" psql -U "$PGUSER" -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='jumpa_storage_staging'" | grep -q '^1
# Point compose to the secret directory without copying secrets into source.
TMP_COMPOSE="$ROOT/docker-compose.yml"
sed "s|\./auth.env|$AUTH_ENV|" "$COMPOSE" > "$TMP_COMPOSE"
chmod 600 "$TMP_COMPOSE"
docker compose --env-file "$ENV_FILE" -f "$TMP_COMPOSE" up -d
for i in $(seq 1 30); do
  if docker exec jumpa-auth-staging wget -q -O - http://127.0.0.1:9999/health >/dev/null 2>&1 && docker exec jumpa-storage-staging wget -q -O - http://127.0.0.1:5000/status >/dev/null 2>&1; then
    echo "PASS: isolated GoTrue and Storage healthy."
    echo "Service: jumpa-auth-staging on jumpa-staging-net (alias auth-staging:9999)"
    echo "Secret files: $ROOT/.env and $ROOT/auth.env (mode 600)"
  python3 - "$AUTH_ENV" "$ROOT/web.env.fragment" <<'PY'
import sys
values={}
for line in open(sys.argv[1]):
    if "=" in line:
        k,v=line.rstrip("\\n").split("=",1); values[k]=v
with open(sys.argv[2],"w") as f:
    f.write("# Both APIs share this host but use separate /auth/v1 and /storage/v1 proxy routes.\\n")
    f.write("NEXT_PUBLIC_SUPABASE_AUTH_URL=https://auth-staging.bahasacerdas.com\\n")
    f.write("NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY="+values["STAGING_ANON_KEY"]+"\\n")
    f.write("NEXT_PUBLIC_SUPABASE_STORAGE_URL=https://auth-staging.bahasacerdas.com\\n")
    f.write("NEXT_PUBLIC_SUPABASE_STORAGE_ANON_KEY="+values["STAGING_ANON_KEY"]+"\\n")
    f.write("SUPABASE_STORAGE_URL=https://auth-staging.bahasacerdas.com\\n")
    f.write("SUPABASE_STORAGE_SERVICE_ROLE_KEY="+values["STAGING_SERVICE_ROLE_KEY"]+"\\n")
PY
  chmod 600 "$ROOT/web.env.fragment"
  echo "Staging web env fragment created: $ROOT/web.env.fragment (merge into staging build/runtime env only)."
    echo "NEXT: configure staging-only reverse proxy: https://$DOMAIN/auth/v1/* -> auth-staging:9999 (strip /auth/v1 prefix)."
    echo "Then set STAGING auth URL/key in jumpa-web-staging build/runtime, and run staging-auth-e2e.mjs."
    exit 0
  fi
  sleep 2
done
docker compose --env-file "$ENV_FILE" -f "$TMP_COMPOSE" logs --tail=80 auth
die "GoTrue healthcheck failed. Production was not touched."
; then
  docker exec "$DB_CONTAINER" createdb -U "$PGUSER" -O jumpa_storage jumpa_storage_staging
fi
if ! grep -q '^STORAGE_DATABASE_URL=' "$ENV_FILE"; then
  printf 'STORAGE_DATABASE_URL=postgresql://jumpa_storage:%s@jumpa-db-staging:5432/jumpa_storage_staging?sslmode=disable\\n' "$STORAGE_DB_PASSWORD" >> "$ENV_FILE"
fi
chmod 600 "$ENV_FILE" "$AUTH_ENV"
# Compose interpolation needs values from both root-only secret files.
export AUTH_DB_PASSWORD SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_SENDER
set -a
. "$ENV_FILE"
. "$AUTH_ENV"
set +a
# Point compose to the secret directory without copying secrets into source.
TMP_COMPOSE="$ROOT/docker-compose.yml"
sed "s|\./auth.env|$AUTH_ENV|" "$COMPOSE" > "$TMP_COMPOSE"
chmod 600 "$TMP_COMPOSE"
docker compose --env-file "$ENV_FILE" -f "$TMP_COMPOSE" up -d
for i in $(seq 1 30); do
  if docker exec jumpa-auth-staging wget -q -O - http://127.0.0.1:9999/health >/dev/null 2>&1; then
    echo "PASS: isolated GoTrue healthy."
    echo "Service: jumpa-auth-staging on jumpa-staging-net (alias auth-staging:9999)"
    echo "Secret files: $ROOT/.env and $ROOT/auth.env (mode 600)"
  python3 - "$AUTH_ENV" "$ROOT/web.env.fragment" <<'PY'
import sys
values={}
for line in open(sys.argv[1]):
    if "=" in line:
        k,v=line.rstrip("\\n").split("=",1); values[k]=v
with open(sys.argv[2],"w") as f:
    f.write("# AUTH-ONLY endpoint. Do NOT map this to NEXT_PUBLIC_SUPABASE_URL until Auth and Storage clients are split.\\n")
    f.write("NEXT_PUBLIC_SUPABASE_AUTH_URL=https://auth-staging.bahasacerdas.com\\n")
    f.write("NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY="+values["STAGING_ANON_KEY"]+"\\n")
PY
  chmod 600 "$ROOT/web.env.fragment"
  echo "Staging web env fragment created: $ROOT/web.env.fragment (merge into staging build/runtime env only)."
    echo "NEXT: configure staging-only reverse proxy: https://$DOMAIN/auth/v1/* -> auth-staging:9999 (strip /auth/v1 prefix)."
    echo "Then set STAGING auth URL/key in jumpa-web-staging build/runtime, and run staging-auth-e2e.mjs."
    exit 0
  fi
  sleep 2
done
docker compose --env-file "$ENV_FILE" -f "$TMP_COMPOSE" logs --tail=80 auth
die "GoTrue healthcheck failed. Production was not touched."
