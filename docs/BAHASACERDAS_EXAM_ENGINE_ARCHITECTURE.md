# BahasaCerdas Exam Engine — Architecture

> **Phase:** Exam 1 — Architecture Design
> **Status:** Draft (pre-implementation)
> **Last Updated:** June 28, 2026
> **Next Phase:** Exam 2 — Audit UKBI/TKA Question Pool

---

## 1. Product Separation

| Product | Destination | Description |
|---------|-------------|-------------|
| **BIGT** | `https://www.bahasacerdas.site` | Dedicated product. No rebuild. Redirect only. |
| **BahasaCerdas Exam Engine** | In-app at `/ukbi`, `/tka`, `/latihan`, `/ulangan` | UKBI practice, TKA preparation, daily quizzes, teacher bank soal |

**BIGT redirect rule:** All routes pointing to BIGT content redirect to `https://www.bahasacerdas.site` with a 301. No BIGT component, API, or model exists inside BahasaCerdas.

---

## 2. Products Covered

| Product | Target | Scope |
|---------|--------|-------|
| UKBI Practice / Simulasi Persiapan UKBI | All levels (SD–Guru/Profesional) | Adaptive-lite, prediksi predikat latihan |
| TKA Kelas 6 | SD Kelas 6 | Literasi membaca dasar |
| TKA Kelas 9 | SMP Kelas 9 | Literasi membaca menengah |
| TKA Kelas 12 | SMA/SMK Kelas 12 | Literasi membaca lanjutan |
| TKA Guru / Persiapan PPG | Guru | Pedagogik, profesional, asesmen |
| Latihan Harian | All | Daily random questions |
| Ulangan Harian | Teacher-assigned | Per-KD, per-bab |
| Bank Soal Guru/Admin | Guru & Admin | CRUD, import, AI generate, categorize |

---

## 3. Architecture Principles

1. **Supabase DB = source of truth.** All questions, sessions, responses, results live in PostgreSQL.
2. **Supabase Storage = asset layer.** Audio files, speaking responses, exports, imports, backups.
3. **Server-side randomization.** Question selection happens in API routes, never in client code.
4. **Deterministic per session.** Seed-based random ensures refresh does not change questions.
5. **Sanitized participant API.** Participant endpoints never expose answer keys or correct answers.
6. **Snapshot on session start.** Selected question IDs are stored in `TestSessionQuestion` rows.
7. **No locking or caching on question pool.** Read from DB directly with server-side pagination.

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Browser)                     │
│  TestPlayer  │  ResultScreen  │  AdminDashboard           │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (sanitized JSON)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  Next.js API Routes                      │
│                                                         │
│  Participant API (sanitized)     Admin API (full access) │
│  /api/exam/session               /api/admin/exam/        │
│  /api/exam/question              /api/admin/questions/   │
│  /api/exam/answer                /api/admin/sessions/    │
│  /api/exam/result                /api/admin/import/      │
│  /api/exam/resume                /api/admin/export/      │
│                                                         │
│  Authorization: requireAuth() / requireRole("GURU")     │
└──────────────────────┬──────────────────────────────────┘
                       │ Prisma Client
                       ▼
┌─────────────────────────────────────────────────────────┐
│               Supabase PostgreSQL (Source of Truth)      │
│                                                         │
│  ExamProduct      ExamBlueprint    QuestionSet          │
│  QuestionItem     QuestionOption   ReadingPassage       │
│  Rubric           TestSession      TestSessionQuestion  │
│  TestResponse     TestResult       QuestionAuditLog     │
│  QuestionImportBatch  BackupManifest                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│               Supabase Storage (Asset Layer)             │
│                                                         │
│  bahasacerdas-question-assets     (images, passages)    │
│  bahasacerdas-listening-audio     (UKBI audio files)    │
│  bahasacerdas-speaking-responses  (user recordings)     │
│  bahasacerdas-exam-exports        (CSV/PDF exports)     │
│  bahasacerdas-question-imports    (bulk uploads)        │
│  bahasacerdas-backups             (versioned backups)   │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Proposed Data Model

### ExamProduct
A top-level product (UKBI, TKA Kelas 6, TKA Kelas 9, etc.)

