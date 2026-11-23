# BahasaCerdas Roblox — Game Factory

Status: branch staging, bukan publik. Semua 13 permainan dari katalog Arena dipetakan menjadi Rojo project dengan arena 3D natural dan antarmuka Roblox.

## Standar
Kota Aksara Langit adalah lobby utama (PlaceId 83975639468986). NUSANTARA tetap di experience lain (PlaceId 135622689114243). Game baru tidak boleh diberi PlaceId yang belum terbit.

Tampilan: pulau belajar low-poly, hijau sage, batu pasir, kayu hangat, gading, langit biru lembut, aksen violet BC. HUD adaptif untuk mobile dan laptop. Kamera dan avatar Roblox tetap terlihat.

## Status kode
- Benar atau Salah: gameplay asli tersedia; visual diubah ke kit baru.
- Susun Kata: 12 tingkat, 173 kata, 3 nyawa, timer, bonus kombo dan validasi server.
- Tebak Kata: 9 tingkat, 254 kata, 3 petunjuk, 3 nyawa, skor dan validasi server.
- Menara Cerdas: 12 soal per putaran, 3 nyawa, menara naik satu lantai setiap benar, 142 soal kurasi.
- Irama Kata: 4 jalur, 9 tingkat, 5 kategori bank kata, ketukan PAS/BAGUS dan penalti dari aturan web.
- Petualangan Kata: arena + data; port mekanik menangkap kata belum selesai.
- BERMAIN KATA: arena + 78 kata dan 15 pasangan makna; empat mode belum selesai.
- Teka-Teki Silang: arena + 11 tema; generator silang belum diportasi.
- Lari Kata: arena; soal API asli belum terintegrasi.
- Kuis Tempur: arena + bank soal; bot dan multiplayer belum diportasi.
- Tantang Teman: arena; matchmaking belum diportasi.
- Adu Cepat: arena; pertandingan serentak belum diportasi.
- Pendekar Suryakerta: arena staging; status unpublished dan premium web dipertahankan.

Arena dengan status preview bukan gameplay penuh dan tidak boleh diklaim playable.

## Sumber
Data literal berasal dari komponen asli di repository BahasaCerdas dan disertai SHA-256 asal pada data/INVENTORY.json. Data soal dan jawaban berada di ServerScriptService, bukan klien. Soal per pengguna yang hanya ada di API tidak dikarang.

## Uji
- Build semua 13 project menggunakan Rojo.
- Jalankan python roblox/game-factory/qa_factory.py untuk pemeriksaan hash, sumber, proyek, berkas, BOM.
- Play Solo perlu memeriksa HUD, mekanik putaran, kontrol dan error Luau.
- Device Emulator, HP fisik, Local Server dua pemain, FPS dan teleport lintas experience adalah tahap wajib sebelum publikasi.
- Aktifkan portal hanya setelah PlaceId resmi tersedia dan game telah lulus QA.

Belum ada sinkronisasi akun/skor web BahasaCerdas ke Roblox. Pengaitan akun memerlukan kajian privasi anak tersendiri. Tidak ada Robux dibelanjakan atau pengalaman publik yang diubah oleh batch ini.
