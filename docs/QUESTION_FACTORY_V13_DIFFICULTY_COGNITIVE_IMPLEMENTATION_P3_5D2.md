# QUESTION_FACTORY_V13_DIFFICULTY_COGNITIVE_IMPLEMENTATION_P3_5D2

**Phase**: P3.5D-2 · **Date**: 2026-09-07  
**Status**: COMPLETE  
**Prerequisite**: P3.5A (393), P3.5C V10/V11 (83), P3.5B (1,500), P3.5D-1 V12 (57)  
**Scope**: V13 DifficultyCognitiveConsistencyValidator implementation, 6-dimension evidence aggregation, 30 golden fixtures, 70 tests

---

## §1  Executive Summary

V13 DifficultyCognitiveConsistencyValidator is a deterministic, pre-calibration consistency checker that assesses whether an item's **declared difficulty** (EASY/MEDIUM/HARD) is defensible given its **observable cognitive and structural evidence**. V13 operates as **stage 13** in the DEFAULT_PIPELINE — the final deterministic validator before any AI-assisted or human stages.

V13 is **NOT** an empirical calibration engine. It is a **consistency gate** that detects obvious mismatches between declared difficulty and item characteristics. Thresholds are explanatory, not empirical.

### 1.1 Key Results

| Metric | Value |
|--------|-------|
| V13 tests | 70/70 passing |
| V12 regression | 57/57 passing |
| V10+V11 regression | 83/83 passing |
| P3.5A regression | 393/393 passing |
| MASTER_BANK regression | 1,500/1,500 correctly rejected |
| TypeScript | clean (`npx tsc --noEmit`) |
| Files created | 3 (validator, fixtures, tests) |
| Files modified | 2 (registry, pipeline index) |
| Lines added | ~1,800 |

---

## §2  Architecture

### 2.1 Validator Identity

```typescript
{
  id: "difficulty-cognitive-consistency",   // canonical string ID
  stage: 13,
  version: "1.0.0",
  name: "Difficulty-Cognitive Consistency",
  description: "Checks whether declared difficulty is defensible given observable evidence",
}
```

### 2.2 Core Principle

> **Cognitive level and difficulty are related but NOT identical.**
> - R3 (MenerAPKAN) can appear at EASY, MEDIUM, or HARD
> - R1 (Mengingat) can appear at any difficulty in certain contexts
> - Long ≠ HARD, short ≠ EASY
> - V13 detects OBVIOUS mismatches only — not borderline cases

### 2.3 Six Dimensions

V13 runs six independent dimension analyses and aggregates their signals:

| # | Dimension | Source | Signal |
|---|-----------|--------|--------|
| 1 | **Cognitive Demand** | `taxonomy.cognitiveTarget` (R-level) vs difficulty | OK / TOO_LOW / TOO_HIGH / INSUFFICIENT |
| 2 | **Stimulus Complexity** | `content.stem` word count + `content.stimulusContent` | OK / TOO_LOW / TOO_HIGH |
| 3 | **Evidence Integration** | Conjunctions + stimulus presence + stem length | OK / TOO_LOW |
| 4 | **Distractor Discrimination** | Option count + unique words + correct answer | OK / TOO_LOW / INSUFFICIENT |
| 5 | **Response Complexity** | Response model + stem word count + question type | OK / TOO_LOW / TOO_HIGH |
| 6 | **Task Structure** | Question type + stimulus + options count | OK / TOO_LOW |

### 2.4 Aggregation Logic

```
mismatchCount = count(dims where signal ∈ {TOO_LOW, TOO_HIGH})

if mismatchCount ≥ 2 → INCONSISTENT (SOFT_FAIL)
if mismatchCount = 1 → REVIEW (ADVISORY)
if mismatchCount = 0 → CONSISTENT (PASS)
```

**Special case**: If cognitive level is INSUFFICIENT (missing), aggregation returns `INSUFFICIENT` → only DIFFICULTY_EVIDENCE_INSUFFICIENT advisory emitted.

### 2.5 Difficulty Bands (Explanatory, NOT Empirical)

