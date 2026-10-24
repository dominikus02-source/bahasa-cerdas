#!/usr/bin/env bash
set -Eeuo pipefail
APP=/opt/bahasacerdas/apps/bahasa-cerdas
PROD=/opt/bahasacerdas/supabase/prod
ENVFILE=$PROD/.env
EXPECTED=f627c45c3c99b72b2bc442a3c90156cf4568e4fb
echo '[bcfix] BahasaCerdas: pemulihan password'
[[ $EUID -eq 0 ]] || { echo 'STOP: jalankan sebagai root di VPS'; exit 1; }
[[ -d $APP/.git && -f $ENVFILE ]] || { echo 'STOP: checkout/SMTP produksi tidak ditemukan'; exit 1; }
command -v docker >/dev/null || { echo 'STOP: docker tidak ditemukan'; exit 1; }
# Read Git as the real owner; do not mark production Git globally safe for root.
gitbc() { runuser -u bcadmin -- git -C "$APP" "$@"; }
[[ $(gitbc branch --show-current) == main ]] || { echo 'STOP: branch bukan main'; exit 1; }
# Backups are untracked; never overwrite, clean or reset them.
gitbc fetch origin main
gitbc merge-base --is-ancestor "$EXPECTED" origin/main || { echo 'STOP: commit perbaikan tidak ada di main'; exit 1; }
gitbc pull --ff-only origin main || { echo 'STOP: pull gagal, periksa perubahan lokal'; exit 1; }
echo "[bcfix] Kode: $(gitbc log -1 --oneline)"
# The Supabase GoTrue SMTP settings are managed by the VPS compose .env,
# NOT by supabase/config.toml in the application repository.
getenv() { sed -n "s/^$1=//p" "$ENVFILE" | tail -n 1; }
host=$(getenv SMTP_HOST)
user=$(getenv SMTP_USER)
sender=$(getenv SMTP_ADMIN_EMAIL)
[[ -n $sender ]] || sender=$(getenv SMTP_SENDER_EMAIL)
if [[ $host == supabase-mail || -z $host || $user == fake_mail_user || -z $user ]]; then
  echo '[bcfix] SMTP dummy ditemukan. Masukkan kredensial SMTP asli dari penyedia.'
  read -r -p 'SMTP host: ' newhost
  read -r -p 'SMTP port [587]: ' newport
  newport=${newport:-587}
  read -r -p 'SMTP username: ' newuser
  read -r -s -p 'SMTP password/API key: ' newpass; echo
  read -r -p 'Sender email (terverifikasi): ' newsender
  [[ $newhost =~ ^[A-Za-z0-9.-]+$ && $newport =~ ^[0-9]+$ && $newport -ge 1 && $newport -le 65535 && -n $newuser && -n $newpass && $newsender == *@* ]] || { echo 'STOP: parameter SMTP tidak valid'; exit 1; }
  getent ahostsv4 "$newhost" >/dev/null || { echo 'STOP: SMTP host tidak dapat di-resolve'; exit 1; }
  backup="$ENVFILE.bak.bcfix.$(date +%Y%m%d%H%M%S)"
  cp -p "$ENVFILE" "$backup"
  chmod 600 "$backup"
  # Never print credentials, preserve existing unrelated env values.
  export BCFIX_SMTP_HOST="$newhost" BCFIX_SMTP_PORT="$newport" BCFIX_SMTP_USER="$newuser" BCFIX_SMTP_PASS="$newpass" BCFIX_SMTP_SENDER="$newsender"
  python3 - "$ENVFILE" <<'PY'
import os,sys,tempfile
p=sys.argv[1]
with open(p) as f: lines=f.readlines()
changes={'SMTP_HOST':os.environ['BCFIX_SMTP_HOST'],'SMTP_PORT':os.environ['BCFIX_SMTP_PORT'],'SMTP_USER':os.environ['BCFIX_SMTP_USER'],'SMTP_PASS':os.environ['BCFIX_SMTP_PASS'],'SMTP_ADMIN_EMAIL':os.environ['BCFIX_SMTP_SENDER'],'SMTP_SENDER_NAME':'BahasaCerdas'}
for v in changes.values():
    if '\n' in v or '\r' in v: raise SystemExit('STOP: invalid SMTP value')
# Encode env values safely; reject characters that break Docker Compose env interpolation.
for k,v in changes.items():
    if '$' in v or '#' in v: raise SystemExit('STOP: SMTP value contains unsupported $ or #; configure manually')
found=set()
out=[]
for line in lines:
    key=line.split('=',1)[0].strip()
    if key in changes:
        out.append(key+'='+changes[key]+'\n'); found.add(key)
    else: out.append(line)
for k in changes.keys()-found: out.append(k+'='+changes[k]+'\n')
fd,tmp=tempfile.mkstemp(prefix='.bcfix-',dir=os.path.dirname(p))
try:
    os.fchmod(fd,0o600)
    with os.fdopen(fd,'w') as f: f.writelines(out)
    os.replace(tmp,p)
except:
    os.unlink(tmp); raise
PY
  unset BCFIX_SMTP_PASS newpass
  echo "[bcfix] SMTP dikonfigurasi; backup: $backup"
else
  echo "[bcfix] SMTP sudah terkonfigurasi: $host (tanpa menampilkan rahasia)"
fi
# Compose must validate before any service is touched.
cd "$PROD"
args=(--env-file "$ENVFILE" -f docker-compose.yml -f docker-compose.bc.yml)
docker compose "${args[@]}" config --quiet || { echo 'STOP: compose tidak valid, tidak restart'; exit 1; }
service=$(docker inspect supabase-auth -f '{{index .Config.Labels "com.docker.compose.service"}}' 2>/dev/null || true)
[[ -n $service && $service != '<no value>' ]] || { echo 'STOP: layanan auth tidak teridentifikasi'; exit 1; }
echo "[bcfix] Siap menerapkan SMTP ke service $service."
read -r -p 'Restart hanya Supabase Auth? [y/N]: ' confirm
if [[ $confirm == y || $confirm == Y ]]; then
  docker compose "${args[@]}" up -d --no-deps --force-recreate "$service"
  docker ps --filter name=supabase-auth --format '{{.Names}} {{.Status}}'
  echo '[bcfix] Restart selesai. Uji Forgot Password menggunakan akun uji milik Anda.'
else
  echo '[bcfix] Belum restart; perubahan SMTP belum aktif.'
fi
