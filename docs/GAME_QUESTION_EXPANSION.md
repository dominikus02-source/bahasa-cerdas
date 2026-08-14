# GAME QUESTION EXPANSION — Strategi Enrichment

## Prinsip
1. **Variety > volume**: soal ditulis lintas topik, konteks, dan pola pikir — bukan template berulang.
2. **Learning value**: setiap soal punya penjelasan singkat yang mengajarkan, bukan sekadar "benar/salah".
3. **Reliability first**: setiap soal lolos validator struktural + integritas jawaban + dedupe sebelum masuk bank.
4. **Difficulty honest**: HARD = tuntutan kognitif (simpulan, makna tersirat, kaidah rumit), bukan sekadar teks panjang.
5. **Canonical taxonomy**: hanya memakai kategori yang sudah ada di bank (Kata Baku, Sinonim, Antonim, Imbuhan, Ejaan, Kalimat Efektif, Ungkapan, Jenis Kata) — tidak mengarang taxonomy baru.

## Strategi per topik
| Topik | Pola variasi | Contoh |
|-------|--------------|--------|
| Kata Baku | pasangan salah-la-fon umum + serapan asing | konkret, hakikat, ekuivalen, apendiks |
| Sinonim/Antonim | kata frekuensi sedang, konteks beragam | arif↔bijaksana, kikir↔dermawan |
| Imbuhan | kalimat rumpang (bukan definisi) + makna imbuhan | me-kan, ber-, ter-, ke-an |
| Ejaan & tanda baca | tanggal, kapital, kata depan, partikel -pun, judul | "17 Agustus 1945" |
| Kalimat Efektif | perbaikan kalimat boros/rancu | "Para siswa" vs "para siswa-siswa" |
| SPOK | identifikasi fungsi + pola kalimat | S-P-O-K |
| Makna & majas | konotasi, homonim, personifikasi, hiperbola | "makan aspal" |
| Ungkapan | idiom umum bermakna kias | buah tangan, kambing hitam |
| Pemahaman teks | teks mini 2–4 kalimat → ide pokok/tersurat/tersirat/simpulan/tujuan | prosedur, eksplanasi, berita, iklan, persuasi, cerpen, puisi |

## Aturan penulisan soal baru (wajib)
- SATU jawaban benar defensible; 3 distractor wajar (bukan absurd).
- Stem tidak ambigu; ada sinyal tanya/instruksi.
- Posisi jawaban benar disebar merata (bukan selalu D).
- Tidak menduplikasi (exact tuple) & tidak near-duplicate (Jaccard ≥0.85) terhadap bank inti.
- `tingkat` EASY/MEDIUM/HARD menargetkan distribusi 30/50/20.
- Penjelasan 1 kalimat edukatif.

## Pipeline penambahan soal (approval gate)
```
TULIS → VALIDATOR (lib/game-questions) → DEDUPE → QUALITY SCORE (≥75) → REVIEW MANUAL → PRODUCTION
```
Soal <60 → karantina (tidak masuk gameplay). Soal 60–74 → REVIEW (hanya dipakai bila tidak ada alternatif).

## Hasil ekspansi 2026
- +82 soal MCQ bank (lib/game/question-bank-expansion.ts) — rata-rata skor 96.4.
- +15 soal katastra (level "Eksplorasi Kata 2" di kataplay-content.ts).
- Bank gabungan `QUESTION_BANK_EXPANDED` = 224 soal; harvest otomatis memakainya + memetakan tingkat → lvl ramp.
- KuisTempurSolo kini membaca EXPANDED (kantong 224 soal).

## Roadmap enrichment berikutnya
1. Enrich katastra SD ke 150+ (saat ini 88) dengan tipe interaktif bervariasi.
2. Wire validator ke agen generator (components/game/agents) sebagai gate otomatis.
3. Audit penuh soal harvest dari DB Jalur Cerdas via validator runtime (saat ini quality gate `isValidQuestion`).
4. Anti-repeat lintas sesi untuk Katastra (client-side) & game solo lain.
