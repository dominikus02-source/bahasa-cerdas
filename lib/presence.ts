/**
 * lib/presence.ts — BahasaCerdas Live Pulse: Redis-based ephemeral user presence
 *
 * Architecture:
 *  - Key: `bc:presence:{userId}` (user-level, not tab-level — multiple tabs share one key)
 *  - Value: `{ r: "GURU"|"MURID"|"ADMIN" }` (minimal — no IP, no email, no page URL)
 *  - TTL: 60 seconds (auto-expires if heartbeat stops)
 *  - Heartbeat interval (client): 20 seconds
 *
 * Privacy:
 *  - No IP address stored
 *  - No email stored
 *  - No page URL stored
 *  - Only aggregate counts exposed to founder dashboard
 *
 * Scale:
 *  - Upstash REST (stateless HTTP, no connection pooling)
 *  - Current platform: <3,000 users, ~100 concurrent peak
 *  - Redis SCAN for aggregation is acceptable at current scale
 *  - Future: Redis Sets or HyperLogLog if scale demands
 */

import { Redis } from "@upstash/redis"

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

const isValidRedisUrl = (v: string | undefined): v is string =>
  !!v && v.startsWith("https://")

const redis = isValidRedisUrl(url) && token ? new Redis({ url, token }) : null

// ─── Constants ───────────────────────────────────────────────
const PRESENCE_TTL_SECONDS = 60
const PRESENCE_KEY_PREFIX = "bc:presence:"
const PRESENCE_KEY_PATTERN = `${PRESENCE_KEY_PREFIX}*`

export type PresenceRole = "GURU" | "MURID" | "ADMIN"

interface PresenceValue {
  r: PresenceRole
}

export interface OnlineBreakdown {
  total: number
  guru: number
  murid: number
  admin: number
}

// ─── Write: Set/refresh presence key ─────────────────────────
export async function setPresence(
  userId: string,
  role: PresenceRole
): Promise<boolean> {
  if (!redis) return false
  try {
    const key = `${PRESENCE_KEY_PREFIX}${userId}`
    const value: PresenceValue = { r: role }
    await redis.set(key, value, { ex: PRESENCE_TTL_SECONDS })
    return true
  } catch {
    return false
  }
}

// ─── Read: Aggregate online users from Redis ─────────────────
export async function getOnlineUsers(): Promise<OnlineBreakdown> {
  const empty: OnlineBreakdown = { total: 0, guru: 0, murid: 0, admin: 0 }
  if (!redis) return empty

  try {
    // SCAN is preferred over KEYS for production, but at current scale (<3k keys)
    // KEYS is acceptable. Upstash REST supports KEYS.
    const keys: string[] = await redis.keys(PRESENCE_KEY_PATTERN)

    if (keys.length === 0) return empty

    // Pipeline MGET to fetch all values in one round trip
    const values = await redis.pipeline().mget(...keys).exec<PresenceValue[]>()

    let guru = 0
    let murid = 0
    let admin = 0

    for (const val of values) {
      if (!val || typeof val !== "object") continue
      const role = (val as PresenceValue).r
      if (role === "GURU") guru++
      else if (role === "MURID") murid++
      else if (role === "ADMIN") admin++
    }

    return {
      total: guru + murid + admin,
      guru,
      murid,
      admin,
    }
  } catch {
    return empty
  }
}

// ─── Read: Check if a specific user is online ────────────────
export async function isUserOnline(userId: string): Promise<boolean> {
  if (!redis) return false
  try {
    const key = `${PRESENCE_KEY_PREFIX}${userId}`
    const val = await redis.get<PresenceValue>(key)
    return val !== null
  } catch {
    return false
  }
}

// ─── Write: Remove presence (on logout) ──────────────────────
export async function removePresence(userId: string): Promise<void> {
  if (!redis) return
  try {
    await redis.del(`${PRESENCE_KEY_PREFIX}${userId}`)
  } catch {
    // silently fail
  }
}

// ─── Read: Canonical Karya count (database-backed) ───────────
export async function getTotalKaryaCount(): Promise<number> {
  // Dynamic import to avoid circular deps; prisma client is singleton
  const { db } = await import("@/lib/db")
  try {
    const count = await db.studentKarya.count()
    return count
  } catch {
    return 0
  }
}

export { PRESENCE_TTL_SECONDS }
