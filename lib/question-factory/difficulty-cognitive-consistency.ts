/**
 * Question Factory V2 — Difficulty-Cognitive Consistency Validator (V13, P3.5D-2).
 *
 * Stage 13: Pre-calibration consistency check between declared difficulty
 * and observable item evidence.
 *
 * IMPORTANT (P3.5D-2):
 *   - V13 is a CONSISTENCY validator, NOT a psychometric calibration engine
 *   - Cognitive level and difficulty are related but NOT identical
 *   - NEVER implement: if R5 => HARD, if R1 => EASY, long => HARD, short => EASY
 *   - V13 reports observable inconsistency between difficulty and item features
 *   - Final gate: READY_FOR_V14 / NEEDS_DETERMINISTIC_FIXES / BLOCKED
 *
 * Section references:
 *   P3.3 §5        — Cognitive scale mapping (R1–R6)
 *   P3.5D-2 §V13   — Difficulty-cognitive consistency (this file)
 *   P3.5D-2 §V13.1 — Canonical difficulty model (EASY/MEDIUM/HARD)
 *   P3.5D-2 §V13.2 — Six dimensions analysis
 *   P3.5D-2 §V13.3 — Pre-calibration boundary
 */

import type { CanonicalItem, ValidationContext, ValidationFinding } from "./types";
import type { Validator } from "./interface";

const VERSION = "1.0.0";
const STAGE = 13;

// ─── R-level definitions (shared with V10 cognitive-label.ts) ────────────────

type RLevel = 1 | 2 | 3 | 4 | 5 | 6;

const COGNITIVE_TARGET_MAP: Record<string, RLevel> = {
  MENGINGAT: 1,
  MEMAHAMI: 2,
  MENERAPKAN: 3,
  MENGANALISIS: 4,
  MENGEVALUASI: 5,
  MENCIPTAKAN: 6,
  R1: 1,
  R2: 2,
  R3: 3,
  R4: 4,
  R5: 5,
  R6: 6,
};

const R_LABELS: Record<RLevel, string> = {
  1: "MENGINGAT",
  2: "MEMAHAMI",
  3: "MENERAPKAN",
  4: "MENGANALISIS",
  5: "MENGEVALUASI",
  6: "MENCIPTAKAN",
};

// ─── Difficulty band definitions ─────────────────────────────────────────────

type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

const DIFFICULTY_ORDER: DifficultyLevel[] = ["EASY", "MEDIUM", "HARD"];

/** Mapping from declared difficulty string to numeric index for comparison. */
const DIFFICULTY_INDEX: Record<DifficultyLevel, number> = {
  EASY: 0,
  MEDIUM: 1,
  HARD: 2,
};

// ─── Text normalization ──────────────────────────────────────────────────────

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function wordCount(text: string): number {
  return normalize(text).split(/\s+/).filter(Boolean).length;
}

// ─── Extraction helpers ──────────────────────────────────────────────────────

function resolveRLevel(cognitiveTarget: string | undefined): RLevel | null {
  if (!cognitiveTarget) return null;
  const normalized = cognitiveTarget.trim().toUpperCase();
  return COGNITIVE_TARGET_MAP[normalized] ?? null;
}

function resolveDifficulty(difficulty: string | undefined): DifficultyLevel | null {
  if (!difficulty) return null;
  const normalized = difficulty.trim().toUpperCase() as DifficultyLevel;
  return DIFFICULTY_INDEX[normalized] !== undefined ? normalized : null;
}

// ─── Finding factories ───────────────────────────────────────────────────────

function failFinding(
  code: string,
  rationale: string,
  details?: Record<string, unknown>
): ValidationFinding {
  return {
    validatorId: "difficulty-cognitive-consistency",
    validatorVersion: VERSION,
    stage: STAGE,
    status: "FAIL",
    severity: "SOFT_FAIL",
    blocking: false,
    retryable: false,
    reasonCode: code,
    rationale,
    details,
    evaluatedAt: new Date().toISOString(),
  };
}

function advisoryFinding(
  code: string,
  rationale: string,
  details?: Record<string, unknown>
): ValidationFinding {
  return {
    validatorId: "difficulty-cognitive-consistency",
    validatorVersion: VERSION,
    stage: STAGE,
    status: "ADVISORY",
    severity: "ADVISORY",
    blocking: false,
    retryable: false,
    reasonCode: code,
    rationale,
    details,
    evaluatedAt: new Date().toISOString(),
  };
}

