#!/usr/bin/env bash
# =============================================================================
# JUMPA — setup sekali jalan di VPS produksi (jalankan sebagai root SETELAH
# PR JUMPA di-merge ke main).
#
#   bash ops/vps/jumpa-setup.sh --dry-run   # lihat dulu apa yang akan dilakukan
#   bash ops/vps/jumpa-setup.sh             # jalankan sungguhan
#   bash ops/vps/jumpa-setup.sh --disable   # MATIKAN JUMPA (rollback)
#
# Opsi:
#   --dry-run     Hanya menampilkan rencana. Tidak mengubah file, DB, firewall,
#                 atau container. (Cek read-only tetap dijalankan.)
#   --yes         Lanjut otomatis bila ada PERINGATAN (default: bertanya).
#   --skip-deploy Lakukan semua langkah kecuali deploy (untuk debug).
#   --disable     Rollback: NEXT_PUBLIC_JUMPA_ENABLED=false, deploy ulang web,
#                 hentikan livekit, cabut situs Caddy jumpa. Tabel DB dibiarkan.
#
# Idempoten: aman dijalankan berulang. Kunci LiveKit yang sudah ada TIDAK
# pernah ditimpa; migrasi yang sudah ada dilewati.
#
# Rollback manual (tanpa script):
#   1. web.env: NEXT_PUBLIC_JUMPA_ENABLED=false
#   2. stack.env: WEB_BUILD_FINGERPRINT=<angka baru, mis. $(date +%s)>
#      (wajib — tanpa ini Docker bisa memakai cache build lama dengan flag on)
#   3. bash ops/vps/deploy.sh          (TANPA ENABLE_JUMPA)
#   4. opsional: docker compose --env-file /opt/bahasacerdas/config/stack.env \
#        --profile jumpa stop livekit   (dari ops/vps)
# Detail: docs/JUMPA_PHASE1.md
# =============================================================================
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/bahasacerdas/apps/bahasa-cerdas}"
CONFIG_DIR="${BC_CONFIG_DIR:-/opt/bahasacerdas/config}"
JUMPA_DOMAIN="${JUMPA_DOMAIN:-jumpa.bahasacerdas.com}"
WEB_URL="${WEB_URL:-https://www.bahasacerdas.com}"
EXPECTED_IP="${EXPECTED_IP:-103.242.10.81}"
SYSCTL_FILE="${JUMPA_SYSCTL_FILE:-/etc/sysctl.d/99-livekit.conf}"
MIGRATION_NAME="20261018000000_jumpa_phase1"
PRISMA_VERSION="5.22.0"
PG_CLIENT_IMAGE="${PG_CLIENT_IMAGE:-postgres:17-alpine}"
NODE_IMAGE="${NODE_IMAGE:-node:22-bookworm}"
SUPABASE_DB_CONTAINER="${SUPABASE_DB_CONTAINER:-supabase-db}"
MIN_FREE_MB=1600   # livekit mem_limit 1536m + sedikit ruang

DRY_RUN=0
ASSUME_YES=0
SKIP_DEPLOY=0
MODE="enable"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
    --skip-deploy) SKIP_DEPLOY=1 ;;
    --disable) MODE="disable" ;;
    -h|--help) sed -n '2,32p' "$0"; exit 0 ;;
    *) echo "Opsi tidak dikenal: $arg (lihat --help)" >&2; exit 2 ;;
  esac
done

WEB_ENV="$CONFIG_DIR/web.env"
STACK_ENV="$CONFIG_DIR/stack.env"
MIGRATION_SQL="$REPO_DIR/prisma/migrations/$MIGRATION_NAME/migration.sql"
STAMP="$(date +%Y%m%d-%H%M%S)"

# ── Tampilan ────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  C_OK=$'\033[32m'; C_ERR=$'\033[31m'; C_WARN=$'\033[33m'; C_DIM=$'\033[2m'; C_B=$'\033[1m'; C_0=$'\033[0m'
else
  C_OK=""; C_ERR=""; C_WARN=""; C_DIM=""; C_B=""; C_0=""
