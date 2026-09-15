/**
 * BC Agent P8C — Telegram outbound reply-delivery transport.
 *
 * THE single outbound Telegram API boundary of the entire codebase. Every
 * sendMessage / answerCallbackQuery call to Telegram goes through here —
 * no other module may call fetch() against Telegram (enforced by the P8C
 * static security gates).
 *
 * Design contract (P8C Phases 2, 4, 6, 7, 8, 11, 16):
 *
 *   - The bot token is read from BC_AGENT_TELEGRAM_BOT_TOKEN, stays
 *     server-side inside this module, is never logged, never included in
 *     thrown errors, and never exposed to the renderer.
 *   - Message text is bounded (Telegram cap 4096; we clip to 3800) and
 *     redacted via render.redactSecrets before it ever reaches the wire.
 *   - parse_mode is FIXED to undefined (plain text). Callers cannot choose
 *     a parse mode — this structurally kills HTML/Markdown injection
 *     (Telegram would otherwise interpret markup in rendered text).
 *   - Delivery results are TYPED and never throw: delivered / failed /
 *     uncertain / dormant. Delivery failure is never a canonical failure
 *     (P8C Phase 6 — Telegram is a notification transport only).
 *   - Timeouts are AMBIGUOUS: when a request times out or the connection
 *     drops mid-flight, the message may or may not have been delivered.
 *     We report "uncertain" and DO NOT auto-resend (no idempotency key
 *     exists on Telegram sendMessage — resend could duplicate a founder
 *     notification; a duplicated "OK" is worse than a silent gap because
 *     it can trigger a founder to re-run a command).
 *   - Retry policy (Phase 7): ONLY transient failures — connect/reset
 *     errors, selected 5xx (500/502/503/504), and 429 honoring
 *     retry-after. Never 400/401/403/404. Bounded attempts, bounded
 *     exponential backoff with jitter, no infinite loops.
 *   - Dormant without a valid token (config.ts): every send returns
 *     DORMANT with zero network I/O — production stays silent until P8D.
 *   - Telemetry (Phase 16): bounded, secret-free counters via
 *     injectable TelegramDeliveryTelemetry.
 *
 * This file NEVER imports the canonical persistence/command/worker layers.
 */

import { redactSecrets } from "./render";
import { loadTelegramDeliveryConfig } from "./config";

// ─── Constants (bounded by design) ────────────────────────────────────────

export const TELEGRAM_API_BASE = "https://api.telegram.org";
export const MAX_OUTBOUND_TEXT_CHARS = 3800; // Telegram hard cap 4096; margin for envelopes.
const CONNECT_TIMEOUT_MS = 5_000; // P8B report §19 recommendation: 5s.
const MAX_ATTEMPTS = 3; // 1 initial + 2 retries (P8B report §19: "2 retries").
const BASE_BACKOFF_MS = 250;
const MAX_BACKOFF_MS = 2_000; // bounded backoff — no exponential blowup.
const RETRYABLE_HTTP = new Set([500, 502, 503, 504]);

// ─── Delivery result taxonomy (Phase 6 semantics) ─────────────────────────

/**
 * Why a delivery ended the way it did. `UNCERTAIN` is reserved for
 * timeout/reset-ambiguity: the request MAY have been delivered — callers
 * must not claim failure, and the transport does not resend.
 */
export type DeliveryFailureCategory =
  | "CONFIG_INVALID"
  | "DORMANT"
  | "BAD_REQUEST"
  | "AUTH"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "TIMEOUT_AMBIGUOUS"
  | "NETWORK"
  | "MALFORMED_RESPONSE"
  | "OVERSIZED";

export type DeliveryStatus =
  | "DELIVERED"
  | "FAILED"
  | "UNCERTAIN"
  | "DORMANT";

export interface DeliveryResult {
  readonly status: DeliveryStatus;
  /** Telegram API HTTP status when a response was received; null otherwise. */
  readonly httpStatus: number | null;
  readonly category: DeliveryFailureCategory | null;
  /** Total attempts consumed (1 = no retry). Telemetry only. */
  readonly attempts: number;
  /** Wall-clock latency in ms across all attempts. */
  readonly latencyMs: number;
  /**
   * Opaque, bounded, SECRET-FREE failure note for logs. Never contains the
   * token, raw Telegram response bodies, or message content.
   */
  readonly error?: string;
}