function pass(rationale: string): ValidationFinding {
  return {
    validatorId: "difficulty-cognitive-consistency",
    validatorVersion: VERSION,
    stage: STAGE,
    status: "PASS",
    severity: "ADVISORY",
    blocking: false,
    retryable: false,
    reasonCode: "PASS",
    rationale,
    evaluatedAt: new Date().toISOString(),
  };
}

// ─── Dimension analyzers ─────────────────────────────────────────────────────

interface DimensionEvidence {
  name: string;
  signal: "TOO_LOW" | "TOO_HIGH" | "INSUFFICIENT" | "OK";
  rationale: string;
  metrics: Record<string, unknown>;
}

/**
 * Dimension 1: Cognitive Demand
 * Checks if cognitive level is consistent with declared difficulty.
 * NOTE: This is a CONSISTENCY check, not a mapping rule.
 *   R3–R4 is the "sweet spot" for MEDIUM difficulty
 *   R1–R2 CAN be HARD if other factors compensate (tricky stem, ambiguous options)
 *   R5–R6 CAN be EASY if the task is well-scaffolded
 *   V13 only flags OBVIOUS mismatches (R5+ with EASY, R1 with HARD)
 */
function analyzeCognitiveDemand(
  item: CanonicalItem,
  difficulty: DifficultyLevel,
  cognitiveLevel: RLevel | null
): DimensionEvidence {
  if (cognitiveLevel === null) {
    return {
      name: "Cognitive Demand",
      signal: "INSUFFICIENT",
      rationale: "No cognitiveTarget declared — cannot assess cognitive demand.",
      metrics: { cognitiveLevel: null, difficulty },
    };
  }

  // Soft mapping: expected cognitive range per difficulty
  // EASY: R1–R3 (recall/understand/apply)
  // MEDIUM: R2–R4 (understand/apply/analyze)
  // HARD: R3–R6 (apply/analyze/evaluate/create)
  //
  // Flag only when cognitive level is clearly OUTSIDE expected range
  // (not when it's at the boundary — that's a calibration question)
  const expectedRanges: Record<DifficultyLevel, [number, number]> = {
    EASY: [1, 3],
    MEDIUM: [2, 4],
    HARD: [3, 6],
  };

  const [minR, maxR] = expectedRanges[difficulty];
  const isOutOfRange = cognitiveLevel < minR || cognitiveLevel > maxR;

  if (!isOutOfRange) {
    return {
      name: "Cognitive Demand",
      signal: "OK",
      rationale: `Cognitive R${cognitiveLevel} (${R_LABELS[cognitiveLevel]}) is within expected range for ${difficulty}.`,
      metrics: { cognitiveLevel, difficulty, expectedRange: [minR, maxR] },
    };
  }

  // Out of range — determine direction
  if (cognitiveLevel > maxR) {
    return {
      name: "Cognitive Demand",
      signal: "TOO_LOW",
      rationale: `Cognitive R${cognitiveLevel} (${R_LABELS[cognitiveLevel]}) exceeds expected range for ${difficulty} (max R${maxR}). Difficulty may be too low for this cognitive demand.`,
      metrics: { cognitiveLevel, difficulty, expectedRange: [minR, maxR], gap: cognitiveLevel - maxR },
    };
  }

  return {
    name: "Cognitive Demand",
    signal: "TOO_HIGH",
      rationale: `Cognitive R${cognitiveLevel} (${R_LABELS[cognitiveLevel]}) is below expected range for ${difficulty} (min R${minR}). Difficulty may be too high for this cognitive level.`,
      metrics: { cognitiveLevel, difficulty, expectedRange: [minR, maxR], gap: minR - cognitiveLevel },
    };
}

/**
 * Dimension 2: Stimulus Complexity
 * Checks if stimulus (reading passage) complexity matches difficulty.
 */