fi
STEP_NO=0
SUMMARY=()
step() { STEP_NO=$((STEP_NO + 1)); printf '\n%s[%d] %s%s\n' "$C_B" "$STEP_NO" "$1" "$C_0"; }
ok()   { printf '  %s✓%s %s\n' "$C_OK" "$C_0" "$1"; }
warn() { printf '  %s!%s %s\n' "$C_WARN" "$C_0" "$1"; }
err()  { printf '  %s✗%s %s\n' "$C_ERR" "$C_0" "$1" >&2; }
info() { printf '    %s%s%s\n' "$C_DIM" "$1" "$C_0"; }
record() { SUMMARY+=("$1|$2"); }   # status(OK/WARN/FAIL/SKIP/PLAN) | teks
# Untuk langkah yang MENGUBAH sesuatu: ✓ saat eksekusi, → "akan" saat dry-run.
chg() {
  if (( DRY_RUN )); then printf '  %s→%s (akan) %s\n' "$C_DIM" "$C_0" "$1"; else ok "$1"; fi
}
record_chg() { if (( DRY_RUN )); then record PLAN "$1"; else record OK "$1"; fi; }

print_summary() {
  local result="$1" line st txt mark
  printf '\n%s══════════════ RINGKASAN ══════════════%s\n' "$C_B" "$C_0"
  for line in "${SUMMARY[@]}"; do
    st="${line%%|*}"; txt="${line#*|}"
    case "$st" in
      OK) mark="${C_OK}✓${C_0}" ;; FAIL) mark="${C_ERR}✗${C_0}" ;;
      WARN) mark="${C_WARN}!${C_0}" ;; PLAN) mark="${C_DIM}→${C_0}" ;; *) mark="${C_DIM}-${C_0}" ;;
    esac
    printf '  %s %s\n' "$mark" "$txt"
  done
  case "$result" in
    SUKSES) printf '\n%s%s SUKSES%s\n' "$C_OK" "$C_B" "$C_0" ;;
    DRYRUN) printf '\n%s%s DRY-RUN selesai — tidak ada yang diubah.%s Jalankan tanpa --dry-run untuk eksekusi.\n' "$C_B" "$C_WARN" "$C_0" ;;
    *) printf '\n%s%s GAGAL%s — lihat langkah bertanda ✗ di atas.\n' "$C_ERR" "$C_B" "$C_0" ;;
  esac
  printf '\nCara mematikan JUMPA kapan saja:  bash ops/vps/jumpa-setup.sh --disable\n'
}

die() {
  err "$1"
  [[ -n "${2:-}" ]] && printf '%s\n' "$2" >&2
  record FAIL "$1"
  print_summary GAGAL
  exit 1
}

# Jalankan perintah yang MENGUBAH sesuatu; di --dry-run hanya ditampilkan.
run() {
  if (( DRY_RUN )); then
    info "[dry-run] akan menjalankan: $*"
    return 0
  fi
  "$@"
}

confirm() {
  local q="$1" ans
  if (( ASSUME_YES )); then warn "$q → lanjut (--yes)"; return 0; fi
  if (( DRY_RUN )); then warn "$q → (dry-run: dianggap lanjut)"; return 0; fi
  if [[ ! -t 0 ]]; then die "$q — butuh konfirmasi tapi tidak ada terminal. Pakai --yes bila yakin."; fi
  read -r -p "  ? $q Lanjut? [y/N] " ans
  [[ "$ans" =~ ^[yY]$ ]] || die "Dibatalkan oleh operator."
}

# ── Helper env file (KEY=VALUE, kutip opsional) ─────────────────────────────
env_get() {  # env_get FILE KEY  → nilai tanpa kutip ("" bila tidak ada)
  python3 - "$1" "$2" <<'PY'
import sys
path, key = sys.argv[1], sys.argv[2]
try:
    lines = open(path).read().splitlines()
except FileNotFoundError:
    sys.exit(0)
for line in lines:
    s = line.strip()
    if not s or s.startswith("#") or "=" not in s:
        continue
    k, v = s.split("=", 1)
    if k.strip() == key:
        v = v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
            v = v[1:-1]
        print(v)
        break
PY
}

env_set() {  # env_set FILE KEY VALUE  (ganti baris yang ada / tambah di akhir)
  if (( DRY_RUN )); then info "[dry-run] akan set $2 di $(basename "$1")"; return 0; fi
  python3 - "$1" "$2" "$3" <<'PY'
import os, sys
path, key, value = sys.argv[1:4]
lines = open(path).read().splitlines()
out, seen = [], False
for line in lines:
    s = line.strip()
    if s and not s.startswith("#") and "=" in s and s.split("=", 1)[0].strip() == key:
        if not seen:
            out.append(f"{key}={value}")
            seen = True
        continue
    out.append(line)
if not seen:
    out.append(f"{key}={value}")
tmp = path + ".tmp-jumpa"
with open(tmp, "w") as f:
    f.write("\n".join(out) + "\n")
os.chmod(tmp, 0o600)
os.replace(tmp, path)
PY
}

