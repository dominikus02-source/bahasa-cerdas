# PHASE 2 STEP 3C — QUESTION-LEVEL LEARNING EVIDENCE LEDGER

# Executive Summary

Step 3C menambahkan ledger evidence question-level minimal dan additive. Ledger ini mencatat apa yang siswa jawab, dari aktivitas mana, kapan, dan hasil validasi server. Ledger bukan XP, bukan coin, bukan `LearningSkill`, dan bukan mastery engine.

Flow yang kini memiliki evidence:

```text
Jalur Cerdas answer
  → server loads LearningUnit.content answer key
  → server calculates correct/incorrect
  → LearningEvidence upsert (idempotent)
  → response returned
  → completion checks matching evidence
  → existing XP/coin/skill activity path
```

```text
Latihan/Bank Soal submit
  → server grades Soal/customAnswer
  → LearningEvidence batch replace for QuizSubmission
  → submission becomes SUBMITTED
```

UKBI/TKA tetap terisolasi. Tidak ada adaptive difficulty, mastery, weak-skill detection, question recommendation, atau mass tagging.

# Existing Attempt Architecture

Audit keputusan:

| Flow | Existing persistence | Decision |
|---|---|---|
| Jalur Cerdas | `UserUnitProgress` hanya satu aggregate per user/unit; submit answer sebelumnya tidak disimpan | Tambah `LearningEvidence` untuk setiap server-verified answer |
| Latihan/Bank Soal | `QuizSubmission` + `QuizAnswer` sudah menyimpan answer/result | Reuse result server, mirror ke ledger canonical yang sama |
| UKBI/TKA | `TestSession`, snapshot, `TestAnswer`, `ProgresKompetensi` | Tidak disentuh; certified boundary tetap terpisah |
| Game | `GameSession`/`GameResult` aggregate tanpa question identity | Tidak dimasukkan; gap tetap didokumentasikan |

Tidak ada model existing yang aman untuk menjadi ledger lintas Jalur dan Latihan tanpa mencampur semantics certified assessment atau reward. Model additive baru diperlukan.

# Evidence Contract

Contract lengkap: `docs/PHASE_2_STEP_3C_EVIDENCE_CONTRACT.md`.

Model `LearningEvidence` menyimpan:

- `userId`: owner dari authenticated session;
- `source`: `JALUR_CERDAS` atau `LATIHAN`;
- `activityId`: `unitId` untuk Jalur, `QuizSubmission.id` untuk Latihan;
- `questionId`: ID stabil dari source server;
- `selectedAnswer`: jawaban siswa, bukan answer key;
- `isCorrect`: hasil server, nullable untuk unanswered/not-evaluated;
- `score`: hasil server bila relevan;
- `skill`: nullable karena metadata skill belum canonical;
- `difficulty`: nullable karena difficulty belum universal/calibrated;
- `answeredAt`, `createdAt`, `updatedAt`;
- `metadata`: version/source details tanpa reward claim.

Idempotency identity:

```text
(userId, source, activityId, questionId)
```

Question text, browser-generated IDs, `isCorrect` dari klien, `score` dari klien, skill dari klien, dan difficulty dari klien bukan sumber kebenaran.

# Ownership

Semua writes menggunakan `getUser()`/`dbUser.id` dari authenticated Supabase session. Tidak ada evidence route yang menerima atau mempercayai `req.body.userId`.

Read API evidence baru belum dibuat, sehingga belum ada permukaan baru untuk membaca evidence user lain. Ketika read API dibuat, predicate owner wajib selalu memakai authenticated user; teacher/admin harus melalui authorization kelas yang sudah ada.

# Question Identity

- Jalur: `questionId` berasal dari `LearningUnit.content.questions[].id`, dibaca ulang server dari unit yang diminta. `activityId` adalah `unitId`.
- Latihan: `questionId` berasal dari server-side `QuizQuestion.id`, bukan text atau ID buatan browser. `sourceId` asli disimpan di metadata untuk provenance.
- Bank Soal: student flow menggunakan `QuizQuestion` yang menunjuk ke `Soal`; evidence menggunakan ID `QuizQuestion` sebagai identity dalam aktivitas submission, dengan `Soal.id` di metadata.
- UKBI/TKA: tetap memakai identity/snapshot existing dan tidak dipaksa masuk ke model ini.

Composite uniqueness membuat retry request yang sama meng-update/menggantikan evidence dalam aktivitas yang sama, bukan membuat baris duplikat.

# Server-Side Result Validation

## Jalur Cerdas

`POST /api/jalur-cerdas/[unitId]/submit`:

1. authentication;
2. loads unit content;
3. resolves question by server-side `questionId`;
4. compares submitted answer with server-side `jawaban` via `isJalurAnswerCorrect()`;
5. writes `LearningEvidence`;
6. only then schedules quest bookkeeping and returns result.

`PATCH /progress`:

- requires `answers`, not client `score`;
- recalculates score with `scoreJalurAnswers()`;
- rejects non-JALUR units;
- for completion, verifies matching evidence rows exist for the submitted answers;
- only then uses the existing completion/reward flow.

## Latihan

`POST /api/murid/quiz/[id]` already grades answers by loading server-side `Soal.correctAnswer` or `QuizQuestion.customAnswer`. Step 3C reads the final server `QuizAnswer` rows and batch-replaces `LearningEvidence` before changing the submission status to `SUBMITTED`.

# Idempotency