| Band | Cognitive Range | Structural Evidence |
|------|----------------|-------------------|
| **EASY** | R1–R3 (Mengingat–Menerapkan) | Short stem (< 30 words), basic options, single-step |
| **MEDIUM** | R2–R4 (Memahami–Menganalisis) | Medium stem (20–40 words), conjunctions present |
| **HARD** | R3–R6 (Menerapkan–Menciptakan) | Long stem (> 35 words), stimulus present, multi-step |

**R3 (Menerapkan) appears in all three bands** — this is correct. V13 only flags when R3 appears with contradictory structural evidence (e.g., HARD + trivial 2-option stem).

---

## §3  Reason Codes

V13 introduces 8 new reason codes:

| Code | Status | Severity | Description |
|------|--------|----------|-------------|
| `DIFFICULTY_COGNITIVE_MISMATCH` | REVIEW | ADVISORY | Borderline: 1 dimension mismatch |
| `DIFFICULTY_DEMAND_TOO_LOW` | FAIL | SOFT_FAIL | ≥2 dimensions: difficulty too low for evidence |
| `DIFFICULTY_DEMAND_TOO_HIGH` | FAIL | SOFT_FAIL | ≥2 dimensions: difficulty too high for evidence |
| `DIFFICULTY_EVIDENCE_INSUFFICIENT` | REVIEW | ADVISATORY | Missing difficulty or cognitive data |
| `DIFFICULTY_DISCRIMINATION_LOW` | REVIEW | ADVISATORY | Distractor quality borderline |
| `DIFFICULTY_STIMULUS_COMPLEXITY_MISMATCH` | FAIL | SOFT_FAIL | Stimulus complexity contradicts difficulty |
| `DIFFICULTY_RESPONSE_COMPLEXITY_MISMATCH` | FAIL | SOFT_FAIL | Response complexity contradicts difficulty |
| `DIFFICULTY_CALIBRATION_REQUIRED` | ANY | ADVISORY | Always emitted — V13 is pre-calibration |

**`DIFFICULTY_CALIBRATION_REQUIRED` is ALWAYS emitted as ADVISORY.** It means "this finding is pre-calibration and should be revisited after 30+ real responses per item."

---

## §4  Golden Fixtures (30)

### 4.1 PASS Cases — Consistent (13 fixtures)

| ID | Difficulty | Cognitive | Description |
|----|-----------|-----------|-------------|
| G01 | EASY | R1 | Simple factual recall, 2 options, short stem |
| G02 | EASY | R2 | Basic comprehension, 2 options |
| G03 | EASY | R3 | Simple application, 2 options |
| G04 | EASY | R3 | Application with conjunctions, 2 options |
| G05 | MEDIUM | R2 | Comprehension with stimulus, 4 options |
| G06 | MEDIUM | R3 | Application with context, 4 options |
| G07 | MEDIUM | R4 | Analysis with stimulus, 4 options |
| G08 | HARD | R3 | Complex application, 4 options |
| G21 | MEDIUM | R3 | Application with 4 options, medium stem |
| G23 | HARD | R4 | Analysis with long stem, 4 options |
| G24 | HARD | R5 | Evaluation with long stem, 4 options |
| G26 | MEDIUM | — | No cognitive target (INSUFFICIENT) → PASS |
| G30 | EASY | R1 | BenarSalah type, short stem |

### 4.2 FAIL Cases — Inconsistent (7 fixtures)

| ID | Difficulty | Cognitive | Expected Finding |
|----|-----------|-----------|-----------------|
| G10 | HARD | R5 | `DIFFICULTY_DEMAND_TOO_LOW` (short stimulus for HARD) |
| G13 | HARD | R1 | `DIFFICULTY_DEMAND_TOO_HIGH` (trivial recall for HARD) |
| G14 | HARD | R1 | `DIFFICULTY_DEMAND_TOO_HIGH` (recall no stimulus for HARD) |
| G17 | HARD | R2 | `DIFFICULTY_DEMAND_TOO_LOW` (trivial 1+1 content for HARD) |
| G18 | EASY | R4 | `DIFFICULTY_DEMAND_TOO_LOW` (complex multi-part for EASY) |
| G19 | HARD | R6 | `DIFFICULTY_DEMAND_TOO_LOW` (create with short stimulus for HARD) |
| G22 | HARD | R4 | `DIFFICULTY_DEMAND_TOO_LOW` (trivial distractors for HARD) |