mask() {  # tampilkan 4 karakter pertama + panjang, tidak pernah utuh
  local v="$1"
  printf '%s…(%d karakter)' "${v:0:4}" "${#v}"
}

bump_fingerprint() {
  # Docker BuildKit tidak meng-invalidate cache bila hanya isi web.env (secret)
  # berubah; fingerprint baru memaksa rebuild agar flag NEXT_PUBLIC ter-bake.
  local fp
  fp="jumpa-$(date +%s)"
  env_set "$STACK_ENV" WEB_BUILD_FINGERPRINT "$fp"
  chg "WEB_BUILD_FINGERPRINT diperbarui → build web pasti memakai flag baru"
}

backup_file() {
  local f="$1" dest
  dest="$f.bak-$STAMP"
  if (( DRY_RUN )); then info "[dry-run] akan backup $f → $dest"; return 0; fi
  cp -p "$f" "$dest"
  chmod 600 "$dest"
  ok "Backup: $dest"
}

COMPOSE=(docker compose --env-file "$STACK_ENV")
compose_jumpa() { (cd "$REPO_DIR/ops/vps" && "${COMPOSE[@]}" "$@"); }

printf '%sJUMPA setup%s — mode: %s%s\n' "$C_B" "$C_0" "$MODE" "$( ((DRY_RUN)) && echo ' (DRY-RUN)')"
printf 'Waktu: %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"

# =============================================================================
# PREFLIGHT
# =============================================================================
step "Pemeriksaan awal"

if [[ "$(id -u)" -ne 0 ]]; then
  die "Harus dijalankan sebagai root." "Jalankan: sudo -i lalu ulangi, atau login ssh root@$EXPECTED_IP"
fi
ok "Berjalan sebagai root"

[[ -d "$REPO_DIR/.git" ]] || die "Repo tidak ditemukan di $REPO_DIR" "Set REPO_DIR=/path/ke/repo bila lokasinya berbeda."
ok "Repo: $REPO_DIR"

branch="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
if [[ "$branch" != "main" ]]; then
  warn "Repo sedang di branch '$branch' (deploy.sh akan pindah ke main)."
  confirm "Branch bukan main."
fi
for f in ops/vps/deploy.sh ops/vps/livekit.yaml ops/vps/caddy/jumpa.caddy "prisma/migrations/$MIGRATION_NAME/migration.sql"; do
  [[ -f "$REPO_DIR/$f" ]] || die "File $f tidak ada — PR JUMPA belum di-merge / belum git pull?" "cd $REPO_DIR && git checkout main && git pull --ff-only origin main"
done
grep -q 'ENABLE_JUMPA' "$REPO_DIR/ops/vps/deploy.sh" || die "deploy.sh belum mendukung ENABLE_JUMPA — git pull dulu."
ok "Kode JUMPA ada di repo (branch $branch)"

[[ -f "$WEB_ENV" && -f "$STACK_ENV" ]] || die "web.env / stack.env tidak ditemukan di $CONFIG_DIR"
ok "Config: $CONFIG_DIR"

command -v docker >/dev/null || die "docker tidak terpasang."
docker info >/dev/null 2>&1 || die "Docker daemon tidak bisa diakses."
docker compose version >/dev/null 2>&1 || die "docker compose (plugin v2) tidak tersedia."
ok "Docker + compose siap"
command -v python3 >/dev/null || die "python3 tidak terpasang (dipakai deploy.sh juga)."
command -v curl >/dev/null || die "curl tidak terpasang."

