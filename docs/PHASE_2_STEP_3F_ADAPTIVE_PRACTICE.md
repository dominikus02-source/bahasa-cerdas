# PHASE 2 STEP 3F — PERSONALIZED PRACTICE ENGINE V1

# Architecture

```text
Authenticated user
  → getLearnerState()
  → APPROVED QuestionMetadata candidate pool
  → server-side Soal existence/type validation
  → evidence novelty/cooldown
  → deterministic selector
  → AdaptivePracticeSession snapshot
  → answer validation against server Soal.correctAnswer
  → LearningEvidence upsert
```

The implementation uses one endpoint: `POST /api/player/adaptive-practice` with `start`, `answer`, and `complete` actions. It does not create a second quiz engine or reward engine.

# Eligibility

A v1 candidate must:

1. come from source `BANK_SOAL`;
2. have `QuestionMetadata.status = APPROVED`;
3. have a valid canonical skill;
4. map to an existing `Soal.kodeSoal`;
5. have a supported question type;
6. have non-empty text and valid options shape.

`NEEDS_REVIEW`, missing metadata, UKBI, TKA, inactive/unsupported/malformed items are excluded. `Soal` currently has no dedicated active flag, so existence plus approved metadata is the v1 activity boundary and is documented as a limitation.

# Target Skill

Target ranking:

1. available skill with at least 5 trustworthy attempts and lowest historical accuracy → `WEAK_SKILL`;
2. otherwise available skill with evidence and oldest `lastPracticedAt` → `PRACTICE_GAP`;
3. otherwise alphabetically first available skill → `NO_DATA` balanced fallback.

The selector never treats one correct answer as a weakness. It uses the learner-state confidence/sample policy, not raw lowest accuracy on tiny samples.

# Difficulty

Content difficulty rules:

- no state or fewer than 5 attempts → `EASY` target;
- `DEVELOPING`/sufficient state → `MEDIUM` target;
- `PROFICIENT` with accuracy below 90% → `HARD` target;
- `PROFICIENT` with accuracy at least 90% → `VERY_HARD` target.

Difficulty is only a metadata ranking signal. Empirical difficulty is not calculated and is not mixed into the learner accuracy.

# Anti-repeat

For candidates with existing `LearningEvidence` in `BANK_SOAL`:

- no evidence → `UNSEEN` score 50;
- last seen at least 14 days ago → `OLD` score 20;
- last seen within 14 days → `RECENT` score 0.

Preference is `UNSEEN > OLD > RECENT`. If the pool is too small, recent items remain a safe fallback rather than failing the session.

# Candidate Scoring

Deterministic constants in `lib/adaptive-practice/selector.ts`:

- target skill: +100;
- target subskill: +15;
- exact target difficulty: +40;
- adjacent difficulty: +30/20/10;
- unseen/old/recent: +50/+20/0;
- new topic/type diversity: +8/+4;
- topic repeated at least three times: -15.

Ties are resolved by stable question ID. Constants are not client input.

# Diversity

Selection is greedy and recalculates topic/type diversity after each question. It maintains target skill relevance while preferring alternative topics and question types when available. It does not force diversity when doing so would leave the target skill.

# Determinism

No `Math.random()` is used. Same learner state, candidate pool, evidence timestamps, and selection version produce the same ordering. A future explicit server seed can be introduced without changing the contract.

# Explanation

Every adaptive session includes machine-readable `reasonCode`, human-readable `reasonText`, target skill/subskill, target difficulty, and `selectionVersion`. Internal weights are not exposed.

# API

`POST /api/player/adaptive-practice`:

- `start`: validates size 5/10/15 and creates server-owned session snapshot;
- `answer`: validates session ownership/question membership and records server result;
- `complete`: closes an owned non-expired session.

Session snapshot stores only question IDs and selection context, never answer keys. Answer keys are read only during server-side answer validation.

# Security

- authentication required;
- user ID from session only;
- no arbitrary skill/difficulty/question selection;
- session ownership predicate uses `id + userId`;
- question membership checked against server snapshot;
- metadata must remain APPROVED;
- no answer key in start/answer response;
- no XP/coin/streak/reward calls;
- no UKBI/TKA route or schema changes.

# Evidence Integration

Answers call the existing `upsertLearningEvidence()` helper with source `BANK_SOAL`, activity ID `AdaptivePracticeSession.id`, question ID, server correctness, approved metadata skill/difficulty, and selection version. No second evidence ledger is created.

# Performance

Start is bounded to:

- one learner-state aggregate query;
- one metadata query capped at 200 candidates;
- one Soal lookup for those IDs;
- one evidence lookup for those candidate IDs;
- one session insert.

Answer is bounded to one session lookup, one metadata/question lookup, and one evidence upsert. No full history is sent to the client and no N+1 candidate writes occur.

# Premium Boundary

The engine itself is available only where approved metadata exists and does not inspect Premium. Future product policy may offer deeper/larger personalized sessions to Premium, but Free must retain a meaningful safe fallback. No entitlement or pricing change is included.

# Fallback

No approved pool returns `mode: FALLBACK` with:

```text
Belum cukup data untuk latihan personal.
Mulai latihan umum → /arena/jalur-cerdas
```

The engine never fabricates metadata or pretends an unapproved question is personalized.

# Tests

Focused suite: `npm run test:adaptive-practice` — 25/25.

Full regression includes Step 3B, Step 3C, metadata, learner-state, My Day, student shell, Premium, gamification, simulation, Arena, TypeScript, ESLint, and build.

# Known Limitations

1. Only BANK_SOAL is supported in v1; Jalur and UKBI/TKA are excluded from selection.
2. Metadata sample is still NEEDS_REVIEW, so production may return the truthful fallback until human approval and migration are applied.
3. No Student Home integration.
4. Evidence/learner state is not recalculated inside the response; the next request reads refreshed evidence.
5. No empirical difficulty, mastery action, or recommendation update.

# Final Classification

- **ADAPTIVE ENGINE: YELLOW**
- **DATA INTEGRITY: GREEN**
- **SECURITY: GREEN**
- **ADAPTIVE QUALITY: YELLOW**
- **ADAPTIVE PRACTICE: READY FOR DESIGN**

Product wording: **evidence-based personalized practice**, not fully adaptive AI.
