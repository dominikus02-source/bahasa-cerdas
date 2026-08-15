# PHASE 2 STEP 3F — ADAPTIVE PRACTICE AUDIT

## Existing Flows

| Flow | Current selector | Session/evidence | Step 3F decision |
|---|---|---|---|
| Jalur Cerdas | fixed unit content questions | `UserUnitProgress` + `LearningEvidence` | keep as curriculum; not adaptive source v1 |
| Latihan/Bank Soal | teacher `QuizQuestion` assignment | `QuizSubmission`/`QuizAnswer` + `LearningEvidence` | metadata identity exists, but assignment semantics are not a free candidate pool |
| UKBI/TKA | package section pool, snapshot, anti-repeat | `TestSession`/`TestAnswer`/`ProgresKompetensi` | explicitly excluded |
| Game | harvest/ramp or game-specific static pool | aggregate GameResult, limited question evidence | explicitly excluded |

## Reusable Systems

- `getLearnerState()` and deterministic calculator: trusted state input;
- `QuestionMetadata`: approved taxonomy filter;
- `LearningEvidence`: seen/cooldown input and answer persistence;
- `lib/question-bank/session-pool.ts`: existing anti-repeat ideas;
- `lib/game-questions/sampler.ts`: existing deterministic sampler patterns;
- `awardXp()` remains separate and is not called by adaptive session.

## Step 3F Scope

v1 supports only `BANK_SOAL` rows whose `QuestionMetadata` is `APPROVED`, has a valid skill, and maps to an existing `Soal.kodeSoal`. This is intentionally narrower than all student practice sources. It avoids pretending that Jalur JSON or certified UKBI/TKA metadata is ready.
