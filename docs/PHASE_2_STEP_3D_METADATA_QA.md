# PHASE 2 STEP 3D — QUESTION METADATA QA

## Sample

File: `data/question-metadata/sample-001.json`

- 30 records;
- source: BANK_SOAL;
- 10 topics: Ide Pokok, Simpulan, Sinonim, Kalimat Efektif, Ejaan, Imbuhan, Cerpen, Pantun, Majas, Teks Eksposisi;
- skills: READING, VOCABULARY, GRAMMAR, LITERATURE;
- subskills: valid parent relationships;
- difficulty: 10 EASY, 10 MEDIUM, 10 HARD;
- question types: 10 PILIHAN_GANDA, 10 BENAR_SALAH, 10 ISIAN_SINGKAT;
- CEFR: nullable for all sample rows;
- provenance: EXISTING_DATA;
- confidence: MEDIUM;
- status: NEEDS_REVIEW for all rows.

No sample row is auto-published. The sample is manually inspectable and uses stable `Soal.kodeSoal` identities from existing master data.

## Validation and Import

- `npm run validate:question-metadata` validates the sample without DB writes.
- `POST /api/admin/question-metadata` is the import/update mechanism, max 50 items/request.
- `GET /api/admin/question-metadata` is admin/founder-only review access.
- API writes use `QuestionMetadata` upsert on `(source, questionId)`.
- Student requests receive 401/403 and cannot mutate or read metadata through this API.
- There is no student-facing metadata mutation path.

## Security QA

Focused test: `npm run test:question-metadata`.

Cases include valid/invalid skill, subskill parent, difficulty, question type, nullable CEFR, provenance, malformed record, AI auto-approval, level bounds, UKBI/TKA rejection, admin-only mutation, session-derived operator, and 30-row sample validation.

## Database

Migration: `prisma/migrations/manual/2026-08-15_question_metadata.sql`.

It is additive, creates only `QuestionMetadata` and its indexes/foreign keys, and has not been applied automatically to production.

## QA Status

The sample is a contract/validation demonstration, not a production-wide classification. No 1,534-question mass update was performed. Metadata coverage outside the sample remains zero until content review approves additional batches.

## Future Review Workflow

1. Validate a small batch.
2. Human content reviewer checks skill/subskill/topic/type/difficulty.
3. Keep `NEEDS_REVIEW` until evidence is sufficient.
4. Update to `HUMAN_REVIEW` + `APPROVED` only through authorized editor API.
5. Never rewrite existing `LearningEvidence` because taxonomy versions must remain auditable.
