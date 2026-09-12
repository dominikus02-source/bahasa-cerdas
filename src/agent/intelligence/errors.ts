/**
 * BC Agent P3 — typed intelligence errors.
 *
 * Normalizes every BC AI failure into seven machine-readable categories.
 * The Agent Core branches on `category` (and instanceof), never on message
 * strings and never on provider-specific error shapes. Diagnostic detail is
 * preserved but SANITIZED: category-specific messages contain HTTP status
 * and error-kind only — never response bodies, never headers, never keys.
 */

import { AgentError } from "../core/errors";

/** The seven canonical categories (P3 brief §3). */
export const INTELLIGENCE_ERROR_CATEGORIES = [
  "INTELLIGENCE_TIMEOUT",
  "INTELLIGENCE_RATE_LIMIT",
  "INTELLIGENCE_UNAVAILABLE",
  "INTELLIGENCE_AUTH_ERROR",
  "INTELLIGENCE_INVALID_REQUEST",
  "INTELLIGENCE_PROVIDER_ERROR",
  "INTELLIGENCE_RESPONSE_INVALID",
] as const;

export type IntelligenceErrorCategory = (typeof INTELLIGENCE_ERROR_CATEGORIES)[number];

/**
 * Recoverable = the same request may succeed later (provider-side trouble).
 * → maps to WAITING_INTELLIGENCE.
 * Permanent = retrying the identical request cannot help (bad request /
 * bad config / bad output). → maps to FAILED.
 */
export const RECOVERABLE_CATEGORIES: readonly IntelligenceErrorCategory[] = [
  "INTELLIGENCE_TIMEOUT",
  "INTELLIGENCE_RATE_LIMIT",
  "INTELLIGENCE_UNAVAILABLE",
  "INTELLIGENCE_PROVIDER_ERROR",
];

export function isRecoverableIntelligenceError(
  e: unknown
): e is IntelligenceError {
  return e instanceof IntelligenceError && RECOVERABLE_CATEGORIES.includes(e.category);
}

/**
 * Maps an HTTP status from a provider to a canonical category. Exported for
 * the adapter and for tests — this is the single source of the mapping.
 */
export function categoryForHttpStatus(status: number): IntelligenceErrorCategory {
  if (status === 401 || status === 403) return "INTELLIGENCE_AUTH_ERROR";
  if (status === 408) return "INTELLIGENCE_TIMEOUT";
  if (status === 429) return "INTELLIGENCE_RATE_LIMIT";
  if (status >= 500) return "INTELLIGENCE_UNAVAILABLE";
  return "INTELLIGENCE_INVALID_REQUEST"; // 400/404/413/422 …
}

/** True when the error chain smells like a deadline (AbortError etc.). */
export function isTimeoutLikeMessage(message: string): boolean {
  return /timeout|timed?\s*out|abort/i.test(message);
}

export class IntelligenceError extends AgentError {
  readonly code = "INTELLIGENCE_ERROR";

  constructor(
    /** One of the seven canonical categories. */
    public readonly category: IntelligenceErrorCategory,
    /**
     * Sanitized human message. The adapter must never place response bodies,
     * headers, URLs with credentials, or raw provider payloads here.
     */
    message: string,
    /**
     * Safe diagnostic extras (e.g. `httpStatus`, `providerAttempts`).
     * MUST NOT contain secrets or raw payloads — enforced by adapter review
     * and asserted by the test suite.
     */
    public readonly details?: Record<string, unknown>,
    /** Original error, preserved internally for server-side diagnostics. */
    cause?: unknown
  ) {
    super(`[${category}] ${message}`);
    if (cause instanceof Error) this.cause = cause;
  }
}

/** Thrown when the request itself violates the contract (invalid shapes). */
export class InvalidIntelligenceRequestError extends AgentError {
  readonly code = "INVALID_INTELLIGENCE_REQUEST";
  constructor(message: string) {
    super(message);
  }
}
