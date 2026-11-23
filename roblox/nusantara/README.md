# NUSANTARA: Kebangkitan Bahasa — Roblox v0.2

## Publikasi Roblox
- **Experience publik:** https://www.roblox.com/games/135622689114243
- Diterbitkan melalui Roblox Studio pada 23 November 2026.
- Roblox Studio mengonfirmasi: **available to players ages 16+**.
- Perangkat dipilih: PC, phone, tablet (VR dinonaktifkan).
- Opsi Data Sharing untuk pelatihan AI Roblox dinonaktifkan saat pembuatan.
- File build yang dipublikasikan: `Nusantara-v0.2-full.rbxl`.

## Uji teknis
- Rojo build: PASS.
- Roblox Studio PlayServer: PASS; map, HUD, kelas, tombol skill tampil.
- Perbaikan: DataStore tidak lagi menghalangi mode Play untuk place yang belum dipublikasikan.
- Catatan: DataStore permanen, multi-pemain lintas perangkat, keseluruhan quest, performa saat ramai, dan akses pemain usia di bawah 16 **belum divalidasi**.
- Masih ada pekerjaan visual: label jarak dekat dan beberapa efek area perlu pemolesan.

## Konten adaptasi
Adaptasi Luau dari `GimNusantara_3D_Playable (1) (1).html` (v9.3), bukan eksekusi HTML/Three.js.
- 8 zona dengan landmark, bangunan, hutan, jembatan, kuil dan arena.
- 8 NPC interaktif, kuis Bahasa Indonesia, perolehan XP dan level.
- 3 lokasi rahasia, kelas Pujangga/Pendekar/Cendekia.
- Jurus Kata, Perisai, Rantai, Ejaan, Majas dan Dash.
- Musuh kata dan Penjaga Makna dengan perhitungan damage di server.
- Progress disimpan ke DataStore pada environment Roblox yang tersedia; fallback sesi saat tidak tersedia.

## Instalasi
Buka `Nusantara-v0.2-full.rbxl` di Roblox Studio atau jalankan `rojo build default.project.json -o Nusantara-v0.2-full.rbxl`.
Mainkan dengan Play. Sumber kode ada di `src/ServerScriptService` dan `src/StarterPlayerScripts`.

## Batasan
Prototipe ini belum merupakan port penuh: quest bercabang lengkap, semua materi dan aset dari HTML, animasi dan cerita sinematik, minimap/fast travel, audio, serta sistem party kustom belum diimplementasikan. Roblox menyediakan multiplayer dasar, tetapi belum ada pengujian multiplayer serentak.

## Aset promosi (audit 23 November 2026)
- `icon-512x512.jpg`: ikon experience 512 × 512 memakai logo BC resmi.
- `thumbnail-1920x1080.jpg`: thumbnail 1920 × 1080 dengan cuplikan aktual dari sesi Roblox Studio, judul, dan branding BC.
- Aset sudah disimpan di branch PR #280, tetapi **belum diunggah ke Creator Dashboard Roblox** karena sesi Chrome belum login ke Roblox walaupun Studio sudah login.
- Untuk memasang: masuk ke https://create.roblox.com/dashboard/creations/experiences/10778596245/places/135622689114243/configure → Icon / Thumbnails → upload aset masing-masing, lalu pantau moderasi.
- Sumber tangkapan layar masih versi prototipe v0.2. Sebelum promosi luas, ambil ulang screenshot setelah label NPC bertumpuk dibereskan.
- Audit Roblox public API: creator BahasaCerdas, place `135622689114243`, universe `10778596245`, judul/deskripsi sesuai, kapasitas terkonfigurasi 50 pemain; pada saat cek kunjungan dan pemain aktif masih 0. Pengujian multiplayer belum dilakukan.
- Karena experience terbit sebagai 16+, akses pengguna di bawah usia tersebut tidak diasumsikan tersedia. Tinjau kuesioner usia/audience sebelum memasarkan untuk murid.