| Field | Type | Notes |
|-------|------|-------|
| id | String | cuid |
| code | String | Unique slug — `ukbi`, `tka-6`, `tka-9`, `tka-12`, `tka-guru` |
| title | String | Display name |
| description | String | |
| productType | Enum | `UKBI`, `TKA`, `LATIHAN`, `ULANGAN` |
| isActive | Boolean | |

### ExamBlueprint
Defines structure per product: sections, question counts, time limits.

| Field | Type | Notes |
|-------|------|-------|
| id | String | |
| productId | String | FK → ExamProduct |
| title | String | e.g., "Paket 1 UKBI" |
| targetLevel | String | `SD`, `SMP`, `SMA`, `MAHASISWA`, `GURU`, `UMUM` |
| questionCount | Int | Total questions |
| duration | Int | Minutes |
| passingScore | Int | |
| randomSeed | String | Default seed for deterministic random |
| isActive | Boolean | |
| sections | JSON | Array of section definitions |

Section definition JSON:
```json
{
  "order": 0,
  "code": "MENDENGARKAN",
  "title": "Mendengarkan",
  "questionCount": 15,
  "duration": 20,
  "hasAudio": true,
  "instruction": "Dengarkan audio berikut..."
}
```

### QuestionSet
Groups questions within a blueprint.

| Field | Type | Notes |
|-------|------|-------|
| id | String | |
| blueprintId | String | FK → ExamBlueprint |
| section | String | Matches blueprint section code |
| title | String | |
| questionCount | Int | How many to select per attempt |
| tags | String[] | For filtering |
| isActive | Boolean | |

### QuestionItem
The actual question.

| Field | Type | Notes |
|-------|------|-------|
| id | String | |
| setId | String | FK → QuestionSet |
| type | Enum | `PILIHAN_GANDA`, `ESAI`, `MENJODOHKAN`, `BENAR_SALAH` |
| stem | String | Question text |
| passage | String | Optional reading passage |
| passageType | String | `INFORMASI`, `SASTRA`, `AKADEMIK` |
| audioUrl | String | For UKBI listening |
| imageUrl | String | Optional image |
| isActive | Boolean | |
| difficulty | Enum | `MUDAH`, `SEDANG`, `SULIT` |
| cognitiveLevel | Enum | `MENGINGAT` → `KREASI` |
| metadata | JSON | Tags, source, year |

### QuestionOption
Options for multiple-choice questions.

| Field | Type | Notes |
|-------|------|-------|
| id | String | |
| questionId | String | FK → QuestionItem |
| label | String | A, B, C, D |
| text | String | |
| isCorrect | Boolean | **Never sent to participant API** |
| order | Int | |

### ReadingPassage
Shared reading passages (reusable across questions).

| Field | Type | Notes |
|-------|------|-------|
| id | String | |
| title | String | |
| text | String | |
| source | String | |
| wordCount | Int | |
| grade | String | |
| questions | Relation | Has many QuestionItem |

### Rubric
Scoring rules for essay/speaking questions.

| Field | Type | Notes |
|-------|------|-------|
| id | String | |
| questionId | String | FK → QuestionItem |
| maxScore | Int | |
| criteria | JSON | Array of scoring dimensions |
| instruction | String | Grader guide |

### TestSession
An attempt (practice, simulation, or exam).

| Field | Type | Notes |
|-------|------|-------|
| id | String | |
| userId | String | |
| productId | String | FK → ExamProduct |
| blueprintId | String | FK → ExamBlueprint |
| status | Enum | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `EXPIRED` |
| currentSection | Int | 0-indexed |
| currentQuestion | Int | 0-indexed |
| startedAt | DateTime | |
| finishedAt | DateTime | |
| expiresAt | DateTime | |
| randomSeed | String | Deterministic random seed for this session |
| timeSpent | Int | Total seconds |

### TestSessionQuestion
Snapshot of selected questions for this session.

| Field | Type | Notes |
|-------|------|-------|
| id | String | |
| sessionId | String | FK → TestSession |
| questionId | String | FK → QuestionItem |
| section | Int | Section order |
| order | Int | Question order within section |
| status | Enum | `UNANSWERED`, `ANSWERED`, `FLAGGED`, `REVIEWED` |
| timeSpent | Int | Seconds spent on this question |

