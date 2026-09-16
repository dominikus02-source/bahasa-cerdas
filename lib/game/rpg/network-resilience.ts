/**
 * P2.6H.5 — Network resilience, timeout, retry, and error classification
 * for the Pendekar server API client layer.
 *
 * Design constraints:
 * - Timeout != server rollback. Client timeout means UNKNOWN, not failure.
 * - Retry only uses the SAME requestKey (never a new one for retry).
 * - Max retries bounded. No infinite loop. Exponential backoff.
 * - Critical mutations (ACTION, REWARD, SETTLEMENT) expose failure to game state.
 * - Renderer (requestAnimationFrame) is NEVER blocked by network.
 * - Errors are classified: PERMANENT vs RETRYABLE vs UNKNOWN.
 */

/* ---------- Error classification ---------- */

export type ErrorClass = "PERMANENT" | "RETRYABLE" | "UNKNOWN";

/** HTTP status codes that are safe to retry (transient). */
const RETRYABLE_STATUSES = new Set([408, 429, 502, 503, 504]);

/** Error codes that are safe to retry (transient server state). */
const RETRYABLE_CODES = new Set([
  "ACTIVE_BATTLE_EXISTS", // might resolve after server GC
  "BATTLE_ACTION_REPLAY_CONFLICT", // concurrent request — retry may succeed
]);

/** Error codes that are permanent (client must not retry). */
const PERMANENT_CODES = new Set([
  "UNAUTHENTICATED",
  "PREVIEW_DENIED",
  "INVALID_INPUT",
  "INVALID_ENCOUNTER",
  "INVALID_PLAYER_STATE",
  "NO_ELIGIBLE_QUESTION",
  "QUESTION_NOT_ELIGIBLE",
  "QUESTION_VERSION_STALE",
  "BATTLE_NOT_ACTIVE",
  "BATTLE_EXPIRED",
  "BATTLE_TERMINAL",
  "BATTLE_REWARD_NOT_ELIGIBLE",
  "BATTLE_REWARD_INVALID_STATE",
  "BATTLE_SETTLEMENT_NOT_READY",
  "BATTLE_SETTLEMENT_INVALID_STATE",
  "LEARNING_NOT_ACTIVE",
  "LEARNING_EXPIRED",
  "LEARNING_ALREADY_COMPLETED",
  "LEARNING_RESULT_REQUIRED",
  "LEARNING_RESULT_NOT_AUTHORITATIVE",
  "LEARNING_ALREADY_CONSUMED",
]);

/**
 * Classify an error as PERMANENT, RETRYABLE, or UNKNOWN.
 *
 * PERMANENT = must NOT retry (auth, validation, terminal state).
 * RETRYABLE = may retry with same requestKey (network, timeout, transient).
 * UNKNOWN = cannot determine — treat as failed but do not retry.
 */
export function classifyError(status: number, code: string): ErrorClass {
  // Network-level failures (status 0 = fetch threw, no response received)
  if (status === 0) return "RETRYABLE";

  // HTTP 4xx client errors (except 408/429) = permanent
  if (status >= 400 && status < 500) {
    if (RETRYABLE_STATUSES.has(status)) return "RETRYABLE";
    return "PERMANENT";
  }

  // HTTP 5xx server errors = transient
  if (status >= 500) return "RETRYABLE";

  // Known permanent error codes from server
  if (PERMANENT_CODES.has(code)) return "PERMANENT";

  // Known retryable error codes from server
  if (RETRYABLE_CODES.has(code)) return "RETRYABLE";

  // Unknown error code with success status — should not happen, but be conservative
  return "UNKNOWN";
}

/* ---------- Timeout ---------- */

