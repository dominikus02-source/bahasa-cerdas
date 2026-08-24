/**
 * Daily Action Engine — Question Quality Gate 1.0
 *
 * Pure validation layer. No DB lookups, no side effects.
 * Each candidate is checked deterministically in-memory.
 * Result: PASS (eligible) or REJECT (with reasons).
 */
import type { DailyCandidate } from "./types";

// ── Rejection Reasons ──────────────────────────────────────

export const REJECTION = {
  MISSING_TEXT: "MISSING_TEXT",
  TEXT_TOO_SHORT: "TEXT_TOO_SHORT",
  PLACEHOLDER_CONTENT: "PLACEHOLDER_CONTENT",
  EMPTY_OPTIONS: "EMPTY_OPTIONS",
  TOO_FEW_OPTIONS: "TOO_FEW_OPTIONS",
  DUPLICATE_OPTIONS: "DUPLICATE_OPTIONS",
  EMPTY_OPTION: "EMPTY_OPTION",
  INVALID_SOURCE: "INVALID_SOURCE",
  MISSING_SKILL: "MISSING_SKILL",
  QUESTION_TOO_LONG: "QUESTION_TOO_LONG",
  TAOPOLOGY_IN_OPTIONS: "TAUTOLOGY_IN_OPTIONS",
} as const;

export type RejectionReason =
  (typeof REJECTION)[keyof typeof REJECTION];

export interface QualityGateResult {
  eligible: boolean;
  reasons: RejectionReason[];
}

// ── Text Quality ───────────────────────────────────────────

/** Minimum characters for a question to be considered real */
const MIN_TEXT_LENGTH = 5;

/** Maximum characters — reject obviously broken / huge text */
const MAX_TEXT_LENGTH = 5000;

/** Placeholders / low-quality indicators (case-insensitive) */
const PLACEHOLDER_PATTERNS = [
  /^(test|todo|tbd|xxx|\?{2,}|placeholder|contoh soal|test question)$/i,
  /^lorem ipsum/i,
  /^[.\-_=]{3,}$/,
];

function checkTextQuality(text: string): RejectionReason[] {
  const errors: RejectionReason[] = [];
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    errors.push(REJECTION.MISSING_TEXT);
    return errors;
  }

  if (trimmed.length < MIN_TEXT_LENGTH) {
    errors.push(REJECTION.TEXT_TOO_SHORT);
  }

  if (trimmed.length > MAX_TEXT_LENGTH) {
    errors.push(REJECTION.QUESTION_TOO_LONG);
  }

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(trimmed)) {
      errors.push(REJECTION.PLACEHOLDER_CONTENT);
      break;
    }
  }

  return errors;
}

// ── Options Quality ────────────────────────────────────────

/** Minimum options required for a valid multiple-choice question */
const MIN_OPTIONS = 2;

function parseOptions(raw: string): unknown[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function checkOptionsQuality(
  optionsRaw: string
): RejectionReason[] {
  const errors: RejectionReason[] = [];

  if (!optionsRaw || optionsRaw.trim().length === 0) {
    errors.push(REJECTION.EMPTY_OPTIONS);
    return errors;
  }

  const options = parseOptions(optionsRaw);

  if (options === null) {
    errors.push(REJECTION.EMPTY_OPTIONS);
    return errors;
  }

  if (options.length < MIN_OPTIONS) {
    errors.push(REJECTION.TOO_FEW_OPTIONS);
    return errors;
  }

  const normalized = new Set<string>();
  let hasEmpty = false;

  for (const opt of options) {
    const text = String(opt ?? "").trim();
    if (text.length === 0) {
      hasEmpty = true;
    }
    normalized.add(text.toLowerCase());
  }

  if (hasEmpty) {
    errors.push(REJECTION.EMPTY_OPTION);
  }

  // Check for duplicate options (only if all options are non-empty)
  if (!hasEmpty && normalized.size < options.length) {
    errors.push(REJECTION.DUPLICATE_OPTIONS);
  }

  return errors;
}

// ── Source Quality ──────────────────────────────────────────

const VALID_SOURCES = new Set(["TKA", "UKBI"]);

function checkSource(source: string): RejectionReason[] {
  if (!VALID_SOURCES.has(source)) {
    return [REJECTION.INVALID_SOURCE];
  }
  return [];
}

// ── Skill Quality ──────────────────────────────────────────

const VALID_SKILLS = new Set([
  "READING",
  "WRITING",
  "GRAMMAR",
  "VOCABULARY",
  "LISTENING",
  "SPEAKING",
  "LITERATURE",
]);

function checkSkill(skill: string | null): RejectionReason[] {
  if (skill !== null && !VALID_SKILLS.has(skill)) {
    // Non-canonical skill is a warning, not a hard reject.
    // The engine has a fallback (default READING), so we allow it.
    return [];
  }
  return [];
}

// ── Main Quality Gate ──────────────────────────────────────

/**
 * Validate a single candidate against all quality rules.
 *
 * Returns PASS if all rules pass, or REJECT with specific reasons.
 *
 * RULES (in evaluation order):
 *   1. Source must be valid (TKA / UKBI only)
 *   2. Question text must be present, not empty, not placeholder
 *   3. Options must be parseable array with ≥2 entries
 *   4. No empty option values
 *   5. No duplicate options
 *   6. Skill must be canonical (soft — allows fallback)
 */
export function validateCandidate(
  candidate: DailyCandidate
): QualityGateResult {
  const reasons: RejectionReason[] = [];

  // 1. Source
  reasons.push(...checkSource(candidate.source));

  // 2. Text
  reasons.push(...checkTextQuality(candidate.questionText));

  // 3. Options
  reasons.push(...checkOptionsQuality(candidate.options));

  // 4. Skill (soft — non-canonical allowed with fallback)
  reasons.push(...checkSkill(candidate.skill));

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

/**
 * Filter an array of candidates through the quality gate.
 * Returns only eligible candidates.
 */
export function filterByQuality(
  candidates: DailyCandidate[]
): DailyCandidate[] {
  return candidates.filter((c) => validateCandidate(c).eligible);
}

/**
 * Get quality gate statistics for a batch of candidates.
 * Useful for logging / debugging without affecting the flow.
 */
export function qualityStats(candidates: DailyCandidate[]): {
  total: number;
  passed: number;
  rejected: number;
  rejectionReasons: Record<RejectionReason, number>;
} {
  const rejectionReasons = {} as Record<RejectionReason, number>;
  let passed = 0;

  for (const c of candidates) {
    const result = validateCandidate(c);
    if (result.eligible) {
      passed++;
    } else {
      for (const r of result.reasons) {
        rejectionReasons[r] = (rejectionReasons[r] ?? 0) + 1;
      }
    }
  }

  return {
    total: candidates.length,
    passed,
    rejected: candidates.length - passed,
    rejectionReasons,
  };
}