### TestResponse
Participant's answer to a single question.

| Field | Type | Notes |
|-------|------|-------|
| id | String | |
| sessionQuestionId | String | FK → TestSessionQuestion |
| userId | String | |
| answer | String | Selected option ID or essay text |
| isCorrect | Boolean | Null if not yet graded (essay) |
| score | Float | Auto-score for MC, null for essay |
| gradedBy | Enum | `SYSTEM`, `AI`, `HUMAN` |
| gradedAt | DateTime | |
| createdAt | DateTime | |

### TestResult
Computed result after session completion.

| Field | Type | Notes |
|-------|------|-------|
| id | String | |
| sessionId | String | FK → TestSession |
| userId | String | |
| totalScore | Float | |
| maxScore | Float | |
| percentage | Float | |
| predikat | String | e.g., `ISTIMEWA`, `MADYA`, `TERBATAS` |
| sectionScores | JSON | Per-section breakdown |
| duration | Int | Total seconds taken |
| completedAt | DateTime | |

### QuestionAuditLog
Track question changes (create, update, status toggle).

| Field | Type | Notes |
|-------|------|-------|
| id | String | |
| questionId | String | |
| actorId | String | User who made the change |
| action | Enum | `CREATED`, `UPDATED`, `VERIFIED`, `DEACTIVATED`, `REACTIVATED` |
| payload | JSON | Previous/new values |
| createdAt | DateTime | |

### QuestionImportBatch
Track bulk imports.

| Field | Type | Notes |
|-------|------|-------|
| id | String | |
| uploaderId | String | |
| source | String | `CSV`, `JSON`, `MANUAL`, `AI_GENERATED` |
| fileUrl | String | |
| status | Enum | `UPLOADED`, `VALIDATING`, `VALIDATED`, `IMPORTING`, `COMPLETED`, `FAILED` |
| totalRows | Int | |
| successCount | Int | |
| errorCount | Int | |
| errors | JSON | Row-level validation errors |
| createdAt | DateTime | |

### BackupManifest
Track versioned data exports.

| Field | Type | Notes |
|-------|------|-------|
| id | String | |
| type | Enum | `FULL`, `PRODUCT`, `BLUEPRINT`, `QUESTION_SET`, `SESSION` |
| refId | String | Optional reference ID |
| fileUrl | String | Supabase Storage path |
| format | String | `JSON`, `CSV`, `SQL` |
| rowCount | Int | |
| checksum | String | SHA-256 |
| createdAt | DateTime | |

---

## 6. Existing Model Mapping

This section maps current Prisma models to the proposed Exam Engine models.

| Current Model | Exam Engine Model | Action |
|---------------|-------------------|--------|
| `UKBIQuestion` | → `QuestionItem` + `QuestionOption` | Migrate data |
| `TKAQuestion` | → `QuestionItem` + `QuestionOption` | Migrate data |
| `PaketKompetensi` | → `ExamProduct` + `ExamBlueprint` | Migrate structure |
| `ProgresKompetensi` | → `TestResult` | Replace |
| `TestSession` | → `TestSession` + `TestSessionQuestion` | Extend (add question snapshot) |
| `TestAnswer` | → `TestResponse` | Replace |
| `BankSoal` | → Stays as-is (guru file uploads) | No migration needed |
| `Soal` | → Stays as-is (guru bank soal) | No migration needed |
| `SoalSet` | → Stays as-is (guru soal sets) | No migration needed |
| `QuizQuestion` | → Stays as-is (teacher quizzes) | No migration needed |
| `GameQuestion` | → Stays as-is (multiplayer games) | No migration needed |
| `KompetensiCertificate` | → Stays as-is | No migration needed |

**Key decisions:**
- `UKBIQuestion` and `TKAQuestion` will be migrated to the unified `QuestionItem` model during Phase Exam 3.
- `PaketKompetensi` data will seed `ExamProduct` + `ExamBlueprint`.
- The existing `TestSession` and `TestAnswer` tables serve a similar purpose but lack question snapshots and sanitization. They will be replaced by the new models.
- `BankSoal`, `Soal`, `SoalSet`, `QuizQuestion`, `GameQuestion` remain unchanged — they serve different use cases (teacher-uploaded docs, teacher quizzes, game content).

