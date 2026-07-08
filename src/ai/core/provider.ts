/**
 * AI Provider abstraction layer.
 *
 * Supports: DeepSeek, Groq, Gemini
 * Future: Anthropic, OpenAI, Ollama (local)
 *
 * IMPORTANT: API keys read from server-side env vars only.
 * Never hardcode keys. Never log keys. Never leak raw errors to client.
 *
 * Env vars:
 *   DEEPSEEK_API_KEY        — DeepSeek (primary)
 *   GROQ_API_KEY            — Groq (fallback)
 *   GEMINI_API_KEY          — Gemini (second fallback)
 *   AI_DEFAULT_MODEL        — Default model for agents (default: deepseek-chat)
 *   AI_FAST_MODEL           — Fast model for quick responses (default: llama-3.3-70b-versatile)
 *   AI_REASONING_MODEL      — Reasoning model for complex tasks (default: deepseek-chat)
 *   AI_PROVIDER_PRIORITY    — Comma-separated priority override (default: deepseek,groq,gemini)
 */

export interface ProviderRequest {
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  responseFormat?: "text" | "json";
}

export interface ProviderResponse {
  content: string;
  model: string;
  provider: string;
  latencyMs: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export type ProviderName = "deepseek" | "groq" | "gemini";

// ─── Provider routing ─────────────────────────────────────

function loadPriority(): ProviderName[] {
  const env = process.env.AI_PROVIDER_PRIORITY;
  if (env) {
    const parsed = env.split(",").map((s) => s.trim()) as ProviderName[];
    if (parsed.every((p) => ["deepseek", "groq", "gemini"].includes(p))) {
      return parsed;
    }
  }
  return ["deepseek", "groq", "gemini"];
}

const MODEL_MAP: Record<string, ProviderName> = {
  "deepseek-chat": "deepseek",
  "llama-3.3-70b-versatile": "groq",
  "llama-3.1-8b-instant": "groq",
  "gemini-2.0-flash": "gemini",
  "gemini-1.5-pro": "gemini",
};

function getProviderForModel(model: string): ProviderName | null {
  return MODEL_MAP[model] ?? null;
}

export function getDefaultModel(): string {
  return process.env.AI_DEFAULT_MODEL || "deepseek-chat";
}

export function getFastModel(): string {
  return process.env.AI_FAST_MODEL || "llama-3.3-70b-versatile";
}

export function getReasoningModel(): string {
  return process.env.AI_REASONING_MODEL || "deepseek-chat";
}

// ─── Internal: wrap with timing ───────────────────────────

async function timedCall<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, latencyMs: Date.now() - start };
}

// ─── Individual provider callers ──────────────────────────

async function callDeepSeek(req: ProviderRequest): Promise<ProviderResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const dsBody: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    temperature: req.temperature,
    max_tokens: req.maxTokens,
  };
  if (req.responseFormat === "json") {
    dsBody.response_format = { type: "json_object" };
  }
  const { result: raw, latencyMs } = await timedCall(() =>
    fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(dsBody),
      signal: AbortSignal.timeout(req.timeoutMs),
    })
  );

  if (!raw.ok) {
    const status = raw.status;
    const body = await raw.text().catch(() => "");
    throw new ProviderHttpError("deepseek", status, body);
  }

  const json = await raw.json();
  const choice = json.choices?.[0]?.message;
  if (!choice?.content) throw new ProviderEmptyError("deepseek");

  return {
    content: choice.content,
    model: req.model,
    provider: "deepseek",
    latencyMs,
    usage: {
      promptTokens: json.usage?.prompt_tokens ?? 0,
      completionTokens: json.usage?.completion_tokens ?? 0,
      totalTokens: json.usage?.total_tokens ?? 0,
    },
  };
}

