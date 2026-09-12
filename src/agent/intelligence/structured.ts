/**
 * BC Agent P3 — bounded structured-output pipeline (§8).
 *
 *   raw model text → size guard → JSON clean (BC AI's own output-validator)
 *   → parse → zod schema → IntelligenceResult.structured
 *
 * Malformed output → INTELLIGENCE_RESPONSE_INVALID with the parse/validation
 * error summarized (truncated, content-safe). The adapter may retry once
 * with a corrective addendum — bounded, never infinite.
 *
 * Reuse rule: cleaning logic comes from the existing BC AI
 * `output-validator.ts` (cleanJSONOutput/tryFixJSON) — NOT reimplemented.
 */

import { z } from "zod";

import { cleanJSONOutput, tryFixJSON } from "../../ai/core/output-validator";
import {
  INTELLIGENCE_MAX_RESPONSE_CHARS,
  type IntelligenceRequest,
} from "./types";
import { IntelligenceError } from "./errors";

export interface StructuredParseSuccess {
  readonly ok: true;
  readonly structured: unknown;
  readonly cleanedText: string;
}

export interface StructuredParseFailure {
  readonly ok: false;
  /** Short, content-safe reason (first 300 chars, no raw payload). */
  readonly reason: string;
}

export type StructuredParseResult = StructuredParseSuccess | StructuredParseFailure;

/**
 * Parse raw model text against the request's schema.
 * Returns a discriminated result — throws nothing (the adapter decides
 * whether to retry or fail).
 */
export function parseStructured(
  raw: string,
  schema: z.ZodTypeAny,
  maxResponseChars = INTELLIGENCE_MAX_RESPONSE_CHARS
): StructuredParseResult {
  if (raw.length > maxResponseChars) {
    return { ok: false, reason: `Respon ${raw.length} karakter melebihi batas ${maxResponseChars}` };
  }

  const direct = attempt(raw, schema);
  if (direct !== null) return { ok: true, structured: direct, cleanedText: raw };

  // BC AI's existing recovery pass (fences, trailing commas, wrapped JSON).
  const { fixed, success } = tryFixJSON(raw);
  if (success) {
    const recovered = attempt(fixed, schema);
    if (recovered !== null) return { ok: true, structured: recovered, cleanedText: fixed };
  }

  const lastError = describeLastAttempt(raw, schema);
  return {
    ok: false,
    reason: lastError ? `Output tidak sesuai skema: ${lastError}` : "Output bukan JSON yang valid",
  };
}

function attempt(text: string, schema: z.ZodTypeAny): unknown | null {
  let parsed: unknown;
  try {
    const { cleaned } = cleanJSONOutput(text);
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  const result = schema.safeParse(parsed);
  return result.success ? result.data : null;
}

/** Content-safe summary of the final failure (schema issues, truncated). */
function describeLastAttempt(text: string, schema: z.ZodTypeAny): string | null {
  try {
    const { cleaned } = cleanJSONOutput(text);
    const parsed: unknown = JSON.parse(cleaned);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return result.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ")
        .slice(0, 300);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Build the corrective user-message addendum for one bounded retry after a
 * schema failure. Carries a truncated excerpt of the failure reason — not
 * the full raw output (keeps prompts bounded and sensitive content out).
 */
export function correctionAddendum(
  request: IntelligenceRequest,
  failureReason: string
): string {
  const excerpt = failureReason.slice(0, 300);
  const schemaNote = request.responseSchema
    ? "Kembalikan HANYA JSON valid sesuai skema yang diminta, tanpa teks pembuka/penutup."
    : "Kembalikan jawaban yang valid.";
  return (
    `${schemaNote}\n` +
    `Kegagalan sebelumnya: ${excerpt}\n` +
    "Perbaiki dan kirim ulang."
  );
}
