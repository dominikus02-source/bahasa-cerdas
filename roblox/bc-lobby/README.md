# BahasaCerdas Kota Belajar — Roblox Lobby, Langkah 1

**Scope:** lobby lokal, bukan pengganti game Roblox publik v0.2. Basis katalog: `lib/arena/game-registry.ts` branch `main`, 23 November 2026.

## Dibangun
- Plaza spawn, tugu buku dan BahasaCerdas, jalur melingkar ke 13 gerbang showcase, rumah baca dan vegetasi ringan.
- Tampilan awal ramah anak, tombol **Mulai Jelajah**, informasi gerbang melalui ProximityPrompt (E PC, tombol sentuh mobile).
- Minimap arah utara tetap, lokasi pemain dan 13 titik gerbang, tombol **Kembali ke Lobby** dengan validasi server dan cooldown.
- Panel musik memiliki kontrol dan status jujur; **audio masih belum ada**. Untuk aktivasi audio, pilih aset Roblox Creator Store yang legal, lalu isi `BGM_ASSET_ID` di `src/StarterPlayer/StarterPlayerScripts/BCLobby.client.lua`.
- Penanda 13 game dari katalog resmi termasuk **Pendekar Suryakerta (belum diterbitkan)**. Setiap pintu hanya `Lihat informasi`, tidak melakukan teleport.
- `Workspace.StreamingEnabled` pada konfigurasi build (jika didukung pada versi Studio/Rojo ini).

## Build
```powershell
rojo build default.project.json -o BCLobby-Stage1.rbxl
```
Buka file di Roblox Studio. Play untuk uji. Untuk uji dua pemain: Test → Local Server → 2 players.

## Kriteria uji langkah 1
1. Spawn di plaza dan langsung terlihat tugu utama (tidak jatuh/terperangkap).
2. 13 gerbang showcase memiliki papan nama, prompt interaksi, dan panel informasi.
3. Kontrol keyboard/touch dan tombol kembali ke lobby dapat digunakan.
4. Minimap mengikuti posisi, UI tidak menghalangi tombol sentuh standar.
5. Tidak ada error Lua pada Output/Studio log; tidak bergantung pada DataStore maupun API.
6. Performa di perangkat rendah dan dua pemain **harus diuji nyata** sebelum menyatakan lolos lintas perangkat.

## Batasan
- TeleportService, PlaceId, akses server game, inventory/progres lintas sesi dan leaderboard **belum dibuat**, sesuai urutan langkah.
- Audio BGM menunggu aset berlisensi yang bisa diputar oleh experience; kontrol mute terpasang tetapi belum ada musik.
- Lobby tidak dipublikasikan ke Roblox dan tidak mengganti experience sebelumnya.
- Link Arena web tidak diubah pada Langkah 1.
- Jangan merge branch ini tanpa hasil uji dan review.