async function callGroq(req: ProviderRequest): Promise<ProviderResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const body: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    temperature: req.temperature,
    max_tokens: req.maxTokens,
  };
  if (req.responseFormat === "json") {
    body.response_format = { type: "json_object" };
  }

  const { result: raw, latencyMs } = await timedCall(() =>
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(req.timeoutMs),
    })
  );

  if (!raw.ok) {
    const status = raw.status;
    const text = await raw.text().catch(() => "");
    throw new ProviderHttpError("groq", status, text);
  }

  const json = await raw.json();
  const choice = json.choices?.[0]?.message;
  if (!choice?.content) throw new ProviderEmptyError("groq");

  return {
    content: choice.content,
    model: req.model,
    provider: "groq",
    latencyMs,
    usage: {
      promptTokens: json.usage?.prompt_tokens ?? 0,
      completionTokens: json.usage?.completion_tokens ?? 0,
      totalTokens: json.usage?.total_tokens ?? 0,
    },
  };
}

async function callGemini(req: ProviderRequest): Promise<ProviderResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const { result: raw, latencyMs } = await timedCall(() =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: req.messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            temperature: req.temperature,
            maxOutputTokens: req.maxTokens,
          },
        }),
        signal: AbortSignal.timeout(req.timeoutMs),
      }
    )
  );

  if (!raw.ok) {
    const status = raw.status;
    const text = await raw.text().catch(() => "");
    throw new ProviderHttpError("gemini", status, text);
  }

  const json = await raw.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new ProviderEmptyError("gemini");

  return {
    content: text,
    model: req.model,
    provider: "gemini",
    latencyMs,
    usage: {
      promptTokens: json.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: json.usageMetadata?.totalTokenCount ?? 0,
    },
  };
}

// ─── Streaming support (added in Phase 7) ──────────────────

export interface ProviderStreamResult {
  fullText: string;
  provider: string;
  model: string;
  latencyMs: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Error khusus: stream terputus SETELAH sebagian teks diterima.
 * Membawa teks parsial supaya pemanggil bisa menyelamatkan konten —
 * dan supaya chain TIDAK berpindah provider (yang akan menyambung dua
 * respons berbeda menjadi satu teks rusak).
 */
export class ProviderStreamInterruptedError extends Error {
  constructor(
    public readonly provider: string,
    public readonly model: string,
    public readonly partialText: string,
    cause?: unknown
  ) {
    super(`[${provider}] stream interrupted after ${partialText.length} chars`);
    this.name = "ProviderStreamInterruptedError";
    if (cause instanceof Error) this.cause = cause;
  }
}

/**
 * Watchdog streaming: abort hanya bila TIDAK ADA chunk baru (idle),
 * bukan durasi total — AbortSignal.timeout() lama memutus RPP panjang
 * di tengah walau stream masih sehat.
 */
function createStreamWatchdog(connectMs = 30000, idleMs = 60000, totalMs = 280000) {
  const controller = new AbortController();
  const start = Date.now();
  let timer: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), connectMs);
  return {
    signal: controller.signal,
    touch() {
      clearTimeout(timer);
      const sisaTotal = totalMs - (Date.now() - start);
      timer = setTimeout(() => controller.abort(), Math.max(1000, Math.min(idleMs, sisaTotal)));
    },
    clear() {
      clearTimeout(timer);
    },
  };
}

async function streamDeepSeek(
  req: ProviderRequest,
  onDelta: (text: string) => void
): Promise<ProviderStreamResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const startTime = Date.now();
  const streamBody: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    temperature: req.temperature,
    max_tokens: req.maxTokens,
    stream: true,
  };
  if (req.responseFormat === "json") {
    streamBody.response_format = { type: "json_object" };
  }
  const watchdog = createStreamWatchdog();
  let acc = "";
  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(streamBody),
      signal: watchdog.signal,
    });

    if (!response.ok) {
      const status = response.status;
      const body = await response.text().catch(() => "");
      throw new ProviderHttpError("deepseek", status, body);
    }

    watchdog.touch();
    const fullText = await collectStreamTextAndParseOpenAI(response, (d) => {
      acc += d;
      watchdog.touch();
      onDelta(d);
    });
    const latencyMs = Date.now() - startTime;

    return {
      fullText,
      provider: "deepseek",
      model: req.model,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      latencyMs,
    };
  } catch (e) {
    if (acc.trim().length > 0) throw new ProviderStreamInterruptedError("deepseek", req.model, acc, e);
    throw e;
  } finally {
    watchdog.clear();
  }
}

/**
 * Collect text from an OpenAI-compatible SSE stream.
 * Calls onDelta per chunk, collects full text.
 */
