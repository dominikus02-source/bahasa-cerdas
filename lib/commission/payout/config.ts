/**
 * P7D — Payout configuration.
 *
 * Semua konstanta bisnis payout hidup di sini. Provider credentials SELALU
 * dari environment — tidak pernah hardcode, tidak pernah di database.
 *
 * Real-money payout TETAP DISABLED sampai Founder Gate terpisah (spec §33):
 * provider default = "mock" (sandbox), dan adapter provider asli tidak
 * tersedia sampai provider dipilih + credentials diberikan founder.
 */

/** ID provider payout aktif. Default "mock" (sandbox). */
export function payoutProvider(): string {
  const raw = (process.env.PAYOUT_PROVIDER ?? "mock").trim().toLowerCase();
  return raw || "mock";
}

/** Apakah payout uang sungguhan diizinkan? SELALU false sampai Founder Gate. */
export function isRealMoneyPayoutEnabled(): boolean {
  return process.env.PAYOUT_REAL_MONEY_ENABLED === "true";
}

/** Apakah provider production diizinkan mengirim? (Founder Gate). */
export function isPayoutProviderEnabled(): boolean {
  return process.env.PAYOUT_PROVIDER_ENABLED === "true";
}

/**
 * Kill switch dari ENVIRONMENT (P7E §6). Nilai "true" = STOP pengiriman baru.
 * Kombinasi dengan SiteSetting "payout_kill_switch" (lihat kill-switch.ts) —
 * salah satu aktif → berhenti.
 */
export function isEnvKillSwitchActive(): boolean {
  return process.env.PAYOUT_KILL_SWITCH === "true";
}

/**
 * Pilot terkontrol (P7E §18): hanya guru dalam daftar yang boleh payout
 * uang asli. Non-pilot → PAYOUT_REAL_MONEY_DISABLED.
 */
export function isPayoutPilotEnabled(): boolean {
  return process.env.PAYOUT_PILOT_ENABLED === "true";
}

/** Daftar teacherId (User.id) yang diizinkan pilot. CSV dari env. */
export function payoutPilotTeacherIds(): Set<string> {
  const raw = process.env.PAYOUT_PILOT_TEACHER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

/**
 * Minimum payout (P7E §7). Default Rp50.000.
 * Env: PAYOUT_MINIMUM_AMOUNT.
 */
export function payoutMinimumAmount(): number {
  const raw = parseInt(process.env.PAYOUT_MINIMUM_AMOUNT ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 50_000;
}

/**
 * Maksimum payout SATU kali (P7E §7). Default Rp5.000.000.
 * Env: PAYOUT_MAX_AMOUNT. Jangan hardcode sebelum kebijakan bisnis dikonfirmasi.
 */
export function payoutMaximumAmount(): number {
  const raw = parseInt(process.env.PAYOUT_MAX_AMOUNT ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 5_000_000;
}

/**
 * Batas harian PER GURU (P7E §7). Default Rp5.000.000.
 * Env: PAYOUT_DAILY_LIMIT.
 */
export function payoutDailyLimit(): number {
  const raw = parseInt(process.env.PAYOUT_DAILY_LIMIT ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 5_000_000;
}

/**
 * Batas harian GLOBAL seluruh guru (P7E §7). Default Rp50.000.000.
 * Env: PAYOUT_GLOBAL_DAILY_LIMIT.
 */
export function payoutGlobalDailyLimit(): number {
  const raw = parseInt(process.env.PAYOUT_GLOBAL_DAILY_LIMIT ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 50_000_000;
}

/**
 * P8E §7 — Langit-langit TOTAL exposure selama PILOT (per hari).
 * Default Rp1.000.000. Bila tercapai: TIDAK ADA payout baru.
 * Error deterministik: PAYOUT_PILOT_LIMIT_REACHED.
 * Env: PAYOUT_PILOT_GLOBAL_LIMIT.
 */
export function payoutPilotGlobalLimit(): number {
  const raw = parseInt(process.env.PAYOUT_PILOT_GLOBAL_LIMIT ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 1_000_000;
}

/**
 * Batas waktu payout PROCESSING sebelum dianggap RECONCILIATION_REQUIRED
 * (spec §20). TIDAK pernah otomatis FAILED hanya karena lewat waktu.
 * Default: 60 menit. Env: PAYOUT_RECONCILIATION_TIMEOUT_MINUTES.
 */
export function payoutReconciliationTimeoutMinutes(): number {
  const raw = parseInt(process.env.PAYOUT_RECONCILIATION_TIMEOUT_MINUTES ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 60;
}

export function payoutReconciliationTimeoutMs(): number {
  return payoutReconciliationTimeoutMinutes() * 60 * 1000;
}

/**
 * Bounded retry (spec §17). Default 3 percobaan; env PAYOUT_MAX_ATTEMPTS.
 * Tidak pernah infinite loop.
 */
export function payoutMaxAttempts(): number {
  const raw = parseInt(process.env.PAYOUT_MAX_ATTEMPTS ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 3;
}

/** Delay antar retry. Default 30 menit. Env: PAYOUT_RETRY_DELAY_MINUTES. */
export function payoutRetryDelayMs(): number {
  const raw = parseInt(process.env.PAYOUT_RETRY_DELAY_MINUTES ?? "", 10);
  const minutes = Number.isFinite(raw) && raw > 0 ? raw : 30;
  return minutes * 60 * 1000;
}

/** Mode provider mock: "manual" (butuh webhook/reconcile) atau "instant" (sukses langsung). */
export function mockPayoutMode(): "manual" | "instant" {
  return process.env.PAYOUT_MOCK_MODE === "instant" ? "instant" : "manual";
}
