/**
 * Question Factory V2 — Security / Leakage Validator (P3.3 §7, P3.4 §V.7).
 *
 * Stage 3: Protect answer key, correct answer, internal metadata, D10,
 * misconception, reviewer comments, provenance, scoring internals.
 *
 * Distinguishes INTERNAL_ITEM vs DELIVERY_SAFE_ITEM.
 *
 * Section references:
 *   P3.3 §7     — Security & leakage validation
 *   P3.3 §14    — Delivery-safe contract
 *   P3.4 §V.7   — Security validator specification
 *   P3.3 §14.2  — Fields NEVER sent to student client
 */

import { INTERNAL_FIELDS } from "./types";
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
    validatorId: "security",
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
    validatorId: "security",
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
 * Security / Leakage Validator — detects answer-key leakage and metadata leaks.
 *
 * Checks:
 *   - Correct answer text appears verbatim in stem (KEY_IN_STEM)
 *   - Internal metadata fields in any student-facing content
 *   - D10 state leaked in stem or options
 *   - Misconception text leaked in stem
 *   - Provenance info leaked in stem
 *   - Reviewer comments leaked in stem
 */
export const securityValidator: Validator = {
  id: "security",
  version: VERSION,
  stage: 3,

  validate(item: CanonicalItem, _ctx: ValidationContext): ValidationFinding[] {
    const findings: ValidationFinding[] = [];
    const stem = item.content.stem;
    const options = item.content.options;
    const qType = item.responseModel.questionType;
    const correctAnswer = item.responseModel.correctAnswer;

    // ─── KEY_IN_STEM: correct answer text verbatim in stem ────────────────
    // Only for PG/BS (index-based), check if the correct option text is in stem
    if ((qType === "PILIHAN_GANDA" || qType === "BENAR_SALAH") &&
        Array.isArray(options) && options.length > 0) {
      const answerIdx = parseInt(String(correctAnswer).trim(), 10);
      if (!isNaN(answerIdx) && answerIdx >= 0 && answerIdx < options.length) {
        const correctText = options[answerIdx];
        const correctNorm = normalizeText(correctText);
        const stemNorm = normalizeText(stem);

        // Only flag if stem is short enough (not a passage) and overlap is significant
        const isPassage = stem.includes("\n") || stem.length >= 200;
        if (!isPassage && correctNorm.length >= 4 && stemNorm.includes(correctNorm)) {
          findings.push(finding(
            "KEY_IN_STEM",
            `Correct option '${correctText.substring(0, 60)}...' appears verbatim in stem.`,
            true,
            "HARD_FAIL",
            { correctOption: correctText.substring(0, 80) }
          ));
        }
      }
    }

    // ─── SECURITY_LEAK_METADATA: internal metadata in stem/options ────────
    const lowerStem = stem.toLowerCase();
    const lowerOptions = options.map((o) => o.toLowerCase());
    const allText = [lowerStem, ...lowerOptions].join(" ");

    // Check for D10 state leakage
    const d10Patterns = [
      /d10\s*(state|status|level)\s*[:=]\s*(not_applicable|hypothesis|reviewed|empirically_supported)/i,
      /diagnostic\s*value\s*(state|level)\s*[:=]/i,
    ];
    for (const pattern of d10Patterns) {
      if (pattern.test(allText)) {
        findings.push(finding(
          "SECURITY_LEAK_METADATA",
          "D10 state/diagnostic value information detected in student-facing content.",
          true
        ));
        break;
      }
    }

    // Check for misconception text leakage
    if (item.purpose.misconceptionTarget && item.purpose.misconceptionTarget.length > 0) {
      for (const mt of item.purpose.misconceptionTarget) {
        const mtNorm = normalizeText(mt.misconception);
        if (mtNorm.length >= 10) {
          for (const text of [stem, ...options]) {
            const textNorm = normalizeText(text);
            if (textNorm.includes(mtNorm)) {
              findings.push(finding(
                "SECURITY_LEAK_METADATA",
                `Misconception text ('${mt.misconception.substring(0, 50)}...') detected in student-facing content.`,
                true
              ));
              break;
            }
          }
        }
      }
    }

    // Check for provenance leakage
    const provenancePatterns = [
      /provenance\s*[:=]\s*(ai|human_review|import|master_bank)/i,
      /ai[_\s]*(generated|provider|model|confidence)\s*[:=]/i,
      /reviewer[_\s]*(comments?|id)\s*[:=]/i,
    ];
    for (const pattern of provenancePatterns) {
      if (pattern.test(allText)) {
        findings.push(finding(
          "SECURITY_LEAK_METADATA",
          "Provenance/reviewer information detected in student-facing content.",
          true
        ));
        break;
      }
    }

    // ─── DELIVERY_SAFE_FIELDS check (stage 7 equivalent) ─────────────────
    // Verify that the canonical item does not have internal fields exposed
    // in content fields. This is a structural check on the item itself.
    for (const field of INTERNAL_FIELDS) {
      if (field in item.content) {
        findings.push(finding(
          "DELIVERY_UNSAFE_FIELDS",
          `Internal field '${field}' found in content (should never be student-facing).`,
          true
        ));
      }
    }

    if (findings.filter((f) => f.status === "FAIL").length === 0) {
      findings.push(pass("No security/leakage issues detected."));
    }

    return findings;
  },
};
