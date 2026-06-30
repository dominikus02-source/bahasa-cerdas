# UKBI Lean Bank — BahasaCerdas.com

## Alasan Target Berubah
Target UKBI diturunkan dari 1.000 soal (250 per track) menjadi 600 soal (150 per track).

**Rationale:**
- Sistem sudah memiliki server-side randomization (Fisher-Yates + seed)
- Option shuffling per attempt
- Session snapshot di TestSession
- Per-attempt answer history
- Validator struktur (validate:ukbi-tka-structure)
- Audit kualitas (audit:ukbi-tka-quality)
- Dokumen Hasil Latihan (bukan sertifikat)
- No answer leakage (11+ leakage tests)

Dengan 150 soal per track (30 soal per simulasi × 5 varian), variasi latihan sudah cukup untuk MVP. Randomization membuat 2 sesi latihan berturut-turut hampir tidak pernah identik.

## Target 150 Soal Per Track

| Section | Target | Auto-scored | Dipakai per simulasi |
|---------|--------|-------------|---------------------|
| Merespons Kaidah | 45 | ✅ | 10 |
| Membaca | 60 | ✅ | 15 |
| Mendengarkan | 30 | ✅ | 5 |
| Menulis | 8 | ❌ (constructed) | 0 |
| Berbicara | 7 | ❌ (constructed) | 0 |
| **Total** | **150** | **135** | **30** |

## Status Per Track

| Track | Total | Auto-scored | Status | Simulasi |
|-------|-------|-------------|--------|----------|
| UKBI SD | 250 | 210 | ✅ Tersedia | ✅ 30 soal |
| UKBI SMP | 275 | 235 | ✅ Tersedia | ✅ 30 soal |
| UKBI SMA | 150 | 150 | ✅ Tersedia | ✅ 30 soal |
| UKBI Guru | 135 | 135 | ⚠️ Paket awal | ✅ 30 soal |

## Gap Tersisa
- **UKBI Guru**: 15 soal (menulis 8 + berbicara 7) — constructed response, ditunda
- **UKBI SMA**: 15 constructed response (menulis 8 + berbicara 7) — ditunda

## Source of Truth
JSON files in `data/question-bank/ukbi/`:
- `sd/{section}/set-001.json` — 250 questions
- `smp/{section}/set-001.json` — 250 questions
- `sma/{section}/set-001.json` + `set-002.json` — 125 questions
- `guru/{section}/set-001.json` + `set-002.json` — 135 questions

Runtime: Supabase via Prisma.

## Rencana Upgrade ke 1.000 Soal
Jika diperlukan, upgrade dapat dilakukan dengan:
1. Tambah 100 soal per track (kaidah +30, membaca +45, mendengarkan +25)
2. Tambah 15 constructed response per track (menulis + berbicara)
3. Total per track: 150 + 115 = 265 × 4 = 1.060 soal
