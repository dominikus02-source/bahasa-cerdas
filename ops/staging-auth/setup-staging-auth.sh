#!/usr/bin/env bash
# One-time, staging-only GoTrue + Storage bootstrap. Production is never targeted.
set -Eeuo pipefail
umask 077
ROOT="$(printenv STAGING_AUTH_DIR 2>/dev/null || true)"
[[ -n "$ROOT" ]] || ROOT="/opt/bahasacerdas/staging/auth"
REPO_DIR="$(printenv STAGING_AUTH_REPO 2>/dev/null || true)"
if [[ -z "$REPO_DIR" ]]; then REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"; fi
COMPOSE="$REPO_DIR/ops/staging-auth/docker-compose.yml"

die(){ echo "STOP: $*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || die "Jalankan sebagai root."
command -v docker >/dev/null || die "Docker tidak ditemukan."
command -v openssl >/dev/null || die "openssl dibutuhkan."
docker info >/dev/null 2>&1 || die "Docker daemon tidak aktif."
docker inspect jumpa-web-staging >/dev/null 2>&1 || die "Container jumpa-web-staging tidak ditemukan."
NETWORKS="$(docker inspect -f '{{range $name, $cfg := .NetworkSettings.Networks}}{{println $name}}{{end}}' jumpa-web-staging | grep -i staging || true)"
[[ -n "$NETWORKS" ]] || die "Tidak menemukan network staging pada jumpa-web-staging."
[[ "$(printf '%s\n' "$NETWORKS" | wc -l | tr -d ' ')" == "1" ]] || die "Lebih dari satu network staging; set STAGING_DOCKER_NETWORK secara eksplisit."
STAGING_DOCKER_NETWORK="$(printf '%s' "$NETWORKS" | head -1)"
export STAGING_DOCKER_NETWORK
docker network inspect "$STAGING_DOCKER_NETWORK" >/dev/null 2>&1 || die "Network staging tidak tersedia."
[[ -f "$COMPOSE" ]] || die "Compose file tidak ditemukan: $COMPOSE"

mkdir -p "$ROOT"
chmod 700 "$ROOT"
ENV_FILE="$ROOT/.env"
AUTH_ENV="$ROOT/auth.env"

if [[ ! -e "$ENV_FILE" && ! -e "$AUTH_ENV" ]]; then
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
elif [[ ! -s "$ENV_FILE" || ! -s "$AUTH_ENV" ]]; then
  die "Konfigurasi parsial. Periksa manual; tidak menimpa secret."
fi

# Dedicated Storage database runs in its own Postgres container and volume.
# It never shares the application database or the Auth database.
if ! grep -q '^STORAGE_DB_PASSWORD=' "$ENV_FILE"; then
  printf 'STORAGE_DB_PASSWORD=%s\n' "$(openssl rand -hex 32)" >> "$ENV_FILE"
fi
if ! grep -q '^AUTHENTICATOR_DB_PASSWORD=' "$ENV_FILE"; then
  printf 'AUTHENTICATOR_DB_PASSWORD=%s\n' "$(openssl rand -hex 32)" >> "$ENV_FILE"
fi
STORAGE_DB_PASSWORD="$(sed -n 's/^STORAGE_DB_PASSWORD=//p' "$ENV_FILE" | head -1)"
AUTHENTICATOR_DB_PASSWORD="$(sed -n 's/^AUTHENTICATOR_DB_PASSWORD=//p' "$ENV_FILE" | head -1)"
[[ -n "$STORAGE_DB_PASSWORD" && -n "$AUTHENTICATOR_DB_PASSWORD" ]] || die "Storage database credentials incomplete."
if ! grep -q '^PGRST_DB_URI=' "$ENV_FILE"; then
  printf 'PGRST_DB_URI=postgres://authenticator:%s@storage-db:5432/storage?sslmode=disable\n' "$AUTHENTICATOR_DB_PASSWORD" >> "$ENV_FILE"
fi

# The Storage API migrations create anon/authenticated/service_role and grant
# them to authenticator. Pre-create only the isolated PostgREST login.
cat > "$ROOT/init-storage.sql" <<SQL
-- PostgREST includes extensions in its configured extra search path.
CREATE SCHEMA IF NOT EXISTS extensions AUTHORIZATION postgres;
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD '$AUTHENTICATOR_DB_PASSWORD';
  ELSE
    ALTER ROLE authenticator WITH LOGIN NOINHERIT PASSWORD '$AUTHENTICATOR_DB_PASSWORD';
  END IF;
END
\$\$;
SQL
chmod 600 "$ROOT/init-storage.sql"

chmod 600 "$ENV_FILE" "$AUTH_ENV"
set -a
. "$ENV_FILE"
. "$AUTH_ENV"
set +a

TMP_COMPOSE="$ROOT/docker-compose.yml"
sed "s|\./auth.env|$AUTH_ENV|" "$COMPOSE" > "$TMP_COMPOSE"
chmod 600 "$TMP_COMPOSE"
# Start only the dedicated databases first. Keep the password-bearing SQL mode
# 600 on the host; feed it over stdin rather than mounting it for another UID.
docker compose --env-file "$ENV_FILE" -f "$TMP_COMPOSE" up -d auth-db storage-db
STORAGE_DB_READY=0
for i in $(seq 1 120); do
  if docker exec -u postgres jumpa-storage-db-staging pg_isready -U postgres -d storage >/dev/null 2>&1; then
    STORAGE_DB_READY=1
    break
  fi
  sleep 2
done
[[ "$STORAGE_DB_READY" == "1" ]] || die "Staging Storage database not ready; no volumes removed."
# Plain PostgreSQL does not pre-create GoTrue's auth schema.
AUTH_DB_READY=0
for i in $(seq 1 120); do
  if docker exec -u postgres jumpa-auth-db-staging pg_isready -U gotrue -d gotrue >/dev/null 2>&1; then
    AUTH_DB_READY=1
    break
  fi
  sleep 2
done
[[ "$AUTH_DB_READY" == "1" ]] || die "Staging Auth database not ready; no volumes removed."
# GoTrue's shipped RLS migration grants SELECT to a role named postgres.
# POSTGRES_USER=gotrue means plain Postgres has not created that DB role.
# Provision it as NOLOGIN, with no elevated privileges; preserve existing roles.
docker exec -i -u postgres jumpa-auth-db-staging psql -X -v ON_ERROR_STOP=1 -U gotrue -d gotrue <<'AUTH_SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    CREATE ROLE postgres NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION gotrue;
ALTER ROLE gotrue IN DATABASE gotrue SET search_path = auth, public;
AUTH_SQL
docker exec -i -u postgres jumpa-storage-db-staging psql -X -v ON_ERROR_STOP=1 -d storage < "$ROOT/init-storage.sql"
docker compose --env-file "$ENV_FILE" -f "$TMP_COMPOSE" up -d

for i in $(seq 1 40); do
  AUTH_OK=0
  STORAGE_OK=0
  REST_OK=0
  docker exec jumpa-auth-staging wget -q -O - http://127.0.0.1:9999/health >/dev/null 2>&1 && AUTH_OK=1 || true
  docker exec jumpa-storage-rest-staging postgrest --ready >/dev/null 2>&1 && REST_OK=1 || true
  docker exec jumpa-storage-staging wget -q -O - http://127.0.0.1:5000/status >/dev/null 2>&1 && STORAGE_OK=1 || true
  if [[ "$AUTH_OK" == "1" && "$REST_OK" == "1" && "$STORAGE_OK" == "1" ]]; then
    python3 - "$AUTH_ENV" "$ROOT/web.env.fragment" <<'PY'
import sys
values={}
for line in open(sys.argv[1]):
    if "=" in line:
        k,v=line.rstrip("\n").split("=",1); values[k]=v
with open(sys.argv[2],"w") as f:
    f.write("# Staging-only endpoints and public JUMPA settings.\n")
    f.write("APP_URL=https://staging.bahasacerdas.com\n")
    f.write("NEXT_PUBLIC_SITE_URL=https://staging.bahasacerdas.com\n")
    f.write("NEXT_PUBLIC_JUMPA_ENABLED=true\n")
    f.write("NEXT_PUBLIC_LIVEKIT_WS_URL=wss://jumpa-staging.bahasacerdas.com\n")
    f.write("LIVEKIT_URL=http://jumpa-livekit-staging:7883\n")
    f.write("NEXT_PUBLIC_SUPABASE_AUTH_URL=https://auth-staging.bahasacerdas.com\n")
    f.write("NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY="+values["STAGING_ANON_KEY"]+"\n")
    f.write("NEXT_PUBLIC_SUPABASE_STORAGE_URL=https://auth-staging.bahasacerdas.com\n")
    f.write("NEXT_PUBLIC_SUPABASE_STORAGE_ANON_KEY="+values["STAGING_ANON_KEY"]+"\n")
    f.write("SUPABASE_STORAGE_URL=https://auth-staging.bahasacerdas.com\n")
    f.write("SUPABASE_STORAGE_SERVICE_ROLE_KEY="+values["STAGING_SERVICE_ROLE_KEY"]+"\n")
    f.write("SUPABASE_AUTH_SERVICE_ROLE_KEY="+values["STAGING_SERVICE_ROLE_KEY"]+"\n")
PY
    chmod 600 "$ROOT/web.env.fragment"
    echo "PASS: isolated GoTrue, PostgREST and Storage health endpoints are healthy."
    echo "Secret files: $ROOT/.env and $ROOT/auth.env (mode 600)"
    echo "Web env fragment: $ROOT/web.env.fragment (staging build/runtime only)"
    echo "NEXT: install the staging-only Caddy routes for /auth/v1/* and /storage/v1/*, then rebuild staging web with this fragment."
    exit 0
  fi
  sleep 2
done

docker compose --env-file "$ENV_FILE" -f "$TMP_COMPOSE" logs --tail=80 auth storage
die "GoTrue/Storage healthcheck failed. Production was not touched."
