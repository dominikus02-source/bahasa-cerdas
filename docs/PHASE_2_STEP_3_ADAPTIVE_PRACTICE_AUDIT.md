# PHASE 2 STEP 3A — ADAPTIVE PRACTICE PRODUCTION AUDIT

Status: **AUDIT ONLY**. Tidak ada source code, schema, migration, API, question bank, Premium, UKBI/TKA, commit, atau push yang diubah.

# Executive Summary

BahasaCerdas sudah memiliki fondasi Learning Loop yang berguna untuk CTA dan ringkasan sesi, tetapi belum memiliki Adaptive Practice production-ready.

Temuan paling penting:

1. `LearningSkill` menyimpan akumulasi XP skill, bukan bukti performa soal. Tidak ada attempts, correct/incorrect count, difficulty-adjusted accuracy, recency, atau mastery.
2. Penyelesaian Jalur Cerdas memberi `skillDelta: 8` berdasarkan unit yang selesai. Nilai jawaban per soal tidak disimpan ke attempt history, dan `score` completion dikirim dari klien.
3. UKBI/TKA memiliki snapshot dan `TestAnswer`, tetapi hasilnya belum masuk ke `LearningSkill`/`PlayerActivity`. Jalurnya terisolasi, sehingga belum dapat menjadi evidence adaptive.
4. Game dan kuis guru memiliki hasil agregat, tetapi tidak memiliki question-level evidence yang konsisten untuk adaptive selection.
5. `GET /api/player/session` memakai `PlayerCTA`, bukan `LearningRecommendation`. CTA hanya memilih satu skill terlemah atau unit yang belum selesai; belum memilih set soal.
6. `POST /api/learning-loop/activity` hanya authentication-gated dan menerima `skillDelta`, `xp`, `coin`, `skill`, serta `reference` dari body klien. Ini membuat data skill dapat dimanipulasi dan merupakan blocker integritas adaptive.
7. Selector soal yang ada bersifat domain-specific: Jalur fixed unit, UKBI/TKA section sampling, game ramp, dan kuis assignment. Belum ada selector learner-aware lintas sumber.

**Current Adaptive Practice: RED**

**Decision: NOT READY — DATA FOUNDATION GAP**

# Existing Learning Architecture

| System | File/API | Database/Prisma | Source of truth | Purpose | Status |
|---|---|---|---|---|---|
| Activity engine | `lib/learning-loop/activity.ts`, `POST /api/learning-loop/activity` | `PlayerActivity`, `LearningSkill`, `LearningJourney` | `recordActivity()` | Log aktivitas, optional skill gain, journey, refresh CTA | YELLOW; public body terlalu dipercaya |
| Skill engine | `lib/learning-loop/skills.ts`, `GET /api/player/skills` | `LearningSkill` | `skillLevelFromXp()` + accumulated XP | Level 1-100 per skill, weakest-first ordering | YELLOW; bukan evidence engine |
| Session/mentor | `lib/learning-loop/session.ts`, `GET /api/player/session` | `LearningInsight`, `PlayerActivity`, `LearningSkill`, `PlayerCTA` | rule-based `generateDailyInsights()` | Insight harian, action, agregat hari ini | YELLOW |
| CTA | `lib/learning-loop/next-action.ts`, `GET /api/player/next-action` | `PlayerCTA`, `UserUnitProgress`, `LearningSkill` | `refreshNextAction()` | Satu aksi berikutnya | YELLOW; activity-level, bukan question-level |
| Recommendations | `lib/learning-loop/recommend.ts` | `LearningRecommendation`, `LearningSkill` | `generateRecommendations()` | Maksimal 3 rekomendasi skill/variasi | YELLOW; tidak dikonsumsi Student Home dan tidak memilih soal |
| Journey | `lib/learning-loop/journey.ts`, `GET /api/player/journey` | `LearningJourney` | `recordActivity()`/`addJourneyEntry()` | Timeline harian WIB | GREEN untuk timeline |
| Jalur Cerdas | `app/api/jalur-cerdas/[unitId]/` | `LearningUnit.content`, `UserUnitProgress` | JSON questions dalam unit | Lesson fixed per unit, completion, XP/koin | YELLOW; tidak ada question attempts |
| UKBI/TKA | `app/api/kompetensi/[paketId]/` | `UKBIQuestion`, `TKAQuestion`, `TestSession`, `TestAnswer`, `ProgresKompetensi` | Snapshot server | Certified simulation, scoring, anti-leakage | GREEN untuk assessment isolation; tidak adaptive |
| Latihan guru | `app/api/murid/quiz/[id]` | `Quiz`, `QuizQuestion`, `QuizSubmission`, `QuizAnswer`, `Soal` | Assignment teacher | Kuis fixed/assigned | YELLOW; tidak learner-aware |
| Game question | `lib/game/harvest.ts`, `lib/game-questions/sampler.ts` | `LearningUnit.content`, static bank, `GameQuestion` | Game-specific pool | Random/ramp/quality | YELLOW; production callers tidak memakai seluruh sampler |
| Gamification | `lib/award-xp.ts`, `lib/coins.ts` | `XPTransaction`, `XpLedger`, `PlayerProfile`, coin ledgers | `awardXp()` | XP, rank, level, streak, koin | GREEN sebagai reward engine |
| Premium | `lib/premium-economy/` | `Subscription`, `Entitlement`, `PremiumUsage`, User flags | `resolvePlan()`/matrix | FREE/PRO/FOUNDER, simulation usage | GREEN sebagai entitlement; belum adaptive |
| Student Home | `app/(dashboard)/murid/beranda/page.tsx` | melalui API komponen | `/api/player/session` + profile | My Day/CTA/progress/motivation | GREEN untuk Step 2B; belum question adaptive |

