# TKA INGESTION REPORT

**Tanggal**: 2026-09-16
**Sumber**: folder "Soal TKA" (dokumen guru, Bahasa Indonesia Kelas IX)
**Status**: **PASS WITH NOTES**

---

## RINGKASAN

70 soal TKA dari 3 dokumen soal DOCX berhasil di-parse, diverifikasi kunci jawabannya (content-based, 100%), dan diingesti ke tabel `TKAQuestion` yang sudah ada — tanpa membuat sistem paralel, tanpa mengubah schema, tanpa merusak konten existing. **58 soal aktif** (ikut pool simulasi), **12 soal disimpan `isActive:false`** (format multi-jawab/grid belum didukung engine scoring single-select — disimpan lengkap untuk aktivasi mendatang).

**Disclosure**: Ingesti menulis 70 baris ke database Supabase live proyek (satu-satunya DB proyek). Tidak ada file production lain yang disentuh; tidak ada delete/migrasi.

Laporan parsing terperinci (per file, per soal, peringatan parser) tersimpan di **`docs/TKA_INGESTION_PARSE_REPORT.json`** (committed, reproducible — regenerasi: `npx tsx scripts/tka-ingest-parse.ts --source "<dir>"` ).

## SOURCE DIRECTORY

`/Users/user/Documents/PPT BI/Soal TKA`

## FILES DISCOVERED / PROCESSED / FAILED

| File | Tipe | Discovered | Processed | Keterangan |
|---|---|---|---|---|
| SOAL TKA BAHASA INDONESIA KELAS IX 1.docx | DOCX | ✓ | ✓ 25 soal | nomor 20 memang tidak ada di sumber (1–19, 21–26) |
| SOAL TKA BAHASA INDONESIA KELAS IX 2.docx | DOCX | ✓ | ✓ 25 soal | |
| SOAL TKA BAHASA INDONESIA KELAS IX 3.docx | DOCX | ✓ | ✓ 20 soal | format lama, opsi a–e |
| KUNCI JAWABAN I/II.docx | DOCX | ✓ | ✓ | kunci sekuensial + teks opsi |
| KUNCI JAWABAN III.docx | DOCX | ✓ | ✓ | kunci huruf per baris |
| PAKET 1 UJI COBA TKA BAHASA INDONESIA.pdf | PDF | ✓ | ✗ BLOCKED | 29 soal terbaca, **kunci tidak ada di folder** |
| LATIHAN SOAL TKA … YAYUK PURWANTI.pdf | PDF | ✓ | ✗ BLOCKED | PDF hasil scan (30 hal → 60 karakter, tanpa text layer) |
| Kunci_Jawaban_Latihan_Soal_TKA….docx | DOCX | ✓ | ✗ ORPHAN | kunci 30 baris untuk PDF scan di atas |
| Materi BI/ (7 buku teks Kemdikbud) | PDF | ✓ | N/A | buku teks referensi, bukan bank soal |

- Files discovered: 16 (9 root + 7 Materi BI)
- Files processed: 9/9 non-Materi files terinventarisasi & didisposisi
- Files failed: 0 (2 PDF blocked dengan alasan terdokumentasi)

## QUESTIONS

- QUESTIONS DETECTED: **70** (+29 pada PAKET 1 yang terbaca tapi tak berkunci)
- QUESTIONS PARSED: **70**
- QUESTIONS IMPORTED: **70** (58 aktif + 12 blocked-by-design)
- EXISTING DUPLICATES: **0** (normalized-content hash + stem|options collision check terhadap 160 soal SMP existing)
- BLOCKED QUESTIONS: **8** (2 MULTI_ANSWER + 6 TRUE_FALSE_GRID — engine scoring saat ini single-select: `isCorrect = ua === q.correctAnswer`)

## ANSWER KEYS

