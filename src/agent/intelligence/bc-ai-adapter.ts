/**
 * BC Agent P3 — BC AI adapter: the ONLY module in src/agent/** that knows
 * the existing BC AI infrastructure (src/ai/core/provider.ts).
 *
 * Responsibilities (translation only — no second engine):
 *   - assemble the trust-boundary prompt (prompt.ts)
 *   - call `callWithFallback` (BC AI owns model chain, key rotation,
 *     per-call AbortSignal timeout, provider fallback)
 *   - normalize BC AI failures into the seven IntelligenceError categories
 *   - bounded provider retry (default 1 retry) + single overall deadline
 *   - bounded structured-output validation (structured.ts)
 *   - metadata-only audit log entries (no prompts/responses/secrets)
 *
 * The adapter is dependency-injected with the BC AI call function and
 * clock/sleep so tests can run fully offline; the production default wires
 * `callWithFallback` and the real model from BC AI configuration
 * (AI_FAST_MODEL → AI_DEFAULT_MODEL), keeping model selection OUT of the
 * Agent layer.
 */

import { callWithFallback, ProviderChainFailedError, getDefaultModel, getFastModel } from "../../ai/core/provider";
import type { IntelligenceProvider, IntelligenceRequest, IntelligenceResult, IntelligenceLogEntry } from "./types";
import {
  INTELLIGENCE_DEFAULT_MAX_TOKENS,
  INTELLIGENCE_DEFAULT_TEMPERATURE,
  INTELLIGENCE_DEFAULT_TIMEOUT_MS,
  INTELLIGENCE_DEFAULT_PROVIDER_RETRIES,
  INTELLIGENCE_RETRY_BACKOFF_MS,
  INTELLIGENCE_CORRECTION_MAX_CHARS,
} from "./types";
import {
  IntelligenceError,
  InvalidIntelligenceRequestError,
  categoryForHttpStatus,
  isTimeoutLikeMessage,
} from "./errors";
import { assemblePrompt } from "./prompt";
import { parseStructured, correctionAddendum } from "./structured";
import { withOverallTimeout, sleep, OverallTimeoutError } from "./timeout";

/** Shape of the injected BC AI call function (matches callWithFallback). */
export type BcAiCall = typeof callWithFallback;

export interface BcAiAdapterOptions {
  /** BC AI entry point. Default: the real `callWithFallback`. */
  readonly bcAiCall?: BcAiCall;
  /** BC AI model id. Default: AI_FAST_MODEL → AI_DEFAULT_MODEL (BC AI's own config). */
  readonly model?: string;
  /** Max provider calls = 1 + retries. Default retry: 1 (bounded). */
  readonly providerRetries?: number;
  /** Backoff between provider attempts (ms). Default 1000. */
  readonly retryBackoffMs?: number;
  /** Wall clock (injectable for deterministic tests). */
  readonly now?: () => number;
  /** Sleep (injectable so tests don't actually wait). */
  readonly sleep?: (ms: number) => Promise<void>;
  /** Audit sink. Receives metadata ONLY — never prompts/responses. */
  readonly onLog?: (entry: IntelligenceLogEntry) => void;
}

/** Normalized view of one BC AI failure before category mapping. */
interface NormalizedFailure {
  readonly error: IntelligenceError;
  /** Retry only when the failure is provider-side and possibly transient. */
  readonly retryable: boolean;
}

/**
 * Normalize ANY error thrown by the BC AI layer into a canonical category.
 *
 * FACT (from src/ai/core/provider.ts): BC AI throws
 *  - ProviderChainFailedError (chain exhausted; `.errors` = sanitized
 *    per-provider strings like "groq/openai/gpt-oss-120b: HTTP 429"),
 *  - plain Error("… not configured") for missing keys,
 *  - anything else is unexpected.
 * The chain's own messages never contain keys (BC AI sanitizes to
 * "HTTP <status>" / short messages) — but we defensively strip header-like
 * and key-like content from anything we embed in our error messages.
 */
