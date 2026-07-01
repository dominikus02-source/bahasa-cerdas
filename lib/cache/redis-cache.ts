/**
 * Redis cache helper — getOrSet pattern.
 *
 * getOrSet(key, ttlSeconds, fetcher):
 *   - Tries Redis GET. If found, returns cached value.
 *   - If not found, calls fetcher(), stores result in Redis, returns it.
 *   - If Redis is unavailable, silently falls back to fetcher().
 *
 * Usage:
 *   const data = await getOrSet("artikel:page:1:limit:12", 300, () => fetchFromDB());
 */

import cache from "@/lib/redis";

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (!cache) {
    return fetcher();
  }

  try {
    const cached = await cache.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  } catch {
    // Redis error — fall through to fetcher
  }

  const fresh = await fetcher();

  try {
    await cache.set(key, fresh, ttlSeconds);
  } catch {
    // Cache write failure is non-critical
  }

  return fresh;
}
