/**
 * P8C — Risk signal configuration (server-side ONLY).
 * Threshold deterministik & explainable. TIDAK diekspos ke klien (tanpa
 * NEXT_PUBLIC). Default konservatif — bukan "AI score".
 */

function envInt(name: string, fallback: number): number {
  const raw = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

/** A. SELF_REFERRAL — hanya dicatat (blokir sudah ada di sistem). */
export function riskSelfReferralSeverity(): string {
  return "LOW";
}

/** B. Akun baru → join → Premium dalam waktu sangat singkat (menit). */
export function riskRapidPremiumWindowMinutes(): number {
  return envInt("RISK_RAPID_PREMIUM_WINDOW_MINUTES", 60);
}
export function riskRapidPremiumSeverity(): string {
  return "LOW";
}

/** C. Abnormal refund pattern — rolling window (hari) + minimum count + rasio. */
export function riskRefundWindowDays(): number {
  return envInt("RISK_REFUND_WINDOW_DAYS", 30);
}
export function riskRefundMinCount(): number {
  return envInt("RISK_REFUND_MIN_COUNT", 3);
}
export function riskRefundRatioThreshold(): number {
  const raw = parseFloat(process.env.RISK_REFUND_RATIO_THRESHOLD ?? "");
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : 0.5;
}
export function riskRefundSeverity(): string {
  return "MEDIUM";
}

/** D. Destination change cooling period (jam). */
export function riskDestinationCooldownHours(): number {
  return envInt("RISK_DESTINATION_COOLDOWN_HOURS", 24);
}
export function riskDestinationCooldownMs(): number {
  return riskDestinationCooldownHours() * 60 * 60 * 1000;
}
export function riskDestinationChangeSeverity(): string {
  return "MEDIUM";
}

/** E. Withdrawal velocity — jendela (jam) + jumlah minimum + lompatan amount. */
export function riskWithdrawalVelocityWindowHours(): number {
  return envInt("RISK_WITHDRAWAL_VELOCITY_WINDOW_HOURS", 24);
}
export function riskWithdrawalVelocityCount(): number {
  return envInt("RISK_WITHDRAWAL_VELOCITY_COUNT", 5);
}
export function riskWithdrawalAmountJumpMultiplier(): number {
  const raw = parseFloat(process.env.RISK_WITHDRAWAL_AMOUNT_JUMP_MULTIPLIER ?? "");
  return Number.isFinite(raw) && raw > 1 ? raw : 5;
}
export function riskWithdrawalVelocitySeverity(): string {
  return "MEDIUM";
}

/**
 * §6 — Ambang pembuatan case.
 * LOW → hanya signal. MEDIUM → case bila berulang (count ≥ nilai ini).
 * HIGH → case. CRITICAL → case + restriction.
 */
export function riskMediumRepeatMin(): number {
  return envInt("RISK_MEDIUM_REPEAT_MIN", 2);
}
