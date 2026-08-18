# QUESTION BANK BATCH 001

## Overview

Batch 001 is the initial seed of 100 production-ready questions for the BahasaCerdas question bank, designed for the Aksi Hari Ini daily practice system.

## Batch Details

```
Batch ID:    aksi-hari-ini-batch-001
Date:        August 18, 2026
Total:       100 questions
Format:      JSON (version 1.0)
File:        data/question-bank/aksi-hari-ini-batch-001.json
```

## Difficulty Distribution

| Difficulty | Count | Percentage |
|------------|-------|------------|
| EASY       | 40    | 40%        |
| MEDIUM     | 40    | 40%        |
| HARD       | 20    | 20%        |

## Question Type Distribution

| Type           | Count |
|----------------|-------|
| PILIHAN_GANDA  | 93    |
| BENAR_SALAH    | 5     |
| ISIAN_SINGKAT  | 2     |

## Skill Distribution

| Skill      | Count | Subskills covered |
|------------|-------|-------------------|
| READING    | 17    | Ide Pokok, Informasi Tersurat, Inferensi, Makna Kata, Struktur Teks |
| GRAMMAR    | 27    | Kata Baku, Ejaan, Imbuhan, Kalimat Efektif, Tanda Baca |
| VOCABULARY | 27    | Sinonim/Antonim, Makna Kata, Kosakata dalam Konteks |
| WRITING    | 19    | Ejaan, Kalimat Efektif, Ketepatan Kata |
| LITERATURE | 10    | Unsur Cerita, Gaya Bahasa, Makna Sastra |

## Subskill Distribution

| Skill + Subskill | Count |
|------------------|-------|
| READING_IDE_POKOK | 3 |
| READING_INFORMASI_TERSURAT | 4 |
| READING_INFERENSI | 4 |
| READING_MAKNA_KATA | 3 |
| READING_STRUKTUR_TEKS | 3 |
| GRAMMAR_KATA_BAKU | 4 |
| GRAMMAR_EJAAN | 6 |
| GRAMMAR_IMBUHAN | 7 |
| GRAMMAR_KALIMAT_EFEKTIF | 6 |
| GRAMMAR_TANDA_BACA | 4 |
| VOCABULARY_SINONIM_ANTONIM | 11 |
| VOCABULARY_MAKNA_KATA | 14 |
| VOCABULARY_KONTEKS | 2 |
| WRITING_KALIMAT_EFEKTIF | 9 |
| WRITING_EJAAN | 6 |
| WRITING_KETEPATAN_KATA | 4 |
| LITERATURE_UNSUR_CERITA | 4 |
| LITERATURE_GAYA_BAHASA | 3 |
| LITERATURE_MAKNA_SASTRA | 3 |

## ID Scheme

Questions use the `ADH-` prefix (Aksi Di Hari):

```
ADH-000001 through ADH-000100
```

## Import Result

| Metric | Value |
|--------|-------|
| Total  | 100 |
| Valid  | 100 |
| Invalid | 0 |
| Duplicates | 0 |
| Warnings | 0 |

## Validation

- [x] JSON envelope valid
- [x] All 100 questions valid
- [x] No duplicate IDs
- [x] No duplicate text
- [x] All difficulties normalized (MUDAH/SEDANG/SULIT)
- [x] All types valid (PILIHAN_GANDA, BENAR_SALAH, ISIAN_SINGKAT)
- [x] All PILIHAN_GANDA have valid options
- [x] All correctAnswers in range
- [x] All questions have explanations
- [x] All questions have skill + subskill metadata

## Runtime Verification

After import, questions flow through:

```
Question Bank (DB)
      |
Adaptive Practice (selectAdaptivePractice)
      |
Diagnostic (selectDiagnosticQuestions)
      |
Aksi Hari Ini (ContinueLearningCard)
```

## Tests

```
test:question-bank-import    35/35
test:arena-web               94/94
test:diagnostic-assessment   48/48
test:my-day-home             37/37
test:adaptive-practice       25/25
test:learner-state           24/24
test:assessment-engine       36/36
test:assessment-quality      45/45
tsc                          0 errors
ESLint                       0 errors
```

## Import Instructions

### Dry Run (validate only)
```bash
npm run import:batch-001-dry
```

### Production Import
```bash
npm run import:batch-001
```

### Via API
```bash
curl -X POST "https://www.bahasacerdas.com/api/admin/bank-soal/import" \
  -H "Content-Type: application/json" \
  -d @data/question-bank/aksi-hari-ini-batch-001.json
```

## Files

```
data/question-bank/aksi-hari-ini-batch-001.json  — 100 questions
lib/question-bank/import-validation.ts          — validation library
app/api/admin/bank-soal/import/route.ts         — import API endpoint
scripts/import-question-bank-batch-001.ts       — local import script
scripts/test-question-bank-import.ts            — 35 test assertions
docs/QUESTION_BANK.md                           — architecture docs
docs/QUESTION_BANK_BATCH_001.md                 — this file
```

## Notes

- AI diagnostic remains enabled as fallback
- Questions are immediately eligible for Adaptive Practice and Diagnostic flows
- All questions have `source: "IMPORT"` in the Soal table
- All questions with metadata have `status: "APPROVED"` in QuestionMetadata
