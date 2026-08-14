# PHASE 2 STEP 3B — LEARNING DATA FOUNDATION HARDENING

Status: implementasi hardening P0 selesai. Adaptive Practice belum dibangun.

# Executive Summary

Step 3A menemukan bahwa browser dapat mengirim `skillDelta`, `xp`, dan `coin` ke endpoint generik Learning Loop, serta completion Jalur Cerdas mempercayai `score` dari klien. Dua trust boundary tersebut sudah diperbaiki tanpa membuat engine adaptive baru.

Perubahan utama:

1. `POST /api/learning-loop/activity` sekarang hanya menerima telemetry client yang tidak memiliki konsekuensi reward (`LOGIN`/`SOCIAL`). Event belajar harus dicatat oleh route fitur server-side.
2. Numeric reward fields dari legacy client tidak lagi dibaca.
3. Jalur Cerdas sekarang menerima jawaban per soal, menghitung skor dari kunci di server, dan menolak completion tanpa jawaban.
4. Progress route hanya memproses unit dengan `LearningLevel.type = JALUR`.
5. Replay XP Jalur yang terdeteksi tidak boleh meneruskan increment koin.
6. `POST /api/player/coin` tidak lagi mengizinkan murid menambah koin secara bebas; `add` hanya admin/founder.
7. UKBI/TKA scoring, Premium Economy, webhook, dan Arena reward engine utama tidak diubah.

# Root Cause

## Activity API

Sebelumnya `POST /api/learning-loop/activity` menerima dan meneruskan body klien langsung ke `recordActivity()`:

```text
client body.skillDelta → LearningSkill XP
client body.xp         → PlayerActivity
client body.coin       → PlayerActivity
client body.skill      → skill yang terlihat lemah/kuat
```

Authentication ada, tetapi event ownership dan consequences tidak diverifikasi.

## Jalur Cerdas

Sebelumnya browser menghitung `score`, lalu PATCH progress menganggap `score >= 70` sebagai completion. Server tidak menghitung ulang dari jawaban yang sudah divalidasi oleh endpoint soal.

## Coin API

Sebelumnya authenticated user dapat memanggil action `add` pada `/api/player/coin` dengan amount yang dibatasi 100 per request, tetapi tidak ada role/feature authorization. Rate limit bukan pengganti authorization.

# Security Boundary

## Before

```text
Browser → arbitrary activity + reward numbers → recordActivity → skill/activity state
Browser → score → Jalur progress → completion + XP + coin + skill
Browser → player/coin add → PlayerProfile.coin
```

## After

```text
Browser → safe telemetry LOGIN/SOCIAL only → zero skill/XP/coin

Browser → question answers → server reads LearningUnit.content keys
         → server score → server completion threshold
         → canonical awardXp + server unit coin reward + server skill event

Admin/Founder → player/coin add (tooling only)
Feature route → server-derived reward engine paths
```

The authenticated user ID is always taken from `getUser()`. Request bodies cannot choose another owner.

# Before Architecture

- `recordActivity()` was a useful internal transaction helper, but the public route exposed its consequence-bearing input shape.
- `LearningSkill` remained a cumulative reward/evidence hybrid.
- Jalur score was client-authoritative at the completion boundary.
- `awardXp()` was already the canonical XP engine and remained so.
- `awardCoins()` and `coin-engine` remained the existing coin paths; only the unsafe public add boundary was gated.

# After Architecture

## Client Events

`lib/learning-loop/client-events.ts` defines the only browser-reportable event rules:

- `LOGIN`
- `SOCIAL`

Both derive `skillDelta: 0`, `xp: 0`, and `coin: 0` on the server. Learning events (`JALUR_CERDAS`, `LESSON`, `KARYA`, `QUIZ`, `GAME`, simulations, and similar) are rejected at the generic route and must be recorded by their owning server route.

The endpoint also has a 30 requests/minute route limit. Client-provided `subtype`, `skill`, `skillDelta`, `xp`, `coin`, `meta`, `reference`, and journey details are ignored.

