import { NextResponse } from "next/server";

const rateMap = new Map<string, { count: number; resetAt: number }>();

const LIMITS = {
  auth: { window: 60_000, max: 20 },
  api: { window: 60_000, max: 120 },
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
