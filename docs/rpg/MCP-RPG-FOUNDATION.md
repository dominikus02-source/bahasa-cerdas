# Fondasi MCP RPG Pendekar Suryakerta

Status: V0.1 — fondasi pipeline visual 3D

## Tujuan

Membangun pipeline lokal untuk:
- Blender sebagai tempat pembuatan/pembersihan aset 3D.
- MCP Blender untuk mengendalikan Blender melalui AI.
- Unity sebagai runtime game 3D.
- MCP for Unity untuk mengendalikan Unity Editor melalui AI.
- Arga sebagai karakter utama.
- Target pertama: dunia berjalan 3D yang indah, bukan combat/RPG penuh.

## Keputusan

Jangan bergantung pada Meshy berbayar untuk pipeline inti.

### MCP Blender

Blender menyediakan MCP Server resmi. Persyaratan saat ini:
- Blender 5.1 atau lebih baru.
- Add-on Blender MCP.
- MCP server.
- Klien AI yang mendukung MCP.

Dokumentasi:
https://www.blender.org/lab/mcp-server/

Catatan keamanan: MCP Blender resmi dapat menjalankan kode Python yang dibuat LLM di Blender. Gunakan hanya pada mesin/proyek yang aman dan jangan berikan akses ke data sensitif.

### MCP Unity

Gunakan MCP for Unity dari CoplayDev sebagai jalur utama.

Repository:
https://github.com/CoplayDev/unity-mcp

Versi yang diverifikasi:
- v10.0.0 (2026-06-30)
- Lisensi MIT
- Unity 2021.3 LTS sampai Unity 6.x
- Python 3.10+ dan uv
- Mendukung Codex dan klien MCP lain.

Paket Unity:
https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main

## Arsitektur

AI
  ↓
MCP Blender
  ↓
Blender
  ↓
GLB/FBX
  ↓
Unity
  ↓
MCP for Unity
  ↓
Scene V0.1 Pendekar Suryakerta

## V0.1

Wajib:
1. Arga 3D.
2. Rig humanoid.
3. Idle.
4. Walk.
5. Run.
6. Third-person camera.
7. WASD + tombol arah.
8. Collision.
9. Terrain.
10. Pohon, batu, semak, reruntuhan.
11. Pencahayaan dan atmosfer yang premium.
12. Scene dapat dimainkan.

Tidak dikerjakan pada V0.1:
- Combat.
- Quest.
- NPC AI.
- Inventory.
- XP.
- Multiplayer.
- Ekonomi.
- Integrasi pembelajaran.

## Referensi Arga

Referensi visual Arga yang sudah ada berada di:
assets-src/rpg/characters/arga/

Gunakan referensi tersebut sebagai sumber kebenaran visual. Jangan mendesain ulang Arga tanpa alasan.

## Gate selesai V0.1

V0.1 hanya dianggap selesai jika:
- Game dapat dibuka.
- Arga terlihat benar.
- Arga dapat bergerak.
- Kamera mengikuti Arga.
- Arga tidak menembus terrain/objek utama.
- Idle/walk/run berpindah dengan benar.
- Dunia terlihat konsisten dan tidak seperti prototipe kotak-kotak.
- Tidak ada error kritis di Unity Console.
- Scene dapat disimpan dan dibuka kembali.

## Catatan integrasi

MCP Unity belum terhubung ke sesi ChatGPT ini. Jadi pemasangan server lokal tetap harus dilakukan pada komputer yang menjalankan Unity. Setelah MCP aktif pada klien MCP yang digunakan, agen tersebut dapat mengendalikan Unity Editor.

Jangan mengubah aplikasi web BahasaCerdas untuk memaksa Unity masuk ke Next.js. RPG sebaiknya tetap menjadi proyek runtime terpisah dan hanya diintegrasikan ke BC setelah vertical slice visual terbukti bagus.
