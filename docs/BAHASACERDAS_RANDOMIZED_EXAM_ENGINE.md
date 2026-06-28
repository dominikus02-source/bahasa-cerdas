# BahasaCerdas Randomized Exam Engine

> **Phase:** Exam 1 — Architecture Design  
> **Status:** Draft  
> **Last Updated:** June 28, 2026  
> **Implements:** Deterministic random question selection + session snapshots

---

## 1. Design Goals

1. **Deterministic per session.** Given the same user + blueprint + retry count, the same question set appears. Refresh does not change questions.
2. **No answer-key leakage.** Participant endpoints never expose `isCorrect`, `correctAnswer`, or `explanation`.
3. **Snapshotted at start.** Once a session begins, the question list is fixed. No pool changes affect an active session.
4. **Auditable.** Every question shown to a participant is logged in `TestSessionQuestion`.
5. **Resumable.** A participant can close the browser and return to their exact position.

---

## 2. Algorithm: Seed-Based Deterministic Random

### Seed Generation

```
seed = crypto
  .createHash("sha256")
  .update(`${userId}:${blueprintId}:${retryCount}`)
  .digest("hex")
  .slice(0, 16)
```

Where `retryCount` = number of previously completed sessions by this user for this blueprint + 1.

### Seeded Shuffle (Fisher-Yates)

