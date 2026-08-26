/**
 * P8C — Deterministic, explainable risk rules (PURE — tanpa DB, tanpa AI).
 *
 * Setiap rule mengembalikan boolean + alasan. Tidak ada scoring palsu.
 * Signal = indikasi butuh perhatian, BUKAN bukti fraud.
 */

import {
  riskRapidPremiumWindowMinutes,
  riskRefundMinCount,
  riskRefundRatioThreshold,
  riskRefundWindowDays,
  riskDestinationCooldownMs,
  riskWithdrawalAmountJumpMultiplier,
  riskWithdrawalVelocityCount,
  riskWithdrawalVelocityWindowHours,
} from "./config";

// ── B. RAPID_ACCOUNT_TO_PREMIUM ─────────────────────────────────────────────

export interface RapidPremiumInput {
  accountCreatedAt: Date;
  premiumSettledAt: Date;
  windowMinutes?: number;
}

export function isRapidAccountToPremium(input: RapidPremiumInput): boolean {
  const windowMs = (input.windowMinutes ?? riskRapidPremiumWindowMinutes()) * 60 * 1000;
  const elapsed = input.premiumSettledAt.getTime() - input.accountCreatedAt.getTime();
  return elapsed >= 0 && elapsed <= windowMs;
}

// ── C. ABNORMAL_REFUND_PATTERN ──────────────────────────────────────────────

export interface RefundPatternInput {
  refundCount: number;      // refund/chargeback pada murid teratribusi (rolling window)
  commissionCount: number;  // komisi tercatat pada murid teratribusi (window sama)
  windowDays?: number;
  minCount?: number;
  ratioThreshold?: number;
}

export function isAbnormalRefundPattern(input: RefundPatternInput): {
  flagged: boolean;
  reason: string;
} {
  const minCount = input.minCount ?? riskRefundMinCount();
  const ratio = input.ratioThreshold ?? riskRefundRatioThreshold();
  const windowDays = input.windowDays ?? riskRefundWindowDays();

  const total = input.refundCount + input.commissionCount;
  if (input.refundCount < minCount) {
    return { flagged: false, reason: `refund ${input.refundCount} < minimum ${minCount}` };
  }
  if (total === 0) {
    return { flagged: false, reason: "tidak ada transaksi pada window" };
  }
  const refundRatio = input.refundCount / total;
  if (refundRatio >= ratio) {
    return {
      flagged: true,
      reason: `refund ${input.refundCount}/${total} (${Math.round(refundRatio * 100)}%) ≥ ambang ${Math.round(ratio * 100)}% dalam ${windowDays} hari`,
    };
  }
  return { flagged: false, reason: `rasio refund ${Math.round(refundRatio * 100)}% < ambang` };
}

// ── D. RAPID_DESTINATION_CHANGE ─────────────────────────────────────────────

export interface DestinationChangeInput {
  profileUpdatedAt: Date;
  now?: Date;
  cooldownMs?: number;
  hasPendingWithdrawal: boolean;
}

export function isRapidDestinationChange(input: DestinationChangeInput): {
  flagged: boolean;
  cooldownActive: boolean;
  reason: string;
} {
  const cooldownMs = input.cooldownMs ?? riskDestinationCooldownMs();
  const nowMs = (input.now ?? new Date()).getTime();
  const changedMs = nowMs - input.profileUpdatedAt.getTime();
  const cooldownActive = changedMs >= 0 && changedMs < cooldownMs;
  const flagged = cooldownActive && input.hasPendingWithdrawal;
  return {
    flagged,
    cooldownActive,
    reason: flagged
      ? `rekening diubah lalu ada penarikan dalam ${Math.round(changedMs / 60000)} menit (cooldown aktif)`
      : cooldownActive
        ? "cooldown destinasi aktif"
        : "di luar cooldown",
  };
}

// ── E. WITHDRAWAL_VELOCITY ──────────────────────────────────────────────────

export interface WithdrawalVelocityInput {
  countInWindow: number;   // jumlah withdrawal dalam jendela (jam)
  latestAmount: number;
  averageAmount: number;   // rata-rata historis guru (0 bila belum ada)
  windowHours?: number;
  minCount?: number;
  jumpMultiplier?: number;
}

export function isWithdrawalVelocityAnomaly(input: WithdrawalVelocityInput): {
  flagged: boolean;
  reason: string;
} {
  const minCount = input.minCount ?? riskWithdrawalVelocityCount();
  const jump = input.jumpMultiplier ?? riskWithdrawalAmountJumpMultiplier();

  if (input.countInWindow >= minCount) {
    return {
      flagged: true,
      reason: `${input.countInWindow} withdrawal dalam ${input.windowHours ?? riskWithdrawalVelocityWindowHours()} jam (ambang ${minCount})`,
    };
  }
  if (
    input.averageAmount > 0 &&
    input.latestAmount >= input.averageAmount * jump
  ) {
    return {
      flagged: true,
      reason: `jumlah ${input.latestAmount} ≥ ${jump}× rata-rata ${Math.round(input.averageAmount)}`,
    };
  }
  return { flagged: false, reason: "velocity normal" };
}

// ── Cooling period destination ──────────────────────────────────────────────

export interface CooldownInput {
  profileUpdatedAt: Date | null;
  now?: Date;
  cooldownMs?: number;
}

export function isDestinationCooldownActive(input: CooldownInput): boolean {
  if (!input.profileUpdatedAt) return false;
  const cooldownMs = input.cooldownMs ?? riskDestinationCooldownMs();
  const elapsed = (input.now ?? new Date()).getTime() - input.profileUpdatedAt.getTime();
  return elapsed >= 0 && elapsed < cooldownMs;
}