---

## 7. Storage Buckets

| Bucket Name | Purpose | Public? |
|-------------|---------|---------|
| `bahasacerdas-question-assets` | Images, diagrams, charts for questions | Yes (read) |
| `bahasacerdas-listening-audio` | UKBI listening section audio files | Yes (read) |
| `bahasacerdas-speaking-responses` | User-recorded speaking answers | No (user-only) |
| `bahasacerdas-exam-exports` | Generated CSV/PDF/exam exports | No (admin-only) |
| `bahasacerdas-question-imports` | Bulk upload files (CSV, JSON) | No (admin-only) |
| `bahasacerdas-backups` | Versioned data backups | No (admin-only) |

---

## 8. API Design

### Participant API (sanitized — no answer keys)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/exam/products` | GET | List available exam products |
| `/api/exam/blueprint?id=` | GET | Get blueprint structure (no questions) |
| `/api/exam/session/start` | POST | Start new session (creates random question snapshot) |
| `/api/exam/session/resume` | POST | Resume existing session |
| `/api/exam/question?sQId=` | GET | Get question (stem, options without correctAnswer, passage) |
| `/api/exam/answer` | POST | Submit answer |
| `/api/exam/session/submit` | POST | Finalize session |
| `/api/exam/result` | GET | Get graded result with section breakdown |

**Response shapes:**

```
GET /api/exam/question
→ {
    questionId, stem, type, options: [{ id, label, text }],
    passage, audioUrl, imageUrl, currentSection, totalSections,
    questionOrder, totalQuestions, timeLimit, timeRemaining
  }

POST /api/exam/answer
→ Body: { sessionQuestionId, answer }
  Response: { ok: true, nextQuestionId }
```

### Admin API (full access)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/exam/products` | CRUD | Manage exam products |
| `/api/admin/exam/blueprints` | CRUD | Manage blueprints |
| `/api/admin/exam/questions` | CRUD | Manage questions (incl. answer keys) |
| `/api/admin/exam/import` | POST | Bulk import questions |
| `/api/admin/exam/export` | GET | Export questions to CSV/JSON |
| `/api/admin/exam/sessions` | GET | View all sessions |
| `/api/admin/exam/backup` | POST | Create/manage backups |

---

## 9. Implementation Phases

| Phase | Focus | Output |
|-------|-------|--------|
| **Exam 1** | Architecture docs | This document + UKBI/TKA design + Random engine spec |
| **Exam 2** | Audit existing UKBI/TKA pool | Count, verify, tag existing questions |
| **Exam 3** | Random selector engine | `lib/exam/random-selector.ts` + seed-based deterministic random |
| **Exam 4** | Session snapshot system | `lib/exam/session-snapshot.ts` + snapshot on session start |
| **Exam 5** | Sanitized participant API | All `/api/exam/*` endpoints with strict response shaping |
| **Exam 6** | Screen test player prototype | React components for full exam flow |
| **Exam 7** | UKBI MVP Paket 1 | Mendengarkan + Merespons Kaidah + Membaca |
| **Exam 8** | TKA MVP | All 4 TKA products |
| **Exam 9** | Admin data center | Question CRUD, import/export, backup UI |
| **Exam 10** | Backup/import/export system | Automated backup scripts + manifest |

---

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Old `UKBIQuestion`/`TKAQuestion` data is incomplete | Medium | High | Audit phase (Exam 2) before migration |
| Existing `TestSession`/`ProgresKompetensi` data loss during migration | Medium | High | Keep old tables until new ones are proven |
| Sanitized API accidentally leaks answer key | Low | Critical | Automated tests to verify no `correctAnswer`/`explanation` in participant responses |
| Session refresh changes questions | Low | High | Deterministic seed + snapshot pattern prevents this |
| Audio file playback issues (UKBI) | Medium | Medium | Audio format validation + pre-check screen |
| User resumes after browser close | Low | Medium | Autosave + resume endpoint with integrity check |

---

*This document is architecture-only. No schema changes or migrations should be applied until all phases are designed and reviewed.*
