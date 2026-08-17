# BC ASSESSMENT ENGINE 2.0 — AUDIT & IMPLEMENTATION REPORT

## Baseline

```
commit: 5762cb1
previous: Kuis TTS 1.1
```

## Architecture Audit

### Current Data Flow (BEFORE)

```
/murid/beranda
  └→ HomeDataProvider
       ├→ /api/player/adaptive-practice?mode=preview (GET)
       └→ /api/player/diagnostic?mode=preview (GET)
  └→ ContinueLearningCard
       ├→ STATE A: NO_EVIDENCE → DIAGNOSTIC → "Kenali Kemampuanmu"
       ├→ STATE B: diagnosticCompleted → ADAPTIVE → "Profil Belajarmu Sudah Siap"
       ├→ STATE C: target skill → ADAPTIVE → "Latihan Untukmu"
       └→ STATE D: CONTINUE_EVIDENCE → ADAPTIVE → "BC Masih Mengenali" ← BUG
```

### Problem

Murid BARU yang BELUM PERNAH assessment tapi punya sedikit evidence latihan:
- adaptive preview returns GENERAL_LEARNING
- personalization returns CONTINUE_EVIDENCE → title "BC Masih Mengenali"
- Murid melihat "BC Masih Mengenali" padahal belum pernah tes awal
- Tidak ada CTA ke diagnostic → murid terjebak di adaptive practice

### Root Cause

Tidak ada **canonical assessment state**. State di-infer dari combination of `hasEvidence` + `diagnosticCompleted` + `personalization.actionType`. Tidak ada explicit `NO_BASELINE` state untuk murid yang punya evidence tapi belum assessment.

## Architecture (AFTER)

### New Data Flow

```
/murid/beranda
  └→ HomeDataProvider
       ├→ /api/player/adaptive-practice?mode=preview (GET)
       └→ /api/player/diagnostic?mode=preview (GET)
            └→ detectAssessmentState(userId) → 5 canonical states
  └→ ContinueLearningCard
       ├→ NO_BASELINE → DIAGNOSTIC → "Kenali Kemampuanmu" (Mulai Tes Awal)
       ├→ BASELINE_IN_PROGRESS → DIAGNOSTIC → "Lanjutkan Tes Awal"
       ├→ BASELINE_COMPLETE_LOW → DIAGNOSTIC → "BC Sedang Mengenalimu" (Lanjutkan Latihan)
       ├→ PROFILE_READY → ADAPTIVE → "Latihan Untukmu" (Mulai Latihan)
       └→ PROFILE_CONFIDENT → ADAPTIVE → "Latihan Untukmu" (Mulai Latihan)
```

## Files Changed

| File | Change |
|---|---|
| `lib/diagnostic/assessment-state.ts` | **NEW** — 5 canonical assessment states, detectAssessmentState(), ASSESSMENT_STATE_LABELS |
| `app/api/player/diagnostic/route.ts` | previewDiagnostic() rewritten to use assessment states, returns assessmentState |
| `components/student-home/ContinueLearningCard.tsx` | 5 state handlers, "BC Masih Mengenali" removed, server-derived CTA |
| `components/student-home/home-data.tsx` | MyDayResponse.assessmentState field added |
| `lib/diagnostic/personalization.ts` | "BC Masih Mengenali" → "BC Sedang Mengenalimu" |
| `scripts/test-assessment-engine.ts` | **NEW** — 36 assertions for assessment engine 2.0 |
| `scripts/test-arena-web.ts` | Fixed unused `allowed` set in API diff check |
| `scripts/test-diagnostic-personalization.ts` | Updated assertions for new copy |
| `package.json` | test:assessment-engine script added |

## Assessment States

