# Bermain Kata — Roblox BahasaCerdas

Status: **implementasi gameplay 4 mode tersedia di source staging, QA runtime belum lolos**. Belum dipublikasikan ke Roblox.

## Cara bermain
- **Susun:** baca petunjuk, susun huruf acak, masukkan kata lengkap.
- **Rumpang:** baca petunjuk, lengkapi kata yang disamarkan.
- **Pasangan:** pilih petunjuk yang sesuai dengan kata.
- **Makna:** pilih kata yang cocok dengan definisi.

Setiap putaran 10 soal, masing-masing benar +10 poin, skor diperiksa **server**.
Bank berasal dari `components/game/BermainKataGame.tsx`, 78 kata, SHA-256 `0267e8674b0ae6df1cac96d42d3e6698d16278d60422f17b9a99f3f2dfb1cad4`. Saat ini ini adalah versi Roblox 4 mode berbasis data yang sama, bukan paritas sempurna animasi/UI gim web.

## Build & QA
```powershell
cd roblox/bermain-kata
rojo build default.project.json -o bermain-kata-QA.rbxl
```

Uji di Roblox Studio Play Solo: masuk empat mode, 10 soal masing-masing, jawaban salah/benar, skor, restart mode, input ketik di PC/ponsel, koneksi multiplayer dua pemain tanpa tercampur skor, respawn, tombol kembali. Teleport lintas place hanya bisa divalidasi lewat aplikasi Roblox setelah PlaceId diterbitkan dan diberi izin.

**Belum boleh dihubungkan ke gerbang publik** hingga Play Solo + multiplayer + mobile QA lulus. Belum ada pengukuran FPS atau bukti uji dari Studio.
