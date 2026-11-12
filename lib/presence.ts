/**
 * lib/presence.ts — BahasaCerdas Live Pulse: Redis-based ephemeral user presence
 *
 * Architecture:
 *  - Key: `bc:presence:{userId}` (user-level, not tab-level — multiple tabs share one key)
 *  - Value: `{ r: "GURU"|"MURID"|"ADMIN"|"UMUM", p?: "coarse:menu-key" }`
 *  - TTL: 60 seconds (auto-expires if heartbeat stops)
 *  - Heartbeat interval (client): 20 seconds
 *
 * Privacy:
 *  - No IP address stored
 *  - No email stored
 *  - No full URL, query string, or dynamic entity ID stored
 *  - Only aggregate role + coarse menu counts exposed to founder dashboard
 *
 * Scale:
 *  - Upstash REST when UPSTASH_REDIS_REST_* / KV_REST_API_* is set
 *  - Otherwise REDIS_URL (redis:// / rediss://) on the production VPS
 *  - Current platform: <3,000 users, ~100 concurrent peak
 *  - Redis KEYS/MGET for aggregation is acceptable at current scale
 *  - Future: Redis Sets or HyperLogLog if scale demands
 */

import { Redis } from "@upstash/redis"
import { labelForPresenceLocation } from "@/lib/presence-location"
import { hasUpstashConfig, standaloneKv } from "@/lib/redis-standalone"

// ─── Constants ───────────────────────────────────────────────
const PRESENCE_TTL_SECONDS = 60
const PRESENCE_KEY_PREFIX = "bc:presence:"
const PRESENCE_KEY_PATTERN = `${PRESENCE_KEY_PREFIX}*`

export type PresenceRole = "GURU" | "MURID" | "ADMIN" | "UMUM"

interface PresenceValue {
  r: PresenceRole
  p?: string
}

type PresenceStore = {
  set: (key: string, value: PresenceValue, ttl: number) => Promise<void>
  get: (key: string) => Promise<PresenceValue | null>
  del: (key: string) => Promise<void>
  keys: (pattern: string) => Promise<string[]>
  mget: (keys: string[]) => Promise<(PresenceValue | null)[]>
}

function parsePresence(raw: unknown): PresenceValue | null {
  if (!raw) return null
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) as unknown : raw
    if (!value || typeof value !== "object") return null
    return value as PresenceValue
  } catch {
    return null
  }
}

function upstashStore(): PresenceStore {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  const client = new Redis({ url: url!, token: token! })
  return {
    async set(key, value, ttl) { await client.set(key, value, { ex: ttl }) },
    async get(key) { return parsePresence(await client.get(key)) },
    async del(key) { await client.del(key) },
    async keys(pattern) { return client.keys(pattern) },
    async mget(keys) {
      const values = await client.pipeline().mget(...keys).exec<unknown[]>()
      return values.map(parsePresence)
    },
  }
}

function standaloneStore(): PresenceStore {
  return {
    async set(key, value, ttl) { await standaloneKv.set(key, JSON.stringify(value), ttl) },
    async get(key) { return parsePresence(await standaloneKv.get(key)) },
    async del(key) { await standaloneKv.del(key) },
    async keys(pattern) { return standaloneKv.keys(pattern) },
    async mget(keys) { return (await standaloneKv.mget(keys)).map(parsePresence) },
  }
}

function getPresenceStore(): PresenceStore | null {
  if (hasUpstashConfig()) return upstashStore()
  if (standaloneKv.available()) return standaloneStore()
  return null
}

const redis = getPresenceStore()

export interface PresenceLocationBreakdown {
  key: string
  label: string
  total: number
  guru: number
  murid: number
  admin: number
  /** Pengguna UMUM (aditif — konsumen lama yang tak membaca field ini tetap jalan). */
  umum: number
}

export interface OnlineBreakdown {
  total: number
  guru: number
  murid: number
  admin: number
  /** Pengguna UMUM — dihitung terpisah, BUKAN dimasukkan ke murid. */
  umum: number
  locations: PresenceLocationBreakdown[]
  available: boolean
}

// ─── Write: Set/refresh presence key ─────────────────────────
export async function setPresence(
  userId: string,
  role: PresenceRole,
  locationKey?: string,
): Promise<boolean> {
  if (!redis) return false
  try {
    const key = `${PRESENCE_KEY_PREFIX}${userId}`
    const value: PresenceValue = locationKey ? { r: role, p: locationKey } : { r: role }
    await redis.set(key, value, PRESENCE_TTL_SECONDS)
    return true
  } catch {
    return false
  }
}

// ─── Read: Aggregate online users from Redis ─────────────────
export async function getOnlineUsers(): Promise<OnlineBreakdown> {
  const empty: OnlineBreakdown = { total: 0, guru: 0, murid: 0, admin: 0, umum: 0, locations: [], available: false }
  if (!redis) return empty

  try {
    // SCAN is preferred over KEYS for production, but at current scale (<3k keys)
    // KEYS is acceptable. Upstash REST supports KEYS.
    const keys: string[] = await redis.keys(PRESENCE_KEY_PATTERN)

    if (keys.length === 0) return { ...empty, available: true }

    // Pipeline MGET to fetch all values in one round trip
    const values = await redis.mget(keys)

    let guru = 0
    let murid = 0
    let admin = 0
    let umum = 0
    const locations = new Map<string, PresenceLocationBreakdown>()

    for (const val of values) {
      if (!val || typeof val !== "object") continue
      const presence = val as PresenceValue
      const role = presence.r
      if (role === "GURU") guru++
      else if (role === "MURID") murid++
      else if (role === "ADMIN") admin++
      else if (role === "UMUM") umum++
      else continue

      const key = presence.p || "unknown"
      const current = locations.get(key) ?? {
        key,
        label: labelForPresenceLocation(presence.p),
        total: 0,
        guru: 0,
        murid: 0,
        admin: 0,
        umum: 0,
      }
      current.total++
      if (role === "GURU") current.guru++
      else if (role === "MURID") current.murid++
      else if (role === "UMUM") current.umum++
      else current.admin++
      locations.set(key, current)
    }

    return {
      total: guru + murid + admin + umum,
      guru,
      murid,
      admin,
      umum,
      locations: Array.from(locations.values()).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)),
      available: true,
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
    const val = await redis.get(key)
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

// ─── Read: Check if Redis presence engine is available ────────
export function isPresenceAvailable(): boolean {
  return redis !== null
}


export { PRESENCE_TTL_SECONDS }
