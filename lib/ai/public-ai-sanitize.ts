/**
 * Pembersih respons AI untuk permukaan publik (KHUSUS SERVER).
 *
 * Dipakai di batas respons API (JSON / SSE) agar pengguna tidak pernah melihat
 * nama model/penyedia AI. Penyedia & model asli tetap dipakai di server dan
 * tetap tercatat di log/analitik admin — hanya respons ke klien yang dinetralkan.
 *
 * JANGAN impor file ini dari komponen klien: daftar pola di bawah memuat nama
 * penyedia dan akan ikut masuk ke bundle browser.
 */

import { AI_PUBLIC_MODEL, AI_PUBLIC_PROVIDER } from "./ai-confidentiality";

/**
 * Pola nama penyedia/model AI yang tidak boleh terlihat pengguna. Batas kata
 * wajib: "levelLama" tidak boleh terbaca sebagai nama model.
 */
export const AI_PROVIDER_NAME_PATTERN =
  /\b(?:deep[\s-]?seek|open[\s-]?ai|chat[\s-]?gpt|gpt(?:-[\w.]+)*|gemini(?:-[\w.]+)*|claude|anthropic|groq|llama(?:-[\w.]+)*|mistral|mixtral|qwen[\w.-]*|perplexity|cohere|ollama|whisper(?:-[\w.]+)*)\b/gi;

/** Teks netral sebagai pengganti nama penyedia di pesan publik. */
const NEUTRAL_REPLACEMENT = "AI";

/** True bila teks memuat nama penyedia/model AI. */
export function containsAiProviderName(text: string): boolean {
  AI_PROVIDER_NAME_PATTERN.lastIndex = 0;
  const found = AI_PROVIDER_NAME_PATTERN.test(text);
  AI_PROVIDER_NAME_PATTERN.lastIndex = 0;
  return found;
}

/**
 * Hapus nama penyedia/model dari pesan publik (pesan error, peringatan,
 * progress). JANGAN dipakai untuk isi karya/hasil AI — teks murid sah memuat
 * kata seperti "Gemini" (rasi bintang).
 */
export function scrubAiProviderNames(text: string): string;
export function scrubAiProviderNames(text: string | null | undefined): string | null | undefined;
export function scrubAiProviderNames(text: string | null | undefined): string | null | undefined {
  if (typeof text !== "string") return text;
  AI_PROVIDER_NAME_PATTERN.lastIndex = 0;
  return text
    .replace(/\b(?:DEEPSEEK|GROQ|GEMINI|OPENAI|ANTHROPIC|CLAUDE|MISTRAL)_[A-Z0-9_]*\b/g, "kunci layanan AI")
    .replace(AI_PROVIDER_NAME_PATTERN, NEUTRAL_REPLACEMENT)
    .replace(/\bAI(?:[\s/:-]+AI)+\b/g, NEUTRAL_REPLACEMENT);
}

/** Metadata penyedia/model netral untuk respons publik. */
export function publicAiMeta(): { provider: string; model: string } {
  return { provider: AI_PUBLIC_PROVIDER, model: AI_PUBLIC_MODEL };
}

interface ResultLike {
  provider?: unknown;
  model?: unknown;
  error?: unknown;
  warnings?: unknown;
  metadata?: unknown;
  [key: string]: unknown;
}

/**
 * Netralkan hasil agent (AgentRunResult & sejenisnya) sebelum dikirim ke
 * klien: field provider/model diganti nilai netral, pesan error/peringatan
 * dibersihkan. Isi `output`/`text` TIDAK diubah.
 */
export function toPublicAgentResult<T extends ResultLike>(result: T): T {
  if (!result || typeof result !== "object") return result;
  const copy: ResultLike = { ...result };
  if ("provider" in copy) copy.provider = copy.provider == null ? copy.provider : AI_PUBLIC_PROVIDER;
  if ("model" in copy) copy.model = copy.model == null ? copy.model : AI_PUBLIC_MODEL;
  if (typeof copy.error === "string") copy.error = scrubAiProviderNames(copy.error);
  if (Array.isArray(copy.warnings)) {
    copy.warnings = copy.warnings.map((w) => (typeof w === "string" ? scrubAiProviderNames(w) : w));
  }
  if (copy.metadata && typeof copy.metadata === "object" && !Array.isArray(copy.metadata)) {
    const meta = { ...(copy.metadata as Record<string, unknown>) };
    if ("provider" in meta && meta.provider != null) meta.provider = AI_PUBLIC_PROVIDER;
    if ("model" in meta && meta.model != null) meta.model = AI_PUBLIC_MODEL;
    copy.metadata = meta;
  }
  return copy as T;
}

/**
 * Netralkan satu event stream agent sebelum dikirim ke klien sebagai SSE.
 */
export function toPublicStreamEvent<E extends { type: string }>(event: E): E {
  const e = event as unknown as Record<string, unknown>;
  switch (event.type) {
    case "provider":
      return { ...e, provider: AI_PUBLIC_PROVIDER, model: AI_PUBLIC_MODEL } as unknown as E;
    case "final_result":
      return { ...e, result: toPublicAgentResult((e.result ?? {}) as ResultLike) } as unknown as E;
    case "error":
    case "progress":
    case "quota_error":
      return {
        ...e,
        ...(typeof e.message === "string" ? { message: scrubAiProviderNames(e.message) } : {}),
      } as unknown as E;
    default:
      return event;
  }
}