## Jalur Completion

The lesson now sends `{ answers }`, not `{ score }`. The server:

1. loads the unit content and its answer keys;
2. validates the unit belongs to the JALUR track;
3. validates question IDs and answer values from the body;
4. computes correct count and percentage via `scoreJalurAnswers()`;
5. applies the existing `>=70` completion rule;
6. uses existing database rewards and `awardXp()`;
7. records the existing Learning Loop activity with a server-derived skill/unit consequence.

Legacy requests containing only `score` now fail safely with `ANSWERS_REQUIRED`; they cannot receive completion or rewards.

# Activity Integrity

Changed files:

- `lib/learning-loop/client-events.ts`
- `app/api/learning-loop/activity/route.ts`

The generic activity route no longer acts as a reward API. It is a safe telemetry endpoint only. Server feature routes continue to call `recordActivity()` with their own server-derived values.

Known remaining limitation: telemetry `LOGIN/SOCIAL` can still be repeated within the rate limit and may add activity rows, but it cannot add skill XP, XP rewards, or coins. This is not a reward-integrity bypass.

# Jalur Cerdas Integrity

Changed files:

- `lib/jalur-cerdas/scoring.ts`
- `app/api/jalur-cerdas/[unitId]/submit/route.ts`
- `app/api/jalur-cerdas/[unitId]/progress/route.ts`
- `app/arena/jalur-cerdas/[unitId]/lesson/page.tsx`

The scoring helper is shared by answer validation and completion scoring, preventing a second comparison rule. The progress route no longer reads `body.score`.

The existing `awardXp()` reference (`unitId`) remains the idempotency boundary. If a replay returns zero XP without `kuotaHabis`, the route exits before incrementing coins again. This preserves normal rewards while closing the common replay path.

The remaining completion skill delta is still a fixed server rule (`8`) because changing reward semantics is outside this hardening step. It is now server-controlled, but it is **not mastery evidence**.

# Reward Integrity

## XP

- `POST /api/player/xp` was already admin/founder-only and remains unchanged.
- Feature routes continue using `awardXp()`.
- `awardXp()` remains the single XP engine with source caps, daily quota, ledger, profile synchronization, and reference idempotency.

## Coin

- `POST /api/player/coin` `add` now requires admin/founder.
- `deduct` remains balance-checked by `coin-engine`.
- Karya, quest, game, and Jalur feature routes continue using their existing server paths.

## Remaining Client-Reported Results

The following game endpoints still accept client-reported gameplay results, but have existing rate limits/caps and are separate from the Learning Loop evidence API:

- `/api/game/xp`: score/correct/wrong/maxStreak;
- `/api/katastra/submit`: score/correct/wrong/maxStreak;
- `/api/game/menara`: correct/total;
- `/api/game/result`: score/correct/wrong/maxStreak/avgTime.

These are bounded reward/statistics paths, not trusted adaptive evidence. A future game integrity phase should use server game sessions/question evidence. They were not redesigned here because the task protects the existing Arena reward engine.

# Evidence Model

No new evidence model was created in Step 3B.

Existing models are not equivalent:

- `PlayerActivity`: activity/reward log, not question evidence;
- `LearningSkill`: cumulative skill XP/level, not mastery;
- `UserUnitProgress`: one aggregate unit completion row;
- `TestAnswer`: UKBI/TKA answer evidence, isolated to certified assessment sessions;
- `QuizAnswer`: teacher quiz answer evidence;
- `GameResult`: aggregate game result without question IDs.

The system still needs a separate trusted evidence boundary before Adaptive Practice v1.

# Attempt Persistence

Question-level persistence remains deferred. Minimum future design:

1. `PracticeAttempt`: authenticated `userId`, source, source ID, started/completed timestamps, immutable session identity.
2. `PracticeEvidence`: attempt ID, authenticated user ID, stable question ID, nullable skill, nullable difficulty, correctness/score, answered timestamp, source metadata.
3. Unique idempotency key for `(attemptId, questionId)` and indexes for `(userId, answeredAt)`, `(userId, questionId)`, and `(userId, source, answeredAt)`.