```
function seededShuffle<T>(array: T[], seed: string): T[] {
  const rng = createSeededRng(seed);
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

### Seeded PRNG (Mulberry32)

```
function createSeededRng(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  let state = h >>> 0;
  return function (): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### Why Mulberry32?

- **Deterministic:** Same seed → same sequence every time, across all JS runtimes
- **Fast:** No external dependencies, pure integer math
- **No Web Crypto needed:** Works in Edge, Node, browser equally

---

## 3. Question Selection Flow

### Step 1: Fetch Pool

```typescript
async function fetchPool(blueprintId: string, section: string): Promise<QuestionItem[]> {
  return prisma.questionItem.findMany({
    where: {
      setId: { blueprintId, section },
      isActive: true,
    },
    include: { options: true },
  });
}
```

### Step 2: Filter by Difficulty (Adaptive-Lite)

If adaptive mode is enabled, filter to questions within ±1 difficulty of current level.

| Current Level | Included Difficulties |
|---------------|----------------------|
| Pemula | MUDAH |
| Menengah | MUDAH, SEDANG |
| Mahir | SEDANG, SULIT |
| Unggul | SULIT |

### Step 3: Select Subset

```typescript
function selectQuestions(
  pool: QuestionItem[],
  count: number,
  seed: string
): QuestionItem[] {
  const shuffled = seededShuffle(pool, seed);
  return shuffled.slice(0, count);
}
```

### Step 4: Snapshot to DB

```typescript
async function snapshotSession(
  sessionId: string,
  questions: QuestionItem[]
): Promise<void> {
  await prisma.testSessionQuestion.createMany({
    data: questions.map((q, i) => ({
      sessionId,
      questionId: q.id,
      section: q.setId.section,
      order: i,
      status: "UNANSWERED",
    })),
  });
}
```

### Step 5: Return Sanitized Questions

```typescript
function sanitize(questions: QuestionItem[]): SanitizedQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    stem: q.stem,
    type: q.type,
    options: q.options.map((o) => ({ id: o.id, label: o.label, text: o.text })),
    passage: q.passage,
    // NO isCorrect, NO correctAnswer, NO explanation
  }));
}
```

---

## 4. Option Randomization

Each question's options are also shuffled per session using a per-question seed:

```
optionSeed = crypto
  .createHash("md5")
  .update(`${sessionSeed}:${questionId}`)
  .digest("hex")
  .slice(0, 16)
```

The correct answer is tracked in `TestSessionQuestion.correctOptionId` (hidden from participant).

For `BENAR_SALAH` type, options are always ["Benar", "Salah"] in fixed order.

---

## 5. Session Lifecycle

```
                    ┌─────────────────┐
                    │  NOT_STARTED    │
                    └────────┬────────┘
                             │ POST /api/exam/session/start
                             ▼
                    ┌─────────────────┐
                    │  IN_PROGRESS    │ ◄──── RESUME
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
           ┌──────────────┐  ┌──────────────┐
           │  COMPLETED    │  │   EXPIRED    │
           └──────────────┘  └──────────────┘
```

### Start / Resume Rules

| Condition | Action |
|-----------|--------|
| No existing session | Create new, snapshot questions |
| Existing IN_PROGRESS (not expired) | Resume: return current position + saved answers |
| Existing IN_PROGRESS (expired) | Mark EXPIRED, create new session |
| Existing COMPLETED | Check `retryCount`, create new session with incremented retry |
| User starts new session while IN_PROGRESS exists | Auto-submit IN_PROGRESS (mark SUBMITTED_EARLY), create new |

### Retry Detection

```typescript
const previousSessions = await prisma.testSession.count({
  where: { userId, blueprintId, status: "COMPLETED" },
});
const retryCount = previousSessions;
const seed = generateSeed(userId, blueprintId, retryCount);
```

---

## 6. Adaptive-Lite Implementation

### Per-Section Difficulty Tracking

```typescript
interface AdaptiveState {
  section: string;
  difficulty: Difficulty;     // MUDAH | SEDANG | SULIT
  correctInBlock: number;
  totalInBlock: number;
  blockSize: number;          // 5
}
```

### On Answer Submit

```typescript
function updateDifficulty(state: AdaptiveState, isCorrect: boolean): Difficulty {
  state.totalInBlock++;
  if (isCorrect) state.correctInBlock++;

  if (state.totalInBlock < state.blockSize) {
    return state.difficulty; // Not enough data yet
  }

  const accuracy = state.correctInBlock / state.totalInBlock;

  let newDifficulty = state.difficulty;
  if (accuracy >= 0.8 && state.difficulty !== "SULIT") {
    newDifficulty = DIFFICULTY_UP[state.difficulty];
  } else if (accuracy <= 0.4 && state.difficulty !== "MUDAH") {
    newDifficulty = DIFFICULTY_DOWN[state.difficulty];
  }

  // Reset block
  state.correctInBlock = 0;
  state.totalInBlock = 0;
  return newDifficulty;
}
```

### Adaptive Question Fetch

On each section transition, the next set of questions is fetched filtered by current difficulty level. The remaining questions for the section are re-selected from the filtered pool using `sectionSeed + blockIndex`.

---

## 7. Autosave & Resume Implementation

### On Every Answer Change (Debounced 500ms)

```
PATCH /api/exam/answer
Body: { sessionQuestionId, answer, timeSpent }
Response: { ok: true }
```

### Resume Flow

```
GET /api/exam/session/resume?sessionId=xxx
→ {
    sessionId,
    status: "IN_PROGRESS",
    currentSection: 1,
    currentQuestion: 23,
    answers: [...],          // { questionId, selectedOption, status }
    timeRemaining: 900,      // seconds
    questions: [...]          // Sanitized questions for remaining unanswered
  }
```

### Edge Case: Browser Close

- Last saved answer is on server (autosave debounce guarantees at most 500ms loss)
- On resume, the participant returns to the last saved position
- No special "heartbeat" needed — the expiration check on submit is sufficient

---

## 8. Timer Implementation

### Client Timer (Display Only)

- Countdown from `duration * 60` seconds
- Emits warning events at configurable thresholds (default: 5 min, 1 min)
- On reaching 0: automatically calls submit

### Server Timer (Authoritative)

- `TestSession.expiresAt` = `startedAt + duration * 60 seconds`
- On every submit/answer call, verify `now < expiresAt`
- If expired: mark session EXPIRED, reject further answers, return expired error
- Auto-expiry cron: `scripts/expire-stale-sessions.ts` (runs every 5 min via `cron` or Vercel Cron Jobs)

### Time Spent Tracking

- Client sends cumulative `timeSpent` (seconds) per question on each answer
- Server aggregates: `TestSession.timeSpent` = sum of all `TestSessionQuestion.timeSpent`
- Used for analytics and average-time-per-question reports

---

## 9. Result Calculation

### After Submit

```typescript
async function calculateResult(sessionId: string): Promise<TestResult> {
  const session = await prisma.testSession.findUnique({
    where: { id: sessionId },
    include: {
      questions: {
        include: {
          question: { include: { options: true } },
          response: true,
        },
      },
    },
  });

  const sectionResults: Record<string, { correct: number; total: number }> = {};

  for (const sq of session.questions) {
    const section = sq.question.setId.section;
    if (!sectionResults[section]) {
      sectionResults[section] = { correct: 0, total: 0 };
    }
    sectionResults[section].total++;

    const response = sq.response;
    if (response && sq.question.type === "PILIHAN_GANDA") {
      const correctOption = sq.question.options.find((o) => o.isCorrect);
      if (correctOption && response.answer === correctOption.id) {
        sectionResults[section].correct++;
      }
    }
    // Essay/Esai: score stored in response.score (set by grader)
  }

  const totalCorrect = Object.values(sectionResults).reduce(
    (sum, s) => sum + s.correct, 0
  );
  const totalQuestions = Object.values(sectionResults).reduce(
    (sum, s) => sum + s.total, 0
  );

  const percentage = Math.round((totalCorrect / totalQuestions) * 100);
  const predikat = computePredikat(percentage);
  const sectionScores = Object.entries(sectionResults).map(([section, data]) => ({
    section,
    correct: data.correct,
    total: data.total,
    percentage: Math.round((data.correct / data.total) * 100),
  }));

  const result = await prisma.testResult.create({
    data: {
      sessionId,
      userId: session.userId,
      totalScore: totalCorrect,
      maxScore: totalQuestions,
      percentage,
      predikat,
      sectionScores,
      completedAt: new Date(),
    },
  });

  // Mark session completed
  await prisma.testSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED", finishedAt: new Date() },
  });

  return result;
}
```

### Predikat Mapping

#### UKBI
```typescript
const UKBI_PREDIKAT = [
  { min: 725, predikat: "Istimewa" },
  { min: 641, predikat: "Sangat Unggul" },
  { min: 577, predikat: "Unggul" },
  { min: 481, predikat: "Madya" },
  { min: 401, predikat: "Semenjana" },
  { min: 321, predikat: "Marginal" },
  { min: 0,   predikat: "Terbatas" },
];

function ukbiPredikat(rawScore: number): string {
  for (const p of UKBI_PREDIKAT) {
    if (rawScore >= p.min) return p.predikat;
  }
  return "Terbatas";
}
```

#### TKA
```typescript
function tkaGrade(percentage: number): string {
  if (percentage >= 85) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 55) return "C";
  return "D";
}
```

---

## 10. Edge Cases

| Case | Handling |
|------|----------|
| **Refresh during test** | Resume endpoint returns to exact position. No data loss. |
| **Browser crash** | Last autosaved answer persisted. Max 500ms loss. |
| **Timer expires while answering** | Auto-submit on client side; server also verifies expiry on submit. |
| **Concurrent sessions (same product)** | Previous IN_PROGRESS session auto-submitted as `SUBMITTED_EARLY`. |
| **Question pool changes mid-session** | Cannot happen — pool is snapshotted at start in `TestSessionQuestion`. |
| **User answers out of order** | Not allowed — client forces sequential order within section. |
| **Network failure on submit** | Client retries 3x with exponential backoff. Final answer stored locally until confirmed. |
| **Audio playback fails (UKBI)** | Device check screen before test begins. Fallback: show transcript. |
| **Zero questions match filter** | Return error: "Not enough questions for [section]. Contact admin." |
| **Same question twice in one session** | Impossible: snapshot deduplicates by questionId. |
| **Retake loses seed challenge** | Seed includes `retryCount`. First retake → seed v2 → different questions. Same retake count → same questions (deterministic). |

---

## 11. Security Considerations

| Concern | Mitigation |
|---------|------------|
| **Answer key in API response** | Sanitization layer strips `isCorrect`, `correctAnswer`, `explanation` from all participant endpoints. Automated test confirms. |
| **Brute-force answer guessing** | Rate limit: max 1 answer/second per session. Server validates answer is one of the options. |
| **Session ID guessing** | cuid2 — collision probability negligible. |
| **Timer manipulation** | Client timer is display-only. Server verifies `expiresAt` on every submit. |
| **Direct DB access** | Service role key never exposed to client. All queries go through API with `requireAuth()`. |
| **Cross-user session access** | Every endpoint validates `session.userId === currentUser.id`. |

---

## 12. Implementation Files

| File | Purpose |
|------|---------|
| `lib/exam/random.ts` | `seededShuffle`, `createSeededRng`, `generateSeed` |
| `lib/exam/selector.ts` | `fetchPool`, `selectQuestions`, `sanitize` |
| `lib/exam/session-snapshot.ts` | `snapshotSession`, `resumeSession` |
| `lib/exam/adaptive.ts` | `AdaptiveState`, `updateDifficulty` |
| `lib/exam/timer.ts` | `verifyTimer`, `computeExpiresAt` |
| `lib/exam/scoring.ts` | `calculateResult`, `computePredikat`, `tkaGrade` |
| `app/api/exam/session/start/route.ts` | Start new session |
| `app/api/exam/session/resume/route.ts` | Resume existing |
| `app/api/exam/session/submit/route.ts` | Final submit |
| `app/api/exam/question/route.ts` | Get single question |
| `app/api/exam/answer/route.ts` | Submit answer |
| `app/api/exam/result/route.ts` | Get result |
| `scripts/expire-stale-sessions.ts` | Cron: expire timed-out sessions |

---

*This document is architecture-only. Implementation begins in Phase Exam 3 (Random Selector Engine).*
