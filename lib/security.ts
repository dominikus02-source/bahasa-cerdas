import { NextResponse } from "next/server";

const rateMap = new Map<string, { count: number; resetAt: number }>();

const LIMITS = {
  auth: { window: 60_000, max: 5 },
  api: { window: 60_000, max: 60 },
  ai: { window: 60_000, max: 10 },
} as const;

export type RateLimitScope = keyof typeof LIMITS;

export function checkRateLimit(
  identifier: string,
  scope: RateLimitScope = "api"
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const config = LIMITS[scope];
  const key = `${scope}:${identifier}`;

  const entry = rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + config.window });
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.window };
  }

  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

export function rateLimitResponse(scope: RateLimitScope = "auth"): NextResponse {
  return NextResponse.json(
    { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
    { status: 429 }
  );
}

const CLEANUP_INTERVAL = 300_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateMap.entries()) {
    if (now > entry.resetAt) rateMap.delete(key);
  }
}, CLEANUP_INTERVAL);