- ANSWER KEYS VALID: **70/70 (100%)** — dipasangkan sekuensial sesuai urutan sumber, lalu diverifikasi konten (teks kunci ↔ teks opsi, huruf kunci ∈ opsi, grid row-aligned)
- ANSWER KEYS INVALID: **0**
- ATURAN: tidak ada kunci yang ditebak; kunci diambil verbatim dari dokumen kunci

## TRACK DISTRIBUTION (tingkat)

- TKA SD: 0
- TKA SMP: **70** (sumber = Kelas IX → SMP, konsisten dengan paket "Simulasi TKA - SMP (Kelas 9)")
- TKA SMA: 0
- TKA Mahasiswa/UTBK: 0
- TKA Guru: 0

Distribusi kompetensi: LITERASI_MEMBACA 41, SASTRA 19, TATA_BAHASA 10 (dari section membaca/sastra/kebahasaan).

## VALIDATION

| Gate | Hasil |
|---|---|
| A — Source coverage | PASS (9/9 file non-Materi terproses/terblokir terdokumentasi) |
| B — Question coverage | PASS (70 = 58 aktif + 12 blocked; 29 PAKET-1 blocked tanpa kunci) |
| C — Answer-key integrity | PASS (70/70 verified) |
| D — Option integrity | PASS (struktur valid; IX1-Q21 PUEBI kapitalisasi adalah konten sah, terdokumentasi) |
| E — Track integrity | PASS (semua TKA_SMP + kompetensi valid) |
| F — Duplicate integrity | PASS (0 duplikat id, 0 hash ganda, 0 collision bank existing) |
| G — Database integrity | PASS (58 aktif/12 blocked, isVerified 100%, 0 baris aktif berkunci ganda, rerun = 0 perubahan) |
| H — Scoring | PASS (integration-level: `buildAnswerRows` + lambda produksi dieksekusi verbatim dari route source terhadap 10 baris DB nyata — A/B/C/D semua skenario) |
| I — Randomization | PASS (pool ≥ blueprint; seeded sampling deterministik; soal baru ikut rotasi) |
| J — Regression | PASS (SD 65/SMA 65/GURU 30 utuh; total 355→425; paket intact) |
| validate:ukbi-tka-structure | PASS **4855/4855** |
| test:bank-soal-leakage | PASS 8/8 |
| test:murid-quiz-leakage | PASS 9/9 |
| test:jalur-leakage | PASS (720/720, 0 leaked) |
| test:ukbi-tka-randomization | PASS 27/27 |
| test:ukbi-tka-session-snapshot | PASS 32/32 |
| test:ukbi-tka-per-attempt-snapshot | PASS 42/42 |
| audit:ukbi-tka-quality | PASS (22 good, 6 warnings non-fatal, 1 info) |
| Gates script khusus ingesti | PASS **37/37** (`scripts/test-tka-ingestion-gates.ts`) |
| TypeScript | PASS (0 error) |
| ESLint | PASS (0 violation pada 6 file) |
| Build | PASS (✓ 425 halaman) |

## FILES CREATED / MODIFIED

**Created:**
- `data/question-bank/tka/smp/soal-tka-ix/set-001.json` — 70 soal ternormalisasi (format canonical seed)
- `scripts/tka-ingest-docx-paras.ts` — ekstraktor paragraf DOCX (ZIP-inflate + `<w:br/>`→newline + NBSP normalisasi; CLI `--source/--out`)
- `scripts/tka-ingest-parse.ts` — parser soal+kunci, verifikasi konten, emit JSON + parse report (CLI `--in/--source`)
- `docs/TKA_INGESTION_PARSE_REPORT.json` — laporan parsing committed (regenerable)
- `scripts/test-tka-ingestion-gates.ts` — gate assertions A–J

**Modified:**
- `scripts/seed-tka-all-tracks.ts` — hormati `status:"blocked"` → `isActive:false` (idempoten, hanya berlaku untuk item baru)
- `scripts/validate-ukbi-tka-question-structure.ts` — kenali format komposit (multi/grid) sebagai non-defect; inactive-composite dilaporkan terpisah

