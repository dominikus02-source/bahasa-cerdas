# PHASE 2 STEP 3H — MY DAY CONTRACT

Version: `1.0`.

## Canonical Response

`GET /api/player/adaptive-practice?mode=preview` returns a read-only My Day decision:

```ts
{
  mode: "PREVIEW" | "FALLBACK",
  actionType: "ADAPTIVE_PRACTICE" | "GENERAL_LEARNING",
  actionTitle: string,
  ctaLabel: string,
  targetSkill: string | null,
  targetSubskill: string | null,
  targetDifficulty: string | null,
  sessionSize: number | null,
  reasonCode: string,
  reasonText: string,
  estimatedMinutes: number | null,
  confidence: "NO_DATA" | "LOW" | "MEDIUM" | "HIGH",
  premiumDepth: "STANDARD",
  selectionVersion: string,
  learnerState: LearnerSkillState[],
  mentor: { insights: string[], today: ... } | null
}
```

`estimatedMinutes` is `null` until reliable timing data exists. `premiumDepth` remains `STANDARD` because Premium adaptive differentiation is not implemented yet.

## Deterministic Titles

- `NO_DATA` → `Mulai Latihan Hari Ini`;
- `WEAK_SKILL` → `Perkuat [subskill/skill]`;
- `PROGRESSION` → `Lanjutkan Perkembanganmu`;
- `PRACTICE_GAP` → `Latihan Lagi`;
- fallback → `Mulai Latihan Hari Ini`.

Reason text comes from the server selector and must correspond to the reason code. The client does not generate recommendation copy.

## Start Contract

`POST /api/player/adaptive-practice` with `{ action: "start", size?: 5|10|15 }` starts the server-owned session. Skill, difficulty, questions, and user cannot be supplied by the client.
