# JUMPA Fase 1 — Panduan aktifkan, deploy & uji

Rencana lengkap: `docs/JUMPA_TECHNICAL_PLAN.md`. Dokumen ini khusus operasional Fase 1.

## Isi Fase 1
- Ruang video **KELAS**: guru pemilik kelas menekan **"Mulai JUMPA"** di KelasKu → lobby → **"Gabung sekarang"** (2 klik). Murid anggota kelas masuk lewat tautan undangan `/jumpa/<kode>`.
- Lobby ala Zoom/Meet: kamera & mik **nyala default** dengan preview langsung, bisa dimatikan sebelum gabung; pilihan terakhir diingat (`localStorage` `bc-jumpa-media-v1`).
- Ruang: grid / pembicara, kontrol Mikrofon · Kamera · Lainnya (tata letak, salin tautan) · Keluar. Tema gelap glass + hijau BC dari token tema.
- Keamanan: token LiveKit 10 menit dicetak server setelah cek keanggotaan kelas; tanpa `roomAdmin`/`roomCreate`/`roomRecord`; metadata peran tidak bisa diubah klien; hanya kamera + mikrofon yang boleh dipublish.
- Semua di belakang flag: `NEXT_PUBLIC_JUMPA_ENABLED` (web) dan `ENABLE_JUMPA` (deploy). Default mati → tidak ada perubahan perilaku produksi (halaman JUMPA "Tidak Ditemukan", API buat ruang/token 404, tombol tersembunyi, LiveKit & situs Caddy tidak dijalankan). Satu-satunya perubahan global: header `Permissions-Policy` kini mengizinkan kamera/mik untuk origin sendiri, dan CSP `connect-src` memuat `jumpa.bahasacerdas.com`.

## Variabel env
| Variabel | Lokasi | Nilai |
|---|---|---|
| `NEXT_PUBLIC_JUMPA_ENABLED` | `web.env` (dibaca saat **build**) | `true` untuk menyalakan |
| `LIVEKIT_API_KEY` | `web.env` | mis. `bcjumpa` + acak |
| `LIVEKIT_API_SECRET` | `web.env` | ≥ 32 karakter acak |
| `LIVEKIT_URL` | `web.env` (opsional) | default `http://livekit:7880` (docker internal). VPS terpisah: `https://jumpa.bahasacerdas.com` |
| `NEXT_PUBLIC_LIVEKIT_WS_URL` | `web.env` (opsional) | default `wss://jumpa.bahasacerdas.com` |
| `JUMPA_DOMAIN` | `stack.env` (opsional) | default `jumpa.bahasacerdas.com` |

`prepare-runtime-envs.sh` otomatis menulis `livekit.env` (`LIVEKIT_KEYS="key: secret"`, chmod 600) dari kunci di `web.env`.

Buat kunci:
```bash
echo "LIVEKIT_API_KEY=bcjumpa$(openssl rand -hex 4)"
echo "LIVEKIT_API_SECRET=$(openssl rand -base64 36 | tr -d '\n/+=')"
```

## Langkah deploy (sekali)
1. **DNS:** A record `jumpa.bahasacerdas.com` → IP publik VPS (sama dengan www). Tunggu propagasi (`dig +short jumpa.bahasacerdas.com`).
2. **Firewall VPS / panel IDCloudHost:** buka **7881/tcp** dan **7882/udp** (masuk). Port 7880 TIDAK perlu dibuka (hanya localhost; publik lewat Caddy 443).
3. **Opsional tapi disarankan** (peringatan LiveKit soal buffer UDP):
   `sysctl -w net.core.rmem_max=5000000 net.core.wmem_max=5000000` (simpan di `/etc/sysctl.d/99-livekit.conf`).
4. **Migrasi DB** (konvensi repo — JANGAN `prisma migrate deploy`): jalankan isi `prisma/migrations/20261018000000_jumpa_phase1/migration.sql` di SQL editor Supabase, lalu
   `npx prisma migrate resolve --applied 20261018000000_jumpa_phase1`.
   Migrasi hanya menambah 4 enum + 3 tabel baru (RLS aktif, deny-all). Rollback ada di header file.
5. **Env:** tambahkan ke `/opt/bahasacerdas/config/web.env`:
   ```
   NEXT_PUBLIC_JUMPA_ENABLED=true
   LIVEKIT_API_KEY=...
   LIVEKIT_API_SECRET=...
   ```
