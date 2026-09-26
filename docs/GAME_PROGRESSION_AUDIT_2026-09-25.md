# GAME AUDIT — LEVELING & CONTENT INTEGRITY
Tanggal: 25 September 2026
Branch: `audit/game-progression-kataplay-tts`

## Executive summary

Audit menemukan pola utama: sebagian besar gim memiliki **level numerik**, tetapi level belum selalu berarti **kenaikan kemampuan Bahasa Indonesia**. Banyak level saat ini terutama menaikkan jumlah soal, panjang kata, tempo, atau waktu.

Target baru yang dipakai audit ini:

1. **Level = kenaikan kompetensi**, bukan sekadar angka.
2. **Soal = sumber belajar yang terverifikasi**, bukan kumpulan soal acak yang hanya diberi label level.
3. **Mekanik boleh sederhana**, tetapi kurva konten harus meningkat.
4. **Unlock harus konsisten** dengan mastery, bukan hanya pernah bermain.
5. **Jalur Cerdas menjadi backbone pembelajaran**, khususnya untuk KataPlay.
6. **Teka-Teki Silang mempertahankan identitas permainan**, tetapi kontennya harus memiliki gerbang kesulitan yang nyata.

## Audit semua gim

| Gim | Kondisi leveling saat audit | Sumber konten | Temuan utama | Arah |
|---|---|---|---|---|
| Teka-Teki Silang | 12 level | `lib/game/tts/word-bank.ts` | Struktur level sudah kuat, tetapi gate sebelumnya masih terlalu longgar; tema belum selalu sama dengan tingkat kognitif | **Diperbaiki**: tier konten digerbangkan per level |
| Tebak Kata | 9 level | bank kata lokal | Level terutama berdasarkan panjang kata/jumlah ronde | Perlu semantic difficulty |
| Susun Kata | 9 level | bank kata lokal | Level terutama panjang kata + timer | Perlu semantic + structural difficulty |
| Benar/Salah | 9 level | API Menara | Count + timer naik; konten tidak jelas mengikuti level | Perlu level-aware question selection |
| Lari Kata | tanpa level produk yang nyata | API Katastra | Klaim kesulitan naik, tetapi komponen tidak mengikat konten ke level | Perlu progression contract |
| Irama Kata | 9 level | bank kata lokal | Level terutama BPM/density/rule | Mekanik sudah naik, konten perlu naik juga |
| Menara Cerdas | progres lantai | pelajaran murid | Sumber konten bagus karena berasal dari pelajaran, tetapi difficulty tidak menjadi filter utama | Perlu mastery-aware selection |
| Kuis Tempur Solo | performance level sampai 99 | `QUESTION_BANK_EXPANDED` | Paling dekat dengan leveling berbasis performa; pool masih global | Pertahankan, tambah difficulty metadata |
| Zelby Dash / Petualangan Kata | 5 level | bank kata statis | Level naik berdasarkan streak; bukan mastery Bahasa Indonesia | Perlu content progression |
| Tantang Teman | duel 10 soal | server challenge | Kompetisi berjalan, tetapi level konten tidak eksplisit | Perlu matchmaking/content band |
| KataPlay | 6 level + banyak lesson/type | static `kataplay-content.ts` | **Tidak benar-benar menjadi Jalur Cerdas**; banyak tipe soal dan progression terpisah | **Diperombak menjadi satu game Jalur Cerdas** |

## Teka-Teki Silang — keputusan desain

TTS tetap memakai generator crossword prosedural karena mekanik ini memang inti gimnya.

Perubahan penting:

- Level 1–2 hanya menerima konten **tier dasar**.
- Level 3–6 memakai transisi dasar → menengah.
- Level 7–8 masuk **tier menengah**.
- Level 9–12 membuka **tier lanjut**.
- Kata langka tidak boleh muncul terlalu dini.
- Grid tetap naik ukuran/jumlah kata, tetapi **isi petunjuk juga naik tingkat**.
- Bank kata khusus TTS tetap dipakai karena crossword membutuhkan jawaban satu kata tanpa spasi.
- Bank soal Bahasa Indonesia dipakai sebagai **rujukan kompetensi/semantik**, bukan ditempel mentah ke grid.

### Mengapa bank soal tidak ditempel mentah ke TTS?

Soal pilihan ganda seperti “Manakah penulisan kata baku yang benar?” tidak otomatis menjadi petunjuk crossword yang valid. Crossword membutuhkan pasangan:

`petunjuk → satu jawaban kata`

Karena itu konten harus melalui transformasi/validasi sebelum menjadi clue crossword. Prinsip ini mencegah crossword menjadi sekadar kumpulan soal pilihan ganda yang dipaksa masuk ke grid.

## KataPlay — keputusan produk baru

KataPlay sekarang diposisikan sebagai **gameplay layer untuk Jalur Cerdas**, bukan kurikulum kedua.

Nama gameplay: **Jalur Kata**