async function collectStreamTextAndParseOpenAI(
  response: Response,
  onDelta: (text: string) => void
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Stream not available");

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let done = false;

  while (!done) {
    const { done: readerDone, value } = await reader.read();
    done = readerDone;
    if (value) {
      buffer += decoder.decode(value, { stream: !done });
    }

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") { done = true; break; }

      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          onDelta(delta);
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  return fullText;
}

/**
 * Stream from Gemini.
 */
async function streamGemini(
  req: ProviderRequest,
  onDelta: (text: string) => void
): Promise<ProviderStreamResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const startTime = Date.now();
  const watchdog = createStreamWatchdog();
  let acc = "";
  try {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: req.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: req.temperature,
          maxOutputTokens: req.maxTokens,
        },
      }),
      signal: watchdog.signal,
    }
  );

    if (!response.ok) {
      const status = response.status;
      const body = await response.text().catch(() => "");
      throw new ProviderHttpError("gemini", status, body);
    }

    watchdog.touch();
    const fullText = await collectStreamTextAndParseGemini(response, (d) => {
      acc += d;
      watchdog.touch();
      onDelta(d);
    });
    const latencyMs = Date.now() - startTime;

    return {
      fullText,
      provider: "gemini",
      model: req.model,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      latencyMs,
    };
  } catch (e) {
    if (acc.trim().length > 0) throw new ProviderStreamInterruptedError("gemini", req.model, acc, e);
    throw e;
  } finally {
    watchdog.clear();
  }
}

/**
 * Collect text from a Gemini SSE stream.
 */
async function collectStreamTextAndParseGemini(
  response: Response,
  onDelta: (text: string) => void
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Stream not available");

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let done = false;

  while (!done) {
    const { done: readerDone, value } = await reader.read();
    done = readerDone;
    if (value) {
      buffer += decoder.decode(value, { stream: !done });
    }

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);

      try {
        const json = JSON.parse(data);
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          fullText += text;
          onDelta(text);
        }
      } catch {
        // skip
      }
    }
  }

  return fullText;
}

const PROVIDER_STREAMERS: Record<string, (req: ProviderRequest, onDelta: (text: string) => void) => Promise<ProviderStreamResult>> = {
  deepseek: streamDeepSeek,
  groq: streamGroq,
  gemini: streamGemini,
};

async function streamGroq(
  req: ProviderRequest,
  onDelta: (text: string) => void
): Promise<ProviderStreamResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const startTime = Date.now();
  const body: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    temperature: req.temperature,
    max_tokens: req.maxTokens,
    stream: true,
    // Catatan: JANGAN kirim response_format json_object saat streaming —
    // Groq menolak kombinasi itu (HTTP 400); prompt sudah memaksa JSON.
  };

  const watchdog = createStreamWatchdog();
  let acc = "";
  try {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: watchdog.signal,
  });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text().catch(() => "");
      throw new ProviderHttpError("groq", status, text);
    }

    watchdog.touch();
    const fullText = await collectStreamTextAndParseOpenAI(response, (d) => {
      acc += d;
      watchdog.touch();
      onDelta(d);
    });
    const latencyMs = Date.now() - startTime;

    return {
      fullText,
      provider: "groq",
      model: req.model,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      latencyMs,
    };
  } catch (e) {
    if (acc.trim().length > 0) throw new ProviderStreamInterruptedError("groq", req.model, acc, e);
    throw e;
  } finally {
    watchdog.clear();
  }
}

/**
 * Stream text from the primary provider for the requested model.
 * Falls back to next available providers in priority order if streaming fails before first chunk.
 */
