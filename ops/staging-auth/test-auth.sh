#!/usr/bin/env bash
# Run only isolated staging Auth API checks, using two operator-owned test inboxes.
set -Eeuo pipefail
umask 077
ROOT=/opt/bahasacerdas/staging/auth
APP=/opt/bahasacerdas/staging/jumpa/app
USERS="$ROOT/test-users.env"
die(){ echo "STOP: $*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || die 'Run as root.'
[[ -s "$ROOT/auth.env" ]] || die 'Staging Auth configuration missing.'
for p in "$USERS" "$ROOT/auth-e2e-public.env" "$ROOT/evidence"; do
  [[ ! -L "$p" ]] || die "Symlink forbidden: $p"
done
command -v flock >/dev/null || die 'flock missing.'
exec 9>"$ROOT/auth-e2e.lock"
flock -n 9 || die 'An Auth test is already running.'
if [[ ! -e "$USERS" ]]; then
  echo 'Use two NEW test email addresses whose inboxes you control.'
  echo 'Recovery messages will be sent to both. No accounts are deleted.'
  read -r -p 'Email uji A: ' EMAIL_A
  read -r -p 'Email uji B: ' EMAIL_B
  for email in "$EMAIL_A" "$EMAIL_B"; do
    [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]] || die 'Invalid email format.'
  done
  [[ "${EMAIL_A,,}" != "${EMAIL_B,,}" ]] || die 'Use two different email addresses.'
  PASS_A=$(openssl rand -hex 16)
  PASS_B=$(openssl rand -hex 16)
  (set -o noclobber; cat > "$USERS" <<ENV
STAGING_TEST_USER_A_EMAIL=$EMAIL_A
STAGING_TEST_USER_A_PASSWORD=$PASS_A
STAGING_TEST_USER_B_EMAIL=$EMAIL_B
STAGING_TEST_USER_B_PASSWORD=$PASS_B
ENV
  )
else
  [[ -s "$USERS" ]] || die 'Test account file empty; inspect it without overwriting.'
  echo 'Reusing saved staging test accounts; passwords are not displayed.'
fi
chmod 600 "$USERS"
grep '^STAGING_ANON_KEY=.' "$ROOT/auth.env" > "$ROOT/auth-e2e-public.env" || die 'Staging anon key missing.'
mkdir -p "$ROOT/evidence"
chmod 700 "$ROOT/evidence"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
LOG="$ROOT/evidence/auth-e2e-$STAMP.log"
{
  echo "utc=$STAMP"
  echo "git_sha=$(git -C "$APP" rev-parse HEAD)"
  docker run --rm --network jumpa-staging-net \
    --env-file "$USERS" --env-file "$ROOT/auth-e2e-public.env" \
    -e STAGING_AUTH_URL=https://auth-staging.bahasacerdas.com \
    -v "$APP/scripts:/work:ro" -w /work node:22-alpine node staging-auth-e2e.mjs
} | tee "$LOG"
echo "EVIDENCE=$LOG"
echo 'NEXT: verify recovery emails arrived in BOTH inboxes; actual password reset and browser tests remain pending.'
