# PHASE 2 STEP 3F — ADAPTIVE PRACTICE CONTRACT

Version: selection `1.0`.

## Input

The server derives:

- authenticated user from `getUser()`;
- learner state from approved evidence/metadata aggregate;
- candidate metadata from `QuestionMetadata`;
- question content from server-side `Soal`.

The client may provide only:

- `action`: `start`, `answer`, or `complete`;
- requested `size`: exactly 5, 10, or 15 for `start`;
- `sessionId`, `questionId`, and selected `answer` for an existing owned session.

The client cannot provide user ID, target skill, difficulty, question IDs for selection, answer key, or learner state.

## Output

Start returns:

- `sessionId`;
- `selectionVersion`;
- `targetSkill`;
- `targetSubskill` when available;
- `targetDifficulty`;
- `reasonCode` and `reasonText`;
- answer-free question payload.

Answer returns only `correct`, `recorded`, session ID, and question ID. It does not return the answer key.

## Reason Codes

- `NO_DATA`: no sufficient learner evidence; balanced deterministic rotation;
- `WEAK_SKILL`: sufficient state and lowest trustworthy accuracy;
- `PRACTICE_GAP`: evidence exists but skill has the oldest practice timestamp;
- `PROGRESSION`: proficient state receives a harder target.

## Fallback

If no approved eligible pool exists:

```text
Belum cukup data untuk latihan personal.
→ /arena/jalur-cerdas
```

No fake personalized questions are returned.
