/**
 * BC Agent P8B — Upstash-backed counter for the telegram rate limiter.
 *
 * Separated from rate-limit.ts so the gateway core has zero Next.js/Redis
 * imports (testable headless). Semantics:
 *   - Redis available → per-user windowed counts (mutations 10/min, reads
 *     30/min enforced by checkTelegramRateLimit);
 *   - Redis unavailable → counter abstains (returns null) and
 *     checkTelegramRateLimit applies its fail-closed policy: mutations are
 *     denied, reads proceed.
 */

import cache from "@/lib/redis";

import type { TelegramRateLimitCounter } from "./rate-limit";

export function makeUpstashRateLimitCounter(): TelegramRateLimitCounter | null {
  if (!cache) return null;
  return {
    async increment(key, windowSeconds) {
      const redisKey = `bc-agent-tg:${key}`;
      const current = await cache.get<number>(redisKey);
      if (current === null) {
        await cache.set(redisKey, 1, windowSeconds);
        return 1;
      }
      const next = current + 1;
      await cache.set(redisKey, next, windowSeconds);
      return next;
    },
  };
}
