# PHASE 2 STEP 3E — LEARNER STATE CONTRACT

Version: `1.0`. Deterministic only; no LLM, selector, recommendation, or reward logic.

## Separation

```text
QuestionMetadata  = what the item represents
LearningEvidence  = what the student answered
Learner State     = deterministic aggregation of eligible evidence
Reward            = XP/coin/streak/leaderboard, separate
```

`LearningSkill` is not used as the evidence ledger and XP is not used as ability.

## State Fields

| Field | Definition | Calculation/source | Empty behavior |
|---|---|---|---|
| `skill` | canonical skill ID | approved `QuestionMetadata.skill` | state returns all 7 known skills |
| `label` | Indonesian display name | existing taxonomy `SKILLS` | always available |
| `attemptCount` | eligible evidence count | `COUNT(LearningEvidence)` grouped by skill | `0` |
| `correctCount` | server-verified correct evidence count | filter `isCorrect=true` | `0` |
| `accuracy` | historical correct ratio | `correctCount / attemptCount` | `null`, never 0% |
| `recentAttemptCount` | latest evidence count | latest 10 rows per skill | `0` |
| `recentCorrectCount` | correct count in latest 10 | filter recent `isCorrect=true` | `0` |
| `recentAccuracy` | recent correct ratio | recent correct / recent attempts | `null` |
| `firstPracticedAt` | oldest eligible evidence timestamp | `MIN(answeredAt)` | `null` |
| `lastPracticedAt` | newest eligible evidence timestamp | `MAX(answeredAt)` | `null` |
| `trend` | historical vs recent direction | formula below | `INSUFFICIENT_DATA` |
| `confidence` | amount of evidence, not skill quality | attempt thresholds | `NO_DATA` |
| `masteryState` | conservative provisional state | formula below | `NO_DATA`/`NOT_ENOUGH_EVIDENCE` |

`userId` is used internally from the session and is not accepted from or required in the client response.

## Sample Size

| Attempts | Confidence | Interpretation |
|---:|---|---|
| 0 | NO_DATA | no eligible approved evidence |
| 1-4 | LOW | directional signal only |
| 5-9 | MEDIUM | usable trend input only with enough historical/recent split |
| 10+ | HIGH | stronger evidence volume, still not automatic mastery |

One correct answer is `accuracy=1.0`, `confidence=LOW`, and never mastery.

## Recent Window

The engine uses the latest **10 eligible evidence rows per skill**, ordered by `answeredAt DESC, id DESC`. Historical accuracy is calculated from rows older than that recent window. Recent performance does not replace historical performance.

## Trend

Trend is only calculated when both recent and historical groups contain at least 5 attempts:

```text
difference = recentAccuracy - historicalAccuracy
difference >= +0.10 → IMPROVING
otherwise           → STABLE
```

If either sample is too small, trend is `INSUFFICIENT_DATA`.

## Confidence

Confidence answers: “How much evidence do we have?” It does not answer: “How good is the student?”

## Mastery State

This is intentionally conservative and provisional:

- 0 attempts → `NO_DATA`;
- fewer than 10 total attempts, fewer than 5 recent attempts, or insufficient trend → `NOT_ENOUGH_EVIDENCE`;
- total accuracy and recent accuracy both at least 0.80, with no declining trend → `PROFICIENT`;
- other sufficiently sampled states → `DEVELOPING`.

This is not a final mastery model and must not be used to unlock adaptive difficulty yet.

## Eligibility

Only evidence joined to `QuestionMetadata` where:

- `status = APPROVED`;
- `skill IS NOT NULL`;
- source/question identity matches;

contributes to learner state. Evidence without metadata remains valid evidence but is excluded from skill aggregation. No skill is inferred at runtime.