if [[ "$MODE" == "enable" ]]; then
  free_mb="$(awk '/^MemAvailable:/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)"
  if (( free_mb >= MIN_FREE_MB )); then
    ok "RAM tersedia: ${free_mb} MB (LiveKit dibatasi 1536 MB)"
    record OK "RAM tersedia ${free_mb} MB"
  else
    warn "RAM tersedia hanya ${free_mb} MB; LiveKit butuh hingga 1536 MB."
    record WARN "RAM tersedia ${free_mb} MB (< ${MIN_FREE_MB} MB)"
    confirm "RAM tipis."
  fi

  public_ip="$(curl -4 -fsS --max-time 5 https://api.ipify.org 2>/dev/null || curl -4 -fsS --max-time 5 https://ifconfig.me 2>/dev/null || true)"
  if [[ ! "$public_ip" =~ ^[0-9.]+$ ]]; then
    public_ip="$EXPECTED_IP"
    warn "IP publik tidak terdeteksi otomatis; memakai $EXPECTED_IP"
  fi
  ok "IP publik server: $public_ip"
  dns_ips="$(getent ahostsv4 "$JUMPA_DOMAIN" 2>/dev/null | awk '{print $1}' | sort -u | tr '\n' ' ' || true)"
  dns_ips="${dns_ips% }"
  if [[ -z "$dns_ips" ]]; then
    warn "DNS $JUMPA_DOMAIN belum ada / belum menyebar."
    info "Tanpa DNS, Caddy belum bisa membuat sertifikat HTTPS dan cek akhir akan gagal."
    record WARN "DNS $JUMPA_DOMAIN belum resolve"
    confirm "DNS belum siap."
  elif [[ " $dns_ips " == *" $public_ip "* ]]; then
    ok "DNS $JUMPA_DOMAIN → $dns_ips (cocok)"
    record OK "DNS $JUMPA_DOMAIN → $public_ip"
  else
    warn "DNS $JUMPA_DOMAIN → $dns_ips, BUKAN $public_ip."
    info "Bila IP-nya milik Cloudflare (104.x / 172.6x.x): matikan proxy → 'DNS only' (awan abu-abu)."
    record WARN "DNS $JUMPA_DOMAIN → $dns_ips (≠ $public_ip)"
    confirm "DNS tidak menunjuk ke server ini."
  fi
fi
record OK "Pemeriksaan awal"

# =============================================================================
# MODE DISABLE (rollback)
# =============================================================================
if [[ "$MODE" == "disable" ]]; then
  step "Backup konfigurasi"
  backup_file "$WEB_ENV"; backup_file "$STACK_ENV"
  record_chg "Backup web.env & stack.env"

  step "Matikan flag JUMPA"
  env_set "$WEB_ENV" NEXT_PUBLIC_JUMPA_ENABLED false
  chg "NEXT_PUBLIC_JUMPA_ENABLED=false"
  bump_fingerprint
  record_chg "Flag JUMPA → false (kunci LiveKit dibiarkan)"

  step "Cabut situs Caddy JUMPA"
  if [[ -f "$CONFIG_DIR/caddy.d/jumpa.caddy" ]]; then
    run mv "$CONFIG_DIR/caddy.d/jumpa.caddy" "$CONFIG_DIR/jumpa.caddy.disabled-$STAMP"
    chg "Snippet dipindah (caddy di-recreate di bawah)"
  else
    ok "Snippet tidak terpasang"
  fi

  if (( SKIP_DEPLOY )); then
    warn "--skip-deploy: deploy dilewati"; record SKIP "Deploy"
  else
    step "Deploy ulang web (tanpa JUMPA)"
    if run bash -c "cd '$REPO_DIR' && bash ops/vps/deploy.sh"; then
      chg "deploy.sh selesai"; record_chg "Deploy web"
    else
      die "deploy.sh gagal."
    fi
    run compose_jumpa up -d --force-recreate caddy
    record_chg "Caddy di-recreate"
  fi

  step "Hentikan LiveKit"
  if docker ps --format '{{.Names}}' | grep -q livekit; then
    run compose_jumpa --profile jumpa stop livekit
    chg "livekit dihentikan"
  else
    ok "livekit tidak berjalan"
  fi
  record_chg "LiveKit berhenti"
  info "Tabel Jumpa* di DB sengaja dibiarkan (tidak berbahaya). Rollback DB: lihat header $MIGRATION_SQL"
  print_summary "$( ((DRY_RUN)) && echo DRYRUN || echo SUKSES)"
  exit 0
fi

# =============================================================================
# 1. Backup
# =============================================================================
step "Backup konfigurasi"
backup_file "$WEB_ENV"
backup_file "$STACK_ENV"
record_chg "Backup web.env & stack.env (.bak-$STAMP)"

