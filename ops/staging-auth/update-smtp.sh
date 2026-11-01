#!/usr/bin/env bash
# Validate a new Resend key before changing isolated staging SMTP settings.
set -Eeuo pipefail
umask 077
ROOT=/opt/bahasacerdas/staging/auth
[[ $EUID -eq 0 ]] || { echo 'STOP: Run as root.' >&2; exit 1; }
[[ -d "$ROOT" && ! -L "$ROOT" ]] || { echo 'STOP: Staging Auth directory missing.' >&2; exit 1; }
exec 9>"$ROOT/smtp-update.lock"
flock -n 9 || { echo 'STOP: SMTP update already running.' >&2; exit 1; }
python3 - "$ROOT" <<'PY'
import datetime, getpass, pathlib, re, shutil, smtplib, ssl, sys
root=pathlib.Path(sys.argv[1])
files=[root/'.env', root/'auth.env']
for path in files:
    if path.is_symlink() or not path.is_file():
        sys.exit('STOP: Staging SMTP configuration missing or symlinked.')
key=getpass.getpass('Paste Resend API key lengkap (tersembunyi): ')
if not re.fullmatch(r're_[A-Za-z0-9_-]+',key):
    sys.exit('STOP: Key harus dimulai re_ tanpa spasi atau tanda kutip. Konfigurasi belum diubah.')
try:
    with smtplib.SMTP_SSL('smtp.resend.com',465,timeout=25,context=ssl.create_default_context()) as smtp:
        smtp.login('resend',key)
except smtplib.SMTPAuthenticationError as error:
    sys.exit(f'STOP: Resend menolak key (SMTP {error.smtp_code}). Konfigurasi belum diubah.')
except Exception as error:
    sys.exit(f'STOP: Uji SMTP gagal ({type(error).__name__}). Konfigurasi belum diubah.')
print('PASS: Resend SMTP authentication accepted; no email sent by this check.')
updates={'SMTP_HOST':'smtp.resend.com','SMTP_PORT':'465','SMTP_USER':'resend','SMTP_PASS':key}
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
for path in files:
    lines=[line for line in path.read_text().splitlines() if line.split('=',1)[0] not in updates]
    shutil.copy2(path,path.with_name(path.name+'.before-smtp-'+stamp))
    path.write_text('\n'.join(lines+[f'{k}={v}' for k,v in updates.items()])+'\n')
    path.chmod(0o600)
print('PASS: staging SMTP files updated; original configuration backed up privately.')
PY
set -a
. "$ROOT/.env"
. "$ROOT/auth.env"
set +a
# Use only the staging Compose project and recreate its Auth service.
docker compose --env-file "$ROOT/.env" -f "$ROOT/docker-compose.yml" up -d --no-deps --force-recreate auth
for i in $(seq 1 60); do
  if curl -fsS --max-time 5 https://auth-staging.bahasacerdas.com/auth/v1/health >/dev/null; then
    echo 'PASS: staging Auth restarted with the validated SMTP key.'
    exit 0
  fi
  sleep 2
done
echo 'STOP: Auth health did not become ready; inspect staging logs.' >&2
exit 1
