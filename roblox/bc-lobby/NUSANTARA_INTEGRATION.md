# Gerbang NUSANTARA di Kota Aksara Langit

**Tujuan:** Kota Aksara Langit sebagai lobby utama BahasaCerdas; NUSANTARA: Kebangkitan Bahasa salah satu dunia yang diakses melalui gerbang.

## ID terverifikasi
- NUSANTARA experience (UniverseId): `10778596245`
- NUSANTARA root PlaceId: `135622689114243`
- Pemilik yang tercatat pada API Roblox: `BahasaCerdas`
- Tautan resmi: https://www.roblox.com/games/135622689114243

## Cara kerja
- Script: `src/ServerScriptService/NusantaraPortal.server.lua`, `src/StarterPlayer/StarterPlayerScripts/NusantaraPortal.client.lua`.
- Pemain membuka panel dengan ProximityPrompt pada gerbang NUSANTARA di plaza.
- Tombol Masuk mengirim permintaan ke server; server memeriksa aksi, karakter, jarak gerbang, dan cooldown.
- Server menjalankan `TeleportService:TeleportAsync(135622689114243,{player})`.
- Kesalahan teleport dikembalikan sebagai pesan berbahasa Indonesia yang ramah.
- Semua 13 gerbang asli masih penanda informasi dan belum diaktifkan teleport.
- Tidak ada biaya Robux atau pembelian yang diinisiasi.

## Pengujian dan publikasi
- ProximityPrompt serta UI dapat diuji di Roblox Studio Play Solo.
- **Teleport tidak bekerja di Play Solo Studio.** Roblox menyarankan uji setelah lobby dipublikasikan dengan aplikasi Roblox.
- Apabila perpindahan lintas universe ditolak, cek security / Allow Third Party Teleports serta akses masuk experience tujuan sesuai kebijakan Roblox Creator Hub. Jangan mengubah setting produksi tanpa verifikasi.
- Lobby visual saat ini masih branch pengembangan; **bukan publik** dan tidak mengganti pengalaman NUSANTARA v0.2.
- Sesudah lobby mendapat PlaceId publik, sediakan gerbang balik / tombol `Kembali ke Kota Aksara` di NUSANTARA menggunakan PlaceId lobby (jangan gunakan placeholder palsu).
- Roblox tidak menjamin progres DataStore otomatis terbagi lintas universe; rancang progres per game dengan bijak sebelum integrasi data akun.

Referensi: https://create.roblox.com/docs/projects/teleport dan https://create.roblox.com/docs/reference/engine/classes/TeleportService .
