/**
 * BC Agent P8C — Telegram delivery configuration.
 *
 * Single configuration surface for the OUTBOUND reply-delivery transport
 * (sendMessage). Reuses the P8A-established env names — no new/duplicate
 * variables are invented:
 *
 *   - BC_AGENT_TELEGRAM_BOT_TOKEN     — bot token for sendMessage. Absent ⇒
 *     delivery is DORMANT (mode "dormant", every send returns DORMANT and
 *     nothing leaves the process). Production stays dormant until the
 *     founder provisions credentials (P8D).
 *   - BC_AGENT_TELEGRAM_WEBHOOK_SECRET — inbound transport gate (P8B,
 *     unchanged); read here only to report the dormant/armed posture.
 *
 * Security rules (P8C Phase 3):
 *   - token values are NEVER returned, logged, or stringified — only the
 *     status enum (SET / MISSING / INVALID) is exposed;
 *   - no value from process.env is ever echoed back by this module.
 *
 * Zero I/O in this file.
 */

export type TelegramConfigStatus = "SET" | "MISSING" | "INVALID";

export interface TelegramDeliveryConfig {
  /** True when a syntactically valid token is configured. */
  readonly enabled: boolean;
  /** "dormant" = no token; "armed" = token present + well-formed. */
  readonly mode: "dormant" | "armed";
  /** BC_AGENT_TELEGRAM_BOT_TOKEN status. NEVER the value itself. */
  readonly tokenStatus: TelegramConfigStatus;
  /** Inbound webhook secret status (P8B). NEVER the value itself. */
  readonly webhookSecretStatus: TelegramConfigStatus;
}

/** P8A-documented token shape: `<numeric-bot-id>:<35-ish alphanumeric/_->`. */
export function isValidTelegramTokenShape(token: string): boolean {
  return /^\d{6,12}:[A-Za-z0-9_-]{30,50}$/.test(token);
}

/** Minimal env view — accepts process.env without requiring the keys. */
export interface TelegramEnvView {
  readonly BC_AGENT_TELEGRAM_BOT_TOKEN?: string | undefined;
  readonly BC_AGENT_TELEGRAM_WEBHOOK_SECRET?: string | undefined;
}

/**
 * Load delivery config. Never throws; never leaks values. A malformed
 * (non-secret-shaped) token is reported INVALID and keeps delivery dormant —
 * a wrong token must never be sent to the real Telegram API.
 */
export function loadTelegramDeliveryConfig(env?: TelegramEnvView): TelegramDeliveryConfig {
  const raw = env?.BC_AGENT_TELEGRAM_BOT_TOKEN ?? process.env.BC_AGENT_TELEGRAM_BOT_TOKEN ?? "";
  const tokenStatus: TelegramConfigStatus = raw
    ? isValidTelegramTokenShape(raw)
      ? "SET"
      : "INVALID"
    : "MISSING";

  const secret = env?.BC_AGENT_TELEGRAM_WEBHOOK_SECRET ?? process.env.BC_AGENT_TELEGRAM_WEBHOOK_SECRET ?? "";
  const webhookSecretStatus: TelegramConfigStatus = secret ? "SET" : "MISSING";

  return {
    enabled: tokenStatus === "SET",
    mode: tokenStatus === "SET" ? "armed" : "dormant",
    tokenStatus,
    webhookSecretStatus: webhookSecretStatus,
  };
}
