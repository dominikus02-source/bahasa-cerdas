/**
 * Guru Cerdas Sejahtera — Wallet service (P7C §10/§11).
 *
 * TeacherWallet is an operational representation of the commission ledger.
 * Write operations live in engine.ts / withdrawals.ts (via upsertWalletTx).
 * This file: reads + reconciliation.
 *
 * Reconciliation computes the EXPECTED wallet state purely from financial
 * records (TeacherCommission ledger + in-flight withdrawals), compares it
 * with the stored row, and reports mismatches. NEVER silently repairs (§11).
 */

import { db } from "@/lib/db";
import { emitCommissionEvent } from "./events";
import type { ReconciliationResult, WalletBalance } from "./types";

// ═══════════════════════════════════════════════════════════════════════════════
// READ OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Get wallet for a teacher. Returns null if wallet doesn't exist yet. */
export async function getWallet(teacherId: string): Promise<WalletBalance | null> {
  const wallet = await db.teacherWallet.findUnique({
    where: { teacherId },
    select: {
      teacherId: true,
      availableBalance: true,
      pendingBalance: true,
      lockedBalance: true,
      lifetimeEarned: true,
      lifetimeWithdrawn: true,
      totalReversed: true,
      status: true,
    },
  });

  if (!wallet) return null;
  return { ...wallet };
}

/** Get or create wallet. Safe for first-time callers — creates with zero balances. */
export async function getOrCreateWallet(teacherId: string): Promise<WalletBalance> {
  const existing = await getWallet(teacherId);
  if (existing) return existing;

  const created = await db.teacherWallet.create({
    data: { teacherId },
    select: {
      teacherId: true,
      availableBalance: true,
      pendingBalance: true,
      lockedBalance: true,
      lifetimeEarned: true,
      lifetimeWithdrawn: true,
      totalReversed: true,
      status: true,
    },
  });
  return { ...created };
}

/**
 * Commission summary for a teacher: aggregated counts and amounts by status.
 * Positive entries only (entryType=COMMISSION); reversals reported separately.
 */
export async function commissionSummary(teacherId: string) {
  const grouped = await db.teacherCommission.groupBy({
    by: ["status"],
    where: { teacherId, entryType: "COMMISSION" },
    _count: { id: true },
    _sum: { commissionAmount: true, grossAmount: true },
  });

  const reversalAgg = await db.teacherCommission.aggregate({
    where: { teacherId, entryType: "REVERSAL" },
    _count: { id: true },
    _sum: { commissionAmount: true },
  });

  const summary: Record<string, { count: number; amount: number; gross: number }> = {};
  for (const row of grouped) {
    summary[row.status] = {
      count: row._count.id,
      amount: row._sum.commissionAmount ?? 0,
      gross: row._sum.grossAmount ?? 0,
    };
  }

  return {
    byStatus: summary,
    reversals: {
      count: reversalAgg._count.id,
      amount: Math.abs(reversalAgg._sum.commissionAmount ?? 0),
    },
  };
}

/** List commission entries for a teacher (ledger view, newest-first). */
export async function listCommissions(
  teacherId: string,
  opts?: { status?: string; limit?: number; offset?: number },
) {
  const limit = Math.min(opts?.limit ?? 20, 100);
  const offset = Math.max(opts?.offset ?? 0, 0);

  const where = {
    teacherId,
    ...(opts?.status ? { status: opts.status as never } : {}),
  };

  const [items, total] = await Promise.all([
    db.teacherCommission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        entryType: true,
        transaksiId: true,
        studentId: true,
        grossAmount: true,
        commissionRate: true,
        commissionAmount: true,
        status: true,
        attributionSource: true,
        eligibleFrom: true,
        holdingEndsAt: true,
        availableAt: true,
        reversedAt: true,
        reversedReason: true,
        createdAt: true,
      },
    }),
    db.teacherCommission.count({ where }),
  ]);

  return { items, total, limit, offset };
}

/** Active premium students attributed to this teacher. */
export async function activePremiumStudents(teacherId: string): Promise<number> {
  const attributionIds = await db.teacherAttribution.findMany({
    where: { teacherId, status: "ACTIVE" },
    select: { studentId: true },
  });
  if (attributionIds.length === 0) return 0;

  const now = new Date();
  const students = await db.user.count({
    where: {
      id: { in: attributionIds.map((a) => a.studentId) },
      isPremium: true,
      premiumUntil: { gt: now },
    },
  });
  return students;
}

/** Commission amount created in the current calendar month (WIB-aware enough for summary). */
export async function currentMonthCommission(teacherId: string): Promise<number> {
  const now = new Date();
  // WIB (UTC+7): awal bulan sekarang.
  const startWib = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0) - 7 * 60 * 60 * 1000);

  const agg = await db.teacherCommission.aggregate({
    where: { teacherId, entryType: "COMMISSION", createdAt: { gte: startWib } },
    _sum: { commissionAmount: true },
  });
  return agg._sum.commissionAmount ?? 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECONCILIATION (§11) — READ-ONLY, never repairs
// ═══════════════════════════════════════════════════════════════════════════════

interface ExpectedBalances {
  available: number;
  pending: number;
  locked: number;
  lifetimeEarned: number;
  lifetimeWithdrawn: number;
  totalReversed: number;
}

/**
 * Compute EXPECTED wallet balances purely from financial records.
 *
 *   pending        = SUM(commissionAmount) entryType=COMMISSION status=ELIGIBLE
 *   available      = SUM(...) status=AVAILABLE
 *   lifetimeEarned = SUM(...) all COMMISSION entries (gross, incl. reversed)
 *   lifetimeWithdrawn = SUM(...) status=PAID
 *   totalReversed  = |SUM(commissionAmount)| entryType=REVERSAL
 *   locked         = SUM(withdrawal.amount) status in (PENDING, APPROVED)
 */
