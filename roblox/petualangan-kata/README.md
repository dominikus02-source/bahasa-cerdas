# Petualangan Kata — Hutan Kategori

**Status: gameplay 3D staging diimplementasikan dalam source, belum diuji Roblox Studio.**

Berbeda dari Bermain Kata yang mengandalkan menu, Petualangan Kata menggunakan **gerakan avatar dan interaksi ProximityPrompt** untuk mengumpulkan kategori yang tepat.

## Mekanik
- Putaran 12 kata acak dari bank kanonis `components/game/ZelbyDash.tsx` (SHA-256 `0eab171b68fd8359f97231dbc9114e28f331a896b64839eb8fd247fc1034160f`).
- Pemain membaca kata di HUD lalu memilih zona fisik **Kata Benda, Kata Kerja, atau Kata Sifat** di arena.
- Server memeriksa jarak avatar, kesehatan, urutan permainan dan kategori jawaban.
- Jawaban benar bernilai 10 poin, maksimum 120.
- Sesi pribadi terpisah untuk setiap pemain; tombol kembali ke lobby tetap ada.
- Tidak ada pembelian, chat tambahan, atau DataStore.

## Build QA
```powershell
cd roblox/petualangan-kata
rojo build default.project.json -o petualangan-kata-QA.rbxl
```

Wajib uji Play Solo 12 soal, jarak ProximityPrompt, ketiga papan kategori, sesi dua pemain, perangkat sentuh, FPS, respawn, serta teleport lintas place. Fitur ini baru menjadi kandidat untuk publikasi setelah pengujian berhasil dan PlaceId resmi sudah ada.

*Catatan:* mekanik kategori diambil dari bank ZelbyDash, tetapi ini bukan klaim paritas sempurna terhadap kecepatan, animasi, dan kontrol gim web.
