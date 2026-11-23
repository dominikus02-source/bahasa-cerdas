# BahasaCerdas Roblox — Kota Aksara Langit · AKSI (Visual v1.2)

## Keputusan kreatif
Disetujui pengguna pada 23 November 2026: **Kota Aksara Langit** dan **AKSI**, maskot makhluk tinta ajaib. Identitas visual diambil dari `lib/brand.ts`, `app/theme/tokens.css`, dan logo BC resmi pengguna.

## Palet
| Peran | Warna |
|--|--|
| Utama — Violet | `#7C3AED` |
| Aksen — Blue | `#2563EB` |
| Aksen — Pink | `#EC4899` |
| Panel — Navy | `#111C3A` |
| Benar | `#10B981` |
| Belum tepat | `#F87171` |
| Bonus | `#FBBF24` |

## Sistem visual
- Bentuk **low-poly stylized**, membulat, chunky, material SmoothPlastic; tidak realistis.
- Dunia: pulau terapung, awan, menara pena, perpustakaan ajaib, 13 buku terbang dan 7 siluet huruf melayang, air mancur, spot foto.
- AKSI adalah maskot orisinal dari primitif Roblox, dengan idle mengambang, tangan melambai, ProximityPrompt dan dialog bahasa Indonesia.
- UI: Gotham Bold/Medium, kartu navy membulat, sorot emas, animasi hover/tekan, popup AKSI, kamera sinematik saat pertama masuk dan kembali normal saat memilih Mulai Jelajah.
- Pencahayaan: siang hangat, Atmosphere, ColorCorrection ringan, Bloom rendah.
- Minimap, 13 showcase gates, informasi tiap gerbang dan tombol kembali tetap dari Stage 1.
- Semua animasi idle berjalan **client-side** agar dekorasi tidak menghasilkan update CFrame berulang dari server.

## Bukti uji 23 November 2026
- Build lokal Rojo: `KotaAksara-Langit-AKSI-v1_2.rbxl` — sukses.
- Roblox Studio: Play Solo/PlayServer berhasil; Output mendeteksi `[BC Lobby]`, `[KotaAksara]`, `[KotaAksaraUI]` tanpa error Lua baru pada pencarian log awal.
- Screenshot asli Roblox Studio (bukan ilustrasi): `KotaAksara-v1_2-Aerial.png` dan `KotaAksara-v1_2-Walk.png`.
- Belum diuji di ponsel fisik, Local Server 2 pemain, pengukuran FPS, serta pengujian interaksi tiap gerbang secara individual. Jangan menganggap target 30/60 FPS sudah terverifikasi.

## Belum dalam scope Langkah 1
- Gerbang belum aktif berpindah game. TeleportService, PlaceId, dan sistem permainan dibuat pada Langkah 2 dan selanjutnya.
- Musik dan efek suara berlisensi masih menunggu pemilihan/pengunggahan aset resmi Roblox; tombol menunjukkan status jujur “Musik belum tersedia”.
- Maskot belum merayakan kemenangan dalam game karena sistem event kemenangan belum terhubung.
- Logo resmi BC belum diunggah menjadi Roblox Image asset ID, sehingga HUD masih teks identitas.
- Pulau dan landmark merupakan **versi visual pertama**, belum akhir produksi. Perlu audit occlusion, material, detail portal, performa mobile, serta keterbacaan teks dekat kamera.
- Proyek ini **belum dipublikasikan** dan tidak mengubah experience NUSANTARA v0.2 yang telah publik.

## Cara buka lokal
File build di `roblox/bc-lobby/KotaAksara-Langit-AKSI-v1_2.rbxl`.
Pilih Play Solo di Studio, tutup layar Selamat Datang dengan Mulai Jelajah, sapa AKSI via ProximityPrompt, jelajahi jalur, dan tekan Kembali ke Lobby.

## Review sebelum melanjutkan
1. Persetujuan kualitas visual Kota Aksara Langit dan karakter AKSI.
2. Umpan balik jika perlu dunia lebih padat, proporsi avatar/landmark, atau efek visual berbeda.
3. Langkah 2: portal tematik modular dengan teleport hanya untuk place yang benar-benar terbit.