function normalizeBcAiError(e: unknown, providerAttemptsMade: number): NormalizedFailure {
  const attemptsDetail = { providerAttempts: providerAttemptsMade };

  if (e instanceof ProviderChainFailedError) {
    const statuses = e.errors
      .map((line) => /HTTP (\d{3})/.exec(line)?.[1])
      .filter((s): s is string => Boolean(s))
      .map((s) => Number(s));
    const summary = e.errors.slice(0, 6).join(" | ").replace(sanitizePattern(), "");

    // The chain only fails hard when EVERY attempt failed; classify by the
    // dominant status across the chain (first found, priority order below).
    const pick = (codes: number[]) => statuses.find((s) => codes.includes(s));
    const status =
      pick([429]) ?? pick([401, 403]) ?? pick([408]) ?? pick([400, 404, 413, 422]) ?? pick([500, 502, 503, 504]);

    if (status !== undefined) {
      const category = categoryForHttpStatus(status);
      return {
        error: new IntelligenceError(category, `Semua provider di rantai gagal (HTTP ${status})`, { ...attemptsDetail, httpStatus: status, chain: summary }, e),
        retryable: category !== "INTELLIGENCE_AUTH_ERROR" && category !== "INTELLIGENCE_INVALID_REQUEST",
      };
    }

    // No HTTP statuses in the chain — look for empty/timeout-flavored text.
    const joined = e.errors.join(" ");
    if (/empty response/i.test(joined)) {
      return {
        error: new IntelligenceError("INTELLIGENCE_PROVIDER_ERROR", "Provider mengembalikan respons kosong", attemptsDetail, e),
        retryable: true,
      };
    }
    if (isTimeoutLikeMessage(joined)) {
      return { error: new IntelligenceError("INTELLIGENCE_TIMEOUT", "Provider kehabisan waktu", attemptsDetail, e), retryable: true };
    }
    if (/not configured/i.test(joined)) {
      return {
        error: new IntelligenceError("INTELLIGENCE_INVALID_REQUEST", "Konfigurasi AI tidak lengkap (API key tidak ada)", attemptsDetail, e),
        retryable: false,
      };
    }
    return {
      error: new IntelligenceError("INTELLIGENCE_PROVIDER_ERROR", "Semua provider di rantai gagal", attemptsDetail, e),
      retryable: true,
    };
  }

  // Missing API key inside a single provider call (shouldn't escape the
  // chain, but normalize defensively).
  if (e instanceof Error && /not configured/i.test(e.message)) {
    return {
      error: new IntelligenceError("INTELLIGENCE_INVALID_REQUEST", "Konfigurasi AI tidak lengkap (API key tidak ada)", attemptsDetail, e),
      retryable: false,
    };
  }

  if (e instanceof Error && isTimeoutLikeMessage(e.message)) {
    return { error: new IntelligenceError("INTELLIGENCE_TIMEOUT", "Provider kehabisan waktu", attemptsDetail, e), retryable: true };
  }

  const safe = e instanceof Error ? e.message.slice(0, 160).replace(sanitizePattern(), "") : "unknown error";
  return {
    error: new IntelligenceError("INTELLIGENCE_PROVIDER_ERROR", `Kegagalan provider tak terduga: ${safe}`, attemptsDetail, e),
    retryable: true,
  };
}

/** Header-like and credential-like fragments never belong in messages. */
function sanitizePattern(): RegExp {
  return /(authorization|bearer|x-goog-api-key|api[-_]?key|sk-[a-zA-Z0-9]{8,}|AIza[a-zA-Z0-9_-]{8,})/gi;
}

/**
 * Safe default audit sink (P3 audit §13 finding): every intelligence call
 * leaves a metadata-only trail even when no sink is injected. Emits ONLY the
 * fields of IntelligenceLogEntry — requestId, outcome, category, provider,
 * model, latency, attempts, token counts. There is no prompt/response field
 * on the type and none is added here, so untrusted external data and
 * sensitive founder instructions can never leak through this path.
 */