- Jalur uses `upsert` on the composite unique key.
- Latihan uses a two-operation transaction: delete evidence for the same submission scope, then `createMany` current server results. The submission is not marked `SUBMITTED` until the batch succeeds.
- Existing XP remains through `awardXp()` and its reference idempotency.
- Existing Jalur replay guard prevents a duplicate XP result from continuing to the coin increment.
- Evidence helper never calls XP/coin/streak/leaderboard code.

This is activity-scoped evidence, not an unlimited historical attempt model. Repeating the same question in the same Jalur unit updates the current evidence row. A future attempt model is still needed if product requirements require a complete history of every retry.

# Jalur Cerdas

Implemented:

- one evidence row per user/unit/question;
- server-selected owner and question identity;
- server correctness;
- nullable skill/difficulty;
- evidence required before successful completion;
- no reliance on client score, skillDelta, XP, or coin.

Existing fixed completion reward remains unchanged: server uses unit `xpReward`/`coinReward` and the existing server skill activity rule. This is reward behavior, not evidence/mastery.

# Latihan

Implemented for `QuizSubmission` flows:

- server result is read from `QuizAnswer` after grading;
- all assigned questions receive an evidence row, including unanswered rows with nullable correctness;
- source is `LATIHAN`;
- activity identity is the authenticated submission ID;
- Bank Soal questions are included when delivered through the existing quiz assignment architecture.

No new Latihan selector or adaptive logic was introduced.

# Bank Soal

Bank Soal practice can safely use the ledger when it is represented by `QuizQuestion` + `QuizSubmission` because the server has stable question identity and answer keys. Direct raw bank preview remains a teacher/read-only flow and does not create student evidence.

# Metadata Contract

The fields `skill` and `difficulty` are nullable by design. No mass tagging was performed. No fabricated values were inserted.

Future metadata contract remains:

- skill;
- subskill;
- difficulty;
- level;
- topic;
- question type;
- CEFR where applicable.

Metadata review and calibration are separate from this ledger.

# Database

Added model: `LearningEvidence` in `prisma/schema.prisma`.

Added manual migration:

`prisma/migrations/manual/2026-08-15_learning_evidence.sql`

Migration is additive and creates:

- table `LearningEvidence`;
- composite unique index `(userId, source, activityId, questionId)`;
- user/time index;
- user/question index;
- user/source/time index;
- user/skill/time index;
- foreign key to `User` with cascade delete;
- RLS enabled.

The migration has not been applied automatically to production.

# Performance

- Jalur answer writes one upsert per answer, which is the evidence event itself; no UI component creates extra writes.
- Jalur progress performs one evidence lookup for completion verification.
- Latihan performs one final answer read and a bounded two-operation evidence transaction, not one upsert per question.
- No learner-state update or mastery calculation runs during evidence insertion.
- Indexes match current owner/time/question/source query patterns.

At very large scale, evidence retention/partitioning and batch submission load should be benchmarked separately.

# Reward Separation

Evidence does not write:

- XP;
- coins;
- streak;
- leaderboard;
- `PlayerProfile`;
- `LearningSkill`.

Existing reward engines remain the only reward paths. Evidence and rewards are deliberately separate so XP cannot be used as a mastery proxy.

# Failure Semantics

## Jalur Answer

If answer validation succeeds but evidence persistence fails, the endpoint returns an error instead of returning a successful answer result. The client cannot proceed with a trustworthy completion because progress verification will return `EVIDENCE_REQUIRED`.

## Jalur Completion

If evidence is absent/mismatched, completion and rewards are not granted. The UI reports the save failure instead of showing a successful completion state.

## Latihan

Evidence batch runs before the submission status becomes `SUBMITTED`. A ledger failure returns an error and leaves the submission out of the completed state, allowing a retry.

# Security Tests

Focused suite:

`npm run test:step3c-evidence` — **29/29**.

Coverage includes:

- authenticated ownership;
- no body userId;
- stable source/activity/question key;
- correctness server-side;
- nullable unverified skill/difficulty;
- duplicate evidence constraint;
- Jalur evidence before quest/completion;
- Latihan evidence before `SUBMITTED`;
- no reward calls in evidence helper;
- UKBI/TKA snapshot boundary.

Step 3B security suite remains green: `npm run test:step3b-foundation` — **28/28**.

# UKBI/TKA Boundary

No UKBI/TKA route, scoring algorithm, snapshot logic, answer-key protection, or certified assessment schema was modified.

UKBI/TKA remain isolated in `TestSession`, snapshot, `TestAnswer`, and `ProgresKompetensi`. Future evidence projection may be designed separately after certified assessment review; it is not part of this ledger.

# Remaining Gaps

1. Production migration must be applied manually before Jalur/Latihan evidence writes work in production.
2. No read API or student evidence history UI exists yet.
3. Same-question retries within one activity update the row; full attempt history needs a future server-issued attempt identity.
4. `skill` and `difficulty` are nullable until metadata is reviewed.
5. `LearningSkill` remains cumulative state/reward-derived XP, not mastery.
6. Game/Katastra aggregate result flows are not included in the ledger.
7. UKBI/TKA remain isolated by design.

# Adaptive Readiness

**QUESTION-LEVEL EVIDENCE: YELLOW** — Jalur and Latihan now have a trustworthy additive ledger, but production migration and broader source coverage remain.

**DATA INTEGRITY: GREEN** for the implemented Jalur/Latihan boundaries: owner and result are server-derived, duplicate evidence is constrained, and rewards remain separate.

**ADAPTIVE PRACTICE: NOT READY — metadata/learner-state work remains.**

No adaptive difficulty, mastery, recommendation, weak-skill detection, Premium feature, or mass tagging was implemented.
