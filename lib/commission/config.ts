/**
 * Guru Cerdas Sejahtera — Commission configuration.
 *
 * All business constants live here. Do NOT hardcode rates elsewhere.
 * Source of truth: P7B/P7C founder-approved spec.
 */

/** Default commission rate (10%) — applied to settled transaction amount. */
export const DEFAULT_COMMISSION_RATE = 0.10;

/**
 * Holding period in days. After attribution is confirmed + eligibleFrom met,
 * commission stays ELIGIBLE (in pendingBalance) for this many days before
 * becoming AVAILABLE (in availableBalance).
 *
 * Default: 7 days. Configurable via env `COMMISSION_HOLDING_PERIOD_DAYS`.
 */
export function commissionHoldingPeriodDays(): number {
  const raw = parseInt(process.env.COMMISSION_HOLDING_PERIOD_DAYS ?? "", 10);
  return Number.isFinite(raw) && raw >= 0 ? raw : 7;
}

/** Holding period in milliseconds (derived). */
export function commissionHoldingPeriodMs(): number {
  return commissionHoldingPeriodDays() * 24 * 60 * 60 * 1000;
}

/**
 * Minimum withdrawal amount in integer rupiah.
 * Default: Rp 50.000. Configurable via env `TEACHER_COMMISSION_MIN_WITHDRAWAL`.
 */
export function teacherCommissionMinimumWithdrawal(): number {
  const raw = parseInt(process.env.TEACHER_COMMISSION_MIN_WITHDRAWAL ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 50_000;
}

/**
 * Official "Guru Cerdas Sejahtera" launch date (ISO string).
 * Attribution yang berasal dari pre-launch enrollment memakai tanggal ini
 * sebagai eligibleFrom — TIDAK ADA komisi retroaktif sebelum tanggal resmi.
 * Configurable via env `TEACHER_COMMISSION_LAUNCH_DATE` (e.g. "2026-08-26T00:00:00Z").
 * Default: today at midnight WIB — artinya program aktif sejak deploy.
 */
export function teacherCommissionLaunchDate(): Date {
  const raw = process.env.TEACHER_COMMISSION_LAUNCH_DATE ?? "";
  const parsed = new Date(raw);
  if (raw && !Number.isNaN(parsed.getTime())) return parsed;
  const now = new Date();
  // Tengah malam WIB (UTC+7) hari ini.
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  wib.setUTCHours(0, 0, 0, 0);
  return new Date(wib.getTime() - 7 * 60 * 60 * 1000);
}

/**
 * Founder/ADMIN exclusion — server-side only.
 * Users with `isFounder === true` or `role === "ADMIN"` are never eligible
 * for teacher commission, even if they have an active GURU plan.
 */
export function isEligibleForCommission(role: string, isFounder: boolean): boolean {
  return role === "GURU" && !isFounder;
}

/**
 * Compute commission amount from gross transaction amount.
 * Formula: floor(grossAmount × rate), minimum 0.
 * Uses integer rupiah — no floating-point for money.
 */
export function computeCommissionAmount(
  grossAmount: number,
  rate: number = DEFAULT_COMMISSION_RATE,
): number {
  if (grossAmount <= 0 || rate <= 0) return 0;
  return Math.floor(grossAmount * rate);
}

/**
 * Compute the date when commission becomes AVAILABLE.
 * creationTime + holdingPeriod. If holding = 0, instant availability.
 */
export function computeHoldingEndsAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + commissionHoldingPeriodMs());
}

/**
 * Premium plan IDs that are eligible for commission.
 * Program: komisi ketika MURID yang teratribusi membayar Premium murid
 * (Bulanan Rp19.000 / Tahunan Rp180.000). Pembelian guru sendiri TIDAK
 * menghasilkan komisi (guru/ADMIN dikecualikan sebagai penerima).
 */
export const COMMISSION_ELIGIBLE_PLAN_IDS = new Set([
  "MURID_PREMIUM_MONTHLY",
  "MURID_PREMIUM_YEARLY",
]);

/** Transaksi types yang dapat menghasilkan komisi. */
export const COMMISSION_ELIGIBLE_TRANSACTION_TYPES = new Set(["MURID_PREMIUM"]);
