import { Redis } from "@upstash/redis"

// Terima kedua penamaan: `UPSTASH_REDIS_REST_*` (manual) atau `KV_REST_API_*`
// (yang di-provision oleh integrasi Upstash/KV di Vercel Marketplace).
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

const redis = url && token ? new Redis({ url, token }) : null

const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null
    try {
      return await redis.get<T>(key)
    } catch {
      return null
    }
  },

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!redis) return
    try {
      await redis.set(key, value, { ex: ttlSeconds })
    } catch {
      // silently fail
    }
  },

  async del(key: string): Promise<void> {
    if (!redis) return
    try {
      await redis.del(key)
    } catch {
      // silently fail
    }
  },

  async delPattern(pattern: string): Promise<void> {
    if (!redis) return
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) await redis.del(...keys)
    } catch {
      // silently fail
    }
  },

  async incr(key: string): Promise<number> {
    if (!redis) return 0
    try {
      return await redis.incr(key)
    } catch {
      return 0
    }
  },

  async getOrSet<T>(
    key: string,
    fetch: () => Promise<T>,
    ttlSeconds = 300
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) return cached
    const fresh = await fetch()
    await this.set(key, fresh, ttlSeconds)
    return fresh
  },
}

export default cache
