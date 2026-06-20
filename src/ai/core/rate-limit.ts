/**
 * Agent-level rate limiting.
 *
 * Connects to the existing Upstash Redis rate-limit utility at lib/rate-limit.ts.
 * Per-agent limits:
 * - bc-assistant: 30 req/min (chat is fast)
 * - review: 15 req/min
 * - rpp/soal/ppt: 5 req/min (generation is expensive)
 *
 * Premium users get doubled limits via lib/premium.ts helpers.
 * If premium check fails, falls back to base limit.
 */

import { rateLimitRoute } from "@/lib/rate-limit";

export interface AgentRateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const BASE_LIMITS: Record<string, AgentRateLimitConfig> = {
  "bc-assistant": { maxRequests: 30, windowSeconds: 60 },
  review: { maxRequests: 15, windowSeconds: 60 },
  rpp: { maxRequests: 5, windowSeconds: 60 },
  soal: { maxRequests: 5, windowSeconds: 60 },
  ppt: { maxRequests: 3, windowSeconds: 60 },
  rubric: { maxRequests: 10, windowSeconds: 60 },
  eyd: { maxRequests: 15, windowSeconds: 60 },
  feedback: { maxRequests: 10, windowSeconds: 60 },
  grading: { maxRequests: 10, windowSeconds: 60 },
  "text-analysis": { maxRequests: 10, windowSeconds: 60 },
};

export function getAgentRateLimit(agentId: string): AgentRateLimitConfig {
  return BASE_LIMITS[agentId] ?? { maxRequests: 10, windowSeconds: 60 };
}

/**
 * Check rate limit for an agent request.
 * Returns null if allowed, or a NextResponse JSON with 429 if blocked.
 * Premium users get 2x limit.
 *
 * Uses the existing lib/rate-limit.ts → Upstash Redis.
 */
export async function checkAgentRateLimit(
  req: Request,
  agentId: string,
  isPremium: boolean
): Promise<Response | null> {
  const base = getAgentRateLimit(agentId);
  const maxRequests = isPremium ? base.maxRequests * 2 : base.maxRequests;

  return rateLimitRoute(req, {
    maxRequests,
    windowSeconds: base.windowSeconds,
    identifier: `agent:${agentId}`,
  });
}
