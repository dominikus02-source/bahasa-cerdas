/**
 * P7C §21 — Structured observability events.
 *
 * Console-only structured logs. NEVER log sensitive payment/account data:
 * no bank numbers, no amounts of other teachers, no payment provider internals.
 * Amounts logged are commission amounts (not sensitive by themselves) but we
 * keep them minimal and context-scoped.
 */

import type { CommissionEvent } from "./types";

/** Emit a structured event. Safe for fire-and-forget. */
export function emitCommissionEvent(event: CommissionEvent): void {
  try {
    console.log("[commission]", JSON.stringify(event));
  } catch {
    // best-effort — observability must never break the flow
  }
}