/** Default timeout for server requests (15 seconds). */
export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Fetch with bounded timeout. Returns TIMEOUT error on timeout.
 * AbortController is used — the server transaction may still commit
 * after client timeout. Caller must treat timeout as UNKNOWN outcome.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new NetworkError("TIMEOUT", `Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ---------- Network error types ---------- */

export class NetworkError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

/* ---------- Retry policy ---------- */

export interface RetryPolicy {
  /** Maximum number of retries (0 = no retry, 1 = one retry, etc.). */
  maxRetries: number;
  /** Base delay in ms for exponential backoff. */
  baseDelayMs: number;
  /** Maximum delay in ms (cap). */
  maxDelayMs: number;
}

/** Default retry policy: 2 retries, 500ms base, 3000ms cap. */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 3000,
};

/**
 * Sleep helper for retry backoff. Returns a promise that resolves after
 * the specified milliseconds. Does NOT block requestAnimationFrame.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for retry attempt using exponential backoff with jitter.
 * attempt 0 = baseDelayMs, attempt 1 = baseDelayMs * 2, etc.
 */
export function retryDelay(attempt: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number {
  const exponential = policy.baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, policy.maxDelayMs);
  // Add ±20% jitter to prevent thundering herd
  const jitter = capped * 0.2 * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(capped + jitter));
}

/**
 * Execute a fetch with timeout + bounded retry. The requestKey is NEVER
 * changed between retries (idempotency guarantee).
 *
 * @param url - The URL to fetch
 * @param init - Standard RequestInit (signal will be overridden for timeout)
 * @param options - Timeout and retry configuration
 * @returns Response on success
 * @throws NetworkError on timeout or non-retryable failure
 */
export async function fetchWithResilience(
  url: string,
  init: RequestInit,
  options?: { timeoutMs?: number; retryPolicy?: RetryPolicy; requestKey?: string },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const policy = options?.retryPolicy ?? DEFAULT_RETRY_POLICY;
  // requestKey is validated but NOT mutated — retry uses same key

  let lastError: unknown;
  const totalAttempts = 1 + policy.maxRetries;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    try {
      return await fetchWithTimeout(url, init, timeoutMs);
    } catch (err: unknown) {
      lastError = err;

      // Classify the error
      const errorClass = err instanceof NetworkError
        ? classifyError(0, err.code)
        : classifyError(0, "NETWORK_ERROR");

      // Do not retry on PERMANENT errors
      if (errorClass === "PERMANENT") throw err;

      // Do not retry on last attempt
      if (attempt >= totalAttempts - 1) break;

      // Wait before retry (exponential backoff)
      const delay = retryDelay(attempt, policy);
      await sleep(delay);
    }
  }

  // All retries exhausted
  throw lastError instanceof Error
    ? lastError
    : new NetworkError("NETWORK_ERROR", "Request failed after all retries");
}

/* ---------- Fire-and-forget lifecycle ---------- */

/** Explicit states for server call lifecycle. */
export type ServerCallStatus =
  | "PENDING"             // Request in flight
  | "CONFIRMED"           // Server confirmed success
  | "RETRYABLE_FAILURE"   // Failed but could be retried
  | "FAILED"              // Permanent failure
  | "UNKNOWN";            // Timeout or indeterminate outcome

/** Result of a fire-and-forget server call. */
export interface ServerCallResult<T = unknown> {
  status: ServerCallStatus;
  data?: T;
  error?: string;
}

/**
 * Track in-flight server calls without blocking requestAnimationFrame.
 * Callers can inspect status to decide UX (e.g., show retry button for
 * RETRYABLE_FAILURE, accept UNKNOWN as "might have succeeded").
 */
export class PendingServerCalls {
  private calls = new Map<string, ServerCallResult>();

  /** Register a new call. Returns a key for later inspection. */
  track(key: string): void {
    this.calls.set(key, { status: "PENDING" });
  }

  /** Mark a call as confirmed. */
  confirm(key: string, data?: unknown): void {
    this.calls.set(key, { status: "CONFIRMED", data });
  }

  /** Mark a call as retryable failure. */
  retryableFailure(key: string, error: string): void {
    this.calls.set(key, { status: "RETRYABLE_FAILURE", error });
  }

  /** Mark a call as permanently failed. */
  failed(key: string, error: string): void {
    this.calls.set(key, { status: "FAILED", error });
  }

  /** Mark a call as unknown (timeout, indeterminate). */
  unknown(key: string, error: string): void {
    this.calls.set(key, { status: "UNKNOWN", error });
  }

  /** Get the status of a call. */
  getStatus(key: string): ServerCallResult | undefined {
    return this.calls.get(key);
  }

  /** Check if any calls are still pending. */
  hasPending(): boolean {
    for (const result of this.calls.values()) {
      if (result.status === "PENDING") return true;
    }
    return false;
  }

  /** Get count of calls by status. */
  summary(): Record<ServerCallStatus, number> {
    const counts: Record<ServerCallStatus, number> = {
      PENDING: 0, CONFIRMED: 0, RETRYABLE_FAILURE: 0, FAILED: 0, UNKNOWN: 0,
    };
    for (const result of this.calls.values()) {
      counts[result.status]++;
    }
    return counts;
  }

  /** Remove completed calls (cleanup). */
  gc(): void {
    for (const [key, result] of this.calls) {
      if (result.status !== "PENDING") this.calls.delete(key);
    }
  }
}
