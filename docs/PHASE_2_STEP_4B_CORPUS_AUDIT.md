# PHASE 2 — STEP 4B: METADATA CORPUS AUDIT (CORPUS AUDIT)

> Status: **CORPUS AUDIT — read-only** · Tanggal audit: 15 Agustus 2026
> DB: Supabase production (`transaction pooler` via `.env.db.local`)
> Prinsip: **never fabricate, never force** — sel tanpa bahan cukup = `INSUFFICIENT_CORPUS`.
> Tidak ada commit/push. Manifest built oleh `scripts/enrichment-candidates-builder.ts` (deterministik).

---

## 1. Tujuan

Membuktikan bahwa bank Soal production (`BANK_SOAL`) memiliki bahan cukup untuk membangun **PILOT CORPUS terpilih** (manifest enrichment `enrichment-manifest-001.json`, status `NEEDS_REVIEW`, provenance `AI_SUGGESTED`) dengan target ~140 soal (7 skill × 4 difficulty × min 5), TANPA fabrikasi metadata dan TANPA memaksa soal ke kategori yang tidak didukung bukti.

## 2. Metode Audit

- **Read-only** — hanya `SELECT` (tanpa create/update/delete/upsert).
- Sumber: tabel `Soal` (bank soal existing), kunci `kodeSoal` (unik, pola `BC-…-NNNN`) sebagai referensi kontrak `(source, questionId)` yang dipakai `QuestionMetadata`.
- Normalisasi topik untuk kategorisasi: `normalize(value) = trim + lowercase + collapse-whitespace` (menyatukan varian `"Ide pokok"`, `"Ide Pokok"`, `"teks deskripsi "` dst.).
- Difficulty `Soal.difficulty` (String) dipetakan TERBUKTI ke enum `Difficulty`:
  - `MUDAH → EASY` · `SEDANG → MEDIUM` · `SULIT → HARD` · `MEDIUM → MEDIUM` · `HARD → HARD`
  - **Tidak ada `VERY_HARD` yang terdefinisi di bank** — sel `VERY_HARD` seluruhnya `INSUFFICIENT_CORPUS` (tidak dipaksa dari data yang tidak membuktikan tingkat itu).
- Kuesioner eksekusi (evidence chain):
  1. Distribusi global (total, berkode, prefiks kode).
  2. Distribusi per `type` (bentuk soal).
  3. Distribusi per `difficulty` (nilai mentah bank).
  4. Distribusi per `source` (asal bank).
  5. Distribusi per `kelas`.
  6. Distribusi topik (65 topik, dengan varian casing/spasi).
  7. Distribusi `isHOTS` (305 soal HOTS — semuanya `SULIT`).
  8. Interseksi tipe×difficulty untuk soal berkode.
  9. Sampel konten (representatif per topik, untuk menentukan kelaikan skill).
  10. Panjang teks soal (min/max/avg) — tidak ada soal < 10 karakter.

## 3. Hasil Audit Mentah (3A–3D)

### 3A. Volume & Kode

| Metrik | Nilai | Keterangan |
|---|---|---|
| Total `Soal` | **1.595** | — |
| Berkode (`kodeSoal IS NOT NULL`) | **1.500** | 100% prefiks `BC-` |
| Tanpa kode | 95 | source `AI` — **tidak dapat direferensikan** lewat kontrak `(source, questionId)`; dikecualikan dari kandidat |
| Soal berkode tanpa metadata | 1.470 | informasional (4A) |

### 3B. Bentuk Soal (type)

| Type | Jumlah | Dapat auto-score | Dipakai kandidat |
|---|---|---|---|
| `PILIHAN_GANDA` | 1.125 | ✅ | ✅ (preferensi utama) |
| `BENAR_SALAH` | 300 | ✅ | ✅ (fallback deterministik) |
| `ISIAN_SINGKAT` | 150 | ✅ | ✅ (fallback deterministik) |
| `ISIAN` | 10 | ❌ jawaban bebas | ❌ dikecualikan |
| `ESSAY` | 10 | ❌ jawaban bebas | ❌ dikecualikan |

### 3C. Difficulty (nilai mentah bank)

| Nilai bank | Jumlah | Pemetaan terbukti |
|---|---|---|
| `MUDAH` | 600 | `EASY` |
| `SEDANG` | 600 | `MEDIUM` |
| `SULIT` | 300 | `HARD` (semua `isHOTS=true` — HOTS = SULIT di bank ini) |
| `MEDIUM` | 90 | `MEDIUM` (bank AI, 95 soal tanpa kode sebagian) |
| `HARD` | 5 | `HARD` (bank AI) |
| `VERY_HARD` | **0 definisi** | `VERY_HARD` → seluruh sel `INSUFFICIENT_CORPUS` |

