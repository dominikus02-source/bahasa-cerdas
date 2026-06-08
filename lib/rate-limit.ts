import { Redis } from "@upstash/redis"

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN
const redis = url && token ? new Redis({ url, token }) : null

const WINDOW = 60
const LIMITS: Record<string, number> = {
  auth: 20,
  api: 120,
  ai: 10,
  public: 300,
}

export async function rateLimit(
  identifier: string,
  scope: keyof typeof LIMITS = "api"
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const max = LIMITS[scope] || 120
  const key = `ratelimit:${scope}:${identifier}`

  if (!redis) {
    // fallback: allow all if Redis not configured
    return { success: true, remaining: max, reset: Date.now() + WINDOW * 1000 }
  }

  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - (now % WINDOW)
  const windowKey = `${key}:${windowStart}`

  const current = await redis.incr(windowKey)
  if (current === 1) {
    await redis.expire(windowKey, WINDOW + 10)
  }

  const remaining = Math.max(0, max - current)

  return {
    success: current <= max,
    remaining,
    reset: (windowStart + WINDOW) * 1000,
  }
}
