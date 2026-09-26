# TTS QUESTION QUALITY GATE

## Tujuan

Teka-Teki Silang tidak memakai seluruh Bank Soal secara langsung. Bank Soal
tetap menjadi sumber kanonik, tetapi TTS hanya menerima kandidat yang lolos
kontrak khusus permainan.

## Kontrak

### Jawaban
- satu kata;
- hanya A–Z setelah normalisasi;
- 3–14 huruf;
- tidak boleh mengandung spasi, angka, atau tanda baca pada bentuk kanonik;
- tidak boleh duplikat dalam satu pool.

### Petunjuk
- berdiri sendiri sebagai clue;
- 12–180 karakter;
- tidak membawa konteks bacaan/ilustrasi;
- tidak berupa stem pilihan ganda generik;
- tidak membocorkan jawaban;
- tidak mengandung placeholder/debug.

## Skor

- APPROVED: 80–100 — boleh masuk gameplay.
- REVIEW: 65–79 — tidak masuk gameplay otomatis.
- REJECTED: <65 — tidak masuk gameplay.

## Arsitektur

\`\`\`
Canonical Bank
    ↓
TTS Eligibility Engine
    ├── APPROVED → TTS pool
    ├── REVIEW   → audit/manual review
    └── REJECTED → tidak dikirim ke client
                         ↓
                  Grid Generator
\`\`\`

Generator tetap bertanggung jawab atas kompatibilitas grid. Eligibility
bertanggung jawab atas kualitas konten. Keduanya adalah gate terpisah.

## Jalur runtime

GET /api/game/tts-bank menerapkan gate sebelum mengirim pool ke client.

startTtsSession() menerapkan gate yang sama sebelum membangun snapshot puzzle.
Dengan demikian client dan server tidak memiliki standar soal yang berbeda.

## Prinsip

Tidak ada LLM call per permainan. Evaluasi bersifat deterministik dan
pre-runtime. Bila kelak diperlukan enrichment AI untuk clue yang REVIEW,
hasilnya harus masuk ke pipeline kurasi terlebih dahulu, bukan dipanggil saat
pemain bermain.