function defaultIntelligenceLog(entry: IntelligenceLogEntry): void {
  const parts = [
    `request=${entry.requestId}`,
    `outcome=${entry.outcome}`,
    ...(entry.errorCategory ? [`category=${entry.errorCategory}`] : []),
    ...(entry.provider ? [`provider=${entry.provider}`] : []),
    ...(entry.model ? [`model=${entry.model}`] : []),
    `latencyMs=${entry.latencyMs}`,
    `attempts=${entry.providerAttempts}`,
    ...(entry.usage ? [`tokens=${entry.usage.totalTokens}`] : []),
  ];
  console.log(`[BC Intelligence] ${parts.join(" ")}`);
}

/**
 * Production adapter over the existing BC AI stack.
 * Implements IntelligenceProvider.
 */
export class BcAiIntelligenceAdapter implements IntelligenceProvider {
  private readonly bcAiCall: BcAiCall;
  private readonly model: string;
  private readonly maxProviderAttempts: number;
  private readonly retryBackoffMs: number;
  private readonly now: () => number;
  private readonly doSleep: (ms: number) => Promise<void>;
  private readonly onLog: (entry: IntelligenceLogEntry) => void;

  constructor(options: BcAiAdapterOptions = {}) {
    this.bcAiCall = options.bcAiCall ?? callWithFallback;
    // Model selection belongs to BC AI configuration, not the Agent:
    // AI_FAST_MODEL (fast) → AI_DEFAULT_MODEL. FACT: both getters exist in
    // provider.ts; the founder's Groq-only priority chain serves either.
    this.model = options.model ?? (getFastModel() || getDefaultModel());
    this.maxProviderAttempts = Math.max(1, (options.providerRetries ?? INTELLIGENCE_DEFAULT_PROVIDER_RETRIES) + 1);
    this.retryBackoffMs = options.retryBackoffMs ?? INTELLIGENCE_RETRY_BACKOFF_MS;
    this.now = options.now ?? Date.now;
    this.doSleep = options.sleep ?? sleep;
    this.onLog = options.onLog ?? defaultIntelligenceLog;
  }

