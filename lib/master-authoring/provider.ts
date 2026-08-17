import {
  callWithFallback,
  getDefaultModel,
  ProviderRequest,
} from "../../src/ai/core/provider";
import {
  AiOutputContract,
  AuthoringExecutor,
  AuthoringQuestion,
  AuthoringSkill,
  AuthoringTelemetry,
} from "./types";
import { SYSTEM_PROMPT, contractExample } from "./prompts";

const CONTRACT_KEYS = [
  "decision",
  "question",
  "reason",
  "confidence",
  "difficultyEvidence",
  "semanticEvidence",
  "repairType",
  "sourceQuestionId",
  "sourcePreserved",
];
const QUESTION_KEYS = ["type", "skill", "difficulty", "stem", "options", "correctAnswer", "explanation"];
const VALID_SKILLS: AuthoringSkill[] = [
  "SINONIM", "ANTONIM", "SPOK", "KALIMAT_EFEKTIF", "EJAAN", "MAJAS", "MAKNA_KATA", "KONSEP",
];

export function providerAvailable(): boolean {
  const has = (k: string) => {
    const v = process.env[k];
    return typeof v === "string" && v.trim().length >= 10 && !/\[SENSITIVE\]|placeholder|dummy/i.test(v);
  };
  return has("DEEPSEEK_API_KEY") || has("GROQ_API_KEY") || has("GEMINI_API_KEY");
}

/** Executor default — chain callWithFallback (DeepSeek→Groq→Gemini). */
export function createAuthoringExecutor(): AuthoringExecutor {
  return async (req) => callWithFallback(req as ProviderRequest);
}

export function sanitizeError(e: unknown): string {
  const msg = String(e instanceof Error ? e.message : e);
  const cleaned = msg.replace(/sk-[A-Za-z0-9_\-]{6,}|AIza[A-Za-z0-9_\-]{6,}/g, "[REDACTED]");
  return cleaned.slice(0, 500);
}

/** Parse kontrak output AI secara KETAT; kembalikan null bila rusak. */
export function parseContract(raw: string): AiOutputContract | null {
  if (!raw) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    const trimmed = raw.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      obj = JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  if (typeof obj !== "object" || obj === null) return null;
  const o = obj as Record<string, unknown>;
  if (!CONTRACT_KEYS.every((k) => k in o)) return null;

  const decision = o.decision;
  if (decision !== "GOLD" && decision !== "HUMAN_REVIEW" && decision !== "REJECT") return null;

  const qRaw = o.question as Record<string, unknown> | null;
  let question: AuthoringQuestion | null = null;
  if (qRaw && typeof qRaw === "object") {
    if (!QUESTION_KEYS.every((k) => k in qRaw)) return null;
    const options = Array.isArray(qRaw.options)
      ? (qRaw.options as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    if (options.length < 2) return null;
    const skill = String(qRaw.skill).toUpperCase();
    if (!(VALID_SKILLS as string[]).includes(skill)) return null;
    const type = String(qRaw.type).toUpperCase() === "BENAR_SALAH" ? "BENAR_SALAH" : "PILIHAN_GANDA";
    const difficulty = String(qRaw.difficulty).toUpperCase();
    if (difficulty !== "MUDAH" && difficulty !== "SEDANG" && difficulty !== "SULIT") return null;
    question = {
      type,
      skill: skill as AuthoringSkill,
      difficulty: difficulty as AuthoringQuestion["difficulty"],
      stem: String(qRaw.stem ?? "").trim(),
      options,
      correctAnswer: String(qRaw.correctAnswer ?? "").trim(),
      explanation: String(qRaw.explanation ?? "").trim(),
    };
  }

  return {
    decision,
    question,
    reason: String(o.reason ?? "").trim(),
    confidence: typeof o.confidence === "number" ? Math.min(1, Math.max(0, o.confidence)) : 0,
    difficultyEvidence: String(o.difficultyEvidence ?? "").trim(),
    semanticEvidence: String(o.semanticEvidence ?? "").trim(),
    repairType: String(o.repairType ?? "").trim(),
    sourceQuestionId: String(o.sourceQuestionId ?? "").trim(),
    sourcePreserved: o.sourcePreserved === true,
  };
}

export function buildRequestForExecutor(
  model: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {}
): Parameters<AuthoringExecutor>[0] {
  return {
    model,
    messages: [
      { role: "system" as const, content: SYSTEM_PROMPT + "\n\nContoh output yang valid:\n" + contractExample() },
      { role: "user" as const, content: user },
    ],
    temperature: opts.temperature ?? 0.2,
    maxTokens: opts.maxTokens ?? 1500,
    timeoutMs: opts.timeoutMs ?? 45000,
  };
}

export function telemetryFromResponse(
  res: { provider: string; model: string; latencyMs: number; usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } },
  attempted: boolean,
  errorCode?: string
): AuthoringTelemetry {
  return {
    provider: res.provider || "unknown",
    model: res.model || "unknown",
    attempted,
    latencyMs: res.latencyMs ?? 0,
    errorCode,
    tokens: {
      promptTokens: res.usage?.promptTokens ?? 0,
      completionTokens: res.usage?.completionTokens ?? 0,
      totalTokens: res.usage?.totalTokens ?? 0,
    },
  };
}

export function modelToUse(): string {
  try {
    return getDefaultModel();
  } catch {
    return "deepseek-chat";
  }
}

export { callWithFallback, getDefaultModel };
