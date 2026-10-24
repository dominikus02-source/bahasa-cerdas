#!/usr/bin/env bash
set -Eeuo pipefail
EXPECTED=f627c45c3c99b72b2bc442a3c90156cf4568e4fb
echo "[BahasaCerdas] Mencari checkout produksi..."
mapfile -t dirs < <(find /var/www /opt /srv /root /home -maxdepth 5 -type d -name .git 2>/dev/null | sed 's@/\.git$@@' | while IFS= read -r dir; do
 remote="$(git -C "$dir" remote get-url origin 2>/dev/null || true)"
 case "$remote" in *dominikus02-source/bahasa-cerdas*) printf '%s\n' "$dir";; esac
done)
if [ "${#dirs[@]}" -ne 1 ]; then echo "STOP: ditemukan ${#dirs[@]} checkout; perlu memilih lokasi dengan aman"; printf '%s\n' "${dirs[@]}"; exit 1; fi
cd "${dirs[0]}"
echo "APP=$PWD"
if [ -n "$(git status --porcelain)" ]; then echo "STOP: ada perubahan lokal; tidak ditimpa"; exit 1; fi
if [ "$(git branch --show-current)" != "main" ]; then echo "STOP: branch aktif bukan main"; exit 1; fi
git fetch origin main
git merge-base --is-ancestor "$EXPECTED" origin/main || { echo "STOP: commit perbaikan tidak ada di origin/main"; exit 1; }
git pull --ff-only origin main
echo "=== KODE SUDAH DIPULL ==="
git log -1 --oneline
echo "=== MANAJER APLIKASI ==="
if command -v pm2 >/dev/null; then pm2 list; fi
if command -v docker >/dev/null; then docker ps --format '{{.Names}} {{.Status}}'; fi
echo "Pull selesai; build/restart tidak dijalankan otomatis untuk menjaga produksi."