export async function computeExpectedBalances(teacherId: string): Promise<ExpectedBalances> {
  const [ledger, reversals, paid, lockedAgg] = await Promise.all([
    db.teacherCommission.groupBy({
      by: ["status"],
      where: { teacherId, entryType: "COMMISSION" },
      _sum: { commissionAmount: true },
    }),
    db.teacherCommission.aggregate({
      where: { teacherId, entryType: "REVERSAL" },
      _sum: { commissionAmount: true },
    }),
    db.teacherCommission.aggregate({
      where: { teacherId, entryType: "COMMISSION", status: "PAID" },
      _sum: { commissionAmount: true },
    }),
    db.teacherCommissionWithdrawal.aggregate({
      where: { teacherId, status: { in: ["PENDING", "APPROVED"] } },
      _sum: { amount: true },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of ledger) byStatus[row.status] = row._sum.commissionAmount ?? 0;

  const lifetimeEarned = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const totalReversed = Math.abs(reversals._sum.commissionAmount ?? 0);

  return {
    pending: byStatus["ELIGIBLE"] ?? 0,
    available: byStatus["AVAILABLE"] ?? 0,
    locked: lockedAgg._sum.amount ?? 0,
    lifetimeEarned,
    lifetimeWithdrawn: paid._sum.commissionAmount ?? 0,
    totalReversed,
  };
}

/**
 * Reconcile one teacher wallet. READ-ONLY. Mismatch → report + event +
 * return detail (caller surfaces to admin). Never silently repairs.
 */
export async function reconcileTeacherWallet(
  teacherId: string,
): Promise<ReconciliationResult & { invariantHolds: boolean; ledgerPosition: number; walletPosition: number }> {
  const [wallet, expected] = await Promise.all([
    db.teacherWallet.findUnique({
      where: { teacherId },
      select: {
        teacherId: true,
        availableBalance: true,
        pendingBalance: true,
        lockedBalance: true,
        lifetimeEarned: true,
        lifetimeWithdrawn: true,
        totalReversed: true,
        status: true,
      },
    }),
    computeExpectedBalances(teacherId),
  ]);

  const actual: WalletBalance = wallet
    ? { ...wallet }
    : {
        teacherId,
        availableBalance: 0,
        pendingBalance: 0,
        lockedBalance: 0,
        lifetimeEarned: 0,
        lifetimeWithdrawn: 0,
        totalReversed: 0,
        status: "ACTIVE",
      };

  const mismatches: string[] = [];
  const pairs: Array<[string, number, number]> = [
    ["pendingBalance", expected.pending, actual.pendingBalance],
    ["availableBalance", expected.available, actual.availableBalance],
    ["lockedBalance", expected.locked, actual.lockedBalance],
    ["lifetimeEarned", expected.lifetimeEarned, actual.lifetimeEarned],
    ["lifetimeWithdrawn", expected.lifetimeWithdrawn, actual.lifetimeWithdrawn],
    ["totalReversed", expected.totalReversed, actual.totalReversed],
  ];
  for (const [field, exp, act] of pairs) {
    if (exp !== act) mismatches.push(`${field}: expected=${exp} actual=${act}`);
  }

  // ── FINANCIAL INTEGRITY GATE (§23) ──
  // Total Ledger Position = Wallet Position:
  //   lifetimeEarned - totalReversed === available + pending + locked + lifetimeWithdrawn
  const ledgerPosition = expected.lifetimeEarned - expected.totalReversed;
  const walletPosition =
    actual.availableBalance + actual.pendingBalance + actual.lockedBalance + actual.lifetimeWithdrawn;
  const invariantHolds = ledgerPosition === walletPosition;
  if (!invariantHolds) {
    mismatches.push(`invariant: ledger=${ledgerPosition} wallet=${walletPosition}`);
  }

  const matches = mismatches.length === 0;

  if (!matches) {
    emitCommissionEvent({
      event: "wallet.mismatch",
      teacherId,
      actor: "system",
      at: new Date().toISOString(),
    });
  } else {
    emitCommissionEvent({
      event: "wallet.reconciled",
      teacherId,
      actor: "system",
      at: new Date().toISOString(),
    });
  }

  return {
    teacherId,
    expected: {
      teacherId,
      availableBalance: expected.available,
      pendingBalance: expected.pending,
      lockedBalance: expected.locked,
      lifetimeEarned: expected.lifetimeEarned,
      lifetimeWithdrawn: expected.lifetimeWithdrawn,
      totalReversed: expected.totalReversed,
      status: actual.status,
    },
    actual,
    matches,
    mismatches,
    invariantHolds,
    ledgerPosition,
    walletPosition,
  };
}

/** Safe reconciliation report for all teacher wallets (§11). READ-ONLY. */
export async function bulkReconcile(): Promise<{
  total: number;
  matched: number;
  mismatched: number;
  invariantViolations: number;
  details: Array<{
    teacherId: string;
    mismatches: string[];
    ledgerPosition: number;
    walletPosition: number;
  }>;
}> {
  const teachers = await db.user.findMany({
    where: { role: "GURU" },
    select: { id: true },
  });

  const results = await Promise.all(teachers.map((t) => reconcileTeacherWallet(t.id)));

  const mismatched = results.filter((r) => !r.matches);
  return {
    total: results.length,
    matched: results.length - mismatched.length,
    mismatched: mismatched.length,
    invariantViolations: mismatched.filter((r) => !r.invariantHolds).length,
    details: mismatched.map((r) => ({
      teacherId: r.teacherId,
      mismatches: r.mismatches,
      ledgerPosition: r.ledgerPosition,
      walletPosition: r.walletPosition,
    })),
  };
}
