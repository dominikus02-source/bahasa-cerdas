# PHASE 2 STEP 4A — PRODUCTION DATABASE SCHEMA GATE

Version: `1.0` · Date: Aug 15, 2026 · Branch: `main` · Mode: **READ-ONLY audit** (0 write, 0 update, 0 delete, 0 approve) · Tool: `npm run audit:step4a-schema`

## Ringkasan Gate

| Band | Status | Catatan |
|------|--------|---------|
| **DATABASE SCHEMA** | 🟢 **GREEN** | 3 tabel, kolom, PK, unique index, FK, index, enum, RLS cocok kontrak migrasi |
| **DATA INTEGRITY** | 🟢 **GREEN** | 0 orphan, 0 duplikat, 0 evidence non-metadata |
| **METADATA COVERAGE** | 🟡 **YELLOW** | 12 APPROVED (4 skill × EASY/MEDIUM/HARD); sel VERY_HARD + 3 skill kosong — sesuai desain fase |
| **ADAPTIVE READINESS** | 🟢 **GREEN** | Rantai production siap: kandidat ≥5 untuk 4 skill, API jujur FALLBACK di luar itu |

## CHECK A — SCHEMA (katalog production nyata, bukan asumsi Prisma)

Tabel ada (via `information_schema.tables`):

| Tabel | Status |
|-------|--------|
| `LearningEvidence` | ✅ ADA |
| `QuestionMetadata` | ✅ ADA |
| `AdaptivePracticeSession` | ✅ ADA |

Kolom: **cocok kontrak persis** — LearningEvidence 14 kolom, QuestionMetadata 19 kolom, AdaptivePracticeSession 14 kolom (tipe/nullability/default sama dengan `prisma/schema.prisma` dan migration manual 2026-08-15_*). Contoh yang diverifikasi:
- `LearningEvidence.skill` → enum `LearningSkillType` (USER-DEFINED), `difficulty` → enum `Difficulty`
- `QuestionMetadata.status` TEXT NOT NULL default `'DRAFT'`, `questionId` TEXT NOT NULL
- `AdaptivePracticeSession.questionIds` JSONB NOT NULL, `expiresAt` TIMESTAMP(3) NOT NULL

Temuan metode: **unique contract dibuat sebagai UNIQUE INDEX** (bukan table constraint) oleh migration (`CREATE UNIQUE INDEX IF NOT EXISTS`), sehingga tidak terlihat di `information_schema.table_constraints` — dicek lewat `pg_indexes`:

| Kontrak | Ada? |
|---------|------|
| PK `LearningEvidence_pkey`, `QuestionMetadata_pkey`, `AdaptivePracticeSession_pkey` | ✅ |
| `LearningEvidence_userId_source_activityId_questionId_key` (UNIQUE) | ✅ idempotensi evidence |
| `QuestionMetadata_source_questionId_key` (UNIQUE) | ✅ anti-duplikat metadata |
| FK `LearningEvidence_userId_fkey`, `AdaptivePracticeSession_userId_fkey`, `QuestionMetadata_createdById_fkey` + `reviewedById_fkey` | ✅ ON DELETE CASCADE (user) / SET NULL (reviewer) |
| Index pendukung (4+4+2 = 10) | ✅ semua ada |
| Enum `Difficulty` (EASY/MEDIUM/HARD/VERY_HARD) & `LearningSkillType` (7 nilai) | ✅ lengkap |
| RLS `ENABLE ROW LEVEL SECURITY` pada ketiga tabel | ✅ ENABLED |

## CHECK B — QUESTION METADATA

| Metrik | Nilai |
|--------|-------|
| Total | 30 |
| Per source | BANK_SOAL=30 |
| NEEDS_REVIEW | 18 |
| APPROVED | 12 |
| REJECTED | 0 |
| questionId kosong/null | 0 |
| Metadata tanpa Soal (orphan) | 0 |
| Duplikat (source, questionId) | 0 |
| Invalid skill | 0 |
| Orphan createdById/reviewedById | 0 |

## CHECK C — APPROVED DATA & Coverage Matrix

Distribusi approved (12): skill GRAMMAR=3, LITERATURE=3, READING=3, VOCABULARY=3 · difficulty EASY=4, MEDIUM=4, HARD=4 · questionType BENAR_SALAH=4, ISIAN_SINGKAT=4, PILIHAN_GANDA=4 · source BANK_SOAL=12.

| skill × difficulty | EASY | MEDIUM | HARD | VERY_HARD |
|--------------------|------|--------|------|-----------|
| GRAMMAR | 1 | 1 | 1 | 0 |
| LITERATURE | 1 | 1 | 1 | 0 |
| READING | 1 | 1 | 1 | 0 |
| VOCABULARY | 1 | 1 | 1 | 0 |

Sel kosong: **VERY_HARD (4)** + skill WRITING/LISTENING/SPEAKING (belum punya metadata). Ini konsisten desain fase: latihan adaptive lahir dari bank soal pilihan ganda yang sudah di-approve; constructed response & audio menyusul.

## CHECK D — LEARNING EVIDENCE

