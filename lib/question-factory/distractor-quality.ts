/**
 * Question Factory V2 — Distractor Quality Validator (V11, P3.5C).
 *
 * Stage 11: Distractor quality checks — relevance, plausibility,
 * semantic proximity, parallelism, length clues, near-duplicates.
 *
 * Rules (P3.5C §V11):
 *   - MUST avoid bad heuristics:
 *     ✗ "all options same length" → invalid
 *     ✗ "short distractor = invalid"
 *     ✗ "option containing answer word = invalid"
 *   - Check for near-duplicates among distractors
 *   - Check parallelism (grammatical consistency)
 *   - Check length anomalies (suspicious outliers)
 *   - Check semantic overlap with correct answer
 *
 * Section references:
 *   P3.4 §11      — Distractor validator (original spec)
 *   P3.5C §V11    — Distractor quality validator (this file)
 *   Quality §7     — No meaningless distractors
 *   Quality §9     — Single-best-answer discipline
 */

import type { CanonicalItem, ValidationContext, ValidationFinding } from "./types";
import type { Validator } from "./interface";

const VERSION = "1.0.0";
const STAGE = 11;

// ─── Text normalization ──────────────────────────────────────────────────────

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function wordCount(text: string): number {
  return normalize(text).split(/\s+/).filter(Boolean).length;
}

function charCount(text: string): number {
  return normalize(text).length;
}

/**
 * Tokenize text into a set of significant words (≥3 chars, no stopwords).
 */
