# Integrasi 13 Gim → Kota Aksara Langit

**Source status (24 November 2026):** route server + detail panel + Return Lobby handlers implemented in staging branch. **Not live / not fully published.**

## Struktur navigasi
1. Lobby `PlaceId 83975639468986` (Universe `10778631695`) memuat 13 gerbang dari `LobbyCatalog.lua`.
2. `BCGateRouter.server.lua` menangani 12 gerbang; `BenarSalahPortal.server.lua` tetap mengelola gerbang Benar atau Salah agar tidak ada prompt/handler ganda.
3. `BCGateDetails.client.lua` menampilkan panel pendek ketika gerbang didekati. Hanya tombol masuk untuk Place ID yang terisi dan tidak unpublished.
4. Server memvalidasi `id`, Place ID dari daftar resmi, jarak HumanoidRootPart dengan gerbang, kesehatan, serta cooldown. TeleportAsync hanya dipanggil dari server.
5. Setiap proyek gim sudah memiliki event `returnLobby` dan handler teleport kembali ke Place ID lobby. Kegagalan teleport ditangani dengan pesan.
6. NUSANTARA berbeda: saat ini terdaftar sebagai **experience terpisah** (`PlaceId 135622689114243`, Universe `10778596245`); jangan menganggapnya salah satu dari 13 gerbang yang sudah berada dalam Universe lobby.

## Destination inventory
| Gim | Place ID | Status route |
|---|---|---|
| Benar atau Salah | 100707509457007 | Terdaftar; uji live diperlukan |
| Susun Kata | belum ada | Informasi saja |
| Tebak Kata | belum ada | Informasi saja |
| Lari Kata | belum ada | Informasi saja |
| Menara Cerdas | belum ada | Informasi saja |
| Bermain Kata | belum ada | Informasi saja |
| Petualangan Kata | belum ada | Informasi saja |
| Irama Kata | belum ada | Informasi saja |
| Teka-Teki Silang | belum ada | Informasi saja |
| Tantang Teman | belum ada | Informasi saja |
| Adu Cepat | belum ada | Informasi saja |
| Kuis Tempur | belum ada | Informasi saja |
| Pendekar Suryakerta | belum ada | Unpublished, jangan diaktifkan |

## Langkah aktivasi untuk tiap gim
1. Selesaikan dan QA gameplay gim, termasuk mobile, dua pemain jika relevan, dan performa.
2. Di Roblox Creator Dashboard/Studio, tambahkan *place* gim ke **experience/universe lobby yang sama**; publish place, kemudian ambil Place ID asli, bukan Universe ID.
3. Masukkan ID yang dikonfirmasi ke `src/ReplicatedStorage/LobbyDestinations.lua` dan verifikasi izin akses ke place.
4. Build ulang lobby via Rojo, buka di Studio, pastikan gerbang aktif, prompt tidak ganda dan tombol detail muncul.
5. Untuk perjalanan antar-place, jalankan pengujian dalam sesi Roblox yang dipublikasikan (bukan hanya Play Solo). Verifikasi dari lobby → arena → lobby, dengan akun uji berbeda dan saat teleport gagal.
6. Jika semua tes lulus, baru aktifkan game live. Lakukan bertahap, jangan membuka portal pratinjau sebelum mekaniknya benar-benar siap.

## Uji statis
```bash
python roblox/game-factory/qa_13_worlds.py
```
Hasil statis **tidak** membuktikan bahwa Roblox Studio/TeleportService sudah berjalan.

## Pengaman UX
- Tidak mengarang Place ID, angka skor, atau badge publik.
- Gerbang belum aktif hanya menawarkan informasi, bukan teleport gagal.
- Tidak ada pembelian Robux atau pengaturan usia yang diubah.
- Jangan menggabungkan PR sampai uji runtime berhasil dan perubahan terhadap branch lobby yang lebih baru direkonsiliasi.

Referensi resmi:
- https://create.roblox.com/docs/projects/teleport
- https://create.roblox.com/docs/reference/engine/classes/TeleportService