# =============================================================================
# 2. Kunci & env LiveKit
# =============================================================================
step "Kunci LiveKit & env web"
lk_key="$(env_get "$WEB_ENV" LIVEKIT_API_KEY)"
lk_secret="$(env_get "$WEB_ENV" LIVEKIT_API_SECRET)"
if [[ -n "$lk_key" && -n "$lk_secret" ]]; then
  ok "Kunci sudah ada — TIDAK ditimpa (key=$lk_key, secret=$(mask "$lk_secret"))"
  record OK "Kunci LiveKit: dipakai yang sudah ada"
elif [[ -n "$lk_key" || -n "$lk_secret" ]]; then
  die "Hanya salah satu dari LIVEKIT_API_KEY / LIVEKIT_API_SECRET yang ada di web.env." \
      "Periksa manual (jangan ditebak): grep -n '^LIVEKIT_API_' $WEB_ENV"
else
  lk_key="bcjumpa$(python3 -c 'import secrets;print(secrets.token_hex(4))')"
  lk_secret="$(python3 -c 'import secrets;print(secrets.token_urlsafe(36))')"
  env_set "$WEB_ENV" LIVEKIT_API_KEY "$lk_key"
  env_set "$WEB_ENV" LIVEKIT_API_SECRET "$lk_secret"
  chg "Kunci baru dibuat (key=$lk_key, secret=$(mask "$lk_secret")) — disimpan di web.env"
  record_chg "Kunci LiveKit: dibuat baru"
fi
unset lk_secret

set_if_absent() {
  local k="$1" v="$2" cur
  cur="$(env_get "$WEB_ENV" "$k")"
  if [[ -z "$cur" ]]; then
    env_set "$WEB_ENV" "$k" "$v"; chg "$k=$v"
  elif [[ "$cur" == "$v" ]]; then
    ok "$k sudah $v"
  else
    warn "$k sudah berisi '$cur' (tidak diubah — mungkin LiveKit di VPS lain)"
  fi
}
set_if_absent LIVEKIT_URL "http://livekit:7880"
set_if_absent NEXT_PUBLIC_LIVEKIT_WS_URL "wss://$JUMPA_DOMAIN"

if [[ "$(env_get "$WEB_ENV" NEXT_PUBLIC_JUMPA_ENABLED)" == "true" ]]; then
  ok "NEXT_PUBLIC_JUMPA_ENABLED sudah true"
else
  env_set "$WEB_ENV" NEXT_PUBLIC_JUMPA_ENABLED true
  chg "NEXT_PUBLIC_JUMPA_ENABLED=true"
fi
bump_fingerprint
record_chg "Env web: flag JUMPA on + URL LiveKit"

# =============================================================================
# 3. sysctl
# =============================================================================
step "Tuning kernel UDP (sysctl)"
SYSCTL_CONTENT=$'# JUMPA / LiveKit — buffer UDP (rekomendasi LiveKit)\nnet.core.rmem_max=5000000\nnet.core.wmem_max=5000000'
if [[ -f "$SYSCTL_FILE" && "$(cat "$SYSCTL_FILE")" == "$SYSCTL_CONTENT" ]]; then
  ok "$SYSCTL_FILE sudah sesuai"
else
  if (( DRY_RUN )); then
    info "[dry-run] akan menulis $SYSCTL_FILE (rmem_max/wmem_max=5000000)"
  else
    printf '%s\n' "$SYSCTL_CONTENT" > "$SYSCTL_FILE"
    ok "Ditulis: $SYSCTL_FILE"
  fi
fi
if run sysctl -q -p "$SYSCTL_FILE"; then
  chg "sysctl diterapkan"; record_chg "sysctl UDP buffer"
else
  warn "sysctl gagal diterapkan (mis. di container). LiveKit tetap jalan, hanya kurang optimal."
  record WARN "sysctl tidak diterapkan"
fi

# =============================================================================
# 4. Firewall
# =============================================================================
step "Firewall lokal (ufw)"
if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q '^Status: active'; then
  run ufw allow 7881/tcp comment 'JUMPA LiveKit ICE/TCP'
  run ufw allow 7882/udp comment 'JUMPA LiveKit ICE/UDP'
  chg "ufw: 7881/tcp & 7882/udp diizinkan"
  record_chg "ufw 7881/tcp + 7882/udp"
else
  ok "ufw tidak aktif — tidak ada yang diubah"
  record SKIP "ufw tidak aktif"
