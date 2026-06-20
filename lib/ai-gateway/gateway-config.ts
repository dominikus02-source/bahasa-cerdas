/**
 * Gateway Configuration — centralized AI credit hard mode flag.
 *
 * AI_CREDIT_HARD_MODE:
 *   true  → quota checks may block requests with insufficient credits
 *   false → soft mode (log warnings only, never block)
 *
 * Default: true in production, false otherwise.
 * Override via env: AI_CREDIT_HARD_MODE=true|false
 *
 * Rollback: set AI_CREDIT_HARD_MODE=false to go back to soft mode.
 */

export function isHardMode(): boolean {
  const env = process.env.AI_CREDIT_HARD_MODE;
  if (env === "true") return true;
  if (env === "false") return false;
  return process.env.NODE_ENV === "production";
}