# Activity → Skill

## Jalur Cerdas

Actual path:

```text
Lesson client answers question
  → POST /api/jalur-cerdas/[unitId]/submit
  → server checks questionId + answer against LearningUnit.content
  → returns correct/explanation
  → client calculates/submits score to PATCH /progress
  → PATCH accepts score >= 70 as completed
  → awardXp()
  → UserUnitProgress upsert
  → recordActivity({ skill: detectUnitSkill(unit.title), skillDelta: 8 })
  → LearningSkill XP +8, level recalculated
  → generateRecommendations()
  → refreshNextAction()
  → PlayerCTA
```

Important limits:

- `submit` validates an answer but does not persist a question-attempt row.
- `UserUnitProgress` stores one aggregate score per user/unit, not every answer.
- `PATCH /progress` does not recompute the score server-side from the submitted answers. The server only applies the threshold to the received score.
- Every first completed unit gives `skillDelta: 8`, regardless of the number of correct answers, question difficulty, or score above 70.
- `detectUnitSkill()` is title keyword matching with a `READING` default. It is not question-level skill tagging.
- A unit is not checked for `LearningLevel.type === "JALUR"` in this route before awarding progress/rewards.

## Student Karya

`POST /api/siswa/karya` creates the work, then server code calls:

```text
Karya created
  → type PUISI/CERPEN/PANTUN ? skillDelta 12 : 8
  → recordActivity(skill = WRITING)
  → LearningSkill WRITING XP increases
```

This is a legitimate activity signal but not an evaluated writing-quality signal.

## UKBI/TKA

`POST /api/kompetensi/[paketId]/submit`:

- scores from server-side snapshot `correctAnswer`;
- writes `TestAnswer`, `ProgresKompetensi`, and `answerDetails`;
- awards XP through `awardXp(..., "KOMPETENSI", ...)`;
- does **not** call `recordActivity()` or update `LearningSkill`.

Thus certified assessment results are stored, but not connected to adaptive skill state.

## Quiz/Game

- `QuizAnswer` stores answer correctness per submission, but no Learning Loop skill update occurs in the student quiz route.
- `GameResult`/`GameSession` store aggregate correct/wrong/score/streak, not question IDs or per-question skill evidence.
- Game solo routes are client-graded for question display and send only aggregate `correct`/`total` to reward endpoints.

## Direct Activity API Risk

`POST /api/learning-loop/activity` authenticates the user and validates enum names, but accepts these learning facts from the request body:

- `skill`
- `skillDelta`
- `xp`
- `coin`
- `reference`
- arbitrary `meta`

There is no server verification that the activity happened, no maximum `skillDelta`, no rate limit, no idempotency constraint on `reference`, and no feature-owned event type enforcement. A student can create arbitrary positive skill evidence and change which skill appears weakest. This is a **P0 adaptive data-integrity blocker**.

## Skill State Properties

