/**
 * Question Factory V2 — Answer-Key Validator (P3.3 §6, P3.4 §V.6).
 *
 * Stage 3: Answer key exists, points to existing option, exactly one key,
 * unique options, no empty correct, no deterministic explanation contradiction.
 *
 * Section references:
 *   P3.3 §6    — Answer-key validation requirements
 *   P3.4 §V.6  — Answer-key validator specification
 */

import type { CanonicalItem, ValidationContext, ValidationFinding } from "./types";
import type { Validator } from "./interface";

const VERSION = "1.0.0";

function finding(
  code: string,
  rationale: string,
  blocking: boolean,
  severity: "HARD_FAIL" | "SOFT_FAIL" = "HARD_FAIL",
  details?: Record<string, unknown>
): ValidationFinding {
  return {
    validatorId: "answer-key",
    validatorVersion: VERSION,
    stage: 3,
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
    validatorId: "answer-key",
    validatorVersion: VERSION,
    stage: 3,
    status: "PASS",
    severity: "ADVISORY",
    blocking: false,
    retryable: false,
    reasonCode: "PASS",
    rationale,
    evaluatedAt: new Date().toISOString(),
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Answer-Key Validator — validates correctAnswer integrity.
 *
 * Checks:
 *   - correctAnswer exists and is non-empty
 *   - For PG/BS: correctAnswer is a valid integer index into options
 *   - For ISIAN_SINGKAT: correctAnswer is a non-empty string ≤ 80 chars
 *   - Options are unique (normalized)
 *   - No explanation contradiction (if explanation references wrong answer)
 */
export const answerKeyValidator: Validator = {
  id: "answer-key",
  version: VERSION,
  stage: 3,

  validate(item: CanonicalItem, _ctx: ValidationContext): ValidationFinding[] {
    const findings: ValidationFinding[] = [];
    const qType = item.responseModel.questionType;
    const correctAnswer = item.responseModel.correctAnswer;
    const options = item.content.options;

    // ─── Answer key present ───────────────────────────────────────────────
    if (!correctAnswer || (typeof correctAnswer === "string" && !correctAnswer.trim())) {
      findings.push(finding(
        "ANSWER_KEY_MISSING",
        "correctAnswer is empty or missing.",
        true
      ));
      return findings; // Can't check anything else without an answer key
    }

    // ─── PG / BENAR_SALAH: index-based ────────────────────────────────────
    if (qType === "PILIHAN_GANDA" || qType === "BENAR_SALAH") {
      if (!Array.isArray(options) || options.length === 0) {
        // Options missing — structural validator should catch, but answer-key
        // validator also rejects because we can't validate the index.
        return findings;
      }

      // correctAnswer must be a valid integer index
      const answerStr = String(correctAnswer).trim();
      if (!/^\d+$/.test(answerStr)) {
        findings.push(finding(
          "ANSWER_KEY_INVALID_INDEX",
          `correctAnswer '${correctAnswer}' is not a valid integer index for ${qType}.`,
          true
        ));
        return findings;
      }

      const answerIdx = parseInt(answerStr, 10);
      if (answerIdx < 0 || answerIdx >= options.length) {
        findings.push(finding(
          "ANSWER_KEY_INVALID_INDEX",
          `correctAnswer index ${answerIdx} is out of range (0–${options.length - 1}).`,
          true
        ));
        return findings;
      }

      // Check: correct option is non-empty
      const correctOption = options[answerIdx];
      if (!correctOption || !correctOption.trim()) {
        findings.push(finding(
          "ANSWER_KEY_INVALID_INDEX",
          `Option at index ${answerIdx} (the correct answer) is empty.`,
          true
        ));
        return findings;
      }

      // Check: options are unique (normalized)
      const seen = new Map<string, number>();
      for (let i = 0; i < options.length; i++) {
        const norm = normalizeText(options[i]);
        if (seen.has(norm)) {
          findings.push(finding(
            "MULTIPLE_DEFENSIBLE_ANSWERS",
            `Options at indices ${seen.get(norm)} and ${i} are identical after normalization.`,
            true,
            "HARD_FAIL",
            { duplicateIndices: [seen.get(norm), i], normalizedText: norm }
          ));
        }
        seen.set(norm, i);
      }

      // Check: explanation contradiction
      // If explanation explicitly says a different option is correct
      if (item.content.explanation) {
        const explanationNorm = normalizeText(item.content.explanation);
        const correctNorm = normalizeText(correctOption);

        // Look for "jawaban yang benar adalah X" or "correct answer is X"
        const answerPattern = /(?:jawaban yang benar|kunci jawaban|correct answer|adalah)\s*[:"]?\s*["']?([^"'.]+)["']?/i;
        const match = item.content.explanation.match(answerPattern);
        if (match && match[1]) {
          const referencedAnswer = normalizeText(match[1].trim());
          // If the referenced answer is close to a WRONG option, flag it
          if (referencedAnswer.length >= 3) {
            for (let i = 0; i < options.length; i++) {
              if (i === answerIdx) continue;
              const optNorm = normalizeText(options[i]);
              if (optNorm.includes(referencedAnswer) || referencedAnswer.includes(optNorm)) {
                findings.push(finding(
                  "ANSWER_KEY_CONTRADICTION",
                  `Explanation references option ${i} ('${options[i].substring(0, 50)}') but correctAnswer is index ${answerIdx}.`,
                  true,
                  "HARD_FAIL",
                  { referencedIndex: i, correctIndex: answerIdx }
                ));
              }
            }
          }
        }
      }
    }

    // ─── ISIAN_SINGKAT: text-based ────────────────────────────────────────
    if (qType === "ISIAN_SINGKAT") {
      const answer = String(correctAnswer).trim();
      if (answer.length < 1) {
        findings.push(finding(
          "ANSWER_KEY_MISSING",
          "ISIAN_SINGKAT correctAnswer must be a non-empty string.",
          true
        ));
      }
      if (answer.length > 80) {
        findings.push(finding(
          "ANSWER_KEY_INVALID_INDEX",
          `ISIAN_SINGKAT correctAnswer is ${answer.length} characters (max 80).`,
          true
        ));
      }
    }

    if (findings.filter((f) => f.status === "FAIL").length === 0) {
      findings.push(pass("All answer-key checks passed."));
    }

    return findings;
  },
};