  async run(request: IntelligenceRequest): Promise<IntelligenceResult> {
    const startedAt = this.now();
    let lastFailure: NormalizedFailure | null = null;
    let lastCorrection: string | null = null;

    try {
      // Request-contract validation happens BEFORE any provider work and is
      // never wrapped in provider-error semantics: an invalid request is the
      // caller's bug, not a provider failure — it must surface as
      // InvalidIntelligenceRequestError. Inside the try so the audit sink
      // records the rejection too (metadata only; providerAttempts 0).
      if (!request.requestId || !request.requestId.trim()) {
        throw new InvalidIntelligenceRequestError("requestId tidak boleh kosong");
      }
      const basePrompt = assemblePrompt(request);
      const timeoutMs = request.timeoutMs ?? INTELLIGENCE_DEFAULT_TIMEOUT_MS;
      const deadline = startedAt + timeoutMs;
      let attemptsMade = 0;

      const runAll = async (): Promise<IntelligenceResult> => {
        for (let attemptNo = 1; attemptNo <= this.maxProviderAttempts; attemptNo++) {
          attemptsMade = attemptNo;
          // Overall deadline still owns the wall clock even with injected sleeps.
          const remaining = deadline - this.now();
          if (remaining <= 0) {
            throw new OverallTimeoutError(timeoutMs, attemptNo - 1);
          }

          try {
            const userContent = lastCorrection
              ? `${basePrompt.user}\n\n[PERBAIKAN] ${lastCorrection}`
              : basePrompt.user;

            const response = await this.bcAiCall({
              model: this.model,
              messages: [
                { role: "system", content: basePrompt.system },
                { role: "user", content: userContent },
              ],
              temperature: request.temperature ?? INTELLIGENCE_DEFAULT_TEMPERATURE,
              maxTokens: request.maxTokens ?? INTELLIGENCE_DEFAULT_MAX_TOKENS,
              timeoutMs: Math.min(timeoutMs, Math.max(1, remaining)),
              // Note: responseFormat left unset — the adapter parses/validates
              // itself (structured.ts), consistent with BC AI's prompt-strict
              // JSON approach (json_object removed by BC AI STEP 5.1).
            });

            // ── Structured output path ─────────────────────────
            if (request.responseSchema) {
              const parsed = parseStructured(response.content, request.responseSchema);
              if (parsed.ok) {
                return this.success(request, response, parsed.structured, attemptNo, startedAt);
              }
              if (attemptNo < this.maxProviderAttempts) {
                lastCorrection = correctionAddendum(request, parsed.reason).slice(0, INTELLIGENCE_CORRECTION_MAX_CHARS);
                lastFailure = {
                  error: new IntelligenceError("INTELLIGENCE_RESPONSE_INVALID", parsed.reason, { providerAttempts: attemptNo }),
                  retryable: true,
                };
                await this.backoff();
                continue;
              }
              throw new IntelligenceError("INTELLIGENCE_RESPONSE_INVALID", parsed.reason, { providerAttempts: attemptNo });
            }

            // ── Plain text path ────────────────────────────────
            return this.success(request, response, undefined, attemptNo, startedAt);
          } catch (e) {
            if (e instanceof IntelligenceError && e.category === "INTELLIGENCE_RESPONSE_INVALID") throw e;

            const normalized = normalizeBcAiError(e, attemptNo);
            lastFailure = normalized;
            if (attemptNo < this.maxProviderAttempts && normalized.retryable) {
              await this.backoff();
              continue;
            }
            throw normalized.error;
          }
        }
        // Unreachable (loop always returns or throws) — kept for exhaustiveness.
        throw lastFailure?.error ?? new IntelligenceError("INTELLIGENCE_PROVIDER_ERROR", "Tidak ada hasil", { providerAttempts: this.maxProviderAttempts });
      };

      const result = await withOverallTimeout(runAll(), timeoutMs, () =>
        new OverallTimeoutError(timeoutMs, attemptsMade)
      );

      this.onLog({
        requestId: request.requestId,
        outcome: "SUCCESS",
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        providerAttempts: result.providerAttempts,
        usage: result.usage,
      });
      return result;
    } catch (e) {
      // Invalid request / bad assembly is not a provider failure — propagate
      // the typed contract error untouched (after metadata-only logging).
      if (e instanceof InvalidIntelligenceRequestError) {
        this.onLog({
          requestId: request.requestId,
          outcome: "FAILURE",
          errorCategory: e.code,
          latencyMs: this.now() - startedAt,
          providerAttempts: 0,
        });
        throw e;
      }
      const failure =
        e instanceof IntelligenceError
          ? e
          : normalizeBcAiError(e, 0).error;
      this.onLog({
        requestId: request.requestId,
        outcome: "FAILURE",
        errorCategory: failure.category,
        latencyMs: this.now() - startedAt,
        providerAttempts: (failure.details?.providerAttempts as number | undefined) ?? 1,
      });
      throw failure;
    }
  }

  private async backoff(): Promise<void> {
    if (this.retryBackoffMs > 0) await this.doSleep(this.retryBackoffMs);
  }

  private success(
    request: IntelligenceRequest,
    response: Awaited<ReturnType<BcAiCall>>,
    structured: unknown | undefined,
    providerAttempts: number,
    startedAt: number
  ): IntelligenceResult {
    return {
      requestId: request.requestId,
      text: response.content,
      ...(structured !== undefined ? { structured } : {}),
      provider: response.provider,
      model: response.model,
      latencyMs: this.now() - startedAt,
      usage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      },
      providerAttempts,
    };
  }
}
