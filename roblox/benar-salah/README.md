# BahasaCerdas / Benar atau Salah — Roblox multi-place

## Repository source
- `components/game/BenarSalah.tsx` — 9 tingkat, 3 nyawa, 40/70/90 persen untuk 1/2/3 bintang, timer per level, combo, skor 1 per jawaban tepat, XP `min(floor(score/40),60)`.
- `app/api/game/menara/route.ts` — bank soal dipilih dari `harvestJalurQuestions`, API membatasi `count` maksimal 20.
- `lib/game/question-bank.ts`, `lib/game/question-bank-expansion.ts` — 224 entri; generator mempertahankan 215 soal berbeda yang memenuhi quality gate: minimal 3 opsi unik dan indeks jawaban valid.
- `roblox/benar-salah/src/ServerScriptService/QuestionBank.lua` — hasil ekspor bank yang disimpan hanya di server.

## Place architecture
- UniverseId: `10778631695` (BahasaCerdas PRIVATE)
- Lobby start PlaceId: `83975639468986`
- Benar atau Salah PlaceId: `100707509457007` — diterbitkan di dalam universe yang sama lewat **Add as a new place**.
- NUSANTARA terpisah, tidak diubah.

## Flow
Start (pilih tingkat) → soal + contoh jawaban → nilai contoh Benar/Salah → umpan balik + penjelasan → layar hasil + skor, bintang, XP, Main Lagi, Tingkat, Kembali ke Lobby.

Server memegang bank soal, jawaban, RNG pilihan contoh, tenggat waktu, skor, nyawa, combo, bintang, penyimpanan DataStore. Klien hanya mengirim pilihan boolean bersama nonce soal. Permintaan yang berulang/terlambat/di luar ronde ditolak. Skor BC web **tidak** disinkronkan ke Roblox: integrasi akun belum disetujui.

## Penerapan khusus
- Level 8/9 aslinya meminta 22/25 soal, tetapi API saat ini memotong menjadi 20. Port Roblox memakai hasil efektif API, yaitu 20.
- Formula XP web untuk skor maksimal 20 biasanya menghasilkan 0. Port mempertahankannya demi kesetiaan aturan; revisi reward perlu keputusan produk terpisah sebelum dijadikan hadiah lintas platform.
- Musik/efek suara belum tersedia sampai aset audio berlisensi resmi dipilih; tidak memasang aset palsu.
- Game dapat dicoba langsung sebagai private place oleh pemilik; pintu lobby memerlukan publish update lobby dan pengujian teleport ke place tersebut.
- Untuk pengujian: Play Solo (pemuatan, 9 tingkat, 3 nyawa, hasil), Test Local Server 2 clients (isolasi sesi), Device Emulator (small phone/large phone/tablet) dan aplikasi Roblox asli (teleport).
- Privasi experience tetap PRIVATE, tanpa transaksi/Robux.