6. **Deploy dengan JUMPA:** di VPS, `ENABLE_JUMPA=1 bash ops/vps/deploy.sh` (setelah PR di-merge ke `main`). Script akan: rebuild web (flag ikut ter-build), menulis `livekit.env`, menjalankan service `livekit` (2 CPU / 1,5 GB), cek health, memasang `caddy/jumpa.caddy` ke `config/caddy.d/`, recreate Caddy (sertifikat TLS otomatis), lalu smoke `https://jumpa.bahasacerdas.com/`.
   Deploy otomatis berikutnya (push ke main) tanpa `ENABLE_JUMPA` tidak mematikan LiveKit dan tidak menyentuh Caddy.
7. **Cek:** `curl https://www.bahasacerdas.com/api/jumpa/health` → `{"ok":true,"enabled":true,"livekitConfigured":true,"storage":"ready"}`.

**Matikan cepat:** set `NEXT_PUBLIC_JUMPA_ENABLED=false` + deploy (UI/API hilang). Untuk menghentikan media: `docker compose --env-file /opt/bahasacerdas/config/stack.env --profile jumpa stop livekit` dan hapus `config/caddy.d/jumpa.caddy`, lalu recreate caddy.

## Pindah LiveKit ke VPS terpisah
Jalankan `livekit` + Caddy (snippet `jumpa.caddy`, `reverse_proxy localhost:7880`) di VPS media, arahkan DNS `jumpa.` ke sana, buka 7881/tcp + 7882/udp di sana, lalu di `web.env` VPS utama set `LIVEKIT_URL=https://jumpa.bahasacerdas.com` dengan kunci yang sama. Tidak ada perubahan kode.

## Jaringan sekolah
Fase 1 memakai UDP 7882 lalu fallback TCP 7881. **TURN/TLS belum aktif** (butuh rentang port relay + sertifikat). Jaringan yang hanya mengizinkan 443 belum bisa tersambung media — ini target Fase 2 (TURN/TLS, idealnya di 443) setelah uji lapangan.

## Checklist uji
- [ ] Flag mati: `/jumpa/abc-defg-hjk` menampilkan halaman "Tidak Ditemukan" (noindex; status HTTP 200 karena `app/loading.tsx` memulai streaming — perilaku Next yang sama dengan halaman `notFound()` lain), API `/api/jumpa/rooms*` 404, `/api/jumpa/health` → `"enabled":false`, tombol "Mulai JUMPA" tidak tampil di KelasKu.
- [ ] Guru: KelasKu → "Mulai JUMPA" → lobby menampilkan preview kamera + meter mik → "Gabung sekarang" → masuk ruang.
- [ ] Matikan kamera di lobby, keluar, buka ruang lagi → kamera tetap mati (diingat).
- [ ] Izin kamera ditolak → pesan Bahasa Indonesia jelas, tetap bisa gabung tanpa kamera.
- [ ] "Lainnya" → "Salin tautan undangan" → murid anggota kelas membuka tautan (di HP) → login → lobby → gabung; video & suara dua arah.
- [ ] Murid dari kelas lain membuka tautan → ditolak ("Kamu tidak terdaftar di ruang ini.").
- [ ] Belum login → diarahkan ke `/login?next=/jumpa/<kode>` lalu kembali ke lobby.
- [ ] Grid ↔ Pembicara; ring pembicara aktif; nama + badge GURU/MURID/HOST benar.
- [ ] Putus jaringan sebentar → banner "Jaringan terputus — menyambung ulang…" lalu pulih.
- [ ] "Keluar" → layar "Kamu sudah keluar" dengan "Gabung lagi".
- [ ] Chrome Android, Safari iOS, Chrome/Edge desktop.
- [ ] `docker stats` livekit tetap di bawah batas saat 1 kelas ±10–30 orang.

## Keterbatasan diketahui (Fase 2)
- Tidak ada auto-akhir saat durasi maksimum tercapai (cek hanya saat token dicetak; belum ada cron/webhook). LiveKit menutup ruang kosong setelah 10 menit.
- Belum ada screen share, chat, angkat tangan, reaksi, kontrol host (mute/keluarkan/kunci/akhiri), ruang GURU & MURID, laporan, rekaman, TURN.
- Halaman `/jumpa` (daftar ruang) masih redirect ke dasbor; murid masuk lewat tautan (belum ada kartu "Kelas live").
- APK (TWA) belum diuji untuk izin kamera/mik.