### 4.3 REVIEW Cases — Borderline (7 fixtures)

| ID | Difficulty | Cognitive | Description |
|----|-----------|-----------|-------------|
| G09 | HARD | R4 | HARD + R4 at boundary, long stem |
| G11 | EASY | R5 | EASY + R5 at boundary, short stem |
| G12 | EASY | R6 | EASY + R6 at boundary, short stem |
| G15 | MEDIUM | R1 | MEDIUM + R1 borderline |
| G16 | EASY | R2 | Long stem with conjunctions for EASY → REVIEW |
| G20 | MEDIUM | R5 | MEDIUM + R5 borderline |
| G29 | HARD | R3 | HARD + R3 compound borderline |

### 4.4 INSUFFICIENT Cases (3 fixtures)

| ID | Difficulty | Cognitive | Expected Finding |
|----|-----------|-----------|-----------------|
| G25 | — | MEMAHAMI | No difficulty → `DIFFICULTY_EVIDENCE_INSUFFICIENT` |
| G27 | — | — | Neither difficulty nor cognitive → `DIFFICULTY_EVIDENCE_INSUFFICIENT` |
| G28 | INVALID | R1 | Invalid difficulty string → `DIFFICULTY_EVIDENCE_INSUFFICIENT` |

### 4.5 Over-Rejection Resistance (3 fixtures)

| ID | Description | Verdict |
|----|-------------|---------|
| G04 | EASY + R3 with conjunctions | PASS (R3 at EASY boundary is OK) |
| G29 | HARD + R3 compound with long stem | REVIEW (not FAIL) |
| G30 | EASY + R1 BenarSalah short | PASS (short ≠ harder) |

---

## §5  Dimension Details

### 5.1 Cognitive Demand

```
EASY range:  [1, 3]  (R1–R3)
MEDIUM range: [2, 4]  (R2–R4)
HARD range:  [3, 6]  (R3–R6)
```

If `cognitiveLevel` is outside the difficulty's range:
- `cognitiveLevel > maxR` → `TOO_LOW` (difficulty too low — cognitive demand exceeds it)
- `cognitiveLevel < minR` → `TOO_HIGH` (difficulty too high — cognitive demand below it)

### 5.2 Stimulus Complexity

| Difficulty | stemWords threshold | Condition |
|-----------|-------------------|-----------|
| HARD | < 25 words | `TOO_LOW` (too short for HARD) |
| EASY | > 40 words | `TOO_HIGH` (too long for EASY) |
| HARD | has stimulus + < 60 words | `TOO_LOW` |

### 5.3 Evidence Integration

Score = count of: conjunctions present + stimulusWords > 30 + stemWords > 50

- MEDIUM/HARD with score = 0 → `TOO_LOW`
- Score ≥ 2 → OK

### 5.4 Distractor Discrimination

Checks `correctAnswer` string length vs max option length. When `correctAnswer` is a letter (A/B/C/D), lenRatio = 1.0 → never triggers FAIL. Only triggers when correct answer is a full string.

### 5.5 Response Complexity

- EASY with stemWords > 40 → `TOO_LOW`
- HARD with stemWords < 20 → `TOO_HIGH`

### 5.6 Task Structure

- ISIAN_SINGKAT with stemWords > 35 → `TOO_LOW`
- HARD with no stimulus + stemWords < 30 → `TOO_HIGH`

---

## §6  Cross-Validator Interactions

### 6.1 V10 (CognitiveLabelValidator)

- V13 uses V10 evidence but does NOT override V10's `COGNITIVE_LABEL_MISMATCH`
- If V10 detects mismatch, V13 reports `INCONCLUSIVE` for cognitive dimension
- V13 never declares `DIFFICULTY_COGNITIVE_MISMATCH` when V10 has `COGNITIVE_LABEL_MISMATCH`

### 6.2 V11 (DistractorQualityValidator)

- V11 FAIL does NOT automatically cause V13 FAIL
- V11 findings used as evidence in distractor discrimination dimension
- V13 keeps separate verdict

