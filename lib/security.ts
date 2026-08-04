import { NextResponse } from "next/server";
import cache from "@/lib/redis";

export type RateLimitScope = "auth" | "api" | "ai" | "ipBurst";

// Dedicated Redis key prefix — can be shared-nothing with other cache data
const RATE_LIMIT_PREFIX = "rl:";

const LIMITS: Record<RateLimitScope, { window: number; max: number }> = {
  auth: { window: 60_000, max: 1000 },
  api: { window: 60_000, max: 300 },
  ai: { window: 60_000, max: 30 },
  ipBurst: { window: 60_000, max: 20_000 },
};

function hashToBucket(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i++) h = ((h << 5) + h + value.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function getClientIdentity(request: { headers: Headers }): { key: string; identified: boolean } {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";  const authCookie = (request.headers.get("cookie") || "")
    .split(";")
    .map((c) => c.trim())
    .filter((c) => c.startsWith("sb-") && c.slice(0, c.indexOf("=")).includes("auth-token"))
    .join("");

  return authCookie
    ? { key: `sess|${hashToBucket(authCookie)}`, identified: true }
    : { key: `ip|${ip}`, identified: false };
}

// IP asli pengguna untuk diteruskan ke Supabase Auth via header
// `Sb-Forwarded-For` (IP Address Forwarding). Vercel menetapkan
// x-forwarded-for sendiri — IP paling kiri adalah IP klien sebenarnya.
export function getForwardedIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    ""
  );
}

export function getClientKey(request: { headers: Headers }): string {
  return getClientIdentity(request).key;
}

// Rate limit via Redis (Upstash). Falls back to unlimited if Redis is unavailable.
// Returns { allowed, remaining, resetAt }.
export async function checkRateLimit(
  identifier: string,
  scope: RateLimitScope = "api"
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = LIMITS[scope];
  const key = `${RATE_LIMIT_PREFIX}${scope}:${identifier}`;
  const now = Date.now();

  if (!cache) {
    return { allowed: true, remaining: config.max, resetAt: now + config.window };
  }

  try {
    const current = await cache.get<number>(key);
    if (current === null) {
      await cache.set(key, 1, Math.ceil(config.window / 1000));
      return { allowed: true, remaining: config.max - 1, resetAt: now + config.window };
    }
    if (current >= config.max) {
      return { allowed: false, remaining: 0, resetAt: now + config.window };
    }
    // INCR is atomic — safe against concurrent requests
    const ttl = await cache.get<number>(key);
    // If ttl expired between get and set, start fresh
    if (ttl === null) {
      await cache.set(key, 1, Math.ceil(config.window / 1000));
      return { allowed: true, remaining: config.max - 1, resetAt: now + config.window };
    }
    // Use Redis INCR for atomic increment
    const count = await cache.incr(key);
    if (count === 1) {
      // First increment after expiry — set TTL
      await cache.set(key, count, Math.ceil(config.window / 1000));
    }
    if (count > config.max) {
      return { allowed: false, remaining: 0, resetAt: now + config.window };
    }
    return { allowed: true, remaining: config.max - count, resetAt: now + config.window };
  } catch {
    return { allowed: true, remaining: config.max, resetAt: now + config.window };
  }
}

export function rateLimitResponse(scope: RateLimitScope = "auth"): NextResponse {
  return NextResponse.json(
    { error: "Terlalu banyak permintaan. Silakan coba lagi nanti." },
    { status: 429 }
  );
}

const SENSITIVE_ANSWER_FIELDS = [
  "correctAnswer",
  "answerKey",
  "jawaban",
  "correct_option",
  "correctOption",
  "scoringRule",
  "rubricInternal",
  "reviewerNotes",
  "adminOnly",
];

export function stripSensitiveAnswerFields<T extends Record<string, unknown>>(item: T): Omit<T, (typeof SENSITIVE_ANSWER_FIELDS)[number]> {
  const result = { ...item };
  for (const field of SENSITIVE_ANSWER_FIELDS) {
    if (field in result) {
      delete result[field];
    }
  }
  return result;
}

export function sanitizeQuestionForStudent<T extends Record<string, unknown>>(item: T): Omit<T, (typeof SENSITIVE_ANSWER_FIELDS)[number]> {
  const result = { ...item };
  for (const field of SENSITIVE_ANSWER_FIELDS) {
    if (field in result) {
      delete result[field];
    }
  }
  if ("explanation" in result) {
    delete result.explanation;
  }
  return result;
}

export function sanitizeQuestionForAuthoring<T extends Record<string, unknown>>(item: T): T {
  return item;
}

const SOAL_SAFE_FIELDS = ["id", "text", "type", "difficulty", "options"] as const;

export function sanitizeSoalForStudent(soal: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!soal) return null;
  const result: Record<string, unknown> = {};
  for (const field of SOAL_SAFE_FIELDS) {
    if (field in soal) {
      result[field] = soal[field];
    }
  }
  return result;
}

export function deepScanSensitiveFields(obj: unknown, path = ""): string[] {
  const found: string[] = [];
  if (!obj || typeof obj !== "object") return found;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      found.push(...deepScanSensitiveFields(obj[i], `${path}[${i}]`));
    }
    return found;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (SENSITIVE_ANSWER_FIELDS.includes(key)) {
      found.push(currentPath);
    }
    found.push(...deepScanSensitiveFields(value, currentPath));
  }
  return found;
}

export function sanitizeSnapshotQuestionForClient(q: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  const allowed = new Set(["id", "type", "text", "options", "difficulty", "section", "seksi"]);
  for (const key of Object.keys(q)) {
    if (allowed.has(key)) {
      safe[key] = q[key];
    }
  }
  return safe;
}

export function buildClientQuestionPayload(snapshotQuestions: Record<string, unknown>[]): Record<string, unknown>[] {
  return snapshotQuestions.map(sanitizeSnapshotQuestionForClient);
}

export function sanitizeAttemptAnswerDetailsForClient(details: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!details) return null;
  const safe: Record<string, unknown> = {};
  const allowedTop = new Set(["version", "attemptId", "paketId", "product", "startedAt", "submittedAt", "userAnswers", "scoring"]);
  for (const key of Object.keys(details)) {
    if (allowedTop.has(key)) {
      if (key === "userAnswers" && Array.isArray(details[key])) {
        safe[key] = (details[key] as Record<string, unknown>[]).map((ua: Record<string, unknown>) => {
          const safeUa: Record<string, unknown> = {};
          const allowedUa = new Set(["questionId", "selectedOptionId", "selectedAnswer", "isCorrect", "score", "section"]);
          for (const k of Object.keys(ua)) {
            if (allowedUa.has(k)) safeUa[k] = ua[k];
          }
          return safeUa;
        });
      } else {
        safe[key] = details[key];
      }
    }
  }
  return safe;
}

export function sanitizeAttemptHistoryForClient(details: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!details) return null;
  const safe: Record<string, unknown> = {};
  const allowed = new Set(["attemptId", "paketId", "product", "submittedAt", "scoring"]);
  for (const key of Object.keys(details)) {
    if (allowed.has(key)) {
      safe[key] = details[key];
    }
  }
  return safe;
}
