/**
 * Question Factory V2 — Structural Validator (P3.4 §V.5, P3.3 §5).
 *
 * Stage 0–2: Required fields, field types, response model, option structure,
 * non-empty stem, valid identity, valid taxonomy references, stimulus structure.
 *
 * Reuses: `hasSkill`, `hasSubskills` from question-metadata/taxonomy.ts
 *         (canonical taxonomy, zero coupling to Prisma).
 *
 * Section references:
 *   P3.4 §V.5    — Structural validator specification
 *   P3.3 §5      — Structural validation requirements
 *   P3.3 §3      — Reason codes (STRUCTURE_*)
 */

import { hasSkill, hasSubskill } from "@/lib/question-metadata/taxonomy";
import type { CanonicalItem, ValidationContext, ValidationFinding } from "./types";
import type { Validator } from "./interface";

const VERSION = "1.0.0";

/** Supported question types (P3.3 §5). */
const VALID_TYPES = ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] as const;

/** Required fields for a canonical item (P3.3 §5). */
const REQUIRED_IDENTITY_FIELDS = ["id", "version", "source", "createdAt", "createdById"] as const;
const REQUIRED_CONTENT_FIELDS = ["stem"] as const;

function finding(
  code: string,
  rationale: string,
  stage: number,
  blocking: boolean,
  severity: "HARD_FAIL" | "SOFT_FAIL" | "ADVISORY" = blocking ? "HARD_FAIL" : "SOFT_FAIL",
  details?: Record<string, unknown>
): ValidationFinding {
  return {
    validatorId: "structural",
    validatorVersion: VERSION,
    stage,
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

function pass(rationale: string, stage: number): ValidationFinding {
  return {
    validatorId: "structural",
    validatorVersion: VERSION,
    stage,
    status: "PASS",
    severity: "ADVISORY",
    blocking: false,
    retryable: false,
    reasonCode: "PASS",
    rationale,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Structural Validator — checks item shape, types, and taxonomy.
 *
 * Stages covered:
 *   0 — Identity & required fields
 *   1 — Type & response model (options shape, correctAnswer shape)
 *   2 — Content quality (stem length, explanation, template detection)
 */
export const structuralValidator: Validator = {
  id: "structural",
  version: VERSION,
  stage: 0,

  validate(item: CanonicalItem, _ctx: ValidationContext): ValidationFinding[] {
    const findings: ValidationFinding[] = [];

    // ─── Stage 0: Identity & Required Fields ──────────────────────────────

    // Item ID
    if (!item.identity.id || typeof item.identity.id !== "string" || !item.identity.id.trim()) {
      findings.push(finding(
        "STRUCTURE_INVALID_IDENTITY",
        "Item ID is missing or empty.",
        0, true
      ));
    }

    // Source
    const validSources = ["MASTER_BANK", "AI", "IMPORT", "MANUAL", "UKBI", "TKA", "V2_PILOT"];
    if (!validSources.includes(item.identity.source)) {
      findings.push(finding(
        "STRUCTURE_INVALID_SOURCE",
        `Source '${item.identity.source}' is not a recognized ItemSource.`,
        0, true
      ));
    }

    // CreatedAt
    if (!item.identity.createdAt || typeof item.identity.createdAt !== "string") {
      findings.push(finding(
        "STRUCTURE_MISSING_FIELD",
        "identity.createdAt is missing.",
        0, true
      ));
    }

    // CreatedById
    if (!item.identity.createdById || typeof item.identity.createdById !== "string") {
      findings.push(finding(
        "STRUCTURE_MISSING_FIELD",
        "identity.createdById is missing.",
        0, true
      ));
    }

    // Version
    if (typeof item.identity.version !== "number" || item.identity.version < 1) {
      findings.push(finding(
        "STRUCTURE_MISSING_FIELD",
        "identity.version must be a positive integer.",
        0, true
      ));
    }

    // ─── Stage 1: Type & Response Model ───────────────────────────────────

    // Question type
    const qType = item.responseModel.questionType;
    if (!VALID_TYPES.includes(qType)) {
      findings.push(finding(
        "STRUCTURE_UNSUPPORTED_TYPE",
        `questionType '${qType}' is not supported. Must be one of: ${VALID_TYPES.join(", ")}`,
        1, true
      ));
    }

    // Options
    if (!Array.isArray(item.content.options)) {
      findings.push(finding(
        "STRUCTURE_OPTIONS_NOT_ARRAY",
        "content.options is not an array.",
        1, true
      ));
    } else {
      const opts = item.content.options;

      // Empty options
      if (opts.some((o) => typeof o !== "string" || !o.trim())) {
        findings.push(finding(
          "STRUCTURE_EMPTY_OPTION",
          "One or more options are empty or non-string.",
          1, true
        ));
      }

      // Type-specific option count
      if (qType === "PILIHAN_GANDA" && opts.length !== 4) {
        findings.push(finding(
          "STRUCTURE_INVALID_OPTION_COUNT",
          `PILIHAN_GANDA requires exactly 4 options; got ${opts.length}.`,
          1, true
        ));
      }
      if (qType === "BENAR_SALAH") {
        if (opts.length !== 2) {
          findings.push(finding(
            "STRUCTURE_INVALID_OPTION_COUNT",
            `BENAR_SALAH requires exactly 2 options; got ${opts.length}.`,
            1, true
          ));
        } else {
          const normalized = opts.map((o) => o.trim().toLowerCase());
          if (normalized[0] !== "benar" || normalized[1] !== "salah") {
            findings.push(finding(
              "STRUCTURE_BS_SHAPE_INVALID",
              `BENAR_SALAH options must be ['Benar', 'Salah']; got ['${opts[0]}', '${opts[1]}'].`,
              1, true
            ));
          }
        }
      }
      if (qType === "ISIAN_SINGKAT" && opts.length > 0) {
        findings.push(finding(
          "STRUCTURE_ISIAN_HAS_OPTIONS",
          "ISIAN_SINGKAT should not have options.",
          1, true
        ));
      }
    }

    // CorrectAnswer present (full check in answer-key validator)
    if (!item.responseModel.correctAnswer || typeof item.responseModel.correctAnswer !== "string") {
      findings.push(finding(
        "ANSWER_KEY_MISSING",
        "responseModel.correctAnswer is missing or not a string.",
        1, true
      ));
    }

    // ─── Stage 1 continued: Taxonomy ──────────────────────────────────────

    // Skill
    if (!item.taxonomy.skill || !hasSkill(item.taxonomy.skill)) {
      findings.push(finding(
        "STRUCTURE_INVALID_TAXONOMY",
        `taxonomy.skill '${item.taxonomy.skill}' is not a valid skill.`,
        1, true
      ));
    }

    // Subskill
    if (item.taxonomy.subskill && item.taxonomy.skill && hasSkill(item.taxonomy.skill)) {
      if (!hasSubskill(item.taxonomy.skill, item.taxonomy.subskill)) {
        findings.push(finding(
          "STRUCTURE_INVALID_TAXONOMY",
          `taxonomy.subskill '${item.taxonomy.subskill}' does not belong to skill '${item.taxonomy.skill}'.`,
          1, true
        ));
      }
    }

    // Difficulty
    const validDifficulties = ["EASY", "MEDIUM", "HARD"];
    if (!validDifficulties.includes(item.taxonomy.difficulty)) {
      findings.push(finding(
        "STRUCTURE_INVALID_TAXONOMY",
        `taxonomy.difficulty '${item.taxonomy.difficulty}' is not valid. Must be EASY, MEDIUM, or HARD.`,
        1, true
      ));
    }

    // Purpose
    const validPurposes = ["PRACTICE", "ACHIEVEMENT", "DIAGNOSTIC", "ADAPTIVE_MISCONCEPTION", "CALIBRATION"];
    if (!validPurposes.includes(item.purpose.purpose)) {
      findings.push(finding(
        "STRUCTURE_INVALID_TAXONOMY",
        `purpose.purpose '${item.purpose.purpose}' is not valid.`,
        1, true
      ));
    }

    // D10State
    const validD10 = ["NOT_APPLICABLE", "HYPOTHESIS", "REVIEWED", "EMPIRICALLY_SUPPORTED"];
    if (!validD10.includes(item.purpose.d10State)) {
      findings.push(finding(
        "STRUCTURE_INVALID_TAXONOMY",
        `purpose.d10State '${item.purpose.d10State}' is not valid.`,
        1, true
      ));
    }

    // ─── Stage 2: Content Quality ─────────────────────────────────────────

    // Stem empty
    const stem = item.content.stem;
    if (!stem || typeof stem !== "string" || !stem.trim()) {
      findings.push(finding(
        "STRUCTURE_EMPTY_STEM",
        "content.stem is empty or whitespace-only.",
        2, true
      ));
    }

    // Stem too short
    if (stem && stem.trim().length < 10) {
      findings.push(finding(
        "CONTENT_STEM_TOO_SHORT",
        `content.stem is only ${stem.trim().length} characters (minimum 10).`,
        2, false,
        "SOFT_FAIL"
      ));
    }

    // Template detection (P3.1 forensic, bank-gate.ts patterns)
    if (stem) {
      const templatePatterns = [
        /^berikut ini yang termasuk (contoh|jenis) /i,
        /^berikut yang termasuk (contoh|jenis) /i,
        /^manakah yang termasuk (contoh|jenis) /i,
        /^contoh [a-z ]+ (adalah|:|…|$)/i,
      ];
      if (templatePatterns.some((p) => p.test(stem.trim()))) {
        findings.push(finding(
          "TEMPLATE_STEM_DETECTED",
          "Stem matches known template pattern (forensic: 'contoh...' family).",
          2, true
        ));
      }
    }

    // Explanation (advisory)
    if (!item.content.explanation || item.content.explanation.trim().length === 0) {
      findings.push(finding(
        "CONTENT_EXPLANATION_MISSING",
        "content.explanation is empty (advisory — recommended for all items).",
        2, false,
        "ADVISORY"
      ));
    }

    // If no hard fails at this stage, add a pass
    if (findings.filter((f) => f.status === "FAIL").length === 0) {
      findings.push(pass("All structural checks passed.", 0));
    }

    return findings;
  },
};