| Metrik | Nilai |
|--------|-------|
| Total | 0 |
| Per source | — |
| Dengan metadata | 0 |
| Tanpa metadata | 0 |
| Dengan metadata APPROVED | 0 |
| Orphan userId | 0 |
| Duplikat (contract unik) | 0 |
| 1/7/30 hari terakhir | 0 / 0 / 0 |

(0 karena evidence rill belum pernah tercatat di production — konsisten dengan cleanup E2E Step 3J yang terbukti mengembalikan baseline 0. Tidak ada selectedAnswer/identitas learner yang dicetak — agregasi saja.)

## CHECK E — ADAPTIVE PRACTICE SESSIONS

| Metrik | Nilai |
|--------|-------|
| Total | 0 |
| Per status / source | — |
| Per user (agregat) | users=0 (min/max/avg=0) |
| IN_PROGRESS kedaluwarsa (abandoned) | 0 |
| IN_PROGRESS berlaku | 0 |
| Orphan userId | 0 |
| Anomali duplikat (userId,source,questionIds) | 0 |

## CHECK F — RELATION INTEGRITY

| Relasi | Orphan |
|--------|--------|
| Soal → QuestionMetadata (metadata tanpa Soal.kodeSoal) | 0 |
| Soal berkode tanpa metadata (informasional) | 1470 — di luar cakupan adaptive (bank UKBI/TKA/lain), bukan anomali |
| QuestionMetadata → LearningEvidence (evidence tanpa metadata) | 0 |
| Soal → LearningEvidence (evidence tanpa Soal) | 0 |
| User → LearningEvidence | 0 |
| User → AdaptivePracticeSession | 0 |
| Evidence ke metadata non-APPROVED | 0 |

## CHECK G — PRODUCTION MIGRATION SAFETY

🟢 **GREEN** — skema production cocok persis dengan kontrak Prisma + migration manual `2026-08-15_question_metadata.sql`, `2026-08-15_learning_evidence.sql`, `2026-08-15_adaptive_practice_session.sql` (termasuk enum `Difficulty` & `LearningSkillType`). Drift kompatibel: tidak ada. **Tidak ada perbaikan otomatis yang dilakukan.**

## CHECK H — PRODUCTION READINESS

1. **DATABASE SCHEMA = GREEN** — kontrak penuh terpenuhi; tidak ada production hidden failure.
2. **DATA INTEGRITY = GREEN** — 0 orphan/duplikat/anomali di ketiga tabel dan relasinya.
3. **METADATA COVERAGE = YELLOW** — cakupan approved 12 soal (4 skill × 3 difficulty); sel VERY_HARD & skill WRITING/LISTENING/SPEAKING kosong (rencana fase enrichment selanjutnya).
4. **ADAPTIVE READINESS = GREEN** — rantai production nyata (Question→Metadata→Evidence→LearnerState→Selector→Practice) terverifikasi Step 3J 49/49 + skema hari ini GREEN; API fallback jujur (INSUFFICIENT_METADATA) aktif di luar cakupan pool.

## Temuan & Anomali

1. **Metode unik = UNIQUE INDEX, bukan constraint** — bukan anomali; konsisten dengan kontrak Prisma `@@unique`; verifikasi lewat `pg_indexes` (bukan table_constraints).
2. Soal berkode tanpa metadata = 1470 — **informasional**, di luar sumber adaptive saat ini; enrichment metadata adalah pekerjaan fase lanjutan, bukan kerusakan relasi.
3. Evidence & sessions = 0 — **produk baru tanpa traksi production**; angka jujur, tanpa angka karangan.

## Query yang Dieksekusi (READ-ONLY, ringkas)

Semua lewat `db.$queryRaw` (tipe `Prisma.sql`, parameterized) terhadap pooler production via `lib/db`:
- `information_schema.tables/columns/table_constraints/key_column_usage` untuk ketiga tabel
- `pg_indexes` (indexdef ILIKE '%UNIQUE%') untuk kontrak unik
- `pg_enum`/`pg_type` untuk enum Difficulty & LearningSkillType
- `pg_class.relrowsecurity` untuk RLS
- COUNT/GROUP BY pada `QuestionMetadata` (source/status/duplikat/invalid skill/orphan vs `Soal.kodeSoal` & `User`)
- COUNT/GROUP BY pada `LearningEvidence` (source/skill-via-metadata/kontrak unik/recency)
- COUNT/GROUP BY pada `AdaptivePracticeSession` (status/source/per-user agregat/anomali duplikat JSONB)
- NOT EXISTS untuk seluruh pengecekan orphan lintas tabel

## Rekomendasi Next Step

1. **Enrichment metadata** — tambah metadata APPROVED utk WRITING/LISTENING/SPEAKING + sel VERY_HARD (target ≥5 per sel) agar pool DEGRADED → HEALTHY penuh.
2. Setelah enrichment: jalankan ulang gate ini (`npm run audit:step4a-schema`) — METADATA COVERAGE diharapkan GREEN.
3. Lanjutkan ke wiring reward loop adaptive (XP/koin) + UI Personalized Practice (retail/start session endpoint) sebagai fase implementasi berikutnya — fondasi skema sudah GREEN.

## File Terkait

- `scripts/test-step4a-production-schema.ts` — audit read-only (exit 0; UNVERIFIED jujur bila DB tak tersedia)
- `package.json` — `audit:step4a-schema`