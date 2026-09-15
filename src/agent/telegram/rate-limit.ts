/**
 * BC Agent P8B — Telegram command rate limiting (fail-closed).
 *
 * NOTE: lib/rate-limit.ts is fail-OPEN when Redis is absent
 * (`if (!cache) return { success: true }`). That is correct for public web
 * routes but NOT for a founder-only control surface: P8A F5 requires
 * "rate-limit state unknown ⇒ deny mutating commands". This limiter is
 * therefore self-contained with an injectable counter — fail-closed for
 * mutations, fail-open only for reads (reads cannot mutate anything).
 *
 * Design values (P8A §12): mutations 10/min per user, reads 30/min per user.
 */

import { isReadCommand, type TelegramCommand } from "./types";

export interface TelegramRateLimitConfig {
  readonly mutationLimitPerMin: number;
  readonly readLimitPerMin: number;
}

export const DEFAULT_TELEGRAM_RATE_LIMIT: TelegramRateLimitConfig = {
  mutationLimitPerMin: 10,
  readLimitPerMin: 30,
};

export interface TelegramRateLimitCounter {
  /**
   * Increment and return the window count for a key.
   * Return null to explicitly abstain (e.g., no backing store configured).
   */
  increment(key: string, windowSeconds: number): Promise<number | null>;
}

/** In-memory counter for TESTS ONLY — never a dedupe source of truth. */
export function makeInMemoryRateLimitCounter(): TelegramRateLimitCounter {
  const windows = new Map<string, { count: number; windowStart: number }>();
  return {
    async increment(key, windowSeconds) {
      const now = Date.now();
      const cur = windows.get(key);
      if (!cur || now - cur.windowStart >= windowSeconds * 1000) {
        windows.set(key, { count: 1, windowStart: now });
        return 1;
      }
      cur.count += 1;
      return cur.count;
    },
  };
}

export type TelegramRateLimitResult =
  | { ok: true }
  | { ok: false; reason: "RATE_LIMITED"; text: string };

export async function checkTelegramRateLimit(
  counter: TelegramRateLimitCounter | null,
  telegramUserId: string,
  command: TelegramCommand,
  config: TelegramRateLimitConfig = DEFAULT_TELEGRAM_RATE_LIMIT
): Promise<TelegramRateLimitResult> {
  const read = isReadCommand(command);
  const limit = read ? config.readLimitPerMin : config.mutationLimitPerMin;

  // No counter configured:
  //  - reads may proceed (they cannot mutate canonical state);
  //  - mutations fail CLOSED (P8A F5).
  if (!counter) {
    return read ? { ok: true } : { ok: false, reason: "RATE_LIMITED", text: "Rate limit tidak tersedia." };
  }

  let count: number | null;
  try {
    count = await counter.increment(`${telegramUserId}:${read ? "read" : "mutate"}`, 60);
  } catch {
    // Counter failure → reads pass, mutations denied (fail-closed).
    return read ? { ok: true } : { ok: false, reason: "RATE_LIMITED", text: "Rate limit tidak tersedia." };
  }

  if (count === null) return { ok: true }; // counter explicitly abstains (e.g., no Redis in tests)

  if (count > limit) {
    return { ok: false, reason: "RATE_LIMITED", text: "Terlalu banyak perintah. Coba lagi nanti." };
  }
  return { ok: true };
}