fi
warn "INGAT: firewall di panel IDCloudHost juga harus mengizinkan 7881/tcp dan 7882/udp (tidak bisa dicek dari sini)."
record WARN "Panel IDCloudHost: pastikan 7881/tcp + 7882/udp terbuka (manual)"

# =============================================================================
# 5. Migrasi DB
# =============================================================================
step "Migrasi database ($MIGRATION_NAME)"
MANUAL_DB_HELP="Langkah manual (dari $REPO_DIR, sebagai root):
  getv() { grep -m1 \"^\$1=\" $WEB_ENV | cut -d= -f2- | sed 's/^[\"'\'']//; s/[\"'\'']\$//'; }
  export DIRECT_URL=\"\$(getv DIRECT_URL)\" DATABASE_URL=\"\$(getv DATABASE_URL)\"
  psql \"\$DIRECT_URL\" -v ON_ERROR_STOP=1 --single-transaction -f prisma/migrations/$MIGRATION_NAME/migration.sql
  docker run --rm --network host -e DATABASE_URL -e DIRECT_URL -v \"\$PWD/prisma:/work/prisma:ro\" -w /work $NODE_IMAGE \\
    npx -y prisma@$PRISMA_VERSION migrate resolve --applied $MIGRATION_NAME --schema prisma/schema.prisma
(atau tempel migration.sql di Supabase SQL Editor, lalu jalankan perintah resolve di atas)
Lalu ulangi script ini — langkah migrasi akan otomatis dilewati."

DB_URL="$(env_get "$WEB_ENV" DIRECT_URL)"
[[ -n "$DB_URL" ]] || DB_URL="$(env_get "$WEB_ENV" DATABASE_URL)"
[[ -n "$DB_URL" ]] || die "DIRECT_URL/DATABASE_URL tidak ada di web.env." "$MANUAL_DB_HELP"

# Urai URL → variabel PG* (password tidak pernah ditampilkan / masuk argv).
PG_PARSED="$(DB_URL="$DB_URL" python3 - <<'PY'
import os, shlex
from urllib.parse import urlsplit, parse_qs, unquote
u = urlsplit(os.environ["DB_URL"])
if u.scheme not in ("postgres", "postgresql"):
    raise SystemExit(1)
q = parse_qs(u.query)
vals = {
    "PGHOST": u.hostname or "",
    "PGPORT": str(u.port or 5432),
    "PGUSER": unquote(u.username or ""),
    "PGPASSWORD": unquote(u.password or ""),
    "PGDATABASE": (u.path or "/postgres").lstrip("/") or "postgres",
    "PGSSLMODE": (q.get("sslmode") or ["prefer"])[0],
}
for k, v in vals.items():
    print(f"{k}={shlex.quote(v)}")
PY
)" || die "DIRECT_URL di web.env tidak bisa diurai." "$MANUAL_DB_HELP"
eval "$PG_PARSED"
export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSSLMODE
info "Target DB: $PGUSER@$PGHOST:$PGPORT/$PGDATABASE (password disembunyikan)"

# Hanya DB self-hosted di server ini yang diproses otomatis.
db_kind="unknown"
case "$PGHOST" in
  *.supabase.com|*.supabase.co) db_kind="managed" ;;
  localhost|127.*|::1|host.docker.internal|"$EXPECTED_IP"|"${public_ip:-$EXPECTED_IP}"|10.*|192.168.*|172.1[6-9].*|172.2[0-9].*|172.3[01].*) db_kind="selfhost-host" ;;
  *.*) db_kind="unknown" ;;
  ?*) db_kind="selfhost-docker" ;;   # nama container tanpa titik, mis. supabase-db
esac
case "$db_kind" in
  managed) die "web.env menunjuk Supabase CLOUD ($PGHOST), bukan DB self-hosted. Migrasi tidak dijalankan otomatis." "$MANUAL_DB_HELP" ;;
  unknown) die "Host DB '$PGHOST' tidak dikenali sebagai DB self-hosted di server ini — berhenti demi aman." "$MANUAL_DB_HELP" ;;
esac
if [[ "$db_kind" == "selfhost-docker" ]]; then
  PG_NET="$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$SUPABASE_DB_CONTAINER" 2>/dev/null | awk '{print $1}')"
  [[ -n "$PG_NET" ]] || die "Container $SUPABASE_DB_CONTAINER tidak ditemukan untuk host '$PGHOST'." "$MANUAL_DB_HELP"