function analyzeStimulusComplexity(
  item: CanonicalItem,
  difficulty: DifficultyLevel
): DimensionEvidence {
  const stem = item.content?.stem ?? "";
  const stimulus = item.content?.stimulusContent ?? "";
  const stemWords = wordCount(stem);
  const hasStimulus = stimulus.length > 0;
  const stimulusWords = hasStimulus ? wordCount(stimulus) : 0;

  // Expected stimulus characteristics per difficulty:
  // EASY: No stimulus or very short (< 50 words); stem < 30 words
  // MEDIUM: Short stimulus (50–150 words); stem 20–60 words
  // HARD: Longer stimulus (150+ words); stem 40+ words

  const expectations: Record<DifficultyLevel, { maxStemWords: number; minStimulusWords: number }> = {
    EASY: { maxStemWords: 40, minStimulusWords: 0 },
    MEDIUM: { maxStemWords: 80, minStimulusWords: 30 },
    HARD: { maxStemWords: 999, minStimulusWords: 80 },
  };

  const exp = expectations[difficulty];

  // Check stem length
  if (difficulty === "HARD" && stemWords < 25) {
    return {
      name: "Stimulus Complexity",
      signal: "TOO_LOW",
      rationale: `HARD difficulty item has very short stem (${stemWords} words). Expected longer, more complex stem.`,
      metrics: { stemWords, stimulusWords, difficulty, hasStimulus },
    };
  }

  if (difficulty === "EASY" && stemWords > exp.maxStemWords) {
    return {
      name: "Stimulus Complexity",
      signal: "TOO_HIGH",
      rationale: `EASY difficulty item has unexpectedly long stem (${stemWords} words). May indicate higher difficulty than declared.`,
      metrics: { stemWords, stimulusWords, difficulty, hasStimulus },
    };
  }

  if (difficulty === "HARD" && hasStimulus && stimulusWords < 60) {
    return {
      name: "Stimulus Complexity",
      signal: "TOO_LOW",
      rationale: `HARD difficulty item has short stimulus (${stimulusWords} words). Expected longer reading passage.`,
      metrics: { stemWords, stimulusWords, difficulty, hasStimulus },
    };
  }

  return {
    name: "Stimulus Complexity",
    signal: "OK",
    rationale: `Stem (${stemWords} words) and stimulus (${stimulusWords} words) are within expected range for ${difficulty}.`,
    metrics: { stemWords, stimulusWords, difficulty, hasStimulus },
  };
}

/**
 * Dimension 3: Evidence Integration
 * Checks if the item requires integration of multiple pieces of information.
 */
function analyzeEvidenceIntegration(
  item: CanonicalItem,
  difficulty: DifficultyLevel
): DimensionEvidence {
  const stem = item.content?.stem ?? "";
  const stimulus = item.content?.stimulusContent ?? "";
  const options = item.content?.options ?? [];

  const stemWords = wordCount(stem);
  const stimulusWords = wordCount(stimulus);

  // Integration indicators:
  // Multiple sentences in stem (contains "atau", "dan", "serta", "namun")
  // Stimulus present (requires reading + connecting to stem)
  // Options reference different parts of the content
  const hasConjunctions = /\b(atau|dan|serta|namun|tetapi|karena|sehingga)\b/i.test(stem);
  const hasStimulus = stimulusWords > 30;
  const integrationScore = (hasConjunctions ? 1 : 0) + (hasStimulus ? 1 : 0) + (stemWords > 50 ? 1 : 0);

  // Expected integration per difficulty:
  // EASY: 0–1 (single fact, no integration needed)
  // MEDIUM: 1–2 (some integration)
  // HARD: 2–3 (significant integration required)
  const expectedIntegration: Record<DifficultyLevel, [number, number]> = {
    EASY: [0, 1],
    MEDIUM: [1, 2],
    HARD: [2, 3],
  };

  const [minI, maxI] = expectedIntegration[difficulty];

  if (difficulty === "HARD" && integrationScore < minI) {
    return {
      name: "Evidence Integration",
      signal: "TOO_LOW",
      rationale: `HARD difficulty item shows low integration demand (score ${integrationScore}/3). May not require sufficient information synthesis.`,
      metrics: { integrationScore, difficulty, hasConjunctions, hasStimulus },
    };
  }

  return {
    name: "Evidence Integration",
    signal: "OK",
    rationale: `Evidence integration score (${integrationScore}/3) is acceptable for ${difficulty}.`,
    metrics: { integrationScore, difficulty, hasConjunctions, hasStimulus },
  };
}

/**
 * Dimension 4: Distractor Discrimination
 * Checks if distractors provide adequate discrimination for declared difficulty.
 */