`LearningSkill` is per user and per skill (`@@unique([userId, skill])`). `skillLevelFromXp()` is:

```text
level = floor(sqrt(xp / 10) + 1), clamped 1..100
```

Current behavior:

- historical: only current cumulative XP remains in `LearningSkill`;
- time-aware: no;
- recent performance: no;
- decay: no;
- sample size/confidence: no;
- negative evidence: `recordActivity()` only updates skill when `skillDelta > 0`;
- answer correctness: not part of `LearningSkill`.

# Skill → Recommendation

## `refreshNextAction()`

Priority is:

1. `UserUnitProgress` incomplete within the last 30 days → `Lanjutkan Belajar`.
2. Otherwise `getSkillProfile()` weakest current row → `SKILL_ACTION_MAP`.
3. No skill rows → static `Bagikan Karyamu`.

The weakest skill is selected by cumulative `level`, then cumulative `xp`. It does not inspect question accuracy, sample size, difficulty, recent trend, or mastery.

## `generateRecommendations()`

It creates up to three rows from the two weakest skill rows plus a variety action, with a seven-day TTL. `getActiveRecommendations()` has no production caller found outside the module; Student Home uses `GET /api/player/session`, which reads `PlayerCTA`, not `LearningRecommendation`.

## Answer to the Critical Question

Current recommendation selects a **generic activity mapped from a weak cumulative skill**, not an adaptive practice question set. Examples:

- weak READING → `/arena/jalur-cerdas`;
- weak WRITING → `/arena/tulis`;
- weak VOCABULARY → `/arena/game`.

The recommendation proves only that the current Learning Loop state ranked a skill low. It does not prove that the next activity contains questions targeting that skill.

# Question Selection

## Jalur Cerdas

- `GET /api/jalur-cerdas/[unitId]` returns the unit's complete sanitized `content.questions` array.
- No learner-specific filter, difficulty filter, unseen filter, or performance filter exists.
- Unit order and question order are content-defined.
- Retry/revisit can show the same questions; this is currently acceptable repetition for lesson review, not adaptive unseen selection.

## UKBI/TKA

`app/api/kompetensi/[paketId]/route.ts` selects by package section:

- UKBI: `seksi`, optional `tingkat`, `isActive`, listening `audioUrl IS NOT NULL`;
- TKA: `kompetensi`, `subKompetensi`, optional `tingkat`, `isActive`;
- package `questionIds` can select explicitly;
- blueprint `section.count` controls sample size;
- all eligible rows are loaded, then sampled and shuffled server-side;
- options are shuffled while option IDs remain stable;
- snapshot stores server answer keys and answer-free `clientSections`.

This is package/section selection, not learner-skill selection.

## UKBI/TKA Anti-Repeat

`session-pool.ts` has `parseRecentUsedBatches()` and tiered `excludeRecentForSection()`:

1. exclude newest used batch;
2. exclude all recent batches if the first result is too small;
3. fallback to full eligible pool so the test is never undersized.

However, `TestSession` has `@@unique([userId, paketId])`. Retry resets the same session and clears/rebuilds its snapshot. Therefore the query intended to read the last three completed `TestSession` rows can return at most one row per user/package. `ProgresKompetensi.answerDetails` contains historical attempt snapshots, but the selector does not use them.

## Teacher Quiz

`GET /api/murid/quiz/[id]` returns the assignment's fixed `QuizQuestion` list in `orderIndex`. The API exposes `shuffleQuestions` and `shuffleOptions` flags, but the shown student take page does not apply a shuffle, and the API does not perform server-side shuffling. The quiz is assignment-driven, not adaptive.

## Game

- `harvestJalurQuestions()` loads all active JALUR unit content plus curated bank, quality-gates and deduplicates by question text.
- `pickRampedQuestions()` splits by unit-level `lvl` bands and randomly picks easy/medium/hard ramp segments.
- Production `/api/game/menara` and `/api/game/tantang` call `pickRampedQuestions(clean, count)` without `recentIds` and without a seed.
- `lib/game-questions/sampler.ts` supports seeded sampling, recent IDs, topic spread, and difficulty targets, but no production caller was found outside tests.
- `GameResult` does not persist question IDs, so future game selection cannot reliably know which questions a student answered.

# Unseen Questions

