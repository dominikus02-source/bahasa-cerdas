/**
 * Distributed concurrency limiter for upstream AI calls.
 *
 * Purpose: stop a burst of concurrent requests from firing at the LLM providers
 * all at once (which triggers upstream 429s / cost spikes). This caps the number
 * of IN-FLIGHT provider calls GLOBALLY across all serverless instances, using the
 * Upstash Redis that already backs rate-limiting/caching — NO new infrastructure.
 *
 * It is a lightweight backpressure gate, not a durable job queue. For truly
 * durable async processing (survive restarts, retries, scheduled workers) see the
 * BullMQ design in docs — that needs a TCP Redis. This gate is the pragmatic
 * first step that works today.
 *
 * Design: a Redis sorted set per pool holds one member per in-flight slot, scored
 * by its expiry timestamp. Expired slots (from crashed/timed-out functions) are
 * purged on every acquire, so slots self-heal — no leaked capacity.
 *
 * Fail-open: if Redis is unavailable or misconfigured, acquire() always succeeds
 * so AI never breaks because of the limiter. Backpressure only kicks in when
 * Redis is healthy AND the pool is genuinely saturated.
 */
import { Redis } from "@upstash/redis";

// Accept both namings, matching lib/redis.ts: `UPSTASH_REDIS_REST_*` when set by
// hand, or `KV_REST_API_*` as provisioned by the Vercel Upstash/KV integration.
// Reading only the former meant this limiter silently fail-opened in production,
// where the integration supplies the KV_ names — i.e. no backpressure at all.
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// Defensif, sejalan dengan lib/redis.ts: URL placeholder lokal (mis. `[SENSITIVE]`)
// tidak boleh diteruskan ke `new Redis` (Runtime UrlError saat evaluasi modul).
// Konfigurasi tidak valid -> redis null -> acquire() fail-open (tidak memblokir AI).
const isValidRedisUrl = (value: string | undefined): value is string =>
  !!value && value.startsWith("https://");

const redis = isValidRedisUrl(url) && token ? new Redis({ url, token }) : null;

// Global cap on concurrent AI provider calls. Tune via env once you know the
// providers' real rate limits; default is deliberately conservative.
const DEFAULT_LIMIT = Number(process.env.AI_MAX_CONCURRENCY || 12);
const DEFAULT_TTL_MS = 120_000; // safety expiry for a slot (matches maxDuration)
const DEFAULT_MAX_WAIT_MS = 8_000; // how long a request waits for a free slot
const POLL_MS = 250;

export interface AiSlot {
  release: () => Promise<void>;
}

const NOOP_SLOT: AiSlot = { release: async () => {} };

function newToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Try to acquire a concurrency slot. Returns an AiSlot on success, or null if the
 * pool stayed saturated past maxWaitMs (caller should return 503 / "sistem sibuk").
 * Never throws; returns a no-op slot when Redis is unavailable (fail-open).
 */
export async function acquireAiSlot(opts?: {
  pool?: string;
  limit?: number;
  ttlMs?: number;
  maxWaitMs?: number;
}): Promise<AiSlot | null> {
  if (!redis) return NOOP_SLOT;

  const pool = opts?.pool ?? "default";
  const limit = opts?.limit ?? DEFAULT_LIMIT;
  const ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
  const maxWaitMs = opts?.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const key = `ai:inflight:${pool}`;
  const deadline = Date.now() + maxWaitMs;

  try {
    // Retry loop: purge expired slots, reserve, check count, back off if full.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const now = Date.now();
      await redis.zremrangebyscore(key, 0, now);

      const member = newToken();
      await redis.zadd(key, { score: now + ttlMs, member });
      // Keep the set from living forever if the app goes idle.
      await redis.expire(key, Math.ceil(ttlMs / 1000) + 60);

      const count = await redis.zcard(key);
      if (count <= limit) {
        return { release: () => releaseSlot(key, member) };
      }

      // Pool is full — hand the slot back and wait for one to free up.
      await redis.zrem(key, member);
      if (Date.now() >= deadline) return null;
      await sleep(POLL_MS);
    }
  } catch {
    // Redis hiccup — never block AI on the limiter.
    return NOOP_SLOT;
  }
}

async function releaseSlot(key: string, member: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.zrem(key, member);
  } catch {
    /* slot will expire via TTL anyway */
  }
}

/**
 * Convenience wrapper: run `fn` while holding a slot, always releasing it.
 * Throws AiBusyError if the pool is saturated so the route can map it to 503.
 */
export class AiBusyError extends Error {
  constructor() {
    super("AI concurrency limit reached");
    this.name = "AiBusyError";
  }
}

export async function withAiSlot<T>(
  fn: () => Promise<T>,
  opts?: { pool?: string; limit?: number; ttlMs?: number; maxWaitMs?: number }
): Promise<T> {
  const slot = await acquireAiSlot(opts);
  if (!slot) throw new AiBusyError();
  try {
    return await fn();
  } finally {
    await slot.release();
  }
}
