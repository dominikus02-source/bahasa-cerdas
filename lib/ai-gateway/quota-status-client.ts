"use client";

// Shared client-side fetch for /api/ai/quota/status.
//
// AiCreditBalance and TrialStatusCard both render on /guru/beranda and each
// fired its own useEffect fetch, so every dashboard load made two identical
// requests at the same instant — visible in the console as the endpoint timing
// out twice. They now share one in-flight request, and a short TTL keeps a
// remount (or a second component mounting a beat later) from refetching.

export interface QuotaStatus {
  plan: string;
  unlimited: boolean;
  creditsTotal: number;
  remainingCredits: number;
  isTrial: boolean;
  trialEndsAt: string | null;
  daysRemaining: number;
  [key: string]: unknown;
}

const TTL_MS = 30_000;

let inFlight: Promise<QuotaStatus | null> | null = null;
let cached: { at: number; value: QuotaStatus | null } | null = null;

export function fetchQuotaStatus(): Promise<QuotaStatus | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.value);
  if (inFlight) return inFlight;

  inFlight = fetch("/api/ai/quota/status")
    .then((r) => (r.ok ? r.json() : null))
    .then((value: QuotaStatus | null) => {
      cached = { at: Date.now(), value };
      return value;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Drop the cache after an action that spends credits. */
export function invalidateQuotaStatus(): void {
  cached = null;
}