else
  PG_NET="host"
fi
if docker ps --format '{{.Names}}' | grep -qx "$SUPABASE_DB_CONTAINER"; then
  ok "Container $SUPABASE_DB_CONTAINER berjalan (Supabase self-hosted)"
else
  warn "Container $SUPABASE_DB_CONTAINER tidak terlihat; tetap memakai koneksi DIRECT_URL aplikasi."
fi

# psql klien: pakai psql host bila ada, kalau tidak lewat container postgres.
psql_cmd() {
  if command -v psql >/dev/null; then
    psql -X -q -v ON_ERROR_STOP=1 "$@"
  else
    docker run --rm -i --network "$PG_NET" \
      -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE \
      "$PG_CLIENT_IMAGE" psql -X -q -v ON_ERROR_STOP=1 "$@"
  fi
}
sql_val() { psql_cmd -Atc "$1" | tr -d '[:space:]'; }

app_ok="$(sql_val "select (to_regclass('public._prisma_migrations') is not null and to_regclass('public.\"User\"') is not null)::text" 2>/dev/null)" \
  || die "Tidak bisa terhubung ke DB ($PGHOST:$PGPORT)." "$MANUAL_DB_HELP"
[[ "$app_ok" == "true" ]] || die "DB terhubung tapi bukan DB aplikasi BC (tabel User/_prisma_migrations tidak ada)." "$MANUAL_DB_HELP"
ok "Terhubung ke DB aplikasi (tabel User & _prisma_migrations ada)"

n_tables="$(sql_val "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname in ('JumpaRoom','JumpaParticipant','JumpaEvent')")" \
  || die "Query status tabel gagal." "$MANUAL_DB_HELP"
n_enums="$(sql_val "select count(*) from pg_type where typtype='e' and typname in ('JumpaRoomKind','JumpaRoomMode','JumpaRoomStatus','JumpaRoomRole')")" \
  || die "Query status enum gagal." "$MANUAL_DB_HELP"
resolved="$(sql_val "select count(*) from public._prisma_migrations where migration_name='$MIGRATION_NAME' and finished_at is not null and rolled_back_at is null")" \
  || die "Query _prisma_migrations gagal." "$MANUAL_DB_HELP"
info "Status: tabel Jumpa*=$n_tables/3, enum Jumpa*=$n_enums/4, tercatat di Prisma=$resolved"

if [[ "$n_tables" == "0" && "$n_enums" == "0" ]]; then
  if (( DRY_RUN )); then
    info "[dry-run] akan menerapkan $MIGRATION_SQL (single-transaction)"
    record PLAN "Migrasi akan diterapkan"
  else
    psql_cmd --single-transaction -f - < "$MIGRATION_SQL" || die "Migrasi gagal (transaksi dibatalkan, DB tidak berubah)." "$MANUAL_DB_HELP"
    ok "Migrasi diterapkan"
  fi
elif [[ "$n_tables" == "3" && "$n_enums" == "4" ]]; then
  ok "Tabel & enum JUMPA sudah ada — apply dilewati"
else
  die "Objek JUMPA hanya sebagian ada (tabel $n_tables/3, enum $n_enums/4). Butuh pemeriksaan manual." "$MANUAL_DB_HELP"
fi

if (( ! DRY_RUN )); then
  rls="$(sql_val "select count(*) from pg_class where relname in ('JumpaRoom','JumpaParticipant','JumpaEvent') and relrowsecurity")"
  if [[ "$rls" == "3" ]]; then
    ok "Verifikasi: 3 tabel, 4 enum, RLS aktif"
  else
    die "Verifikasi gagal: RLS aktif di $rls/3 tabel."
  fi
fi

if [[ "$resolved" != "0" ]]; then
  ok "Prisma sudah mencatat migrasi (resolve dilewati)"