| Flow | Unseen guarantee | Actual behavior |
|---|---|---|
| Jalur Cerdas | NO | fixed unit content; no question attempt table |
| UKBI/TKA in-progress refresh | YES for same snapshot | immutable `clientSections` during active session |
| UKBI/TKA across attempts | PARTIAL | anti-repeat uses at most one `TestSession` row under unique user/package; fallback allows repeats when pool is small |
| Teacher quiz | NO | same assignment question set; no question-history selector |
| Game solo/duel | NO | recent IDs are not passed and GameResult lacks question IDs |

Acceptable repetition today: revisiting a lesson or fallback when a certified section pool is smaller than its blueprint. Unintended repetition: repeated Jalur/game/teacher-quiz questions presented as if they were new practice without a per-question history check.

# Difficulty

Existing metadata exists at several incompatible layers:

- `UKBIQuestion.difficulty` and `TKAQuestion.difficulty`: Prisma enum `EASY | MEDIUM | HARD | VERY_HARD`;
- `Soal.difficulty`: free-form String, default `MEDIUM`;
- `GameQuestion.difficulty`: `EASY | MEDIUM | HARD` in the canonical game type;
- Jalur questions: question JSON has no canonical difficulty; harvest maps unit level to `lvl`;
- source JSON product banks: numeric difficulty values `1..5` in the current static scan;
- `master` bank: numeric difficulty plus `levelBerpikir` and `isHOTS`;
- no CEFR field found in the product JSON scan or Prisma question models.

Difficulty is metadata, not calibrated learner ability. No code maps current student performance to the next difficulty. No item calibration, success-rate calibration, or difficulty confidence is stored.

# Cold Start

For a new student:

- no `LearningSkill` rows exist;
- `getNextAction()` returns null until `PlayerCTA` is created;
- Student Home has a safe frontend fallback to `/arena/jalur-cerdas`;
- `refreshNextAction()` with no skills writes `Bagikan Karyamu`, which is not the safest first adaptive practice action;
- `generateRecommendations()` with an empty profile creates default Reading/Writing/Vocabulary recommendations, but those recommendations are not the Student Home source.

Jalur Cerdas is the safest baseline path because it is structured, available without an adaptive selector, and already has 72-level/unit progression according to the repository's recorded validation status. The current system does not use it to establish a measured baseline.

# Mastery

No mastery model exists. There are no thresholds for stable success, no repeated-success requirement, no difficulty-adjusted mastery, no skill confidence, and no mastered timestamp. `UserUnitProgress.completed` at score >=70 is unit completion, not mastery of a skill. UKBI/TKA passing grades are assessment outcomes, not `LearningSkill` mastery.

# Recovery

## Poor Jalur Result

- score below 70 stores `UserUnitProgress.completed=false` and score;
- no question-level result history is written;
- no skill penalty or evidence update occurs;
- no difficulty reduction or remediation selector runs;
- CTA can remain stale because `refreshNextAction()` is not called on the incomplete branch.

## Poor UKBI/TKA/Quiz Result

Scores and answers are stored in their respective assessment models, but no Learning Loop skill update or remediation recommendation is generated.

Current recovery is therefore **NO** for adaptive practice.

# Improvement

## High Jalur Result

Any first completion at or above 70 receives the same fixed skill gain `8`, regardless of 70 versus 100, item difficulty, or number correct. It may unlock the next unit and refresh the CTA, but it does not increase question difficulty based on ability.

## UKBI/TKA/Quiz/Game Improvement

Scores can be stored and XP can be awarded, but no unified skill evidence is created and no adaptive next question is selected. There is no trend comparison across difficulty or attempt windows.

# Premium

## Current Entitlements

Canonical `lib/premium-economy/` currently provides:

- FREE simulation limit: 3/month;
- PRO simulation limit: 10/month;
- FOUNDER simulation: unlimited;
- profile/cosmetics/advanced-stats/streak-freeze entitlements;
- AI limits in this matrix are unlimited because existing AI uses a separate credit ledger.

`PremiumUsage` is enforced for simulation in `app/api/kompetensi/[paketId]/route.ts`. `resolvePlan()` is server-authoritative.

## What Premium Can Truly Promise Today

- more simulation allowance;
- premium profile/cosmetics/advanced stats where those existing surfaces consume the entitlement;
- existing paid AI credit behavior in its own gateway.

## What Premium Cannot Promise Today