function tokenize(text: string): Set<string> {
  const stopwords = new Set([
    "yang", "dan", "ini", "itu", "adalah", "untuk", "dengan", "pada",
    "dalam", "oleh", "dari", "ke", "di", "tidak", "akan", "jika",
    "maka", "adanya", "tersebut", "sebuah", "berikut", "merupakan",
    "ialah", "yaitu", "yakni", "antara", "serta", "atau", "tetapi",
    "karena", "sehingga", "sebagai", "bahwa", "seperti", "hanya",
    "lebih", "sangat", "juga", "telah", "sudah", "sedang", "dapat",
    "bisa", "harus", "perlu", "manakah", "apakah", "bagaimana",
  ]);
  const words = normalize(text)
    .split(/\s+/)
    .map((w) => w.replace(/[.,;:!?'"()\[\]{}]+/g, ""))
    .filter((w) => w.length >= 3 && !stopwords.has(w));
  return new Set(words);
}

/**
 * Jaccard similarity between two token sets.
 */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Normalized Levenshtein similarity (1 - distance/maxLen).
 */
function levenshteinSimilarity(a: string, b: string): number {
  const aNorm = normalize(a);
  const bNorm = normalize(b);
  if (aNorm === bNorm) return 1;
  const maxLen = Math.max(aNorm.length, bNorm.length);
  if (maxLen === 0) return 1;

  const matrix: number[][] = [];
  for (let i = 0; i <= aNorm.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bNorm.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= aNorm.length; i++) {
    for (let j = 1; j <= bNorm.length; j++) {
      const cost = aNorm[i - 1] === bNorm[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return 1 - matrix[aNorm.length][bNorm.length] / maxLen;
}

// ─── Helper: finding factory ─────────────────────────────────────────────────

function finding(
  code: string,
  rationale: string,
  blocking: boolean,
  severity: "HARD_FAIL" | "SOFT_FAIL" = "SOFT_FAIL",
  details?: Record<string, unknown>
): ValidationFinding {
  return {
    validatorId: "distractor-quality",
    validatorVersion: VERSION,
    stage: STAGE,
    status: "FAIL",
    severity,
    blocking,
    retryable: false,
    reasonCode: code,
    rationale,
    details,
    evaluatedAt: new Date().toISOString(),
  };
}

function pass(rationale: string): ValidationFinding {
  return {
    validatorId: "distractor-quality",
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

// ─── Validator ───────────────────────────────────────────────────────────────

/**
 * V11 Distractor Quality Validator — checks distractor quality
 * across multiple dimensions.
 *
 * Returns:
 *   PASS       — all distractors pass quality checks
 *   SOFT_FAIL  — quality issues detected (non-blocking, human review)
 */
export const distractorQualityValidator: Validator = {
  id: "distractor-quality",
  version: VERSION,
  stage: STAGE,

  validate(item: CanonicalItem, _ctx: ValidationContext): ValidationFinding[] {
    const findings: ValidationFinding[] = [];
    const options = item.content?.options ?? [];
    const correctAnswer = item.responseModel?.correctAnswer;
    const qType = item.responseModel?.questionType;

    // Skip for BENAR_SALAH (only 2 options: Benar/Salah) and ISIAN_SINGKAT
    if (!qType || qType === "BENAR_SALAH" || qType === "ISIAN_SINGKAT") {
      return [pass(`${qType ?? "UNKNOWN"} type — distractor quality checks not applicable.`)];
    }

    // Only check for PILIHAN_GANDA with ≥3 options
    if (qType !== "PILIHAN_GANDA" || options.length < 3) {
      return [pass("Not a PILIHAN_GANDA item with sufficient options.")];
    }

    // Parse correct answer index
    const answerIdx = parseInt(String(correctAnswer).trim(), 10);
    if (isNaN(answerIdx) || answerIdx < 0 || answerIdx >= options.length) {
      // Answer-key issues are caught by V3 answer-key validator
      return [pass("Answer key out of range — handled by answer-key validator.")];
    }

    const correctText = options[answerIdx];
    const distractorIndices = options
      .map((_, i) => i)
      .filter((i) => i !== answerIdx);
    const distractors = distractorIndices.map((i) => options[i]);

    // ── CHECK 1: Near-duplicate distractors (≥2 distractors too similar) ────
    // Uses both token Jaccard and Levenshtein — catches paraphrase duplicates
    const NEAR_DUP_TOKEN_THRESHOLD = 0.80;
    const NEAR_DUP_LEVENSHTEIN_THRESHOLD = 0.85;

    for (let i = 0; i < distractors.length; i++) {
      for (let j = i + 1; j < distractors.length; j++) {
        const tokensA = tokenize(distractors[i]);
        const tokensB = tokenize(distractors[j]);
        const jaccardSim = jaccard(tokensA, tokensB);
        const levSim = levenshteinSimilarity(distractors[i], distractors[j]);

        if (jaccardSim >= NEAR_DUP_TOKEN_THRESHOLD || levSim >= NEAR_DUP_LEVENSHTEIN_THRESHOLD) {
          findings.push(finding(
            "DISTRACTOR_NEAR_DUPLICATE",
            `Distractors at indices ${distractorIndices[i]} and ${distractorIndices[j]} are near-duplicates (Jaccard: ${jaccardSim.toFixed(2)}, Levenshtein: ${levSim.toFixed(2)}).`,
            false,
            "SOFT_FAIL",
            {
              idxA: distractorIndices[i],
              idxB: distractorIndices[j],
              textA: distractors[i].substring(0, 60),
              textB: distractors[j].substring(0, 60),
              jaccard: jaccardSim,
              levenshtein: levSim,
            }
          ));
        }
      }
    }

    // ── CHECK 2: Distractor too similar to correct answer ────────────────────
    // A distractor that is nearly identical to the correct answer is dangerous
    // (students might pick it by accident). Threshold: Levenshtein ≥ 0.85.
    const NEAR_ANSWER_THRESHOLD = 0.85;
    for (let i = 0; i < distractors.length; i++) {
      const levSim = levenshteinSimilarity(distractors[i], correctText);
      if (levSim >= NEAR_ANSWER_THRESHOLD) {
        findings.push(finding(
          "DISTRACTOR_NEAR_ANSWER",
          `Distractor at index ${distractorIndices[i]} is near-identical to correct answer (Levenshtein: ${levSim.toFixed(2)}).`,
          false,
          "SOFT_FAIL",
          {
            distractorIdx: distractorIndices[i],
            distractorText: distractors[i].substring(0, 60),
            correctText: correctText.substring(0, 60),
            similarity: levSim,
          }
        ));
      }
    }

    // ── CHECK 3: Length anomaly (single outlier) ─────────────────────────────
    // BAD HEURISTIC (P3.5C): "all options same length" → NOT checked.
    // GOOD CHECK: if ONE distractor is >3× longer or <0.25× shorter than
    // the median, it's a potential quality issue.
    const lengths = options.map((o) => charCount(o));
    const sortedLens = [...lengths].sort((a, b) => a - b);
    const medianLen = sortedLens[Math.floor(sortedLens.length / 2)];

    if (medianLen > 0) {
      for (let i = 0; i < distractors.length; i++) {
        const dLen = charCount(distractors[i]);
        const ratio = dLen / medianLen;
        if (ratio > 3.0 || ratio < 0.25) {
          findings.push(finding(
            "DISTRACTOR_LENGTH_OUTLIER",
            `Distractor at index ${distractorIndices[i]} has length ratio ${ratio.toFixed(2)}× median (${dLen} vs ${medianLen} chars).`,
            false,
            "SOFT_FAIL",
            {
              distractorIdx: distractorIndices[i],
              distractorText: distractors[i].substring(0, 60),
              charLength: dLen,
              medianLength: medianLen,
              ratio,
            }
          ));
        }
      }
    }

    // ── CHECK 4: Parallelism (grammatical structure consistency) ─────────────
    // Check if all options share the same starting pattern (article, capitalization).
    // This is a STRUCTURAL check, not a content check.
    const starters = options.map((o) => {
      const norm = normalize(o);
      const firstWord = norm.split(/\s+/)[0] ?? "";
      return firstWord;
    });

    // If ≥3 options start with the same word and one doesn't, flag it
    const starterCounts = new Map<string, number>();
    for (const s of starters) {
      starterCounts.set(s, (starterCounts.get(s) ?? 0) + 1);
    }
    const dominantStarter = [...starterCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0];

    if (dominantStarter && dominantStarter[1] >= options.length - 1) {
      // All but one start with the same word — check if the outlier is a distractor
      const outlierIdx = starters.findIndex((s) => s !== dominantStarter[0]);
      if (outlierIdx >= 0 && outlierIdx !== answerIdx) {
        findings.push(finding(
          "DISTRACTOR_PARALLELISM_BREAK",
          `Distractor at index ${outlierIdx} starts with '${starters[outlierIdx]}' while all other options start with '${dominantStarter[0]}'.`,
          false,
          "SOFT_FAIL",
          {
            outlierIdx,
            outlierText: options[outlierIdx].substring(0, 60),
            dominantStarter: dominantStarter[0],
          }
        ));
      }
    }

    // ── CHECK 5: Semantic overlap (distractor tokens mostly in correct answer) ─
    // If a distractor's content tokens are a strict subset of the correct answer's
    // tokens, the distractor may just be the answer with words removed.
    const correctTokens = tokenize(correctText);
    for (let i = 0; i < distractors.length; i++) {
      const dTokens = tokenize(distractors[i]);
      if (dTokens.size === 0) continue;

      // Check if >80% of distractor tokens appear in correct answer
      const overlapCount = [...dTokens].filter((t) => correctTokens.has(t)).length;
      const overlapRatio = overlapCount / dTokens.size;

      if (overlapRatio >= 0.80 && dTokens.size >= 2) {
        findings.push(finding(
          "DISTRACTOR_SUBSET_OF_ANSWER",
          `Distractor at index ${distractorIndices[i]} tokens are ${overlapRatio.toFixed(0)}% contained in correct answer — may be answer-derived.`,
          false,
          "SOFT_FAIL",
          {
            distractorIdx: distractorIndices[i],
            distractorText: distractors[i].substring(0, 60),
            correctText: correctText.substring(0, 60),
            overlapRatio,
          }
        ));
      }
    }

    if (findings.filter((f) => f.status === "FAIL").length === 0) {
      findings.push(pass(
        `All ${distractors.length} distractors pass quality checks (near-dup, answer-proximity, length, parallelism, semantic overlap).`
      ));
    }

    return findings;
  },
};
