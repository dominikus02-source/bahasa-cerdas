# JUMPA Fase 2 — fitur V1 lengkap

Branch `feat/jumpa-phase2` (bertumpuk di atas `feat/jumpa-phase1` / PR #130).
Semua tetap di belakang flag `NEXT_PUBLIC_JUMPA_ENABLED`. Saat flag mati,
rute API membalas 404, halaman redirect, cron sweep `skipped`, dan tidak ada
perubahan perilaku produksi. Rencana induk: `docs/JUMPA_TECHNICAL_PLAN.md` §4.
Fase 1: `docs/JUMPA_PHASE1.md`.

## Isi Fase 2

| Area | Yang dibangun | File utama |
|---|---|---|
| Berbagi layar | Tombol **Layar** di bilah kontrol, panggung layar + strip peserta. Guru selalu boleh. Murid hanya bila host menyalakan "Murid boleh berbagi layar" (khusus ruang KELAS). Izin ditegakkan di token (`canPublishSources`) dan diperbarui langsung lewat `UpdateParticipant`. | `lib/jumpa/token.ts`, `components/jumpa/JumpaRoomView.tsx` |
| Obrolan persisten | Disimpan di `JumpaChatMessage` lalu disiarkan oleh server (data channel, topik `jumpa.chat`). Soft-delete: konten terhapus tidak pernah dikirim ke peserta. Host bisa mematikan obrolan. Retensi 90 hari (dihapus sweep). | `lib/jumpa/chat.ts`, `lib/jumpa/room-actions.ts`, `app/api/jumpa/rooms/[code]/chat`, `app/api/jumpa/chat/[id]` |
| Angkat tangan + antrean | Peer signal `jumpa.hand`. Host/co-host melihat antrean urut waktu dan bisa menurunkan tangan (diterima hanya dari HOST/COHOST menurut metadata yang diset server). | `lib/jumpa/signals.ts`, `components/jumpa/RoomPanels.tsx` |
| Reaksi | 6 reaksi tetap (ikon lucide, bukan emoji bebas), dibatasi 5 per 3 detik di klien. | `lib/jumpa/signals.ts` |
| Kontrol host | Mute mik/kamera/layar (soft mute), keluarkan (token dicabut dan tidak bisa masuk lagi), kunci/buka, akhiri untuk semua, jadikan/cabut co-host, izinkan layar murid, matikan obrolan. Semua lewat `POST /api/jumpa/rooms/[code]/moderation` → RoomServiceClient di server. Tidak ada admin token di klien. Semua aksi tercatat di `JumpaEvent`. | `lib/jumpa/room-actions.ts`, `lib/jumpa/livekit.ts` |
| Undangan | KelasKu (seluruh kelas), anggota MGMP/komunitas (ruang GURU), pengguna tertentu (cari nama), dan tautan (token acak, hanya hash sha256 yang disimpan, berlaku 24 jam). Penerima mendapat notifikasi "Undangan JUMPA". | `app/api/jumpa/rooms/[code]/invites`, `lib/jumpa/code.ts` |
| Jenis ruang | KELAS (≤ 50 orang, 120 menit), GURU (≤ 25, 120 menit), MURID (≤ 8, 60 menit, hanya teman sekelas). Home `/jumpa` berisi kartu buat ruang dan ruang aktif. | `lib/jumpa/caps.ts`, `lib/jumpa/service.ts`, `components/jumpa/JumpaHome.tsx` |
| Perlindungan ruang murid | Arena Junior tidak bisa membuat/masuk ruang MURID. Murid host hanya bisa kunci/buka/akhiri. Satu ruang MURID aktif per murid. Guru tidak ikut masuk, tetapi bisa melihat log ruang murid dari kelasnya. Tombol **Laporkan** (kategori berbahasa Indonesia + cuplikan 50 pesan terakhir). | `lib/jumpa/permissions.ts` |
| Panel pantau | `/jumpa/pantau`: admin melihat semua ruang, guru melihat ruang miliknya dan ruang di kelasnya. Berisi peserta, kehadiran, obrolan (termasuk yang dihapus), dan laporan yang bisa ditandai ditinjau/ditutup. | `lib/jumpa/pantau.ts`, `components/jumpa/PantauView.tsx` |
| Auto-akhir | Cron `*/5` → `/api/cron/jumpa-sweep` (Bearer `CRON_SECRET`, fail-closed). Mengirim peringatan 10 menit sebelum batas waktu, mengakhiri ruang yang lewat durasi, mengakhiri SCHEDULED yang basi > 24 jam, dan membersihkan obrolan > 90 hari. | `lib/jumpa/background.ts`, `ops/vps/cron/root.crontab` |
| Webhook kehadiran | LiveKit → `POST /api/jumpa/webhook` (http://web:3000 di jaringan docker `edge`, ditandatangani dengan kunci API). Mencatat `participant_joined/left` ke kehadiran, `room_finished` mengakhiri ruang (EMPTY). Idempoten lewat `JumpaEvent.dedupeKey`. Dikecualikan dari redirect host di proxy. | `app/api/jumpa/webhook`, `lib/jumpa/lifecycle.ts` |
| TURN/TLS | Opsional, **mati secara default**. TURN bawaan LiveKit di 5349/tcp + 3478/udp, sertifikat dari Caddy. | `ops/vps/render-livekit-config.sh`, `ops/vps/docker-compose.jumpa-turn.yml` |

## Default yang dipilih (bisa diubah)

- Laporan dikirim ke guru kelas terkait dan semua admin. Untuk ruang GURU tanpa kelas, host guru yang menerima. Pelapor tidak menerima laporannya sendiri.
- Retensi obrolan 90 hari. Cuplikan obrolan di laporan tetap disimpan.
- Arena Junior dikecualikan dari ruang MURID (buat dan masuk). Di home, murid Junior hanya melihat ruang KELAS.
- Murid host hanya bisa kunci, buka, dan akhiri. Murid tidak pernah punya kuasa atas peserta lain.
- Co-host hanya guru. Co-host tidak bisa mengakhiri ruang, mengatur co-host, atau mematikan obrolan.
- Tautan undangan hanya untuk ruang GURU, berlaku 24 jam. Ruang KELAS/MURID masuk lewat keanggotaan kelas.
- Maksimal 1 ruang MURID aktif per murid.
- Mute bersifat lunak: peserta bisa menyalakan lagi (seperti Meet). Untuk murid yang mengganggu, gunakan "Keluarkan".
- Admin non-founder tidak ikut masuk ke ruang. Mereka diarahkan ke panel pantau.
- Guru tidak masuk ke ruang MURID, tetapi bisa melihat lognya.
- Peringatan 10 menit sebelum batas waktu. Sweep berjalan tiap 5 menit, jadi ruang bisa berakhir hingga ±5 menit setelah batas.
- Ruang SCHEDULED yang tidak pernah dimulai lebih dari 24 jam diakhiri (STALE).
- Ruang kosong ditutup LiveKit (10 menit), lalu webhook `room_finished` menandainya ENDED (EMPTY).
- Klik ganda "Mulai JUMPA" dalam 3 jam memakai ruang aktif yang sama.
- TURN mati. Kalau dinyalakan, memakai 5349/tcp (443 dipegang Caddy).

## Migrasi DB

`prisma/migrations/20261018120000_jumpa_phase2/migration.sql` bersifat aditif. Isinya: kolom baru ber-DEFAULT di `JumpaRoom`/`JumpaParticipant`/`JumpaEvent`, tabel `JumpaInvite`, `JumpaChatMessage`, `JumpaReport`, dan RLS deny-all. Konvensi repo: jalankan SQL lewat psql/SQL editor lalu `npx prisma migrate resolve --applied 20261018120000_jumpa_phase2`. **Jangan** jalankan `prisma migrate deploy`.

`bash ops/vps/jumpa-setup.sh` menerapkan migrasi fase 1 lalu fase 2 secara berurutan dan melewati yang sudah ada.

**Urutan penting:** kode Fase 2 membutuhkan migrasi Fase 2 saat flag menyala. Selama flag mati, aman. Kalau Fase 1 sudah live, jalankan `jumpa-setup.sh` segera setelah PR ini di-merge. `GET /api/jumpa/health` menampilkan `storage: "phase1-only"` bila migrasi Fase 2 belum ada.

## Ops

- **Konfigurasi LiveKit dirender.** `ops/vps/livekit.yaml` sekarang template. `render-livekit-config.sh` (dipanggil `prepare-runtime-envs.sh`) menulis `$BC_CONFIG_DIR/livekit.yaml`: blok `webhook` (nama kunci API saja, tanpa secret; URL `JUMPA_WEBHOOK_URL`, default `http://web:3000/api/jumpa/webhook`) dan blok `turn` hanya bila `JUMPA_TURN_ENABLED=1` dan sertifikat ada. `deploy.sh` me-recreate livekit hanya bila hash konfigurasi berubah (`.livekit-applied`).
- **Cron:** `*/5 * * * * bc-cron-call /api/cron/jumpa-sweep` (container cron, `CRON_SECRET` yang sudah ada).
- **Rate limit:** webhook datang dari IP internal docker dan berbagi bucket per-IP. Volume normal jauh di bawah batas.

### Menyalakan TURN (opsional, untuk jaringan sekolah yang memblokir UDP)

1. DNS: A record `turn` → IP server, **DNS only** (awan abu-abu).
2. Panel firewall VPS: izinkan 5349/tcp, 3478/udp, dan 30000–30100/udp.
3. `bash ops/vps/jumpa-setup.sh --enable-turn` (`TURN_DOMAIN=...` untuk domain lain). Script menyetel `JUMPA_TURN_ENABLED=1` dan `JUMPA_TURN_DOMAIN` di `stack.env`, membuka ufw, dan memasang cron harian `jumpa-turn-cert-sync.sh`. Saat deploy, Caddy memasang situs `turn.…` untuk sertifikat, sertifikat disalin ke `$BC_CONFIG_DIR/livekit-turn/` (0600), lalu LiveKit dijalankan dengan override `docker-compose.jumpa-turn.yml`. Kalau sertifikat belum siap, LiveKit tetap jalan tanpa TURN dan cron mencoba lagi.
4. Mematikan: `bash ops/vps/jumpa-setup.sh --disable-turn`.

Variabel opsional (stack.env): `JUMPA_TURN_TLS_PORT` (5349), `JUMPA_TURN_UDP_PORT` (3478), `JUMPA_TURN_RELAY_START`/`END` (30000/30100).
Konfigurasi hasil render (webhook + TURN) sudah divalidasi dengan `livekit-server` v1.13.10: TURN listen di 5349/tcp + 3478/udp.
Catatan: container livekit harus bisa membaca file sertifikat 0600 milik root (image resmi berjalan sebagai root).

## Uji

```bash
npm run test:jumpa-permissions      # matriks izin
npm run test:jumpa-token            # token & sumber publish
npm run test:jumpa-room-types       # KELAS/GURU/MURID, undangan, Junior
npm run test:jumpa-host-actions     # moderasi, sweep, webhook, kehadiran, ops
npm run test:jumpa-chat-moderation  # obrolan, sinyal, tangan, reaksi, laporan
```
Semuanya terdaftar di langkah CI "JUMPA permission + token gates".

### Checklist uji manual (staging)

- [ ] Guru membagikan layar. Murid tidak bisa sampai host menyalakan izin, lalu bisa tanpa perlu masuk ulang.
- [ ] Obrolan tetap ada setelah muat ulang. Pesan yang dihapus tampil "Pesan telah dihapus" untuk semua orang.
- [ ] Murid mengangkat tangan dan host melihat antreannya. "Turunkan" dari host berhasil, tetapi murid lain tidak bisa menurunkan tangan orang lain.
- [ ] Mute, Keluarkan (peserta yang dikeluarkan tidak bisa masuk lagi), Kunci, Akhiri untuk semua.
- [ ] Undangan KelasKu dan MGMP memunculkan notifikasi. Tautan ruang GURU bisa dipakai guru lain, dan kedaluwarsa setelah 24 jam.
- [ ] Ruang MURID: peserta ke-9 ditolak, ruang berakhir otomatis di 60 menit (dengan peringatan di menit 50), dan laporan muncul di `/jumpa/pantau`.
- [ ] Kehadiran tercatat dari webhook (masuk/keluar) dan ruang kosong menjadi ENDED.
- [ ] TURN (jika dinyalakan): tersambung dari jaringan yang memblokir UDP.

## Belum dikerjakan (Fase 3+)

Rekaman, kuis live, ruang breakout, papan tulis, latar virtual, kirim file di obrolan, push notifikasi APK, load test 3×30 dan uji 3 jaringan sekolah nyata (harus di staging/produksi), dan uji izin kamera di APK (TWA).