export async function streamProviderText(
  req: ProviderRequest,
  onDelta: (text: string) => void
): Promise<ProviderStreamResult> {
  const priority = loadPriority();
  const errors: string[] = [];

  for (const providerName of priority) {
    const streamer = PROVIDER_STREAMERS[providerName];
    if (!streamer) {
      errors.push(`${providerName}: No streamer available`);
      continue;
    }

    const apiKeyVar =
      providerName === "deepseek" ? "DEEPSEEK_API_KEY" :
      providerName === "groq" ? "GROQ_API_KEY" :
      "GEMINI_API_KEY";

    if (!process.env[apiKeyVar]) {
      errors.push(`${providerName}: No API key configured`);
      continue;
    }

    try {
      return await streamer({ ...req, model: getModelForProvider(providerName, req.model) }, onDelta);
    } catch (e) {
      // Teks sudah mengalir ke client — berpindah provider akan menyambung
      // dua respons berbeda jadi satu teks rusak. Lempar ke pemanggil agar
      // teks parsial diselamatkan.
      if (e instanceof ProviderStreamInterruptedError) throw e;
      const message = e instanceof ProviderHttpError
        ? `HTTP ${e.status}`
        : e instanceof Error
        ? e.message.slice(0, 100)
        : "unknown error";
      errors.push(`${providerName}: ${message}`);
    }
  }

  throw new ProviderChainFailedError(errors);
}

/**
 * Map a generic model to a provider-specific model.
 */
function getModelForProvider(provider: string, requestedModel: string): string {
  if (provider === "groq" && requestedModel.includes("deepseek")) return "llama-3.3-70b-versatile";
  if (provider === "gemini" && requestedModel.includes("deepseek")) return "gemini-2.0-flash";
  return requestedModel;
}

// ─── Typed errors (internal — never leak to client) ───────

class ProviderHttpError extends Error {
  constructor(
    public readonly provider: string,
    public readonly status: number,
    public readonly body: string
  ) {
    super(`[${provider}] HTTP ${status}: ${body.slice(0, 200)}`);
    this.name = "ProviderHttpError";
  }
}

class ProviderEmptyError extends Error {
  constructor(provider: string) {
    super(`[${provider}] Empty response`);
    this.name = "ProviderEmptyError";
  }
}

// ─── Public API ────────────────────────────────────────────

const PROVIDER_CALLERS: Record<ProviderName, (req: ProviderRequest) => Promise<ProviderResponse>> = {
  deepseek: callDeepSeek,
  groq: callGroq,
  gemini: callGemini,
};

/**
 * Call a specific provider/model directly.
 * Throws on failure — caller handles fallback.
 */
export async function callProvider(req: ProviderRequest): Promise<ProviderResponse> {
  const provider = getProviderForModel(req.model);
  if (!provider) throw new Error(`Unknown model: ${req.model}`);
  const caller = PROVIDER_CALLERS[provider];
  return caller(req);
}

/**
 * Try providers in configured priority order until one succeeds.
 * Respects AI_PROVIDER_PRIORITY env var override.
 * Sanitizes errors — never leaks raw API responses.
 */
export async function callWithFallback(req: ProviderRequest): Promise<ProviderResponse> {
  const priority = loadPriority();
  const errors: string[] = [];

  for (const providerName of priority) {
    const caller = PROVIDER_CALLERS[providerName];
    const apiKeyVar =
      providerName === "deepseek" ? "DEEPSEEK_API_KEY" :
      providerName === "groq" ? "GROQ_API_KEY" :
      "GEMINI_API_KEY";

    if (!process.env[apiKeyVar]) {
      errors.push(`${providerName}: No API key configured`);
      continue;
    }

    try {
      return await caller(req);
    } catch (e) {
      const message = e instanceof ProviderHttpError
        ? `HTTP ${e.status}`
        : e instanceof ProviderEmptyError
        ? "empty response"
        : e instanceof Error
        ? e.message.slice(0, 100)
        : "unknown error";
      errors.push(`${providerName}: ${message}`);
    }
  }

  throw new ProviderChainFailedError(errors);
}

export class ProviderChainFailedError extends Error {
  constructor(public readonly errors: string[]) {
    super(`All AI providers failed: ${errors.join("; ")}`);
    this.name = "ProviderChainFailedError";
  }
}

/**
 * Estimate cost per 1K tokens for a given provider/model.
 * Used for usage tracking, not billing.
 */
export function estimateCost(provider: ProviderName, totalTokens: number): number {
  const rates: Record<string, number> = {
    deepseek: 0.0005,
    groq: 0.0003,
    gemini: 0.00015,
  };
  const rate = rates[provider] ?? 0.0005;
  return (totalTokens / 1000) * rate;
}