export interface SendMessageOptions {
  /**
   * ONLY injectable for tests (mock transport). Never set in production
   * callers. When absent, the token comes from config.
   */
  readonly tokenOverride?: string;
  /** Injectable clock for deterministic backoff in tests. */
  readonly now?: () => number;
  /** Injectable sleep — tests pass a no-op; production uses real timers. */
  readonly sleep?: (ms: number) => Promise<void>;
  /** Injectable fetch — tests point this at a deterministic mock API. */
  readonly fetchImpl?: typeof fetch;
  /** Injectable telemetry sink (Phase 16). Default is a no-op. */
  readonly telemetry?: TelegramDeliveryTelemetry;
}

// ─── Telemetry (Phase 16 — safe, secret-free) ─────────────────────────────

export type DeliveryTelemetryEvent =
  | { kind: "attempt"; attempt: number; chatIdClass: "bound" | "unknown" }
  | {
      kind: "outcome";
      status: DeliveryStatus;
      httpStatus: number | null;
      category: DeliveryFailureCategory | null;
      attempts: number;
      latencyMs: number;
    };

export interface TelegramDeliveryTelemetry {
  (event: DeliveryTelemetryEvent): void;
}

export function noopTelemetry(): TelegramDeliveryTelemetry {
  return () => undefined;
}

// ─── Bounded, sanitized error notes (never token/content-bearing) ─────────

const MAX_ERROR_NOTE_CHARS = 160;

function note(text: string): string {
  // Second-pass redaction + hard bound: even a hostile upstream error body
  // cannot smuggle a secret shape or unlimited bytes into logs.
  return redactSecrets(String(text)).slice(0, MAX_ERROR_NOTE_CHARS);
}

function classifyHttpStatus(httpStatus: number): DeliveryFailureCategory {
  if (httpStatus === 400) return "BAD_REQUEST";
  if (httpStatus === 401) return "AUTH";
  if (httpStatus === 403) return "FORBIDDEN";
  if (httpStatus === 404) return "NOT_FOUND";
  if (httpStatus === 429) return "RATE_LIMITED";
  if (httpStatus >= 500) return "SERVER_ERROR";
  return "MALFORMED_RESPONSE";
}

function backoffDelay(attempt: number, retryAfterSec: number | null, now: () => number): number {
  // 429 retry-after wins (honored, clamped to the bounded ceiling).
  if (retryAfterSec !== null && retryAfterSec > 0) {
    return Math.min(retryAfterSec * 1000, MAX_BACKOFF_MS);
  }
  // Bounded exponential + jitter: 250ms base, never above MAX_BACKOFF_MS.
  const exp = Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
  const jitter = Math.floor(now() % 100); // 0-99ms deterministic-ish jitter
  return Math.min(exp + jitter, MAX_BACKOFF_MS);
}

// ─── Core send primitive ──────────────────────────────────────────────────

interface SendOnceOk {
  ok: true;
  httpStatus: number;
}
interface SendOnceErr {
  ok: false;
  httpStatus: number | null;
  category: DeliveryFailureCategory;
  note: string;
  /** true when the request may have reached Telegram (timeout/reset ambiguity). */
  ambiguous: boolean;
  retryAfterSec: number | null;
}
type SendOnceResult = SendOnceOk | SendOnceErr;

/**
 * One HTTP attempt against the Telegram Bot API. Never throws.
 * `method` is a fixed allowlist value from this module — never caller input.
 */
