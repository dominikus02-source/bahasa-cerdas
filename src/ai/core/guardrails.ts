/**
 * Guardrails — content safety and policy checks applied to AI inputs/outputs.
 *
 * Rules:
 * - PII detection (emails, phones, NIK — flag/log but do not block)
 * - Profanity check (Indonesian language)
 * - Upstream/downstream policy compliance
 *
 * All checks return { passed, warnings } — never block by default.
 */

export interface GuardrailResult {
  passed: boolean;
  warnings: string[];
  violations: { rule: string; detail: string }[];
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+62|62|0)8[1-9][0-9]{6,12}/g;
const NIK_REGEX = /\b[1-9]\d{15}\b/g;

// Indonesian-language profanity list (abridged — expand in production)
const PROFANITY_LIST = [
  "anjing", "babi", "bangsat", "brengsek", "kampret",
  "keparat", "kontol", "memek", "ngentot", "pantek",
  "perek", "sarap", "setan", "sial", "tolol",
];

function hasIndonesianProfanity(text: string): string[] {
  const lower = text.toLowerCase();
  return PROFANITY_LIST.filter((word) => lower.includes(word));
}

export function checkInput(text: string): GuardrailResult {
  const warnings: string[] = [];
  const violations: { rule: string; detail: string }[] = [];

  const emails = text.match(EMAIL_REGEX);
  if (emails) {
    warnings.push(`Input contains ${emails.length} email address(es) — PII detected`);
  }

  const phones = text.match(PHONE_REGEX);
  if (phones) {
    warnings.push(`Input contains ${phones.length} phone number(s) — PII detected`);
  }

  const nik = text.match(NIK_REGEX);
  if (nik) {
    warnings.push("Input contains potential NIK — sensitive PII detected");
  }

  const profanity = hasIndonesianProfanity(text);
  if (profanity.length > 0) {
    warnings.push(`Input contains inappropriate language: ${profanity.join(", ")}`);
    violations.push({ rule: "no-profanity", detail: `Found: ${profanity.join(", ")}` });
  }

  return {
    passed: violations.length === 0,
    warnings,
    violations,
  };
}

export function checkOutput(text: string): GuardrailResult {
  // Same checks for now — can be extended separately
  return checkInput(text);
}
