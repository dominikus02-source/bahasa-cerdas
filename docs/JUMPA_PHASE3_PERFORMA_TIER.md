# JUMPA Fase 3 — Performa, Tampilan Khas, dan Paket Gratis/Premium

Status: draft PR (branch `feat/jumpa-phase3`, basis `feat/jumpa-phase2`). Semua tetap di
balik flag `NEXT_PUBLIC_JUMPA_ENABLED` / `ENABLE_JUMPA`. **Tidak ada harga yang diubah** —
angka paket di bawah adalah usulan awal untuk diputuskan CEO, semuanya di satu file:
`lib/jumpa/tiers.ts`.

---

## 1. Riset kompetitor (ringkas, bersumber)

### Batas paket gratis vs berbayar

| Layanan | Gratis | Berbayar | Sumber |
|---|---|---|---|
| Zoom Basic | 40 menit per rapat, 100 peserta, rekaman lokal | Pro: hingga 30 jam, rekaman cloud, peserta lebih banyak | [Zoom free video conferencing](https://www.zoom.com/en/products/virtual-meetings/features/free-video-conferencing/), [Zoom KB0067966 batas waktu](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0067966), [Zoom KB0068002 batas peserta](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0068002) |
| Google Meet (akun pribadi) | 100 peserta, 60 menit untuk 3+ orang (1:1 sampai 24 jam) | Workspace Individual: 24 jam, 150 peserta, rekaman, peredam bising, 1080p | [Google Meet](https://workspace.google.com/products/meet/), [Meet answer 13396001](https://support.google.com/meet/answer/13396001), [Workspace Individual 10459644](https://support.google.com/google-workspace-individual/answer/10459644) |
| Microsoft Teams (free) | 60 menit, 100 peserta | Essentials: 30 jam, 300 peserta | [Microsoft Q&A 5616490](https://learn.microsoft.com/en-us/answers/questions/5616490/) |
| Whereby | Free: 4 peserta, 30 menit, tanpa rekaman | Pro: 100 peserta, tanpa batas waktu, rekaman | [Whereby pricing](https://whereby.com/information/meetings/pricing) |

Pola yang sama di semua layanan: **gratis dibatasi waktu (30–60 menit) lebih dulu daripada
jumlah peserta**. Rekaman, HD/1080p, dan peredam bising tingkat lanjut ditaruh di paket
berbayar.

### Teknik "ringan di HP"

| Layanan | Teknik | Sumber |
|---|---|---|
| Zoom | 720p grup ≈ 2,6 Mbps naik / 1,8 Mbps turun; gallery view menerima 2–4 Mbps. Gallery view adalah mode paling boros. | [Zoom: calculating bandwidth](https://library.zoom.com/) |
| Google Meet | Grid hingga 49 tile di web, default 16, **8 di HP**; mode **"Batasi penggunaan data"** (≈1 Mbps saat tanpa Wi-Fi). | [Meet answer 9292748](https://support.google.com/meet/answer/9292748), [Workspace Updates 2021-03](https://workspaceupdates.googleblog.com/2021/03/), [Meet answer 12929159](https://support.google.com/meet/answer/12929159) |
| Microsoft Teams | Setelan "Kurangi penggunaan data" di HP. | [Optimize mobile data usage](https://support.microsoft.com/en-us/office/optimize-mobile-data-usage-in-microsoft-teams) |
| Jitsi | `channelLastN`/`startLastN` (hanya N video terakhir yang dikirim), mode bandwidth rendah (audio saja), batas resolusi, `mobileCodecPreferenceOrder` default **VP8 dulu**, mode adaptif saat CPU kewalahan, `maxFullResolutionParticipants`. | [Jitsi handbook – configuration](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-configuration), [jitsi-meet config.js](https://github.com/jitsi/jitsi-meet/blob/master/config.js) |
| LiveKit | **H.264 untuk perangkat CPU terbatas** (hardware encode), maks 2 lapis simulcast tambahan, **dynacast** (lapisan yang tak ditonton berhenti di-encode), **adaptiveStream** (video yang tak terlihat dijeda, resolusi mengikuti ukuran elemen). | [LiveKit KB: optimal video quality](https://kb.livekit.io/), [LiveKit docs: advanced media](https://docs.livekit.io/transport/media/advanced/) |

---

## 2. Keputusan & yang diterapkan

### 2.1 Performa (tujuan 1)

**Kirim (publish)** — `components/jumpa/media-policy.ts`, murni dan diuji:

| Kualitas | Perangkat | Kamera | Lapis simulcast tambahan | Audio |
|---|---|---|---|---|
| Otomatis | HP lemah (≤ 4 core / ≤ 3 GB RAM) | 360p / 20 fps / 450 kbps | 180p | speech |
| Otomatis | HP biasa | 540p / 24 fps / 700 kbps | 180p | music |
| Otomatis | Laptop | 720p / 24 fps / 1,2 Mbps | 180p, 360p | music |
| Hemat Data | semua | 360p / 15 fps / 300 kbps | 180p / 12 fps / 100 kbps | speech |
| HD | Laptop Premium | 1080p / 30 fps / 2,6 Mbps | 360p, 720p | music |
| HD | Gratis atau HP | 720p / 30 fps / 1,7 Mbps | 180p, 360p | music |

- **Codec:** H.264 di iOS/iPadOS (encoder hardware, hemat baterai), VP8 di Android dan
  desktop (selaras dengan default mobile Jitsi; dukungan hardware VP8/H.264 di Android
  murah tidak konsisten, dan VP8 paling stabil di simulcast LiveKit).
- `simulcast` + `dynacast` + `adaptiveStream` (pixelDensity 1 di Hemat Data, 1,5 di HP,
  `screen` di laptop). Audio: preset `speech` + DTX + RED (tahan paket hilang).
- **Berbagi layar:** 720p / 5 fps / 1,2 Mbps (Gratis) atau 1080p / 5 fps / 2 Mbps (Premium),
  `contentHint: "detail"` supaya teks slide tajam.

**Terima (subscribe):**
- Grid berhalaman: **4 tile per halaman di HP**, 16 di laptop (12 laptop lemah, 9 Hemat Data),
  dengan pager dan geser (swipe). Tile di luar halaman tidak dipasang, jadi adaptiveStream
  menjeda videonya.
- Strip pembicara dibatasi (HP 6, HP lemah 4, Hemat Data 3; laptop 12), sisanya jadi chip
  "+N lainnya" yang membuka panel Peserta.
- Pembicara dari halaman lain naik ke halaman 1 tanpa membuat tile lain melompat.

**Turun kualitas otomatis:** di mode Otomatis, kalau koneksi sendiri `Poor`/`Lost` selama 6 detik,
JUMPA menerima lapisan rendah dan mengecilkan strip. Ada toast "Koneksi lemah, kualitas video
diturunkan." Kualitas dipulihkan setelah 20 detik `Good`. Indikator sinyal 3 batang kecil di
header; di layar ≤ 400px indikator hanya muncul saat koneksi lemah. Ikon "sinyal lemah" juga
tampil per tile peserta.

**Mode audio saja:** berhenti berlangganan semua video kamera (layar yang dibagikan tetap tampil)
dan mematikan kamera sendiri.

**Render React:** tile di-`memo` dan bereaksi sendiri saat track tiba; `Stage` di-memo; hitung
mundur, toast, dan reaksi punya komponen sendiri, jadi satu detik hitung mundur tidak me-render
ulang grid video. Jumlah peserta hanya diperbarui saat ada yang masuk atau keluar. Opsi `Room`
dibuat sekali.

**CSS di HP:** `backdrop-filter` dan bayangan glow dimatikan untuk `max-width: 767px` dan
`pointer: coarse`. Animasi bicara diganti cincin statis. Nameplate tanpa blur. `prefers-reduced-motion`
dihormati.

**Bundle:** `framer-motion` dihapus dari semua komponen JUMPA (diganti keyframe CSS). Ruang
LiveKit tetap di-lazy-load (`next/dynamic`) dan sekarang di-prefetch saat browser idle di lobby.
Lobby, beranda, dan tombol KelasKu tidak meng-import `livekit-client` (ada tesnya).

#### Bundle sebelum → sesudah

Next 16 (Turbopack) tidak lagi mencetak "First Load JS", jadi angka diukur dengan
`npm run jumpa:bundle-report` (membaca `.next` setelah `NEXT_PUBLIC_JUMPA_ENABLED=true npm run build`).

| Rute | JS awal sebelum (mentah / gzip) | JS awal sesudah | Selisih gzip |
|---|---|---|---|
| `/jumpa/[code]` (lobby) | 937,2 KB / 279,8 KB | 841,1 KB / 247,8 KB | **−32,0 KB (−11,4%)** |
| `/jumpa` (beranda) | 929,2 KB / 277,0 KB | 820,3 KB / 241,3 KB | **−35,7 KB (−12,9%)** |
| `/guru/kelasku` | 1001,4 KB / 291,1 KB | 1001,7 KB / 291,2 KB | +0,1 KB (tombol kuota) |
| `/` | 1022,3 KB / 301,1 KB | 1022,3 KB / 301,0 KB | 0 |
| Ruang (lazy, saat gabung) | 659,0 KB / 172,8 KB | 663,1 KB / 173,8 KB | +1,0 KB (pengaturan, kebijakan media) |

Sekitar 900 KB dari JS awal adalah layout root situs (dipakai semua halaman), bukan JUMPA.

### 2.2 Tampilan khas (tujuan 2)

- Merek **"JUMPA by BahasaCerdas"**: tanda "J" bergradien di header, lobby, dan beranda.
- **Dock kontrol khas:** tombol "squircle" (bukan bulat seperti Meet/Zoom) dengan label di bawah,
  dikelompokkan (Mik · Kamera | Layar · Tangan · Pengaturan · Lainnya | Keluar). Pita
  gradien tipis di atas dock. Tombol Keluar berbentuk pil merah berlabel. Indikator bicara
  berdenyut di tombol Mik.
- **Warna tombol "kekinian":** tombol diam pakai kaca berwarna tipis (gradien teal→violet di atas
  surface, tanpa `backdrop-filter`). Tombol aktif pakai gradien merek teal→biru→violet dengan ikon
  gelap. Mik/kamera mati pakai coral lembut. Angkat tangan pakai gradien kuning→coral. Keluar tetap
  merah. Di laptop, tombol terangkat 2px saat hover dengan glow `box-shadow` ringan; saat ditekan
  mengecil ke 0,92 dengan efek pegas. Kontras (token gelap): ikon diam 9,4:1, ikon aktif ≥ 6,9:1,
  ikon mati 4,96:1, Keluar 6,7:1. Semua lolos WCAG AA.
- **Panel Pengaturan** (dipakai di lobby dan ruang): pemilih kamera, mikrofon, dan speaker (speaker
  hanya bila browser mendukung `setSinkId`); kualitas video **Otomatis / Hemat Data / HD**
  (HD menunjukkan batas paket, mis. "maks 720p"); **Mode audio saja**; **Peredam bising**
  (pakai `noiseSuppression` bawaan browser, karena Krisp LiveKit hanya tersedia di LiveKit Cloud); baris
  **Latar blur · Premium · Segera hadir (hanya laptop)** dikunci (lihat keputusan); kartu "Paket ruang ini".
- Nama di strip pembicara tidak terpotong lagi: "Dewi Permata" → **"Dewi P."** (nama lengkap ada
  di `title`/`aria-label`).

### 2.3 Paket Gratis vs Premium (tujuan 3)

**Tabel paket** (satu sumber: `lib/jumpa/tiers.ts`; `lib/jumpa/caps.ts` kini diturunkan dari sini):

| | **Gratis** | **Premium** (PRO / masa coba guru / FOUNDER) |
|---|---|---|
| Ruang Kelas | **40 peserta · 45 menit** | 50 peserta · 120 menit |
| Ruang Guru | **10 peserta · 45 menit** | 25 peserta · 120 menit |
| Ruang baru per hari (Kelas + Guru, hitungan WIB) | **3** | tanpa batas |
| Kamera maks | 720p | 1080p (laptop) |
| Berbagi layar maks | 720p / 5 fps | 1080p / 5 fps |
| Rekaman | tidak | Fase 4 (belum dibangun) |
| Latar blur | tidak | Fase 4 (belum dibangun) |
| Ruang **MURID** (belajar bareng) | **8 peserta · 60 menit, selalu gratis, sama di kedua paket, tidak pernah ada ajakan upgrade** | sama |

Alasan angka Gratis: 45 menit = 1 JP SMA (SMP 40, SD 35), jadi satu jam pelajaran muat utuh.
40 peserta = satu rombel penuh (maks 36 murid + guru). Sedikit lebih longgar dari Zoom
(40 menit), lebih ketat dari Meet (60 menit).

**Hak paket:** `resolveJumpaTier(userId)` memakai `resolvePlan()` yang sudah ada
(`lib/premium-economy/plans.ts`): PRO (termasuk trial guru) dan FOUNDER → Premium;
FREE/MURID_PREMIUM → Gratis. Kalau DB gagal dibaca, hasilnya Gratis (fail-closed).

**Penegakan server:**
- `POST /api/jumpa/rooms` → paket ditentukan saat ruang dibuat dari paket pembuat, lalu
  disimpan di metadata event `ROOM_CREATED` (**tanpa migrasi DB**). Batas peserta dan durasi
  ditulis ke baris ruang. Kuota harian dihitung sejak 00:00 WIB; kalau habis, server membalas
  `429 TIER_DAILY_LIMIT` + `upgradeUrl`.
- `POST /api/jumpa/rooms/[code]/token` → kapasitas dan waktu habis ditegakkan dari baris ruang
  (seperti Fase 2) + `maxParticipants` di LiveKit. Respons membawa `tier` untuk UI.
- Cron sweep menutup ruang yang lewat waktu, dan klien keluar otomatis saat hitung mundur 0.
- Batas resolusi kamera adalah **kebijakan klien**: SFU tidak bisa memaksa resolusi kirim.
  Pemborosan maksimal tetap dibatasi oleh `maxBitrate` per lapis.
- Ruang lama (tanpa `tier` di metadata) dianggap Premium, jadi perilaku Fase 2 tidak berubah.

**UI:** lencana Gratis/Premium di header ruang, lobby, dan beranda. Strip paket di beranda guru
menampilkan "N dari 3 ruang tersisa hari ini". **Hitung mundur** selalu tampil di ruang Gratis
(ruang lain hanya di 10 menit terakhir), berwarna kuning di ≤ 10 menit. Lembar
**"Ruang hampir selesai"** muncul sekali di ≤ 5 menit, hanya untuk guru pembuat ruang Gratis
(murid tidak pernah melihatnya). Lembar **"Kuota ruang hari ini habis"** muncul saat batas harian
tercapai. Tombol **"Lihat Premium"** membuka `/guru/berlangganan` di tab baru, jadi kelas tetap
berjalan.

**Copy UI singkat, tanpa pengulangan** (permintaan CEO): setiap lembar punya satu judul plus
daftar manfaat ("Dengan Premium": Kelas 120 menit · 50 peserta / Ruang guru 25 peserta / Ruang
tanpa batas per hari / Video hingga 1080p). Tidak ada paragraf yang mengulang angka. Saat kuota
habis, hanya lembar upgrade yang tampil (banner error tidak lagi mengulang pesannya). Teks bantuan
pengaturan, lencana ("Premium (coba)"), kartu paket ("40 orang · 45 menit · 720p"), beranda,
layar keluar, empty state, dan toast dipadatkan. Ada tesnya di `test:jumpa-tiers`. Layar "ruang berakhir karena batas waktu" juga punya tombol ke Premium.

---

## 3. Pengujian

- `npm run test:jumpa-tiers` (baru, 80 cek): tabel paket, MURID selalu tetap, pemetaan plan,
  kuota harian dan batas hari WIB, ajakan upgrade, penegakan di service/route, kebijakan media
  (HP lebih rendah, H.264 iOS, Hemat Data, batas 720p Gratis), preferensi lama tetap terbaca,
  `shortName`, tanpa framer-motion, lazy-load LiveKit, tanpa emoji, tanpa hex di CSS. Sudah
  ditambahkan ke step CI "JUMPA permission + token gates".
- Tes JUMPA lama tetap hijau. `test-jumpa-permissions` disesuaikan untuk bentuk preferensi
  baru dan dock yang pindah ke CSS.
- Tes yang memang sudah gagal di main tidak bertambah parah (jumlah gagal identik):
  `test:no-emoji-icons` (2), `audit:theme-hardcoded` (BLOCKING 2), `test:task-share-link` (16),
  `test:guru-dashboard-theme-consistency` (3; zona terlindung kini hanya 2 rute JUMPA yang
  memang diubah).
- Tangkapan layar: `/workspace/jumpa/screens/v3_*_{1440,360,430}.png` (lobby, pengaturan lobby,
  panggilan, tampilan pembicara/grid, pengaturan di ruang, ajakan upgrade, beranda paket, kuota
  harian). Dibuat dengan LiveKit lokal (`--dev`) + 5 bot Chrome kamera palsu + data tiruan
  paket Gratis (harness dev, tidak di-commit).

---

## 4. Keputusan untuk CEO

1. **Angka final paket Gratis:** Kelas 40 orang / 45 menit, Guru 10 / 45, 3 ruang per hari?
   (Satu baris di `lib/jumpa/tiers.ts`.)
2. **Upgrade di tengah panggilan:** saat ini upgrade berlaku untuk ruang **berikutnya**
   (`maxParticipants` di LiveKit tidak bisa diubah setelah ruang dibuat; ruang lama tidak
   dipakai ulang setelah upgrade). Perlu "perpanjang ruang yang sedang berjalan"?
3. **Rekaman dan latar blur** sebagai fitur Premium di Fase 4? (Blur MediaPipe berat untuk HP
   dan butuh penyesuaian CSP, jadi diusulkan hanya untuk laptop.)
4. **Hitung mundur sejak awal** di ruang Gratis (sekarang ya), atau hanya 10 menit terakhir?
5. **Masa coba guru dihitung Premium** (sekarang ya, mengikuti `resolvePlan`)?
6. **720p untuk Gratis** dan 1080p untuk Premium. Tetap begitu, atau Gratis cukup 540p supaya lebih hemat server?