async function sendTelegramApiOnce(
  method: "sendMessage" | "answerCallbackQuery",
  payload: Record<string, string | number>,
  token: string,
  deps: { fetchImpl: typeof fetch; now: () => number }
): Promise<SendOnceResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
  const startedAt = deps.now();
  try {
    const res = await deps.fetchImpl(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
    if (res.ok) return { ok: true, httpStatus: res.status };

    const category = classifyHttpStatus(res.status);
    let retryAfterSec: number | null = null;
    let errNote = `http_${res.status}`;
    if (res.status === 429) {
      const ra = res.headers.get("retry-after");
      const parsed = ra === null ? NaN : Number.parseInt(ra, 10);
      retryAfterSec = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      if (retryAfterSec === null) errNote = "http_429_no_retry_after";
    }
    return { ok: false, httpStatus: res.status, category, note: note(errNote), ambiguous: false, retryAfterSec };
  } catch (err) {
    const elapsed = deps.now() - startedAt;
    const isAbort =
      typeof err === "object" && err !== null && (err as { name?: unknown }).name === "AbortError";
    const isTimeout = isAbort || elapsed >= CONNECT_TIMEOUT_MS;
    if (isTimeout) {
      // Ambiguity window: the request may have been delivered. We do NOT
      // retry here — resending without an idempotency key risks duplicate
      // founder notifications (Phase 6/8 decision, documented in the report).
      return {
        ok: false,
        httpStatus: null,
        category: "TIMEOUT_AMBIGUOUS",
        note: `timeout_after_${elapsed}ms_may_have_been_delivered`,
        ambiguous: true,
        retryAfterSec: null,
      };
    }
    const name = typeof err === "object" && err !== null ? String((err as { name?: unknown }).name ?? "Error") : "Error";
    return {
      ok: false,
      httpStatus: null,
      category: "NETWORK",
      note: note(`network_${name}`),
      ambiguous: false,
      retryAfterSec: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Retryable classification (Phase 7) ───────────────────────────────────

function isRetryable(r: SendOnceErr): boolean {
  // Timeouts are NOT retried: ambiguous delivery — a resend could duplicate
  // the notification (see sendTelegramApiOnce). Conservative by design.
  if (r.category === "TIMEOUT_AMBIGUOUS") return false;
  if (r.category === "NETWORK") return true; // connect reset / refused — request never left
  if (r.httpStatus !== null && RETRYABLE_HTTP.has(r.httpStatus)) return true;
  if (r.httpStatus === 429) return true; // retried honoring retry-after backoff
  return false; // 400/401/403/404/malformed — permanent, never retried
}

// ─── Public transport ─────────────────────────────────────────────────────

/**
 * Send one bounded, redacted plain-text message to one chat via the
 * Telegram Bot API. Never throws. Delivery failure NEVER implies canonical
 * failure (Phase 6). Exactly one outbound boundary for sendMessage.
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options: SendMessageOptions = {}
): Promise<DeliveryResult> {
  const startedAt = options.now?.() ?? Date.now();
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const fetchImpl = options.fetchImpl ?? fetch;
  const telemetry = options.telemetry ?? noopTelemetry();

  // Config gate: dormant without a well-formed token (Phase 3).
  const token = options.tokenOverride ?? process.env.BC_AGENT_TELEGRAM_BOT_TOKEN ?? "";
  if (!options.tokenOverride && !loadTelegramDeliveryConfig().enabled) {
    const latencyMs = now() - startedAt;
    telemetry({ kind: "outcome", status: "DORMANT", httpStatus: null, category: "DORMANT", attempts: 0, latencyMs });
    return { status: "DORMANT", httpStatus: null, category: "DORMANT", attempts: 0, latencyMs, error: "delivery_dormant_no_token" };
  }
  if (!token) {
    const latencyMs = now() - startedAt;
    telemetry({ kind: "outcome", status: "FAILED", httpStatus: null, category: "CONFIG_INVALID", attempts: 0, latencyMs });
    return { status: "FAILED", httpStatus: null, category: "CONFIG_INVALID", attempts: 0, latencyMs, error: "missing_token" };
  }

  // Bounded + redacted BEFORE the wire (Phases 4, 11): plain text only —
  // parse_mode is deliberately never set, so Telegram cannot interpret
  // markup from rendered content (HTML/Markdown injection neutralized).
  const bounded = redactSecrets(text).slice(0, MAX_OUTBOUND_TEXT_CHARS);
  if (!chatId || chatId.length > 64) {
    const latencyMs = now() - startedAt;
    telemetry({ kind: "outcome", status: "FAILED", httpStatus: null, category: "BAD_REQUEST", attempts: 0, latencyMs });
    return { status: "FAILED", httpStatus: null, category: "BAD_REQUEST", attempts: 0, latencyMs, error: "invalid_chat_id" };
  }

  let lastErr: SendOnceErr | null = null;
  let attemptsUsed = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    attemptsUsed = attempt;
    telemetry({ kind: "attempt", attempt, chatIdClass: "bound" });
    const r = await sendTelegramApiOnce("sendMessage", { chat_id: chatId, text: bounded }, token, { fetchImpl, now });

    if (r.ok) {
      const latencyMs = now() - startedAt;
      telemetry({ kind: "outcome", status: "DELIVERED", httpStatus: r.httpStatus, category: null, attempts: attempt, latencyMs });
      return { status: "DELIVERED", httpStatus: r.httpStatus, category: null, attempts: attempt, latencyMs };
    }

    lastErr = r;
    // 400 with chat-not-shape is terminal; all non-retryables terminal.
    if (!isRetryable(r) || attempt === MAX_ATTEMPTS) break;

    const delay = backoffDelay(attempt, r.retryAfterSec, now);
    await sleep(delay);
  }

  // lastErr is non-null here: the loop only exits via break (error) or return.
  const err = lastErr as SendOnceErr;
  const latencyMs = now() - startedAt;
  const status: DeliveryStatus = err.ambiguous ? "UNCERTAIN" : "FAILED";
  telemetry({ kind: "outcome", status, httpStatus: err.httpStatus, category: err.category, attempts: attemptsUsed, latencyMs });
  return {
    status,
    httpStatus: err.httpStatus,
    category: err.category,
    attempts: attemptsUsed,
    latencyMs,
    error: err.note,
  };
}

/**
 * Answer a Telegram callback query (one per callback id, best-effort).
 * Same boundary, same semantics, no retries (callback answers are
 * ephemeral UI state — the durable reply is the sendMessage above).
 */
export async function answerTelegramCallback(
  callbackId: string,
  text: string,
  options: SendMessageOptions = {}
): Promise<DeliveryResult> {
  const startedAt = options.now?.() ?? Date.now();
  const now = options.now ?? (() => Date.now());
  const fetchImpl = options.fetchImpl ?? fetch;
  const telemetry = options.telemetry ?? noopTelemetry();

  const token = options.tokenOverride ?? process.env.BC_AGENT_TELEGRAM_BOT_TOKEN ?? "";
  if (!options.tokenOverride && !loadTelegramDeliveryConfig().enabled) {
    const latencyMs = now() - startedAt;
    telemetry({ kind: "outcome", status: "DORMANT", httpStatus: null, category: "DORMANT", attempts: 0, latencyMs });
    return { status: "DORMANT", httpStatus: null, category: "DORMANT", attempts: 0, latencyMs, error: "delivery_dormant_no_token" };
  }
  if (!token) {
    const latencyMs = now() - startedAt;
    telemetry({ kind: "outcome", status: "FAILED", httpStatus: null, category: "CONFIG_INVALID", attempts: 0, latencyMs });
    return { status: "FAILED", httpStatus: null, category: "CONFIG_INVALID", attempts: 0, latencyMs, error: "missing_token" };
  }

  const bounded = redactSecrets(text).slice(0, 180); // callback answer cap 200
  const r = await sendTelegramApiOnce("answerCallbackQuery", { callback_query_id: callbackId, text: bounded }, token, {
    fetchImpl,
    now,
  });
  const latencyMs = now() - startedAt;
  if (r.ok) {
    telemetry({ kind: "outcome", status: "DELIVERED", httpStatus: r.httpStatus, category: null, attempts: 1, latencyMs });
    return { status: "DELIVERED", httpStatus: r.httpStatus, category: null, attempts: 1, latencyMs };
  }
  const status: DeliveryStatus = r.ambiguous ? "UNCERTAIN" : "FAILED";
  telemetry({ kind: "outcome", status, httpStatus: r.httpStatus, category: r.category, attempts: 1, latencyMs });
  return { status, httpStatus: r.httpStatus, category: r.category, attempts: 1, latencyMs, error: r.note };
}
