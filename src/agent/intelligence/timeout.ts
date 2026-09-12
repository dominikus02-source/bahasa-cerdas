/**
 * BC Agent P3 — single timeout boundary (§11).
 *
 * The BC AI provider layer already bounds each HTTP call with
 * `AbortSignal.timeout(req.timeoutMs)` inside `callWithFallback`. But that
 * bound applies PER CALL: a fallback chain (model A → model B → …) makes
 * the total wall time the sum of several bounded calls. The Agent needs one
 * overall guarantee per intelligence request.
 *
 * This is that single boundary — one overall timer wrapping ALL adapter
 * activity (every provider attempt, backoff sleeps, parsing). There is
 * deliberately no second/tighter timer here: BC AI owns per-call limits,
 * this owns the request limit. One layer, one clock.
 *
 * Pure timing primitive — no provider knowledge.
 */

import { IntelligenceError } from "./errors";

export class OverallTimeoutError extends IntelligenceError {
  constructor(
    public readonly timeoutMs: number,
    public readonly providerAttemptsMade: number,
    cause?: unknown
  ) {
    super(
      "INTELLIGENCE_TIMEOUT",
      `Batas waktu total ${timeoutMs} ms tercapai setelah ${providerAttemptsMade} percobaan provider`,
      { timeoutMs, providerAttempts: providerAttemptsMade },
      cause
    );
  }
}

/** Race a promise against one overall deadline. */
export async function withOverallTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => OverallTimeoutError
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(onTimeout()), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Bounded backoff sleep between provider attempts. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