- adaptive question selection;
- skill-targeted practice;
- difficulty that responds to ability;
- mastery detection;
- evidence-backed personalized practice plans.

Do not market those adaptive claims before the data foundation exists.

# UKBI/TKA Boundary

The assessment boundary is comparatively strong and must remain separate:

- question pools use `UKBIQuestion`/`TKAQuestion`;
- answer-free client selection is separate from server snapshot answer keys;
- scoring uses the server snapshot and writes `TestAnswer`/`ProgresKompetensi`;
- Premium simulation usage is consumed in the attempt-start transaction;
- constructed response grading uses its own AI/manual review path.

Adaptive Practice may read finalized assessment evidence later, but must not:

- rewrite `TestSession.questionSnapshot`;
- alter `correctAnswer` or assessment scoring;
- change UKBI/TKA package blueprints;
- consume an assessment attempt as an adaptive practice attempt;
- expose answer keys or constructed-response rubrics.

Recommended boundary: one-way read from finalized `ProgresKompetensi`/`TestAnswer` into a separate skill-evidence projection.

# Gamification

Current reward paths:

| Activity | XP/koin/activity behavior |
|---|---|
| Jalur completion | `awardXp("JALUR_CERDAS", ..., unitId)`; User coins; `recordActivity`; quest/streak |
| UKBI/TKA | `awardXp("KOMPETENSI", ...)`; Progres/TestAnswer; no PlayerActivity/skill update |
| Teacher quiz | QuizSubmission/QuizAnswer; no unified skill update found |
| Game | `awardXp()` and GameResult/GameSession aggregates; no question-level PlayerActivity found |
| Karya | coins/streak + `recordActivity(skill=WRITING)` |

Adaptive Practice should eventually reuse `awardXp()` with a unique reference and use `recordActivity()` only with server-derived evidence. It must not create a second XP, coin, streak, or leaderboard pipeline.

# Performance

## Current Costs

- `getSkillProfile()` reads at most the seven skill rows for a user; low cost.
- `getRecentActivity()` is indexed by `(userId, createdAt)` and capped at 200.
- `generateDailyInsights()` reads all same-day activity rows without an explicit `take`; a high-volume user can make this grow during a day.
- UKBI/TKA loads full eligible section pools before sampling; pool cache reduces repeat work, but cache misses can be expensive.
- UKBI/TKA recent-session query takes up to 3 rows but schema uniqueness means at most one per user/package.
- `harvestJalurQuestions()` loads all active JALUR unit content and curated bank on a game request; it is not a DB-backed learner-specific selector or a durable pool cache.
- `PlayerActivity` has useful user/time indexes; question attempt history is fragmented and cannot be queried through one indexed table.

## Scale Assessment

| Scale | Assessment |
|---|---|
| 100 students | Existing routes can operate; fixed/pool selection is acceptable with cache |
| 1,000 students | Likely workable, but cache misses and session pool full reads need monitoring |
| 10,000 students | Risk: pool cache stampede, full pool reads, and fragmented attempt history |
| 100,000 students | Not ready: needs precomputed candidate pools, indexed evidence tables, bounded aggregation, and load testing |

# Data Quality

Static repository scan (not production DB):

- `data/question-bank`: 101 JSON files, 3,034 records including `master` sources;
- product-specific non-master JSON: 51 files, 1,534 records;
- product-specific records have `tags`, `band`, `track`, `section`, `difficulty`, and `type`;
- product-specific records with explicit `skill`: **0/1,534**;
- product-specific records with CEFR: **0/1,534**;
- product-specific difficulty values are numeric `1..5`, while Prisma UKBI/TKA uses a named enum;
- `kompetensi` exists in master/teacher-style data but is not a universal skill taxonomy;
- `Soal` has `topik`, `kompetensi`, `indikator`, `levelBerpikir`, `estimasiWaktu`, and free-form difficulty, but no canonical skill.

The repository status records a deduplicated Jalur bank of 720 questions across 72 units, but the validator reads the database. Production counts are not asserted here because the current environment has masked database URLs.

Metadata gaps blocking quality adaptive selection:

1. no canonical skill tag across question sources;
2. no normalized difficulty scale;
3. no CEFR or equivalent ability scale;
4. no item discrimination/calibration;
5. no consistent question type/outcome schema across Jalur, Quiz, UKBI/TKA, and Game;
6. no durable per-question attempt evidence for all learning flows.

