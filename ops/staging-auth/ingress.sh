#!/usr/bin/env bash
# Dedicated staging ingress. Default prepares files only; never changes production.
set -Eeuo pipefail
umask 077
ROOT=/opt/bahasacerdas/staging/ingress
HOST=auth-staging.bahasacerdas.com
NAME=jumpa-ingress-staging
MODE=${1:-prepare}
die(){ echo "STOP: $*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || die 'Run as root.'
[[ "$MODE" == prepare || "$MODE" == start ]] || die 'Use prepare or start.'
command -v openssl >/dev/null || die 'openssl missing.'
command -v docker >/dev/null || die 'Docker missing.'
# Refuse symlinks so writes and mounts cannot escape the staging directory.
for p in /opt/bahasacerdas/staging "$ROOT" "$ROOT/tls"; do
  [[ ! -L "$p" ]] || die "Symlink forbidden: $p"
done
mkdir -p "$ROOT/tls"
chmod 700 "$ROOT" "$ROOT/tls"
KEY="$ROOT/tls/origin.key"
CSR="$ROOT/tls/origin.csr"
CERT="$ROOT/tls/origin.pem"
for p in "$KEY" "$CSR" "$CERT" "$ROOT/Caddyfile"; do
  [[ ! -L "$p" ]] || die "Symlink forbidden: $p"
done
if [[ ! -e "$KEY" ]]; then
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$KEY" 2>/dev/null
fi
chmod 600 "$KEY"
if [[ ! -e "$CSR" ]]; then
  openssl req -new -key "$KEY" -out "$CSR" -subj "/CN=$HOST" -addext "subjectAltName=DNS:$HOST"
fi
# Existing configuration is never overwritten.
if [[ ! -e "$ROOT/Caddyfile" ]]; then
  cat > "$ROOT/Caddyfile" <<'CADDY'
{
  admin off
  auto_https off
}
https://auth-staging.bahasacerdas.com {
  tls /etc/caddy/tls/origin.pem /etc/caddy/tls/origin.key
  handle /ingress-health {
    respond "jumpa-staging-ingress" 200
  }
  handle_path /auth/v1/* {
    reverse_proxy auth-staging:9999
  }
  handle_path /storage/v1/* {
    reverse_proxy storage-staging:5000 {
      header_up X-Forwarded-Prefix /storage/v1
    }
  }
  handle /health {
    reverse_proxy auth-staging:9999
  }
  handle {
    respond "Staging route not found" 404
  }
}
CADDY
fi
if [[ "$MODE" == prepare ]]; then
  echo 'PREPARED ONLY: no container, listener or production config changed.'
  echo "CSR=$CSR"
  echo "NEXT: obtain a Cloudflare Origin certificate for $HOST using this CSR."
  echo "Save the issued CERTIFICATE ONLY to $CERT; keep origin.key private."
  echo 'Then run: bash ops/staging-auth/ingress.sh start'
  exit 0
fi
[[ -s "$CERT" ]] || die "Missing staging certificate: $CERT. Nothing started."
openssl x509 -in "$CERT" -noout -checkhost "$HOST" >/dev/null || die 'Certificate hostname mismatch.'
openssl x509 -in "$CERT" -noout -checkend 86400 >/dev/null || die 'Certificate expires too soon.'
CERT_HASH=$(openssl x509 -in "$CERT" -pubkey -noout | openssl pkey -pubin -outform DER | sha256sum)
KEY_HASH=$(openssl pkey -in "$KEY" -pubout -outform DER | sha256sum)
[[ "$CERT_HASH" == "$KEY_HASH" ]] || die 'Certificate does not match staging key.'
docker network inspect jumpa-staging-net >/dev/null || die 'Staging network missing.'
if docker inspect "$NAME" >/dev/null 2>&1; then
  die 'Staging ingress already exists; inspect it before replacing anything.'
fi
if ss -H -lnt '( sport = :8443 )' | grep -q .; then
  die 'TCP port 8443 is in use. Nothing changed.'
fi
docker run --rm --network none -v "$ROOT:/etc/caddy:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker run -d --name "$NAME" --restart unless-stopped --network jumpa-staging-net -p 8443:443 -v "$ROOT:/etc/caddy:ro" --security-opt no-new-privileges:true caddy:2-alpine
# Do not change DNS, firewall or Cloudflare rules automatically.
echo 'STARTED: dedicated staging ingress on TCP 8443; production ports/config untouched.'
echo 'NEXT: verify TLS and /ingress-health before activating the hostname-only Cloudflare origin rule.'
