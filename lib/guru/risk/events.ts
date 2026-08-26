/**
 * P8C — Risk event evaluators (best-effort hooks dari flow yang ada).
 *
 * Semua query bounded + indexed. TIDAK memindai seluruh DB. Signal idempotent
 * via dedupeKey. Kegagalan di sini TIDAK PERNAH menggagalkan flow utama.
 */

import { db } from "@/lib/db";
import { recordRiskSignal } from "./signals";
import {
  isAbnormalRefundPattern,
  isRapidAccountToPremium,
  isWithdrawalVelocityAnomaly,
  isRapidDestinationChange,
} from "./rules";
import {
  riskDestinationChangeSeverity,
  riskRapidPremiumSeverity,
  riskRefundSeverity,
  riskRefundWindowDays,
  riskWithdrawalVelocitySeverity,
  riskWithdrawalVelocityWindowHours,
} from "./config";

/** B. Akun baru → Premium sangat cepat (webhook setelah komisi tercatat). */
export async function evaluateRapidPremiumSignal(input: {
  teacherId: string;
  studentId: string;
  transaksiId: string;
}): Promise<void> {
  try {
    const student = await db.user.findUnique({
      where: { id: input.studentId },
      select: { createdAt: true },
    });
    if (!student) return;

    if (!isRapidAccountToPremium({ accountCreatedAt: student.createdAt, premiumSettledAt: new Date() })) {
      return;
    }

    await recordRiskSignal({
      teacherId: input.teacherId,
      signalType: "RAPID_ACCOUNT_TO_PREMIUM",
      severity: riskRapidPremiumSeverity() as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      dedupeKey: `rapid-premium:${input.transaksiId}`,
      evidence: { transaksiId: input.transaksiId, studentId: input.studentId },
    });
  } catch (err) {
    console.error("[risk] evaluateRapidPremiumSignal error:", err);
  }
}

/** C. Abnormal refund pattern (webhook refund branch). */
export async function evaluateRefundPatternSignal(transaksiId: string): Promise<void> {
  try {
    // Guru dari entry komisi (positif) transaksi ini — satu guru per transaksi.
    const commission = await db.teacherCommission.findFirst({
      where: { transaksiId, entryType: "COMMISSION" },
      select: { teacherId: true },
    });
    if (!commission) return;

    const teacherId = commission.teacherId;
    const since = new Date(Date.now() - riskRefundWindowDays() * 24 * 60 * 60 * 1000);

    const attributedStudents = await db.teacherAttribution.findMany({
      where: { teacherId },
      select: { studentId: true },
    });
    const studentIds = attributedStudents.map((a) => a.studentId);
    if (studentIds.length === 0) return;

    const [refundCount, commissionCount] = await Promise.all([
      db.transaksi.count({
        where: {
          userId: { in: studentIds },
          status: "REFUNDED",
          updatedAt: { gte: since },
        },
      }),
      db.teacherCommission.count({
        where: { teacherId, entryType: "COMMISSION", createdAt: { gte: since } },
      }),
    ]);

    const rule = isAbnormalRefundPattern({ refundCount, commissionCount });
    if (!rule.flagged) return;

    await recordRiskSignal({
      teacherId,
      signalType: "ABNORMAL_REFUND_PATTERN",
      severity: riskRefundSeverity() as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      dedupeKey: `refund-pattern:${transaksiId}`,
      evidence: { refundCount, commissionCount, windowDays: riskRefundWindowDays() },
    });
  } catch (err) {
    console.error("[risk] evaluateRefundPatternSignal error:", err);
  }
}

/** D. Perubahan destinasi + withdrawal tertunda (setelah PUT payout-profile). */
export async function evaluateDestinationChangeSignal(teacherId: string): Promise<void> {
  try {
    const profile = await db.teacherPayoutProfile.findUnique({
      where: { teacherId },
      select: { updatedAt: true },
    });
    if (!profile) return;

    const pendingWithdrawal = await db.teacherCommissionWithdrawal.count({
      where: { teacherId, status: { in: ["PENDING", "APPROVED"] } },
      take: 1,
    });

    const rule = isRapidDestinationChange({
      profileUpdatedAt: profile.updatedAt,
      hasPendingWithdrawal: pendingWithdrawal > 0,
    });
    if (!rule.flagged) return;

    const day = new Date().toISOString().slice(0, 10);
    await recordRiskSignal({
      teacherId,
      signalType: "RAPID_DESTINATION_CHANGE",
      severity: riskDestinationChangeSeverity() as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      dedupeKey: `destination-change:${teacherId}:${day}`,
      evidence: { cooldownActive: rule.cooldownActive },
    });
  } catch (err) {
    console.error("[risk] evaluateDestinationChangeSignal error:", err);
  }
}

/** E. Withdrawal velocity (setelah withdrawal dibuat, sebelum orkestrasi). */
export async function evaluateWithdrawalVelocitySignal(input: {
  teacherId: string;
  latestAmount: number;
}): Promise<void> {
  try {
    const sinceHours = riskWithdrawalVelocityWindowHours();
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

    const [countInWindow, history] = await Promise.all([
      db.teacherCommissionWithdrawal.count({
        where: { teacherId: input.teacherId, createdAt: { gte: since } },
      }),
      db.teacherCommissionWithdrawal.aggregate({
        where: {
          teacherId: input.teacherId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _avg: { amount: true },
      }),
    ]);

    const rule = isWithdrawalVelocityAnomaly({
      countInWindow,
      latestAmount: input.latestAmount,
      averageAmount: Math.round(history._avg.amount ?? 0),
    });
    if (!rule.flagged) return;

    const day = new Date().toISOString().slice(0, 10);
    await recordRiskSignal({
      teacherId: input.teacherId,
      signalType: "WITHDRAWAL_VELOCITY",
      severity: riskWithdrawalVelocitySeverity() as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      dedupeKey: `velocity:${input.teacherId}:${day}`,
      evidence: { countInWindow, windowHours: sinceHours },
    });
  } catch (err) {
    console.error("[risk] evaluateWithdrawalVelocitySignal error:", err);
  }
}