function analyzeDistractorDiscrimination(
  item: CanonicalItem,
  difficulty: DifficultyLevel
): DimensionEvidence {
  const options = item.content?.options ?? [];
  const correctAnswer = item.responseModel?.correctAnswer;

  if (options.length < 2) {
    return {
      name: "Distractor Discrimination",
      signal: "INSUFFICIENT",
      rationale: "Insufficient options to assess distractor discrimination.",
      metrics: { optionCount: options.length, difficulty },
    };
  }

  // Compute option lengths
  const lengths = options.map((o) => wordCount(String(o)));
  const correctIdx = typeof correctAnswer === "number" ? correctAnswer : -1;
  const correctLen = correctIdx >= 0 ? lengths[correctIdx] : 0;
  const avgDistractorLen =
    lengths.filter((_, i) => i !== correctIdx).reduce((a, b) => a + b, 0) /
    Math.max(lengths.filter((_, i) => i !== correctIdx).length, 1);

  // Check for "obviously wrong" distractors (very short compared to answer)
  // For HARD difficulty, distractors should be plausible (similar length to answer)
  const lenRatio = correctLen > 0 ? avgDistractorLen / correctLen : 1;

  if (difficulty === "HARD" && lenRatio < 0.4) {
    return {
      name: "Distractor Discrimination",
      signal: "TOO_LOW",
      rationale: `HARD difficulty item has distractors that are much shorter than the correct answer (ratio ${lenRatio.toFixed(2)}). Distractors may be trivially wrong.`,
      metrics: { lenRatio, correctLen, avgDistractorLen, difficulty },
    };
  }

  if (difficulty === "EASY" && lenRatio > 2.5) {
    return {
      name: "Distractor Discrimination",
      signal: "TOO_HIGH",
      rationale: `EASY difficulty item has distractors that are much longer than the correct answer (ratio ${lenRatio.toFixed(2)}). This may indicate the item is harder than declared.`,
      metrics: { lenRatio, correctLen, avgDistractorLen, difficulty },
    };
  }

  return {
    name: "Distractor Discrimination",
    signal: "OK",
    rationale: `Distractor discrimination (ratio ${lenRatio.toFixed(2)}) is acceptable for ${difficulty}.`,
    metrics: { lenRatio, correctLen, avgDistractorLen, difficulty },
  };
}

/**
 * Dimension 5: Response Complexity
 * Checks if expected response complexity matches difficulty.
 */
function analyzeResponseComplexity(
  item: CanonicalItem,
  difficulty: DifficultyLevel
): DimensionEvidence {
  const options = item.content?.options ?? [];
  const correctAnswer = item.responseModel?.correctAnswer;
  const qType = item.responseModel?.questionType;

  if (qType === "ISIAN_SINGKAT") {
    const answerLen = wordCount(String(correctAnswer));
    if (difficulty === "HARD" && answerLen < 3) {
      return {
        name: "Response Complexity",
        signal: "TOO_LOW",
        rationale: `HARD difficulty ISIAN_SINGKAT has very short expected answer (${answerLen} words). May not require sufficient complexity.`,
        metrics: { answerLen, difficulty, questionType: qType },
      };
    }
    return {
      name: "Response Complexity",
      signal: "OK",
      rationale: `ISIAN_SINGKAT response complexity (${answerLen} words) is acceptable for ${difficulty}.`,
      metrics: { answerLen, difficulty, questionType: qType },
    };
  }

  // For PILIHAN_GANDA / BENAR_SALAH: check option length variation
  const lengths = options.map((o) => wordCount(String(o)));
  const maxLen = Math.max(...lengths);
  const minLen = Math.min(...lengths);
  const lenRange = maxLen - minLen;

  // HARD difficulty items should have more uniform option lengths (harder to guess)
  if (difficulty === "HARD" && lenRange > 8) {
    return {
      name: "Response Complexity",
      signal: "TOO_LOW",
      rationale: `HARD difficulty item has wide option length variation (${lenRange} words range). Uniform lengths expected for harder items.`,
      metrics: { lenRange, maxLen, minLen, difficulty, questionType: qType },
    };
  }

  return {
    name: "Response Complexity",
    signal: "OK",
    rationale: `Response complexity (range ${lenRange} words) is acceptable for ${difficulty}.`,
    metrics: { lenRange, maxLen, minLen, difficulty, questionType: qType },
  };
}

