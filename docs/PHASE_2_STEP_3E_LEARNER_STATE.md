# PHASE 2 STEP 3E — LEARNER STATE ENGINE

# Executive Summary

BahasaCerdas now has a deterministic read-only learner-state projection over trusted `LearningEvidence` and approved `QuestionMetadata`.

The engine does not modify evidence, `LearningSkill`, XP, coins, recommendations, or Student Home. It calculates a bounded seven-skill response on demand for the authenticated user.

# Evidence Inputs

The API reads:

- `LearningEvidence`: server-verified answer/result rows;
- `QuestionMetadata`: approved metadata and skill assignment;
- existing taxonomy in `lib/question-metadata/taxonomy.ts`.

Evidence with missing skill metadata or non-approved metadata is excluded from skill state. It is not deleted or rewritten.

Current source limitation: the sample `BANK_SOAL` metadata is `NEEDS_REVIEW`, so it contributes zero state until human approval. Jalur/Latihan production evidence also requires matching approved metadata identity.

# State Contract

Contract: `docs/PHASE_2_STEP_3E_LEARNER_STATE_CONTRACT.md`.

Fields returned per canonical skill:

- historical attempts/correctness/accuracy;
- recent 10-attempt correctness/accuracy;
- first/last practice timestamps;
- deterministic trend;
- evidence-volume confidence;
- conservative provisional mastery state.

# Accuracy

Accuracy is calculated server-side as:

```text
correctCount / attemptCount
```

With zero attempts it is `null`, not `0`. Counts are validated by the pure calculator; impossible counts throw rather than produce a misleading state.

# Sample Size

Confidence bands are `NO_DATA` (0), `LOW` (1-4), `MEDIUM` (5-9), and `HIGH` (10+). The engine deliberately does not treat 1/1 as mastery.

# Recent Performance

The latest 10 eligible evidence rows per skill are selected by a SQL window function. Historical rows are the remaining rows. Both are returned separately, so improvement does not erase historical performance.

# Trend

Trend requires at least 5 recent and 5 historical attempts. A 10 percentage-point difference is the threshold for `IMPROVING` or `DECLINING`; otherwise it is `STABLE`. Smaller samples return `INSUFFICIENT_DATA`.

# Recency

`MIN(answeredAt)` and `MAX(answeredAt)` are returned as `firstPracticedAt` and `lastPracticedAt`. No activity is invented from XP, login, rank, or streak.

# Confidence

Confidence is evidence quantity only. It is independent from accuracy and does not imply learner ability.

# Mastery

The engine exposes a conservative provisional state (`NO_DATA`, `NOT_ENOUGH_EVIDENCE`, `DEVELOPING`, `PROFICIENT`). It requires 10 total and 5 recent attempts plus a usable trend before `PROFICIENT` is possible. It is not used for recommendations, unlocking, or adaptive difficulty.

# Difficulty Boundary

Difficulty metadata is not included in raw accuracy. `QuestionMetadata.difficulty` remains available for future stratified analysis, but Step 3E does not calculate adaptive difficulty or mix content difficulty with empirical correctness.

# Metadata Coverage

Only `QuestionMetadata.status=APPROVED` with non-null skill contributes. The current sample is review-only, so the safe default state is no data rather than inferred skill.

# Performance

API: `GET /api/player/learner-state`.

Strategy:

- one server-side aggregate query;
- filter by authenticated `userId`;
- join only approved metadata;
- window latest 10 per skill;
- group in SQL;
- 10-second query timeout;
- seven bounded state rows returned;
- no client-side full-history scan;
- no polling or Student Home integration yet.

This is simpler than maintaining a second materialized state table at current scale. A materialized/incremental projection can be considered after evidence volume and query latency are measured.

# API

`GET /api/player/learner-state`:

- authentication required;
- no request body or arbitrary user ID;
- own-user filter from `getUser().id`;
- deterministic response;
- no LLM or reward calls;
- missing metadata infrastructure returns `503 LEARNER_STATE_UNAVAILABLE`, not fabricated state.

# Security

- No client can submit counts, accuracy, trend, confidence, or mastery state.
- No client can choose another user ID.
- Metadata mutation remains admin/founder-only through `/api/admin/question-metadata`.
- Existing evidence ownership remains server-derived.
- No UKBI/TKA endpoint or certified model was modified.

# Tests

`npm run test:learner-state` covers:

1. no evidence;
2. one correct/incorrect;
3. 5 and 10 attempts;
4. mixed results;
5. improving/declining/stable trends;
6. insufficient sample;
7. evidence without skill;
8. difficulty separation;
9. zero division;
10. impossible counts;
11. deterministic repeatability;
12. auth/session-only API;
13. no client state body;
14. approved metadata join;
15. bounded user query;
16. reward separation.

Result: **24/24**.

Full regression remains green: Step 3B, Step 3C, metadata, My Day, student shell, Premium, gamification, simulation, Arena, TypeScript, ESLint, and build.

# Remaining Gaps

1. `QuestionMetadata` and `LearningEvidence` migrations must be applied in production before meaningful state is available.
2. Sample metadata is `NEEDS_REVIEW`; no mass metadata classification was performed.
3. Current evidence identity is activity-scoped; a future server-issued attempt identity is needed for complete retry history.
4. No Student Home integration yet; API is read-only infrastructure.
5. No adaptive selector, adaptive difficulty, mastery action, or recommendation change.
6. UKBI/TKA evidence remains intentionally isolated.

# Adaptive Readiness

**LEARNER STATE ENGINE: YELLOW** — deterministic and secure, but production metadata/evidence coverage is still incomplete.

**DATA INTEGRITY: GREEN** — state is derived server-side from approved metadata and trusted evidence only.

**ADAPTIVE PRACTICE: READY FOR DESIGN** — the system can now calculate a bounded current state without client-controlled values. Design must still wait for approved metadata coverage and production migration verification before implementation.