# Security

## Existing Strengths

- Jalur GET strips `jawaban` from client payload.
- Jalur submit validates answer against server content.
- UKBI/TKA client pools omit `correctAnswer`; snapshots keep keys server-side.
- Quiz student API uses `sanitizeSoalForStudent()`.
- Player APIs derive user ID from authenticated session, not request body.
- Premium status uses canonical server-side `resolvePlan()`.

## Adaptive-Relevant Risks

1. `POST /api/learning-loop/activity` allows authenticated clients to submit arbitrary skill evidence (`skillDelta`, XP, coin, meta) without proof of the underlying activity. This can poison learner state and recommendations.
2. Jalur progress accepts a client-provided score and does not verify that the unit is a JALUR unit before awarding completion/reward.
3. Game solo sends aggregate result data to the server and does not persist question-level evidence; this is safe for capped reward but unusable as trusted adaptive evidence.
4. No adaptive endpoint exists yet, so there is no current parameter-manipulation attack against a selector; future selectors must derive weak skill/difficulty server-side and ignore client claims.

# Product Experience

| Question | Answer | Evidence |
|---|---|---|
| 1. Can BC say what the student should practice? | PARTIAL | `PlayerCTA` chooses an activity from incomplete unit/weak cumulative skill, not a practice set |
| 2. Can BC explain why? | PARTIAL | rule-based description/mentor says weakest skill, but no question evidence or confidence |
| 3. Can BC select an appropriate question set? | NO | selectors are unit/package/assignment/game-specific, not learner-aware |
| 4. Can BC avoid unnecessary repetition? | PARTIAL | UKBI/TKA has snapshot and limited anti-repeat; Jalur, Quiz, Game lack universal guarantee |
| 5. Can BC adapt difficulty? | NO | difficulty metadata exists, but no ability-to-difficulty policy |
| 6. Can BC detect improvement? | PARTIAL | cumulative skill XP/level and assessment scores exist; no normalized trend/evidence model |
| 7. Can BC detect mastery? | NO | no mastery threshold/stability/confidence |
| 8. Can BC recover from poor performance? | NO | no remediation selector, lower difficulty, or skill-specific recovery path |
| 9. Can BC personalize Premium? | NO | Premium changes quota/entitlements, not adaptive practice |
| 10. Can BC prove a recommendation is data-based? | PARTIAL | CTA metadata says `source: LEARNING_LOOP`, but no stored evidence IDs or decision explanation |

# Target Architecture

Minimum Adaptive Practice v1 should reuse existing systems and add only missing evidence/orchestration:

```text
Server-verified Activity / Assessment Result
          ↓
Question-level Skill Evidence
          ↓
Learner Skill State (reuse LearningSkill, add confidence/recency or projection)
          ↓
Practice Decision (weak skill + sample confidence + target difficulty)
          ↓
Question Selector (reuse session-pool/sampler, add server filters)
          ↓
Practice Session Snapshot
          ↓
Server-verified Answer/Result
          ↓
recordActivity + awardXp + refreshNextAction
```

Missing components only:

1. **Trusted evidence ledger**: a durable, server-created record for user/question/skill/difficulty/answer/correctness/time. It can be a new additive practice-response model or a carefully extended existing attempt model; do not overload `PlayerActivity` with unverified client facts.
2. **Practice session snapshot**: immutable question IDs and server answer keys, isolated from UKBI/TKA certification sessions.
3. **Server selector**: filters by skill, difficulty, unseen IDs, and sufficient pool; weak-skill and difficulty parameters must be derived server-side.
4. **Learner-state policy**: sample-size minimum, recent window, confidence, recovery, improvement, and mastery rules.
5. **Recommendation evidence**: store the evidence/decision reason consumed by `PlayerCTA` so the UI can prove why the practice was selected.

Existing `LearningSkill`, `PlayerActivity`, `PlayerCTA`, `LearningRecommendation`, `session-pool.ts`, `randomization.ts`, and `game-questions/sampler.ts` should be reused rather than duplicated.

# Premium Strategy

Smallest meaningful capability: **Personalized Practice**.

| | FREE | PREMIUM |
|---|---|---|
| Guidance | One meaningful baseline recommendation and limited daily practice | More targeted sessions based on verified weak-skill evidence |
| Question selection | Existing Jalur/standard practice | Wider unseen pool, more skill-targeted sessions, deeper trend view |
| Progress | Basic skill level and recent result | Evidence-backed skill trend, confidence, mastery/recovery explanation |
| Fairness | Core learning remains useful | Premium adds depth/volume, not the right to learn |

