# Question Bank Architecture — BahasaCerdas

## Overview

BahasaCerdas uses a **database-driven question bank** as the single source of truth for all student-facing question flows. Questions are authored/imported with metadata, validated, and served to students via server-side selection engines.

---

## Architecture

```
QUESTION AUTHORING (AI / Manual / JSON)
        ↓
JSON / IMPORT
        ↓
VALIDATION (lib/question-bank/import-validation.ts)
        ↓
DATABASE (Soal + QuestionMetadata)
        ↓
PUBLISHED QUESTIONS (status: APPROVED)
        ↓
┌───────────────┴───────────────┐
│                               │
│   Adaptive Practice           │   Diagnostic (Tes Awal)
│   (Aksi Hari Ini — profile)   │   (Aksi Hari Ini — no baseline)
│                               │
│   selectAdaptivePractice()    │   selectDiagnosticQuestions()
│   → skill-targeted            │   → composition-based
│   → novelty-aware             │   → difficulty-per-slot
│   → difficulty-matched        │   → anti-repeat
│                               │
└───────────────┬───────────────┘
                ↓
        USER EXPERIENCE
```

---

## Question Format (JSON Import)

```json
{
  "version": "1.0",
  "questions": [
    {
      "kodeSoal": "BC-GRAMMAR-0001",
      "judul": "Imbuhan me- #1",
      "topik": "Imbuhan",
      "kelas": "7",
      "semester": 1,
      "difficulty": "MUDAH",
      "type": "PILIHAN_GANDA",
      "text": "Bentuk kata 'me-' + 'tulis' yang benar adalah...",
      "options": ["Mentulis", "Menyulis", "Metulis", "Menulis"],
      "correctAnswer": "3",
      "explanation": "'me-' + kata berawalan 't' luluh menjadi 'men-': menulis.",
      "skill": "GRAMMAR",
      "subskill": "GRAMMAR_IMBUHAN"
    }
  ]
}
```

### Required Fields
| Field | Type | Description |
|-------|------|-------------|
| `kodeSoal` | string | Unique question ID |
| `text` | string | Question text |
| `difficulty` | string | MUDAH/EASY, SEDANG/MEDIUM, SULIT/HARD |
| `type` | string | PILIHAN_GANDA, BENAR_SALAH, ISIAN_SINGKAT |
| `correctAnswer` | string | Correct answer (index for PILIHAN_GANDA) |

### Optional Fields
| Field | Type | Description |
|-------|------|-------------|
| `judul` | string | Question title |
| `options` | string[] | Answer options (required for PILIHAN_GANDA) |
| `explanation` | string | Answer explanation |
| `skill` | string | Skill ID (creates QuestionMetadata if present) |
| `subskill` | string | Subskill ID |
| `topik` | string | Topic name |
| `kelas` | string | Grade level (default: "7") |
| `semester` | number | Semester |
| `kompetensi` | string | Competency code |
| `levelBerpikir` | number | Cognitive level (1-5) |
| `kataKunci` | string[] | Keywords |
| `estimasiWaktu` | number | Estimated time (seconds) |
| `isHOTS` | boolean | Higher Order Thinking Skill |

---

## Question Lifecycle

Questions are managed via `QuestionMetadata.status`:

```
DRAFT → NEEDS_REVIEW → APPROVED → (active in Aksi Hari Ini)
```

Only `APPROVED` questions are served to students. The adaptive practice and diagnostic routes both filter by `QuestionMetadata.status === "APPROVED"`.

---

## Import Process

### Via API
```
POST /api/admin/bank-soal/import
Body: { "version": "1.0", "questions": [...] }
Query: ?dryRun=true (validation only, no DB write)
```

### Pipeline
1. **Auth check** — founder/admin only
2. **Envelope validation** — valid JSON, questions array, size limits
3. **Per-question validation** — required fields, difficulty normalization, type normalization
4. **Duplicate detection** — by kodeSoal (exact) and text (similarity)
5. **DB transaction** — Soal records + optional QuestionMetadata (when skill provided)
6. **Import summary** — imported/skipped/invalid/duplicates counts