### 3D. Asal & Kelas

| Asal | Jumlah |
|---|---|
| `MASTER_BANK` | 1.500 |
| `AI` | 95 |

| Kelas | Jumlah |
|---|---|
| 7 | 675 |
| 8 | 490 |
| 9 | 275 |
| 10 | 125 |
| 11 | 5 |
| 12 | 20 |
| 6 | 5 |

> Kelas 7–9 (SMP) mendominasi — konsisten dengan fokus kurikulum; coverage atas berbentuk teks (10–12) ada dalam porsi kecil.

### 3E. Topik (65 topik normalisasi → 55 kanonikal)

Distribusi dominan: ~30 soal per topik (12 `MUDAH`, 12 `SEDANG`, 6 `SULIT/HOTS`) untuk topik kurikulum utama. Topik AI (tanpa kode): `biografi tokoh`, `Teks biografi tokoh sastrawan`, `TEK SURAT`, `puisi`, varian `teks deskripsi`/`teks observasi`/`teks laporan hasil observasi` — **tanpa kode → dikecualikan**.

Contoh topik kanonikal dominan (30 soal): Artikel, Cerpen, Drama, Editorial, Ejaan, Fabel, Gagasan Utama, Gurindam, Hikayat, Ide Pokok, Iklan, Imbuhan, Kalimat, Kalimat Efektif, Kata Baku, Kata Tidak Baku, Legenda, Majas, Makna Kata, Mitos, Novel, Pantun, Paragraf, Pidato, Poster, Proposal, PUEBI, Puisi, Resensi, Simpulan, Sinonim, Slogan, SPOK, Surat Dinas, Surat Pribadi, Syair, Tanda Baca, Teks Argumentasi, Teks Berita, Teks Deskripsi (40), Teks Editorial, Teks Eksplanasi, Teks Eksposisi, Teks Laporan Hasil Observasi, Teks Narasi, Teks Persuasi, Teks Prosedur (35), Teks Ulasan.

## 4. Matriks Kelayakan Corpus (7 skill × 4 difficulty)

Basis pemetaan topik→skill (whitelist deterministik, konsisten dengan taksonomi `lib/question-metadata/taxonomy.ts`):

| Skill | Topik sumber (normalisasi) | Subskill |
|---|---|---|
| READING | teks deskripsi, teks prosedur, artikel, proposal, cerita inspiratif, poster, iklan, slogan, gagasan utama, ide pokok, simpulan, paragraf, teks argumentasi, teks berita, teks editorial/editorial, teks eksplanasi, teks eksposisi, teks laporan hasil observasi, teks narasi, teks persuasi, teks ulasan, resensi | READING_IDE_POKOK / READING_INFORMASI_TERSURAT / READING_INFERENSI / READING_STRUKTUR_TEKS |
| GRAMMAR | ejaan, puebi, tanda baca, kalimat, kalimat efektif, spok, imbuhan | GRAMMAR_EJAAN / GRAMMAR_TANDA_BACA / GRAMMAR_KALIMAT_EFEKTIF / GRAMMAR_IMBUHAN |
| VOCABULARY | sinonim, antonim, kata baku, kata tidak baku, makna kata | VOCABULARY_SINONIM_ANTONIM / VOCABULARY_KATA_BAKU / VOCABULARY_MAKNA_KATA / VOCABULARY_KONTEKS |
| LITERATURE | cerpen, novel, drama, fabel, legenda, mitos, hikayat, pantun, gurindam, syair, puisi, majas | LITERATURE_UNSUR_CERITA / LITERATURE_GAYA_BAHASA / LITERATURE_APRESIASI_KARYA / LITERATURE_MAKNA_SASTRA |
| WRITING | surat dinas, surat pribadi | WRITING_ORGANISASI_GAGASAN / WRITING_KETEPATAN_KATA |
| LISTENING | **tidak ada topik simakan di bank** (0 soal audio; kolom audioUrl absen di daftar kolom) | — |
| SPEAKING | pidato (konten **identifikasi materi**, bukan tugas berbicara/penilaian produk lisan) | — |

### Matrix

