/**
 * BC Agent P8B — Telegram remote control adapter (public surface).
 *
 * Consumers: the dormant webhook route (transport) and the test suite.
 * Nothing in this module family imports ToolExecutor, worker internals,
 * shell/OpenCode, or performs direct canonical business mutations.
 */

export { parseTelegramUpdate, parseTelegramCommand } from "./adapter";
export { resolveTelegramIdentity, touchBinding } from "./identity";
export { handleTelegramUpdate, type GatewayOutcome, type TelegramGatewayDeps } from "./gateway";
export { createTask } from "./create-task";
export {
  checkTelegramRateLimit,
  makeInMemoryRateLimitCounter,
  DEFAULT_TELEGRAM_RATE_LIMIT,
  type TelegramRateLimitCounter,
  type TelegramRateLimitConfig,
} from "./rate-limit";
export {
  redactSecrets,
  renderStatus,
  renderHealth,
  renderHelp,
} from "./render";
export type {
  TelegramUpdate,
  TelegramCommand,
  TelegramCommandOutcome,
  TelegramDenialReason,
  TelegramAuthContext,
  MAX_TELEGRAM_TEXT_CHARS,
} from "./types";