## DATABASE CHANGES

- `TKAQuestion`: **+70 rows** (id `BC-TKA-SMP-SOALTKA-IX[1|2|3]-Qnn`), `source='SOAL_TKA_KELAS_IX_DOCX'`, `isVerified=true`, `tingkat=SMP`
  - 58 `isActive=true` (PG satu jawaban)
  - 12 `isActive=false` (MULTI_ANSWER ×6, TRUE_FALSE_GRID ×6 — menunggu dukungan engine)
- `PaketKompetensi` TKA: hanya `totalQuestions`/sections di-update oleh seeder existing (30 soal/simulasi, perilaku lama)
- Tanpa migrasi schema, tanpa delete, tanpa perubahan pada 355 soal existing (terverifikasi census)
- **Keputusan reklasifikasi**: 3 soal awalnya terklasifikasi PG tapi berkunci ganda (IX1-Q24 "B,C", IX2-Q19 "A,B,C", IX2-Q24 "A,C" — terkonfirmasi multi-select di dokumen sumber "Pilih semua jawaban yang benar"). Parser kini menentukan type dari **bentuk kunci** (deterministik), bukan hint teks; 3 soal ikut blocked. Total komposit: 12 (6 multi + 6 grid).

## COMMANDS EXECUTED

```
npx tsx scripts/tka-ingest-docx-paras.ts --source "<DIR SOAL TKA>" [--out /tmp/tka-src-text]
npx tsx scripts/tka-ingest-parse.ts --in /tmp/tka-src-text --source "<DIR SOAL TKA>"
npx tsx scripts/seed-tka-all-tracks.ts          # dry-run
npx tsx scripts/seed-tka-all-tracks.ts --execute  # ingesti (insert 70; rerun = 0 change)
npx tsx scripts/test-tka-ingestion-gates.ts     # 32/32
npm run validate:ukbi-tka-structure             # 4855/4855
npm run test:bank-soal-leakage / test:murid-quiz-leakage / test:jalur-leakage
npm run test:ukbi-tka-randomization / session-snapshot / per-attempt-snapshot
npm run audit:ukbi-tka-quality
npx tsc --noEmit && npx eslint … && npm run build
```

## REMAINING BLOCKERS

1. **PAKET 1 UJI COBA (29 soal)** — dibutuhkan kunci jawaban dari pemilik dokumen sebelum bisa diingesti (hard gate: no guessing).
2. **PDF Yayuk Purwanti** — butuh sumber digital/OCR; kuncinya (30 baris) sudah aman dan akan terpasang otomatis begitu soalnya tersedia.
3. **12 soal komposit (6 multi-jawab + 6 grid Benar/Salah)** — tersimpan lengkap + terkunci kunci, `isActive:false` sampai engine scoring mendukung multi-select/grid. Termasuk 3 soal yang mula-mula salah diklasifikasi PG (kunci ganda — reklasifikasi deterministik dari bentuk kunci). Aktivasi = ubah status di JSON → rerun seeder.
4. **audit:ukbi-tka-attempt-history gagal 1 check — PRE-EXISTING** (refactor `cc57c2c` mengganti `attemptAnswerDetails` → `buildDetails(...)` di submit route; audit belum diupdate). Kedua file tidak disentuh sesi ini; bukan akibat ingesti.

## CATATAN DESAIN

- **Pairing kunci berbasis konten** (bukan posisi) — kunci IX1 ada 25 dan soal 25, tetapi nomor 20 tidak ada di dokumen; verifikasi teks mencegah shift.
- **Passage/stimulus dipertahankan utuh** — 39/70 soal membawa passage (puisi, berita, memo, teks diskusi, dsb.) sesuai sumber.
- **Tidak ada penulisan-ulang konten** — hanya normalisasi whitespace/NBSP.
- Provenance lengkap per item: `sourceFile`, `sourceNumber`, `sourceHash`.