This should be additive and separate from UKBI/TKA certified models. Skill may remain nullable until question metadata is reviewed. No fabricated skill labels should be inserted.

# Idempotency

Current protections:

- XP uses `awardXp()` reference idempotency.
- Jalur has an existing completed guard plus the new duplicate-XP replay guard before coin increment.
- `player/coin add` is no longer a student-facing mutation path.
- client activity has no reward consequence and is rate-limited.

Remaining P1 gap:

- `PlayerActivity` itself has no unique constraint on `reference` and server feature routes can still create duplicate activity rows on retries.
- `CoinTransaction` has no universal unique `(userId, reason, reference)` constraint.
- A future evidence model must provide the idempotency key before adaptive practice is exposed.

# Premium Boundary

Premium was not modified. Integrity is independent of plan:

- FREE and PRO use the same server-side activity and scoring boundaries;
- Premium does not grant permission to submit arbitrary skill/reward values;
- adaptive access must be gated later through canonical `lib/premium-economy/`, but evidence must remain trustworthy for every plan.

# UKBI/TKA Boundary

UKBI/TKA scoring, snapshots, answer-key protection, attempt isolation, and Premium simulation gate were not modified.

The new Jalur scoring helper is not imported by UKBI/TKA. The security tests confirm the certified submit route still uses `buildAnswerRows` and `scoredFromSnapshot`.

Future adaptive projections may read finalized `ProgresKompetensi`/`TestAnswer`, but must not alter certified snapshots, scoring, package blueprints, or answer leakage behavior.

# Database Changes

**No migration created.**

No new evidence table is required to close the immediate P0 trust boundaries. The proposed attempt/evidence model remains P1 design work. No production database change was applied.

# Tests

New focused suite:

- `npm run test:step3b-foundation` — **28/28**
  - client numeric reward tampering;
  - safe/unsafe client events;
  - server-side Jalur scoring;
  - no `body.score` completion trust;
  - JALUR track boundary;
  - coin add authorization;
  - owner derived from session;
  - duplicate replay coin guard;
  - UKBI/TKA snapshot boundary.

Regression suites:

- `test:my-day-home` — 34/34;
- `test:student-home` — 61/61;
- `test:student-shell` — 34/34;
- `test:student-consolidation` — 19/19;
- `test:premium-production` — 24/24;
- `test:premium-economy` — PASS;
- `test:gamification-engine` — PASS;
- `test:simulation-workflow` — 63/63;
- `test:arena-web` — 56/56;
- `test:arena-chat` — 94/94;
- `npx tsc --noEmit` — exit 0;
- ESLint changed files — 0 errors;
- production build — exit 0;
- `git diff --check` — clean.

Protected-zone test assertions were updated only to allow the explicitly authorized Step 3B security files. They still fail for any other unexpected file in those zones.

# Remaining Risks

1. No question-level evidence ledger exists yet, so Adaptive Practice cannot prove unseen status or skill evidence across all flows.
2. Jalur skill gain remains completion-based fixed `8`, not answer-quality evidence.
3. Game/Katastra result endpoints still accept bounded client gameplay outcomes; they are not suitable as trusted adaptive evidence.
4. `PlayerActivity` and `CoinTransaction` do not have universal reference uniqueness.
5. Production database/runtime verification was not performed from this masked local environment.

# Adaptive Readiness After Hardening

**P0 SECURITY: GREEN** for the identified Learning Loop activity API, Jalur score boundary, and student coin-add boundary.

**LEARNING DATA FOUNDATION: YELLOW** — client reward manipulation is closed at the addressed boundaries, but question-level evidence, canonical question metadata, and universal idempotency are still missing.

**ADAPTIVE PRACTICE: NOT READY**.

The next safe phase is P1 evidence/attempt design and implementation, followed by reviewed skill metadata and selector tests. Do not market or expose Personalized Practice until those foundations exist.