| State | Trigger | actionType | Title | CTA |
|---|---|---|---|---|
| NO_BASELINE | No completed diagnostic + no in-progress | DIAGNOSTIC | Kenali Kemampuanmu | Mulai Tes Awal |
| BASELINE_IN_PROGRESS | In-progress diagnostic session exists | DIAGNOSTIC | Lanjutkan Tes Awal | Lanjutkan Tes |
| BASELINE_COMPLETE_LOW | Completed diagnostic + insufficient evidence | DIAGNOSTIC | BC Sedang Mengenalimu | Lanjutkan Latihan |
| PROFILE_READY | Sufficient evidence + reasonable confidence | ADAPTIVE_PRACTICE | Latihan Untukmu | Mulai Latihan |
| PROFILE_CONFIDENT | Strong evidence + high confidence | ADAPTIVE_PRACTICE | Latihan Untukmu | Mulai Latihan |

## Key Product Fixes

1. **"BC Masih Mengenali" removed** → "BC Sedang Mengenalimu" for BASELINE_COMPLETE_LOW
2. **NO_BASELINE always shows diagnostic** — even if student has some practice evidence
3. **BASELINE_IN_PROGRESS shows resume CTA** — student can continue their diagnostic
4. **Server-derived CTA** — card reads actionTitle/ctaLabel from server, no hardcoded copy
5. **No false personalization** — student without baseline never sees "latihan untukmu"

## Evidence Weight (Existing — Reused)

The existing learner-state calculator already implements:
- `accuracy` = correctCount / attemptCount
- `recentAccuracy` = recentCorrectCount / recentAttemptCount (last 10)
- `trend` = IMPROVING / STABLE / DECLINING / INSUFFICIENT_DATA
- `confidence` = NO_DATA / LOW / MEDIUM / HIGH (by attempt count)
- `masteryState` = NO_DATA / NOT_ENOUGH_EVIDENCE / DEVELOPING / PROFICIENT

The diagnostic profile adds:
- `category` = STRONG / DEVELOPING / WEAK / INSUFFICIENT_EVIDENCE
- `diagnosticConfidence` = INSUFFICIENT_EVIDENCE / PROVISIONAL / PROFILE_CONFIDENT

These are sufficient for the current assessment engine. No new evidence weighting needed.

## Psychometric Principle

Implemented in assessment state detection:
- `2/2 = 100%` with low confidence (few attempts) → BASELINE_COMPLETE_LOW
- `20/25 = 80%` with high confidence (many attempts) → PROFILE_READY/CONFIDENT
- `confidence` is separate from `accuracy` — high accuracy + few attempts = low overall confidence

## Coverage

Coverage concept already exists in the diagnostic profile:
- `insufficient` = skills with 0 evidence
- `developing` = skills with accuracy 60-80%
- `strong` = skills with accuracy ≥80%

The assessment state detector uses `confidentSkills` (skills with ≥5 attempts) to determine PROFILE_READY vs BASELINE_COMPLETE_LOW.

## Tests

| Test | Result |
|---|---|
| test:assessment-engine | ✅ 36/36 |
| test:arena-web | ✅ 94/94 |
| test:diagnostic-assessment | ✅ 48/48 |
| test:diagnostic-personalization | ✅ 32/32 |
| test:my-day-home | ✅ 37/37 |
| test:my-day-personalization | ✅ 25/25 |
| test:adaptive-practice | ✅ 25/25 |
| test:learner-state | ✅ 24/24 |
| TypeScript | ✅ 0 errors |
| ESLint | ✅ 0 errors |
| no-emoji | ✅ 0 new regressions (2 pre-existing) |
| git diff --check | ✅ clean |
| Protected zones | ✅ 0 diff |

## Protected Zones

- Prisma schema: 0 diff
- Gamification engine: 0 diff
- Learning loop: 0 diff
- Adaptive practice core: 0 diff
- Arena: 0 diff
- XP/coins: 0 diff
- MuridMobileNav: 0 diff

## DB

READ ONLY — no schema changes, no migrations.

## Files NOT Changed

- `lib/learner-state/calculator.ts` — reused as-is
- `lib/learning-loop/skills.ts` — reused as-is
- `lib/learning-loop/recommend.ts` — reused as-is
- `lib/learning-loop/next-action.ts` — reused as-is
- `lib/adaptive-practice/selector.ts` — reused as-is
- `lib/adaptive-practice/config.ts` — reused as-is
- Arena pages: 0 diff
- TTS: 0 diff

## Final Verdict

**PASS**

## Commit

**NOT CREATED**