Prinsip:

- 1 game.
- 1 mekanik inti.
- 1 progression.
- 12 level Jalur Cerdas.
- Unit mengikuti data `LearningLevel` + `LearningUnit` yang sudah menjadi backbone Jalur Cerdas.
- Setiap unit mengambil soal dari konten unit yang sebenarnya.
- Tipe soal internal Jalur Cerdas tidak lagi menjadi tipe gameplay yang berbeda.
- Untuk KataPlay, konten pilihan dinormalisasi menjadi **pilih jawaban yang tepat**.
- Soal isian yang belum dapat dinormalisasi secara aman tidak dipaksa masuk.
- Completion dan reward tetap dihitung server melalui endpoint Jalur Cerdas yang sama.
- XP/koin tidak dibuatkan sistem kedua.
- Unlock level mengikuti completion unit Jalur Cerdas.

### Kenapa ini lebih tepat untuk SD?

Anak SD tidak perlu mempelajari “sekarang kita bermain matching”, lalu “sekarang true/false”, lalu “sekarang fill blank”.

Mereka cukup memahami satu aturan:

**“Pilih jawaban yang tepat agar Zelby terus maju.”**

Yang berubah adalah **materinya**, bukan aturan bermainnya.

Dengan demikian:
- kelas rendah bisa mulai dari huruf/kosakata sederhana,
- kelas lebih tinggi naik ke kalimat dan kompetensi Bahasa Indonesia,
- visual tetap ringan,
- beban kognitif dari UI lebih rendah,
- anak bisa fokus pada materi,
- dan progression mengikuti kurikulum yang sudah dibangun di Jalur Cerdas.

## Implementasi pada branch ini

### TTS
- Difficulty gate diperketat di `lib/game/tts/difficulty.ts`.
- Gameplay TTS diberi kelas `tts-monochrome`.
- Playfield TTS sekarang dipaksa **hitam-putih baik light maupun dark mode**.
- Lobby/setup/result tidak dipaksa monochrome agar identitas Arena tetap hidup.

### KataPlay
Ditambahkan:
- `app/api/game/kata-play/route.ts`
- `components/game/KataPlayGameV2.tsx`

Route KataPlay diarahkan ke gameplay baru.

Gameplay baru:
- membaca progression langsung dari Jalur Cerdas,
- 12 level / unit mengikuti database,
- unlock berurutan,
- satu mekanik pilihan jawaban,
- server Jalur Cerdas tetap menjadi sumber kebenaran untuk scoring/evidence/XP/koin.

## Game Reward Economy v1 — diberlakukan

Reward sekarang memakai satu kontrak ekonomi untuk semua gameplay yang masuk melalui
`/api/game/xp` dan untuk dua jalur khusus yang sudah memiliki server settlement.

### Kontrak

- **XP = progres belajar.** Payout mengikuti akurasi, lalu dikalikan difficulty multiplier.
- **Koin = aktivitas.** Payout kecil dan stabil (sekitar 3–5 koin untuk game umum), bukan sumber farming besar.
- **Jalur Cerdas** mempertahankan `LearningUnit.xpReward` / `coinReward` sebagai base reward yang mengkalibrasi tingkat materi; akurasi sesi kemudian menentukan payout aktual.
- **TTS** tetap memakai server-authoritative settlement, tetapi sekarang mengikuti kontrak yang sama dan koin dicatat ke `CoinTransaction`.
- Reward tetap idempoten melalui reference/session server-side dan guard `awardXp`.

### Coverage

- Game yang memakai `/api/game/xp`: otomatis masuk standar baru tanpa perlu enam rumus reward terpisah.
- TTS: settlement khusus diperbarui ke standar.
- Jalur Kata / Jalur Cerdas: settlement unit diperbarui ke standar.
- Guru tetap dipisahkan dari ekonomi murid melalui `awardGuruXp`.
## Gate berikutnya

Sebelum branch ini digabung:

1. TypeScript/build harus PASS.
2. API KataPlay harus mengembalikan level + unit sesuai database.
3. Unit completion harus tetap menghasilkan XP/koin hanya sekali.
4. TTS level 1–12 harus diuji bahwa kata tier lebih tinggi tidak bocor ke level dasar.
5. TTS harus diverifikasi visual dalam light mode dan dark mode.
6. KataPlay harus diuji dari Level 1 sampai perpindahan Level.
7. Soal yang gagal dinormalisasi tidak boleh membuat sesi KataPlay blank.

## Kesimpulan audit

Masalah terbesar bukan “kurang banyak gim”.

Masalahnya adalah **level di beberapa gim masih berarti parameter permainan, bukan perkembangan kemampuan**.

Arah produk yang lebih kuat:

**Jalur Cerdas = kurikulum/progression backbone**

**Game = cara anak menjalani progression tersebut**

Dengan model ini, kita tidak perlu membuat enam kurikulum berbeda untuk enam gim.
