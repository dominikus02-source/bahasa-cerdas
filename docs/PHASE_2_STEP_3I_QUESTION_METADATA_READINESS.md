# PHASE 2 STEP 3I — QUESTION METADATA READINESS

Version: `1.0` · Date: Aug 15, 2026 · Branch: `main` · Status: AUDIT — FOUNDATION + SAMPLE ONLY

## TASK 3 — Coverage Audit

### Koleksi bank soal (101 file JSON, 3.034 soal)
| Pool | Files | Shape | Soal |
|------|-------|-------|------|
| `master/` | 50 | array | 1.500 |
| `tka/` | 8 | objek `.questions` | 255 |
| `ukbi/` | 43 | objek `.questions`/`.data` | 1.279 |
| **Total** | **101** | | **3.034** |

### Audit `master/` (sumber adaptive, 1.500 soal)
| Aspek | Hasil |
|-------|-------|
| `kodeSoal` | ✅ 1.500/1.500 (100%), 0 duplikat |
| Type | PILIHAN_GANDA 1.050 · BENAR_SALAH 300 · ISIAN_SINGKAT 150 |
| Difficulty (string) | MUDAH 600 · SEDANG 600 · SULIT 300 |
| Topik (`tema`) | 50 unik |
| Kolom pelengkap | `judul`, `kelas`, `kompetensi`, `indikator`, `levelBerpikir`, `text`, `options`, `correctAnswer`, `explanation` |

**Catatan pemetaan:** `difficulty` di data master memakai `MUDAH/SEDANG/SULIT`, sedangkan enum Prisma `Difficulty` = `EASY/MEDIUM/HARD/VERY_HARD` dan metadata memakai `DifficultyId` (taxonomy). Pemetaan 3→4 level (dan dari mana `VERY_HARD` muncul) adalah keputusan penelusuran — TIDAK dilakukan klasifikasi massal di fase ini.

### Status metadata di DB (sample ter-seed)
| Status | Jumlah |
|--------|--------|
| Total metadata | 30 (semua `source=BANK_SOAL`, id `qm-*`) |
| `APPROVED` | **0** |
| `NEEDS_REVIEW` | 30 |

Dari 3.034 soal bank, hanya **30 soal (1%)** punya baris metadata, dan semuanya masih menunggu peninjauan. Coverage efektif untuk adaptive = 0.

## Keputusan (sesuai aturan Step 3I)

1. **TIDAK** melakukan klasifikasi massal otomatis sekarang — masing-masing batas peninjauan founder (30 sample terlebih dahulu, sebelum batch 60/75/100 dst.).
2. **TIDAK** menambah migration/kolom baru — schema metadata sudah final (source, questionId, skill, subskill, difficulty, topic, questionType, level CEFR, provenance, confidence, versioning, status).
3. Pemetaan `MUDAH/SEDANG/SULIT → DifficultyId` serta isian `CEFR (targetPoint)` termasuk keputusan review per-soal oleh founder — dicatat sebagai panduan review, bukan script otomatis.

## Gap yang didokumentasikan (bukan bug)

| Gap | Keterangan |
|-----|-----------|
| 1% coverage (30/3034) | Adaptive menunggu review metadata |
| 0 APPROVED | Pintu masuk `startSession` selalu FALLBACK |
| TKA/UKBI tanpa kode | `master/` unik punya `kodeSoal`; ukbi/tka IDs beda namespace (tidak dipakai adaptive hari ini) |
| CEFR kosong | `targetPoint` butuh penilaian per soal (level CEFR) |

## Peluang review founder (panduan, bukan eksekusi)
1. Tinjau 30 sample → set sebagian `APPROVED` (≥20 direkomendasikan, lintas skill/difficulty).
2. Setelah APPROVED ≥ 1 + Soal production berisi `kodeSoal` sesuai → adaptive real-data siap diuji end-to-end.
3. Review batch berikutnya tersedia berbasis topik (50) agar lintas materi.

Final: QUESTION METADATA = YELLOW (fondasi + parser + validator + 30 sample valid; coverage 0% untuk produksi; menunggu review founder).