else
  RESOLVE=(docker run --rm --network "$PG_NET" -e DATABASE_URL -e DIRECT_URL
           -v "$REPO_DIR/prisma:/work/prisma:ro" -w /work "$NODE_IMAGE"
           npx -y "prisma@$PRISMA_VERSION" migrate resolve --applied "$MIGRATION_NAME" --schema prisma/schema.prisma)
  DATABASE_URL="$(env_get "$WEB_ENV" DATABASE_URL)"; DIRECT_URL="$DB_URL"
  [[ -n "$DATABASE_URL" ]] || DATABASE_URL="$DB_URL"
  export DATABASE_URL DIRECT_URL
  if (( DRY_RUN )); then
    info "[dry-run] akan menjalankan: prisma migrate resolve --applied $MIGRATION_NAME (via $NODE_IMAGE)"
  else
    "${RESOLVE[@]}" || die "prisma migrate resolve gagal (tabel sudah ada; ulangi script ini)." "$MANUAL_DB_HELP"
    ok "prisma migrate resolve --applied $MIGRATION_NAME"
  fi
  unset DATABASE_URL DIRECT_URL
fi
unset PGPASSWORD
record "$( ((DRY_RUN)) && echo PLAN || echo OK)" "Migrasi DB + prisma resolve"

# =============================================================================
# 6. Deploy
# =============================================================================
if (( SKIP_DEPLOY )); then
  step "Deploy"; warn "--skip-deploy: dilewati"; record SKIP "Deploy"
else
  step "Deploy (ENABLE_JUMPA=1 bash ops/vps/deploy.sh) — beberapa menit"
  if (( DRY_RUN )); then
    info "[dry-run] akan menjalankan: cd $REPO_DIR && ENABLE_JUMPA=1 bash ops/vps/deploy.sh"
    record PLAN "Deploy dengan ENABLE_JUMPA=1"
  elif (cd "$REPO_DIR" && ENABLE_JUMPA=1 bash ops/vps/deploy.sh); then
    ok "deploy.sh selesai"; record OK "Deploy (web + LiveKit + Caddy)"
  else
    err "deploy.sh gagal — lihat log di atas."
    record FAIL "Deploy"
    info "Penyebab umum: DNS $JUMPA_DOMAIN belum benar (sertifikat HTTPS gagal)."
  fi
fi

# =============================================================================
# 7. Cek akhir
# =============================================================================
step "Cek kesehatan"
FINAL_OK=1
if (( DRY_RUN )); then
  info "[dry-run] akan cek: http://127.0.0.1:7880/, https://$JUMPA_DOMAIN/, $WEB_URL/api/jumpa/health"
  record PLAN "Cek kesehatan"
  print_summary DRYRUN
  exit 0
fi

if curl -fsS --max-time 5 http://127.0.0.1:7880/ >/dev/null 2>&1; then
  ok "LiveKit lokal (127.0.0.1:7880) OK"; record OK "LiveKit lokal"
else
  err "LiveKit lokal tidak menjawab"; record FAIL "LiveKit lokal"; FINAL_OK=0
fi
retry_curl() {  # retry_curl URL  → stdout body; coba ±60 detik (sertifikat/web baru naik)
  local _
  for _ in $(seq 1 12); do
    if curl -fsS --max-time 10 "$1" 2>/dev/null; then return 0; fi
    sleep 5
  done
  return 1
}
if retry_curl "https://$JUMPA_DOMAIN/" >/dev/null; then
  ok "https://$JUMPA_DOMAIN OK (TLS + Caddy)"; record OK "https://$JUMPA_DOMAIN"
else
  err "https://$JUMPA_DOMAIN gagal (DNS/sertifikat?)"; record FAIL "https://$JUMPA_DOMAIN"; FINAL_OK=0
fi
health="$(retry_curl "$WEB_URL/api/jumpa/health" || true)"
info "health: ${health:-<tidak ada jawaban>}"
if HEALTH="$health" python3 -c 'import json,os,sys; d=json.loads(os.environ["HEALTH"]); sys.exit(0 if d.get("enabled") is True and d.get("livekitConfigured") is True and d.get("storage")=="ready" else 1)' 2>/dev/null; then
  ok "Health: enabled=true, livekitConfigured=true, storage=ready"; record OK "Health endpoint"
else
  err "Health belum sesuai (butuh enabled=true, livekitConfigured=true, storage=ready)"
  record FAIL "Health endpoint"; FINAL_OK=0
fi

for s in "${SUMMARY[@]}"; do [[ "${s%%|*}" == "FAIL" ]] && FINAL_OK=0; done
if (( FINAL_OK )); then
  print_summary SUKSES
  printf 'Coba sekarang: login guru → KelasKu → "Mulai JUMPA".\n'
else
  print_summary GAGAL
  exit 1
fi
