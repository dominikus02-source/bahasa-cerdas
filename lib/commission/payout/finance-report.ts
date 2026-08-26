/**
 * P7E §15/§16/§17 — Daily finance report + provider fee accounting.
 *
 * Akuntansi TERPISAH: COMMISSION EARNED / WITHDRAWAL / PAYOUT / PROVIDER FEE
 * tidak boleh di-collapse jadi satu angka. Komisi historis guru TIDAK PERNAH
 * berubah karena fee payout — fee adalah biaya platform (P7E §16/§17).
 *
 * getDailyTeacherPayoutReport(date) menjadi basis rekonsiliasi Finance.
 */

import { db } from "@/lib/db";
import { startOfDayWIB } from "./safety";

export interface DailyTeacherPayoutReport {
  date: string; // YYYY-MM-DD (WIB)
  withdrawals: number;
  requestedAmount: number;
  processingAmount: number;
  paidAmount: number;
  failedAmount: number;
  retryableAmount: number;
  reconciliationIssueCount: number;
  totalProviderFees: number;
  netPayoutAmount: number; // paidAmount - totalProviderFees (payout PAID saja)
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Laporan payout harian (WIB). Semua agregat dari TeacherPayout.
 * `reconciliationIssueCount` dari payout RECONCILIATION_REQUIRED hari itu.
 */
export async function getDailyTeacherPayoutReport(date: Date): Promise<DailyTeacherPayoutReport> {
  // Hari yang diminta (WIB) → rentang UTC.
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const startWib = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - 7 * 60 * 60 * 1000);
  const endWib = new Date(startWib.getTime() + 24 * 60 * 60 * 1000);

  const [grouped, feesAgg, issueCount] = await Promise.all([
    db.teacherPayout.groupBy({
      by: ["status"],
      where: { createdAt: { gte: startWib, lt: endWib } },
      _count: { id: true },
      _sum: { amount: true },
    }),
    db.teacherPayout.aggregate({
      where: { createdAt: { gte: startWib, lt: endWib } },
      _sum: { providerFee: true },
    }),
    db.teacherPayout.count({
      where: {
        createdAt: { gte: startWib, lt: endWib },
        status: "RECONCILIATION_REQUIRED",
      },
    }),
  ]);

  const byStatus: Record<string, { count: number; amount: number }> = {};
  for (const row of grouped) {
    byStatus[row.status] = { count: row._count.id, amount: row._sum.amount ?? 0 };
  }

  const withdrawals =
    Object.values(byStatus).reduce((acc, v) => acc + v.count, 0);
  const requestedAmount = Object.values(byStatus).reduce((acc, v) => acc + v.amount, 0);
  const paidAmount = byStatus["PAID"]?.amount ?? 0;
  const processingAmount =
    (byStatus["REQUESTED"]?.amount ?? 0) +
    (byStatus["VALIDATING"]?.amount ?? 0) +
    (byStatus["SUBMITTING"]?.amount ?? 0) +
    (byStatus["PROCESSING"]?.amount ?? 0);
  const failedAmount = byStatus["FAILED"]?.amount ?? 0;
  const retryableAmount = byStatus["RETRYABLE_FAILURE"]?.amount ?? 0;
  const totalProviderFees = feesAgg._sum.providerFee ?? 0;

  return {
    date: fmtDate(startWib),
    withdrawals,
    requestedAmount,
    processingAmount,
    paidAmount,
    failedAmount,
    retryableAmount,
    reconciliationIssueCount: issueCount,
    totalProviderFees,
    netPayoutAmount: paidAmount - totalProviderFees,
  };
}

/** Awal hari ini (WIB) — helper untuk admin dashboard. */
export function todayStartWIB(): Date {
  return startOfDayWIB(new Date());
}

// ─────────────────────────────────────────────────────────────────────────────
// P8D §15 — Dimensi provider (aditif; semantik report lama TIDAK berubah)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProviderDimensionRow {
  provider: string;
  withdrawals: number;
  paidAmount: number;
  failedAmount: number;
  retryableAmount: number;
  reconciliationRequired: number;
  providerFees: number;
  teacherNetTransfer: number; // jumlah diterima guru (FULL amount — fee platform)
}

/**
 * Rincian payout harian per provider (WIB). Basis finance reconciliation
 * multi-provider. netTransfer guru = FULL amount (fee ditanggung platform).
 */
export async function getDailyTeacherPayoutReportByProvider(
  date: Date,
): Promise<{ date: string; providers: ProviderDimensionRow[] }> {
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const startWib = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - 7 * 60 * 60 * 1000);
  const endWib = new Date(startWib.getTime() + 24 * 60 * 60 * 1000);

  const grouped = await db.teacherPayout.groupBy({
    by: ["provider", "status"],
    where: { createdAt: { gte: startWib, lt: endWib } },
    _count: { id: true },
    _sum: { amount: true, providerFee: true },
  });

  const byProvider = new Map<string, ProviderDimensionRow>();
  const ensure = (provider: string): ProviderDimensionRow => {
    let row = byProvider.get(provider);
    if (!row) {
      row = {
        provider,
        withdrawals: 0,
        paidAmount: 0,
        failedAmount: 0,
        retryableAmount: 0,
        reconciliationRequired: 0,
        providerFees: 0,
        teacherNetTransfer: 0,
      };
      byProvider.set(provider, row);
    }
    return row;
  };

  for (const g of grouped) {
    const row = ensure(g.provider);
    row.withdrawals += g._count.id;
    const amount = g._sum.amount ?? 0;
    switch (g.status) {
      case "PAID":
        row.paidAmount += amount;
        row.teacherNetTransfer += amount; // guru menerima FULL amount
        break;
      case "FAILED":
        row.failedAmount += amount;
        break;
      case "RETRYABLE_FAILURE":
        row.retryableAmount += amount;
        break;
      case "RECONCILIATION_REQUIRED":
        row.reconciliationRequired += amount;
        break;
      default:
        break;
    }
    row.providerFees += g._sum.providerFee ?? 0;
  }

  return {
    date: fmtDate(startWib),
    providers: [...byProvider.values()].sort((a, b) => a.provider.localeCompare(b.provider)),
  };
}