/**
 * Dimension 6: Task Structure
 * Checks if the overall task structure matches difficulty.
 */
function analyzeTaskStructure(
  item: CanonicalItem,
  difficulty: DifficultyLevel
): DimensionEvidence {
  const stem = item.content?.stem ?? "";
  const options = item.content?.options ?? [];
  const qType = item.responseModel?.questionType;

  const stemWords = wordCount(stem);
  const optionCount = options.length;

  // Task structure score:
  // 0–1: Simple (short stem, few options, no multi-part)
  // 2–3: Moderate (medium stem, 4 options, some multi-part indicators)
  // 4–5: Complex (long stem, many elements, multi-part)
  const hasMultiPart = /\b(bagian|part|langkah|tahap|pertama|kedua|ketiga)\b/i.test(stem);
  const hasConditional = /\b(jika|apabila|bila|ketika|maka)\b/i.test(stem);
  const hasComparison = /\b(bandingkan|perbedaan|persamaan|lebih|kurang)\b/i.test(stem);

  let structureScore = 0;
  if (stemWords > 40) structureScore++;
  if (stemWords > 80) structureScore++;
  if (hasMultiPart) structureScore++;
  if (hasConditional) structureScore++;
  if (hasComparison) structureScore++;

  // Expected structure per difficulty:
  // EASY: 0–1
  // MEDIUM: 1–3
  // HARD: 2–5
  const expectedStructure: Record<DifficultyLevel, [number, number]> = {
    EASY: [0, 1],
    MEDIUM: [1, 3],
    HARD: [2, 5],
  };

  const [minS, maxS] = expectedStructure[difficulty];

  if (difficulty === "HARD" && structureScore < minS) {
    return {
      name: "Task Structure",
      signal: "TOO_LOW",
      rationale: `HARD difficulty item has simple task structure (score ${structureScore}/5). Expected more complex structure.`,
      metrics: { structureScore, difficulty, hasMultiPart, hasConditional, hasComparison },
    };
  }

  if (difficulty === "EASY" && structureScore > maxS) {
    return {
      name: "Task Structure",
      signal: "TOO_HIGH",
      rationale: `EASY difficulty item has complex task structure (score ${structureScore}/5). May indicate higher difficulty than declared.`,
      metrics: { structureScore, difficulty, hasMultiPart, hasConditional, hasComparison },
    };
  }

  return {
    name: "Task Structure",
    signal: "OK",
    rationale: `Task structure (${structureScore}/5) is acceptable for ${difficulty}.`,
    metrics: { structureScore, difficulty, hasMultiPart, hasConditional, hasComparison },
  };
}

// ─── Aggregation logic ───────────────────────────────────────────────────────

/**
 * Aggregate dimension evidence into a final consistency verdict.
 *
 * Returns:
 *   - "CONSISTENT" if all dimensions OK or INSUFFICIENT
 *   - "INCONSISTENT" if ≥2 dimensions signal mismatch
 *   - "REVIEW" if exactly 1 dimension signals mismatch (borderline)
 */
function aggregateDimensions(evidence: DimensionEvidence[]): "CONSISTENT" | "INCONSISTENT" | "REVIEW" {
  const mismatches = evidence.filter((d) => d.signal === "TOO_LOW" || d.signal === "TOO_HIGH");
  const insufficient = evidence.filter((d) => d.signal === "INSUFFICIENT");

  if (mismatches.length >= 2) return "INCONSISTENT";
  if (mismatches.length === 1 && evidence.length - insufficient.length >= 3) return "REVIEW";
  if (mismatches.length === 1) return "REVIEW";
  return "CONSISTENT";
}

// ─── V13 Validator ───────────────────────────────────────────────────────────

/**
 * V13 Difficulty-Cognitive Consistency Validator — checks whether an item's
 * declared difficulty is defensible given its observable cognitive and
 * structural evidence.
 *
 * Pre-calibration only — NOT a psychometric engine.
 *
 * Returns:
 *   PASS                — difficulty is consistent with observable evidence
 *   SOFT_FAIL           — difficulty-cognitive mismatch detected (needs review)
 *   ADVISORY            — insufficient evidence or calibration required
 */
