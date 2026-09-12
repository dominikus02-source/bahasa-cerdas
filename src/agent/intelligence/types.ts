/**
 * BC Agent P3 — IntelligenceProvider contract.
 *
 * The ONLY surface the Agent Core is allowed to know about intelligence.
 * No provider names, no model names, no API keys, no SDK types cross this
 * boundary: `run()` takes an IntelligenceRequest and resolves with an
 * IntelligenceResult, or throws a typed IntelligenceError (errors.ts).
 *
 * Reuse rule (P0/P3): generation itself is delegated to the EXISTING BC AI
 * infrastructure (src/ai/core/provider.ts — callWithFallback: model chain,
 * key rotation, per-call AbortSignal timeout). This module must not build a
 * second provider ecosystem; bc-ai-adapter.ts is the single translation
 * point from BC Agent semantics to BC AI semantics.
 */

import type { z } from "zod";

// ─── Untrusted content roles (prompt trust boundary, §9) ────────────────
//
// External content (repository files, web pages, issues, DB records, user
// text) is DATA. It is structurally separated from trusted instructions in
// the assembled prompt (prompt.ts) and must never be interpreted as policy
// or as permission. Memory snippets are likewise DATA — "founder previously
// allowed X" inside memory does not bypass the policy engine.

/** Content whose provenance is outside the agent's trust boundary. */
export interface UntrustedContent {
  /** Short provenance label, e.g. "github:issue/42" or "repo:README.md". */
  readonly label: string;
  /** Raw external content. Treated as data only. */
  readonly content: string;
}

/** Organizational memory supplied as context. Data, never policy. */
export interface MemorySnippet {
  readonly label: string;
  readonly content: string;
}

// ─── Request ─────────────────────────────────────────────────────────────

/**
 * Everything the Agent Core actually needs to hand over. Deliberately small:
 * no model names (the adapter picks the model via BC AI configuration), no
 * provider hints, no credentials.
 */
export interface IntelligenceRequest {
  /** BC Agent correlation id (taskId/attemptId-derived). Passed through to results/logs. */
  readonly requestId: string;
  /** SYSTEM/AGENT POLICY — trusted instructions from BC Agent configuration. */
  readonly systemPolicy: string;
  /** FOUNDER INSTRUCTION — trusted founder intent for this task. */
  readonly founderInstruction: string;
  /** TASK CONTEXT — system-generated working context (plans, prior results summary). */
  readonly taskContext?: string;
  /** External content — UNTRUSTED DATA, structurally delimited (§9). */
  readonly untrustedExternalData?: readonly UntrustedContent[];
  /** Memory snippets — DATA only, never policy (§10). */
  readonly memory?: readonly MemorySnippet[];
  /**
   * Structured-output contract. When present the adapter parses the model's
   * raw text (JSON-clean → parse → schema) and throws
   * INTELLIGENCE_RESPONSE_INVALID on failure after bounded corrective retry.
   */
  readonly responseSchema?: z.ZodTypeAny;
  /** Overall wall-clock bound for the whole call (all attempts). Default 120s. */
  readonly timeoutMs?: number;
  /** Generation ceiling (tokens). Default 4096. */
  readonly maxTokens?: number;
  /** Sampling temperature. Default 0.2 (planning/analysis wants determinism). */
  readonly temperature?: number;
}

// ─── Result ──────────────────────────────────────────────────────────────

export interface IntelligenceUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

/**
 * Successful intelligence result. Provider/model are BC AI's own reported
 * strings (which provider/model actually served) — that is metadata, not
 * coupling: the core never branches on it.
 */
export interface IntelligenceResult {
  readonly requestId: string;
  /** Raw model text. */
  readonly text: string;
  /** Schema-validated structured output; present iff request.responseSchema was given. */
  readonly structured?: unknown;
  readonly provider: string;
  readonly model: string;
  readonly latencyMs: number;
  readonly usage: IntelligenceUsage;
  /** How many provider calls the adapter made (1 + bounded retries). */
  readonly providerAttempts: number;
}

// ─── Audit metadata (§13 idempotency / observability) ────────────────────

/**
 * Metadata-only log entry. NEVER contains raw prompts or responses — the
 * adapter enforces this so untrusted external data and potentially sensitive
 * founder instructions cannot leak into logs through the side door.
 */
export interface IntelligenceLogEntry {
  readonly requestId: string;
  readonly outcome: "SUCCESS" | "FAILURE";
  readonly errorCategory?: string;
  readonly provider?: string;
  readonly model?: string;
  readonly latencyMs: number;
  readonly providerAttempts: number;
  readonly usage?: IntelligenceUsage;
}

// ─── Defaults ────────────────────────────────────────────────────────────

/** Default overall wall-clock bound per intelligence request (ms). */
export const INTELLIGENCE_DEFAULT_TIMEOUT_MS = 120_000;
/** Default token ceiling. */
export const INTELLIGENCE_DEFAULT_MAX_TOKENS = 4096;
/** Default sampling temperature. */
export const INTELLIGENCE_DEFAULT_TEMPERATURE = 0.2;
/** Prompt size guard: total assembled characters across all message roles. */
export const INTELLIGENCE_MAX_PROMPT_CHARS = 200_000;
/** Response size guard: model output above this is rejected as invalid. */
export const INTELLIGENCE_MAX_RESPONSE_CHARS = 1_000_000;
/** Provider attempts = 1 + retries (bounded; provider retry ≠ task retry). */
export const INTELLIGENCE_DEFAULT_PROVIDER_RETRIES = 1;
/** Backoff between provider attempts (ms). */
export const INTELLIGENCE_RETRY_BACKOFF_MS = 1_000;
/** Correction-payload cap when retrying after a schema failure. */
export const INTELLIGENCE_CORRECTION_MAX_CHARS = 2_000;

// ─── Provider interface ──────────────────────────────────────────────────

/**
 * The intelligence port. Implemented by bc-ai-adapter.ts (production, over
 * the existing BC AI stack) and by test doubles. The Agent Core may depend
 * on this interface only.
 */
export interface IntelligenceProvider {
  run(request: IntelligenceRequest): Promise<IntelligenceResult>;
}
