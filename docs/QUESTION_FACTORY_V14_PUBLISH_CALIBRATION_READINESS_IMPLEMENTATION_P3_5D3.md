# P3.5D-3 — V14 Publish Calibration Readiness Validator

## Overview

V14 is the FINAL deterministic gate in the Question Factory pipeline. It evaluates whether an item satisfies ALL canonical deterministic and governance conditions to proceed to the next lifecycle state. V14 is a **gate orchestrator** — it consumes outputs from V0–V13 and does NOT revalidate. If a required validator result is missing → FAIL CLOSED.

## Canonical Lifecycle

```
AUTHOR → V0–V13 → V14 → HUMAN REVIEW → CALIBRATION → PUBLISH
```

## Core Principle

- **FAIL-CLOSED**: Missing data, missing upstream findings, uncertain state → BLOCK
- **CONJUNCTIVE**: ALL 7 clauses must pass. No arithmetic override.
- **AUDITABLE**: Every decision traceable to specific findings + data points
- **ID-INDEPENDENT**: Validates publishability, not item identity
- **HUMAN-REVIEW-AWARE**: Requires explicit human approval
- **CALIBRATION-AWARE**: Tracks calibration state for purpose-specific gates
- **REGRESSION-SAFE**: Does not break existing validators

## V14 ID

- `id`: `publish-calibration-readiness`
- `stage`: 14 (after V13)
- `version`: 1.0.0

## 7-Clause Conjunctive Publish Contract

P3.3 §13.1 requires ALL of the following:

| Clause | Check | Source |
|--------|-------|--------|
| 1 | STRUCTURAL VALID — no stage-0/1/2 HARD-FAIL | V0–V6 findings |
| 2 | Every HARD-FAIL dimension score ≥ 2 | V7–V13 quality dimensions |
| 3 | Every SCORED dimension ≥ 2 | D3, D9, D10, D12 |
| 4 | D10 has explicit valid state | D10 validity |
| 5 | HUMAN REVIEW = APPROVED | Provenance + reviewState |
| 6 | Purpose-specific gates pass | Purpose gate (V7) |
| 7 | Mean ≥ 2.0 (advisory tier tagging only) | Quality scores |

**Mathematical constraint**: With 15 dimensions all ≥ 2 (required for clauses 2+3), mean is always ≥ 2.0.

## D10 Gate States

P3.3 §11.4 defines purpose-specific D10 state requirements:

| Purpose | Min State | Allowed States |
|---------|-----------|---------------|
| PRACTICE | HYPOTHESIS | HYPOTHESIS, REVIEWED, EMPIRICALLY_SUPPORTED |
| ACHIEVEMENT | HYPOTHESIS | HYPOTHESIS, REVIEWED, EMPIRICALLY_SUPPORTED |
| DIAGNOSTIC | REVIEWED | REVIEWED, EMPIRICALLY_SUPPORTED |
| ADAPTIVE_MISCONCEPTION | EMPIRICALLY_SUPPORTED | EMPIRICALLY_SUPPORTED |
| CALIBRATION | NOT_APPLICABLE | NOT_APPLICABLE, HYPOTHESIS, REVIEWED, EMPIRICALLY_SUPPORTED |

PRACTICE does NOT allow NOT_APPLICABLE.

## D10 State Ordering

```
NOT_APPLICABLE(0) → HYPOTHESIS(1) → REVIEWED(2) → EMPIRICALLY_SUPPORTED(3) → CALIBRATED(4)
```

## Two Entry Points

### 1. Pipeline Entry (item-metadata-only)

`publishCalibrationReadinessValidator.validate(item, ctx)` runs in DEFAULT_PIPELINE. Checks:
- D10 validity (clause 4)
- Human review (clause 5)
- Purpose gates (clause 6)

This is what P3.5A/V10–V13 tests encounter.

### 2. Full Entry (upstream required)

`evaluatePublishReadiness(item, upstream)` is the primary entry point. Requires `ValidationResult` from V0–V13 for full 7-clause evaluation. Used by the actual publish workflow.

## Golden Fixtures

32 fixtures in `lib/question-factory/__fixtures__/v14-fixtures.ts`:

- **G01–G05**: FULL PASS (all 7 clauses)
- **G06–G12**: HARD-FAIL (structural, quality, provenance)
- **G13–G18**: D10 (purpose gates, state validity)
- **G19–G23**: HUMAN REVIEW (missing, wrong state)
- **G24–G27**: MISSING RESULT (missing upstream findings)
- **G28–G29**: ADVISORY (calibration pending, mean low)
- **G30–G32**: ADVERSARIAL (conjunctive gate, fail-closed, ID-independence)

## Publish Tiers (Advisory)

P3.3 §13.3 — tier tagging only, does NOT block publish:

| Tier | Mean | Label |
|------|------|-------|
| GOLD | ≥ 2.6 | Premium quality |
| SILVER | ≥ 2.3 | High quality |
| BRONZE | ≥ 2.0 | Minimum publishable |
| UNRATED | < 2.0 | Below minimum |

## Files Created/Modified

| File | Action |
|------|--------|
| `lib/question-factory/publish-calibration-readiness.ts` | V14 validator (649 lines) |
| `lib/question-factory/__fixtures__/v14-fixtures.ts` | 32 golden fixtures (745 lines) |
| `lib/question-factory/__tests__/v14-publish-readiness.ts` | 68/68 test assertions |
| `lib/question-factory/registry.ts` | +10 PUBLISH_CLAUSE_* + 2 ADVISORY reason codes |
| `lib/question-factory/index.ts` | V14 pipeline entry (stage 14) + barrel exports |
| `lib/question-factory/__tests__/v13-difficulty-cognitive.ts` | F.2 updated (V14 is now last stage) |
| `lib/question-factory/__tests__/validation-pipeline.ts` | P3.5A assertions updated (V14 blocks publishEligible) |
| `vitest.config.ts` | Added `@/` path alias for vitest |

## Verification

| Check | Result |
|-------|--------|
| V14 test suite | ✅ 68/68 (vitest) |
| P3.5A regression | ✅ 483/483 (tsx, process.exit-based) |
| V10/V11 regression | ✅ 83/83 |
| V12 regression | ✅ 57/57 |
| V13 regression | ✅ 70/70 (tsx) |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint` (8 files) | ✅ 0 violations |
| `git diff --check` | ✅ clean |
| Protected zones | ✅ 0 diff |

## Breakage Note

V14 added to DEFAULT_PIPELINE breaks P3.5A's `publishEligible === true` assertion for clean items because V14 requires HUMAN_REVIEW provenance. This is correct behavior — clean items should not be publishable without human review. P3.5A assertions updated accordingly.

## Design Decisions

1. **V14 does not revalidate** — it consumes upstream results. This prevents redundant work and ensures the pipeline is the single source of truth for item quality.
2. **Fail-closed on missing data** — if upstream results are missing for any clause, V14 blocks. This prevents items from slipping through with incomplete validation.
3. **Conjunctive, not additive** — all 7 clauses must pass. No arithmetic mean override. This prevents items with critical flaws from being published due to high scores elsewhere.
4. **D10 state ordering enforced** — states cannot skip levels. This prevents items from jumping from HYPOTHESIS directly to CALIBRATED without evidence.
5. **PRACTICE excludes NOT_APPLICABLE** — PRACTICE items must have a D10 state, not be marked as not applicable.
6. **Advisory tiers do not block** — GOLD/SILVER/BRONZE tagging is informational only. Items below BRONZE are still publishable if all 7 clauses pass (though unlikely given clause 3).