export const difficultyCognitiveConsistencyValidator: Validator = {
  id: "difficulty-cognitive-consistency",
  version: VERSION,
  stage: STAGE,

  validate(item: CanonicalItem, _ctx: ValidationContext): ValidationFinding[] {
    const findings: ValidationFinding[] = [];

    // ── Extract difficulty ─────────────────────────────────────────────────
    const difficulty = resolveDifficulty(item.taxonomy?.difficulty);

    if (difficulty === null) {
      findings.push(advisoryFinding(
        "DIFFICULTY_EVIDENCE_INSUFFICIENT",
        "No valid difficulty declared in taxonomy. Cannot assess difficulty-cognitive consistency.",
        { difficulty: item.taxonomy?.difficulty }
      ));
      return findings;
    }

    // ── Extract cognitive level ────────────────────────────────────────────
    const cognitiveLevel = resolveRLevel(item.taxonomy?.cognitiveTarget);

    // ── Run all six dimension analyses ─────────────────────────────────────
    const dimCognitive = analyzeCognitiveDemand(item, difficulty, cognitiveLevel);
    const dimStimulus = analyzeStimulusComplexity(item, difficulty);
    const dimIntegration = analyzeEvidenceIntegration(item, difficulty);
    const dimDistractor = analyzeDistractorDiscrimination(item, difficulty);
    const dimResponse = analyzeResponseComplexity(item, difficulty);
    const dimTask = analyzeTaskStructure(item, difficulty);

    const allDimensions = [dimCognitive, dimStimulus, dimIntegration, dimDistractor, dimResponse, dimTask];

    // ── Aggregate ──────────────────────────────────────────────────────────
    const verdict = aggregateDimensions(allDimensions);

    // ── Emit findings based on verdict ─────────────────────────────────────

    if (verdict === "INCONSISTENT") {
      // Emit primary finding with all mismatch details
      const mismatches = allDimensions.filter((d) => d.signal === "TOO_LOW" || d.signal === "TOO_HIGH");
      const primaryMismatch = mismatches[0];

      if (primaryMismatch.signal === "TOO_LOW") {
        findings.push(failFinding(
          "DIFFICULTY_DEMAND_TOO_LOW",
          `Item difficulty (${difficulty}) appears too low: ${mismatches.map((d) => d.rationale).join(" ")}`,
          {
            difficulty,
            cognitiveLevel,
            cognitiveLabel: cognitiveLevel ? R_LABELS[cognitiveLevel] : null,
            dimensions: allDimensions.map((d) => ({ name: d.name, signal: d.signal })),
            mismatchCount: mismatches.length,
          }
        ));
      } else {
        findings.push(failFinding(
          "DIFFICULTY_DEMAND_TOO_HIGH",
          `Item difficulty (${difficulty}) appears too high: ${mismatches.map((d) => d.rationale).join(" ")}`,
          {
            difficulty,
            cognitiveLevel,
            cognitiveLabel: cognitiveLevel ? R_LABELS[cognitiveLevel] : null,
            dimensions: allDimensions.map((d) => ({ name: d.name, signal: d.signal })),
            mismatchCount: mismatches.length,
          }
        ));
      }
    } else if (verdict === "REVIEW") {
      // Single mismatch — emit as advisory (borderline case)
      const mismatch = allDimensions.find((d) => d.signal === "TOO_LOW" || d.signal === "TOO_HIGH");
      if (mismatch) {
        findings.push(advisoryFinding(
          "DIFFICULTY_COGNITIVE_MISMATCH",
          `Borderline difficulty-cognitive consistency: ${mismatch.rationale}`,
          {
            difficulty,
            cognitiveLevel,
            cognitiveLabel: cognitiveLevel ? R_LABELS[cognitiveLevel] : null,
            dimension: mismatch.name,
            signal: mismatch.signal,
          }
        ));
      }
    } else {
      // CONSISTENT — emit pass
      findings.push(pass(
        `Difficulty (${difficulty}) is consistent with observable item evidence.`
      ));
    }

    // ── Always emit calibration advisory ───────────────────────────────────
    // Items with < 30 responses need empirical calibration
    findings.push(advisoryFinding(
      "DIFFICULTY_CALIBRATION_REQUIRED",
      "Item has fewer than 30 responses — difficulty assignment requires empirical calibration.",
      { difficulty, responseCount: 0 }
    ));

    return findings;
  },
};
