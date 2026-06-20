import type { ProviderHealth } from "./gateway-types";

/**
 * In-memory provider health tracker.
 *
 * Serverless limitation: state resets on cold start.
 * Acceptable for Phase 9B — provides basic protection
 * within a single warm invocation.
 *
 * Phase 9D+ should consider persistent storage (Redis or DB)
 * for cross-instance provider health tracking.
 */

const HEALTH: Map<string, ProviderHealth> = new Map();

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 5 * 60 * 1000;
const WINDOW_MS = 2 * 60 * 1000;

function getOrCreate(provider: string): ProviderHealth {
  let h = HEALTH.get(provider);
  if (!h) {
    h = { healthy: true, degraded: false, cooldownUntil: null, failureCount: 0, lastFailureAt: null };
    HEALTH.set(provider, h);
  }
  return h;
}

export function recordProviderFailure(provider: string): void {
  const h = getOrCreate(provider);
  const now = Date.now();

  h.lastFailureAt = now;
  h.failureCount++;

  // Reset failure count if outside window
  const failuresInWindow = Array.from(HEALTH.values())
    .filter((x) => x.lastFailureAt && now - x.lastFailureAt < WINDOW_MS)
    .length;

  if (failuresInWindow >= FAILURE_THRESHOLD || h.failureCount >= FAILURE_THRESHOLD) {
    h.healthy = false;
    h.degraded = true;
    h.cooldownUntil = now + COOLDOWN_MS;
    console.warn(`[Provider Guard] ${provider} — cooling down for ${COOLDOWN_MS / 1000}s (${h.failureCount} failures)`);
  } else {
    h.degraded = h.failureCount >= 2;
    console.debug(`[Provider Guard] ${provider} — failure #${h.failureCount}, degraded=${h.degraded}`);
  }
}

export function recordProviderSuccess(provider: string): void {
  const h = getOrCreate(provider);

  if (h.cooldownUntil && h.cooldownUntil > Date.now()) {
    return; // Still in cooldown — don't clear
  }

  h.failureCount = Math.max(0, h.failureCount - 1);
  if (h.failureCount === 0) {
    h.healthy = true;
    h.degraded = false;
    h.cooldownUntil = null;
  } else {
    h.degraded = h.failureCount >= 2;
  }
}

export function getProviderHealth(provider: string): ProviderHealth {
  const h = getOrCreate(provider);
  const now = Date.now();

  if (h.cooldownUntil && now >= h.cooldownUntil) {
    h.healthy = true;
    h.degraded = false;
    h.cooldownUntil = null;
    h.failureCount = 0;
  }

  return { ...h };
}

export function shouldSkipProvider(provider: string): boolean {
  const h = getProviderHealth(provider);
  if (h.cooldownUntil && h.cooldownUntil > Date.now()) {
    console.debug(`[Provider Guard] Skipping ${provider} — in cooldown`);
    return true;
  }
  return false;
}

export function resetProviderHealth(provider: string): void {
  HEALTH.delete(provider);
}