This is a future product recommendation, not a current promise. Current Premium Economy does not contain an adaptive-practice entitlement and must not be advertised as providing it yet.

# Gap Matrix

| Capability | Current | Production Ready | Gap | Priority | Existing Component | Recommended Action |
|---|---|---|---|---|---|---|
| Server-trusted skill evidence | activity API accepts client delta | NO | untrusted input can poison skill state | P0 | `recordActivity`, activity route | restrict feature-owned server events; add validation/rate/idempotency |
| Question-level attempts | fragmented TestAnswer/QuizAnswer; none Jalur/Game | NO | no universal evidence ledger | P0 | TestAnswer, QuizAnswer, UserUnitProgress | add additive practice evidence/session model |
| Learner-aware selector | none | NO | no cross-source skill/difficulty/unseen selector | P0 | session-pool, game sampler | add server selector using existing samplers |
| Jalur score integrity | client score threshold | NO | completion evidence can be overstated | P0 | Jalur progress route | derive completion score server-side in future hardening |
| Skill aggregation | cumulative XP level | PARTIAL | no accuracy/recency/sample confidence | P1 | `LearningSkill`, `skillLevelFromXp` | extend state/projection after evidence exists |
| Skill taxonomy | 7 LearningSkill types | PARTIAL | question banks have no universal skill tags | P1 | `SKILL_LABELS`, `detectUnitSkill` | create reviewed topic-to-skill mapping |
| Difficulty normalization | multiple scales | PARTIAL | no canonical calibration/ability mapping | P1 | Difficulty enum, game sampler | normalize metadata and define policy |
| Unseen guarantee | UKBI partial only | PARTIAL | Jalur/Quiz/Game lack history guarantee | P1 | TestSession snapshot, session-pool | persist question IDs and query history |
| Mastery | absent | NO | no stability/difficulty-aware threshold | P1 | none | define after evidence sample policy |
| Recovery | fixed completion threshold | NO | no remediation/lower difficulty loop | P1 | next-action only | add result-to-remediation policy |
| Improvement detection | cumulative XP/result rows | PARTIAL | no normalized trend | P1 | PlayerActivity/ProgresKompetensi | project recent evidence windows |
| Premium adaptive value | quota/entitlements only | NO | no adaptive entitlement/experience | P2 | premium-economy | add one entitlement only after v1 proves value |
| Large-scale selection | cache + full pool reads | YELLOW | stampede/full scans at scale | P2 | Redis pool cache, indexes | benchmark and precompute pools |

# Recommended Implementation Sequence

## P0 — Data Integrity Before Adaptive UX

1. Lock down or replace client-controlled `POST /api/learning-loop/activity` for skill/XP/coin evidence.
2. Define one trusted, server-created question evidence contract.
3. Add immutable practice-session/question snapshots for non-certified adaptive practice.
4. Ensure Jalur completion evidence is server-derived and limited to JALUR units.
5. Write leakage/ownership/idempotency tests before exposing an adaptive endpoint.

## P1 — Adaptive Practice v1

1. Add reviewed question-to-skill mapping for the first supported pool only.
2. Normalize difficulty and define sample-size/confidence policy.
3. Build selector from weakest sufficiently evidenced skill → target difficulty → unseen IDs → safe fallback.
4. Add result-based skill update, recovery, improvement, and mastery states.
5. Connect decision evidence to existing `PlayerCTA`/session so the UI can explain "why".
6. Read finalized UKBI/TKA evidence one-way only, without mutating certification.

## P2 — Product/Scale

1. Add Premium Personalized Practice after Free baseline is measurable.
2. Add trend and mastery explanations to Student Home.
3. Benchmark 1k/10k/100k learner selection and cache behavior.
4. Add CEFR or equivalent calibrated level only if product strategy requires it.

# Final Decision

**CURRENT ADAPTIVE PRACTICE: RED**

**NOT READY — DATA FOUNDATION GAP**

The existing Learning Loop is ready to drive a recommendation surface, but it is not yet a trustworthy adaptive-practice foundation. The next step must harden evidence ownership and question-level history before building a selector or promising personalized Premium practice.