### Via Seed Script (existing)
```
POST /api/admin/bank-soal/seed
```
Reads from `data/question-bank/master/*.json` files and seeds into Soal table.

---

## Randomization

### Adaptive Practice (Aksi Hari Ini — with profile)
- **Target skill**: Based on learner state (weakest evidenced skill)
- **Novelty**: UNSEEN > OLD > RECENT (14-day cooldown)
- **Difficulty**: Matched to learner proficiency
- **Diversity**: Topic and question type spread
- **Selection**: Score-based ranking, deterministic

### Diagnostic (Aksi Hari Ini — no baseline)
- **Composition**: READING 2 · GRAMMAR 2 · VOCAB 2 · LITERATURE 1 · WRITING 2 · LISTENING 1
- **Difficulty per slot**: Q1-Q3 EASY, Q4-Q7 MEDIUM, Q8-Q10 HARD
- **Anti-repeat**: Recent questions excluded
- **Fallback**: Honest — missing skills noted in composition

---

## Anti-Repetition

1. **Session deduplication**: Same question never appears twice in one session
2. **Cooldown**: 14-day cooldown via `LearningEvidence.answeredAt`
3. **Priority**: New questions > old questions > recently used (fallback only)
4. **Tracking**: `LearningEvidence` table with `@@unique([userId, source, activityId, questionId])`

---

## Security

- **correctAnswer**: Never sent to client before answering
- **Scoring**: Server-side only via `LearningEvidence`
- **Idempotency**: Session completion uses atomic claim + recovery pattern
- **Rate limiting**: 10 starts per 30 minutes per user
- **Client trust**: Client never sends score/XP/coin/confidence/difficulty

---

## How to Add Questions

### Bulk Import (Recommended)
1. Prepare JSON file in the format above
2. Use `?dryRun=true` to validate first
3. POST to `/api/admin/bank-soal/import`
4. Verify summary shows expected counts

### Via Seed Script
1. Add JSON files to `data/question-bank/master/`
2. Run `POST /api/admin/bank-soal/seed`
3. Create QuestionMetadata entries (via audit scripts or manual)

### Adding 100 Questions
```json
{
  "version": "1.0",
  "questions": [
    { "kodeSoal": "BC-XXX-001", "text": "...", "difficulty": "MUDAH", "type": "PILIHAN_GANDA", "options": [...], "correctAnswer": "0", "skill": "GRAMMAR", "subskill": "GRAMMAR_IMBUHAN" },
    ...
  ]
}
```

### Adding 500+ Questions
1. Split into multiple JSON files (500 per file)
2. Import each file separately
3. Use `?dryRun=true` on first file to validate format
4. Monitor import summary for errors

---

## Files

| File | Purpose |
|------|---------|
| `lib/question-bank/import-validation.ts` | JSON validation + duplicate detection |
| `app/api/admin/bank-soal/import/route.ts` | Bulk import API endpoint |
| `app/api/admin/bank-soal/route.ts` | Admin question bank viewer |
| `app/api/admin/bank-soal/seed/route.ts` | Seed from data files |
| `lib/adaptive-practice/selector.ts` | Adaptive question selection |
| `lib/diagnostic/selector.ts` | Diagnostic question selection |
| `lib/question-metadata/taxonomy.ts` | Skill/subskill/difficulty taxonomy |
| `lib/question-metadata/validation.ts` | Metadata validation |
| `data/question-bank/master/*.json` | Question data files |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `Soal` | Question content (text, options, correctAnswer) |
| `QuestionMetadata` | Taxonomy (skill, subskill, difficulty, status) |
| `LearningEvidence` | Student attempt history |
| `AdaptivePracticeSession` | Session snapshots |

---

## Security Considerations

1. **correctAnswer isolation**: Answer key stored only in DB, never sent in question payload
2. **Server-side scoring**: All scoring happens in API routes, not client
3. **Idempotent completion**: Atomic claim pattern prevents double XP
4. **Rate limiting**: Prevents abuse of session creation
5. **Input validation**: All question fields validated before DB insert
6. **Duplicate detection**: Both kodeSoal uniqueness and text similarity checks