| Skill \ Difficulty | EASY (MUDAH) | MEDIUM (SEDANG/`MEDIUM`) | HARD (SULIT/HOTS, `HARD`) | VERY_HARD |
|---|---|---|---|---|
| READING | ✅ ≥5 (banyak topik) | ✅ ≥5 | ✅ ≥5 (SULIT+HOTS) | 🔴 INSUFFICIENT_CORPUS |
| GRAMMAR | ✅ ≥5 | ✅ ≥5 | ✅ ≥5 | 🔴 INSUFFICIENT_CORPUS |
| VOCABULARY | ✅ ≥5 | ✅ ≥5 | ✅ ≥5 | 🔴 INSUFFICIENT_CORPUS |
| LITERATURE | ✅ ≥5 | ✅ ≥5 | ✅ ≥5 | 🔴 INSUFFICIENT_CORPUS |
| WRITING | ✅ ≥5 (Surat Dinas+Pribadi: 24 MUDAH) | ✅ ≥5 (24 SEDANG) | ✅ ≥5 (12 SULIT) | 🔴 INSUFFICIENT_CORPUS |
| LISTENING | 🔴 INSUFFICIENT_CORPUS | 🔴 | 🔴 | 🔴 |
| SPEAKING | 🔴 INSUFFICIENT_CORPUS* | 🔴 | 🔴 | 🔴 |

\* SPEAKING: topik `Pidato` ada 30 soal, tetapi kontennya **identifikasi materi** ("Berikut ini yang termasuk contoh Pidato adalah…"), bukan tugas performa lisan → memaksanya sebagai SPEAKING = fabrikasi. Dikecualikan (didokumentasikan, bukan lupa).

### Sel terisi & INSUFFICIENT

- **15 sel terisi** (5 skills × 3 difficulty), masing-masing 5 kandidat → **75 kandidat manifest** (di bawah target ~140, karena 13 sel jujur INSUFFICIENT).
- **13 sel INSUFFICIENT_CORPUS**: VERY_HARD (5 skill) + LISTENING (4) + SPEAKING (4).

## 5. Keputusan Kelayakan (auditable)

| # | Keputusan | Alasan terbukti |
|---|---|---|
| 1 | Hanya soal **berkode** (`kodeSoal`) jadi kandidat | Kontrak `(source, questionId)` di `QuestionMetadata`/`LearningEvidence` memakai id kode; 95 soal AI tanpa kode tidak dapat dirujuk |
| 2 | Hanya `PILIHAN_GANDA`/`BENAR_SALAH`/`ISIAN_SINGKAT` | Auto-scoring; `ISIAN`/`ESSAY` (20) jawaban bebas tanpa kunci skor konsisten |
| 3 | `MUDAH→EASY`, `SEDANG→MEDIUM`, `SULIT→HARD` | Nilai bank = bahasa Indonesia, kodeSoal `-0001..-0012` MUDAH, `-0013..-0024` SEDANG, `-0025..` SULIT (terverifikasi via BD) |
| 4 | Tidak ada `VERY_HARD` | Bank tidak mendefinisikan level itu; memetakan `SULIT` ke 2 level = menciptakan duplikasi label |
| 5 | LISTENING kosong | Tidak ada soal audio / kolom audioUrl di bank |
| 6 | SPEAKING kosong | Topik Pidato berisi soal identifikasi materi, bukan tugas berbicara |
| 7 | Topik varian (casing/spasi) dinormalisasi | Menghindari fragmentasi topik `"Ide pokok"` vs `"Ide Pokok"` |
| 8 | Pemilihan soal **deterministik**: urutan `kodeSoal` asc per grup (topik, difficulty), ambil 5 pertama (across-topik round-robin untuk diversity) | Reproducible; ulang builder → manifest identik |

## 6. Ringkasan Verifikasi

| Check | Hasil |
|---|---|
| Total soal bank | 1.595 (1.500 berkode ✅) |
| Topik ≥5 soal (normalisasi) | 55 ✅ |
| Sel matrix memenuhi ≥5 | 15/15 ✅ |
| Sel INSUFFICIENT (honest) | 13 (VERY_HARD 5, LISTENING 4, SPEAKING 4) — **tidak diisi paksa** |
| Estimasi kandidat manifest | 75 (15 sel × 5) |
| Fabrikasi metadata | 0 (tidak ada topik-force/level-force) |
| Tulis DB | 0 (audit read-only) |

## 7. Langkah Berikutnya (Phase B+)

1. `scripts/enrichment-candidates-builder.ts` → `data/question-metadata/enrichment-manifest-001.json` (75 record `NEEDS_REVIEW`/`AI_SUGGESTED`).
2. `scripts/check-enrichment-candidates.ts` — QA read-only manifest (duplikat, taksonomi, kontrak soal ada).
3. Desain `approve:enrichment-manifest` (batch ≤ 50, `--execute` eksplisit, founder/admin-only, audit JSONL) — **desain saja, TIDAK dieksekusi** di step ini.
4. `docs/PHASE_2_STEP_4B_METADATA_ENRICHMENT.md` — metadata enrichment pipeline & laporan.
5. Phase H QA (regresi + build) — laporan gate akhir.