### 6.3 V12 (DuplicateSimilarityValidator)

- Duplication is NOT difficulty evidence
- V13 reason codes are distinct from V12 codes
- Each validator operates independently

---

## §7  Pipeline Position

```
Stage 0  → V0 (pass-through)
Stage 1  → V1 StructuralValidator
Stage 2  → V2 AnswerKeyValidator
Stage 3  → V3 SecurityValidator
Stage 4  → V4 PurposeGateValidator
Stage 5  → V5 DuplicatesValidator
Stage 6  → V6 StateGuardValidator
Stage 7  → V7 (pass-through)
Stage 8  → V8 (pass-through)
Stage 9  → V9 (pass-through)
Stage 10 → V10 CognitiveLabelValidator
Stage 11 → V11 DistractorQualityValidator
Stage 12 → V12 DuplicateSimilarityValidator
Stage 13 → V13 DifficultyCognitiveConsistencyValidator  ← FINAL
```

V13 is the **last deterministic stage**. Future AI-assisted validators (V14+) and human review stages follow.

---

## §8  Test Suite Structure (70 tests)

| Section | Tests | Description |
|---------|-------|-------------|
| A | 4 | Import & identity (id, stage, version, fixtures) |
| B | 13 | PASS cases (consistent difficulty-cognitive) |
| C | 14 | FAIL cases (inconsistent: 7 SF + 7 reason-code checks) |
| D | 13 | REVIEW cases (borderline: 7 SF + 6 reason-code checks) |
| E | 4 | INSUFFICIENT cases (missing data) |
| F | 3 | Pipeline integration |
| G | 3 | V10 interaction |
| H | 2 | V11 interaction |
| I | 2 | V12 interaction |
| J | 5 | Dimension-specific boundary tests |
| K | 3 | Over-rejection resistance |
| L | 4 | Structural integrity |
| **Total** | **70** | |

---

## §9  Regression Results

| Suite | Result |
|-------|--------|
| V13 difficulty-cognitive | 70/70 ✅ |
| V12 duplicate-similarity | 57/57 ✅ |
| V10+V11 validation | 83/83 ✅ |
| P3.5A validation-pipeline | 393/393 ✅ |
| P3.5B MASTER_BANK audit | 1,500/1,500 ✅ |
| TypeScript | clean ✅ |

---

## §10  Files

### Created

| File | Lines | Description |
|------|-------|-------------|
| `lib/question-factory/difficulty-cognitive-consistency.ts` | ~655 | V13 validator (stage 13, v1.0.0) |
| `lib/question-factory/__fixtures__/v13-fixtures.ts` | ~550 | 30 golden fixtures (G01–G30) |
| `lib/question-factory/__tests__/v13-difficulty-cognitive.ts` | ~500 | 70 test assertions |
| `docs/QUESTION_FACTORY_V13_DIFFICULTY_COGNITIVE_IMPLEMENTATION_P3_5D2.md` | this file | Implementation documentation |

### Modified

| File | Changes |
|------|---------|
| `lib/question-factory/registry.ts` | +8 V13 reason codes under "Stage 13" |
| `lib/question-factory/index.ts` | V13 integrated at stage 13 in DEFAULT_PIPELINE + barrel export |

---

## §11  Governance

- **No schema migration**
- **No question generation/repair/publish**
- **No MASTER_BANK modification**
- **No Prisma schema changes**
- **No deployment**
- **No DB writes**
- **No AI API calls**
- **No external services**
- **No TB-012 string in source code**
- **No item-ID special-case logic**
- **No psychometric claims** — V13 is a consistency checker, not an empirical difficulty calibrator

---

## §12  Remaining Work

1. **Calibration**: After 30+ real responses per item, empirical difficulty can be computed. V13 findings serve as pre-calibration signal.
2. **AI-assisted validators (V14+)**: Content quality, pedagogical alignment, cultural sensitivity — require LLM.
3. **Human review integration**: V13's DIFFICULTY_CALIBRATION_REQUIRED advisory feeds into human review queue.
4. **Stimulus complexity thresholds**: May need tuning based on production data (currently explanatory, not empirical).
