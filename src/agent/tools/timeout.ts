/**
 * BC Agent P4 — single bounded deadline for tool execution (§17).
 *
 * ONE timer per execution (same principle as the P3 intelligence timeout):
 * `withDeadline` races the work against the tool's declared timeoutMs and
 * surfaces a typed ToolTimeoutError on expiry. No stacked timers, no
 * unbounded waiting.
 */

import { ToolTimeoutError } from "./errors";

export type DeadlineResult<T> = { ok: true; value: T } | { ok: false; error: ToolTimeoutError | Error };

/** Race `promise` against `timeoutMs`. The loser's timer is always cleared. */
export function withDeadline<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<DeadlineResult<T>> {
  return new Promise<DeadlineResult<T>>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, error: new ToolTimeoutError(label.replace(/^tool:/, ""), timeoutMs) });
    }, timeoutMs);

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ ok: true, value });
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ ok: false, error: error instanceof Error ? error : new Error(String(error)) });
      }
    );
  });
}
