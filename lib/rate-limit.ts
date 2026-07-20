import { NextResponse } from "next/server"
import cache from "@/lib/redis"
import { getClientKey } from "@/lib/security"

interface RateLimitResult {
  success: boolean
  reset: number
}

// For middleware use — takes IP + identifier, returns { success, reset }
export async function rateLimit(ip: string, identifier: string, maxRequests = 10, windowSeconds = 60): Promise<RateLimitResult> {
  if (!cache) return { success: true, reset: 0 }

  const key = `ratelimit:${identifier}:${ip}`
  const current = await cache.get<number>(key)

  if (current === null) {
    await cache.set(key, 1, windowSeconds)
    return { success: true, reset: 0 }
  }

  if (current >= maxRequests) {
    return { success: false, reset: Math.floor(Date.now() / 1000) + windowSeconds }
  }

  await cache.set(key, current + 1, windowSeconds)
  return { success: true, reset: 0 }
}

// For API route handler use — returns NextResponse if rate limited, null otherwise
export async function rateLimitRoute(
  req: Request,
  config: { maxRequests: number; windowSeconds: number; identifier: string }
): Promise<NextResponse | null> {
  // Per session, not per IP — a whole class submits from one school NAT address.
  const result = await rateLimit(getClientKey(req), config.identifier, config.maxRequests, config.windowSeconds)
  if (!result.success) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
      {
        status: 429,
        headers: {
          "Retry-After": String(config.windowSeconds),
          "X-RateLimit-Limit": String(config.maxRequests),
        },
      }
    )
  }
  return null
}
