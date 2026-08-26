/**
 * Guru Cerdas Sejahtera — Commission engine (core, P7C).
 *
 * Append-only ledger. Idempotent via
 * `@@unique([transaksiId, teacherId, entryType])` — database-level guarantee:
 * the same qualifying transaction can NEVER create two positive commissions,
 * and a refund can NEVER create two reversal entries.
 *
 * Business rules (P7C founder spec):
 * - §1: Commission = floor(settledAmount × 10%) — integer rupiah, post-coupon
 * - §5: PENDING → ELIGIBLE (holding) → AVAILABLE (default 7 days, configurable)
 * - §2: first-valid attribution wins; payment < eligibleFrom → NO COMMISSION
 * - §2: founder/ADMIN excluded server-side; self-referral impossible
 * - §4/§12: ledger immutable — reversal creates a NEW negative entry; the
 *   original entry is preserved (only its lifecycle status changes)
 * - §7: idempotent across webhook retry / cron retry / manual retry
 */

import { Prisma } from "@prisma/client";
import type { AttributionSource } from "@prisma/client";
import { db } from "@/lib/db";
import {
  computeCommissionAmount,
  computeHoldingEndsAt,
  commissionHoldingPeriodDays,
  DEFAULT_COMMISSION_RATE,
  COMMISSION_ELIGIBLE_PLAN_IDS,
  COMMISSION_ELIGIBLE_TRANSACTION_TYPES,
  isEligibleForCommission,
} from "./config";
import { auditCommission } from "./audit";
import { emitCommissionEvent } from "./events";
import type {
  CommissionContext,
  CommissionCreateResult,
  CommissionSkipReason,
  ReversalReason,
  ReversalResult,
} from "./types";

type DbClient = Prisma.TransactionClient | typeof db;

function isP2002(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALLET UPSERT (single source of truth for every balance mutation)
// ═══════════════════════════════════════════════════════════════════════════════

export interface WalletAdjustment {
  incAvailable?: number;
  decAvailable?: number;
  incPending?: number;
  decPending?: number;
  incLocked?: number;
  decLocked?: number;
  incLifetimeEarned?: number;
  incLifetimeWithdrawn?: number;
  incReversed?: number;
}

/**
 * Atomic wallet mutation. Lazy-creates the wallet with defaults.
 * Every balance-changing event MUST flow through here (§10: wallet is an
 * operational representation of the ledger — no arbitrary mutations).
 */
export async function upsertWalletTx(
  tx: DbClient,
  teacherId: string,
  adj: WalletAdjustment,
): Promise<void> {
  const inc = (v?: number) => (v ? { increment: v } : undefined);
  const dec = (v?: number) => (v ? { decrement: v } : undefined);

  const data: Prisma.TeacherWalletUpdateInput = {};
  if (adj.incAvailable) data.availableBalance = inc(adj.incAvailable);
  if (adj.decAvailable) data.availableBalance = dec(adj.decAvailable);
  if (adj.incPending) data.pendingBalance = inc(adj.incPending);
  if (adj.decPending) data.pendingBalance = dec(adj.decPending);
  if (adj.incLocked) data.lockedBalance = inc(adj.incLocked);
  if (adj.decLocked) data.lockedBalance = dec(adj.decLocked);
  if (adj.incLifetimeEarned) data.lifetimeEarned = inc(adj.incLifetimeEarned);
  if (adj.incLifetimeWithdrawn) {
    data.lifetimeWithdrawn = inc(adj.incLifetimeWithdrawn);
    // totalPaid = legacy alias lifetimeWithdrawn — selalu disinkron.
    data.totalPaid = inc(adj.incLifetimeWithdrawn);
  }
  if (adj.incReversed) data.totalReversed = inc(adj.incReversed);

  if (Object.keys(data).length === 0) return;

  await tx.teacherWallet.upsert({
    where: { teacherId },
    create: {
      teacherId,
      availableBalance: (adj.incAvailable ?? 0) - (adj.decAvailable ?? 0),
      pendingBalance: (adj.incPending ?? 0) - (adj.decPending ?? 0),
      lockedBalance: (adj.incLocked ?? 0) - (adj.decLocked ?? 0),
      lifetimeEarned: adj.incLifetimeEarned ?? 0,
      lifetimeWithdrawn: adj.incLifetimeWithdrawn ?? 0,
      totalPaid: adj.incLifetimeWithdrawn ?? 0,
      totalReversed: adj.incReversed ?? 0,
    },
    update: data,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE COMMISSION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Evaluate + create a commission from a settled transaction.
 *
 * Called from the payment webhook (after the claim transaction commits),
 * the backfill service, and manual admin re-processing. Safe to call
 * repeatedly: idempotency is enforced by the database unique key.
 *
 * Never trusts client input — everything (amount, teacher, student) is
 * resolved server-side from the Transaksi row + TeacherAttribution.
 */
export async function createCommissionFromTransaction(
  transaksiId: string,
): Promise<CommissionCreateResult> {
  const transaksi = await db.transaksi.findUnique({
    where: { id: transaksiId },
    select: {
      id: true,
      userId: true,
      type: true,
      amount: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      metadata: true,
    },
  });

  if (!transaksi) return { created: false, reason: "INVALID_PAYMENT" as CommissionSkipReason };
  if (transaksi.status !== "SUCCESS") return { created: false, reason: "NOT_SETTLED" };
  if (!COMMISSION_ELIGIBLE_TRANSACTION_TYPES.has(transaksi.type)) {
    return { created: false, reason: "NOT_PREMIUM_STUDENT" };
  }

  const metadata = (transaksi.metadata ?? {}) as Record<string, unknown>;
  const planId = typeof metadata.planId === "string" ? metadata.planId : null;
  if (planId && !COMMISSION_ELIGIBLE_PLAN_IDS.has(planId)) {
    // Paket tidak eligible (mis. kupon plan lain) — skip.
    return { created: false, reason: "NOT_PREMIUM_STUDENT" };
  }

  // Settlement time ≈ updatedAt (webhook menulis SUCCESS + updatedAt).
  const settledAt = transaksi.updatedAt;

  return createCommission({
    transaksiId: transaksi.id,
    amount: transaksi.amount,
    userId: transaksi.userId,
    planId,
    metadata,
    settledAt,
  });
}

/**
 * Core creation. `ctx` fully resolved server-side.
 * status: ELIGIBLE (holding) or AVAILABLE (holding = 0 hari).
 * P7C §2: payment before eligibleFrom → NO COMMISSION (skip, no row).
 */
export async function createCommission(
  ctx: CommissionContext & { settledAt: Date },
): Promise<CommissionCreateResult> {
  const evaluated = await evaluateCommission(ctx);
  if (!evaluated.eligible) return { created: false, reason: evaluated.reason };

  const now = new Date();
  const { teacherId, attribution, commissionAmount, status, holdingEndsAt } = evaluated;

  // ── Idempotent create (§7) ──
  const existing = await db.teacherCommission.findUnique({
    where: {
      transaksiId_teacherId_entryType: {
        transaksiId: ctx.transaksiId,
        teacherId,
        entryType: "COMMISSION",
      },
    },
    select: { id: true, status: true, commissionAmount: true, holdingEndsAt: true },
  });
  if (existing) {
    return {
      created: true,
      id: existing.id,
      transaksiId: ctx.transaksiId,
      teacherId,
      studentId: ctx.userId,
      commissionAmount: existing.commissionAmount,
      status: existing.status,
      holdingEndsAt: existing.holdingEndsAt,
      idempotent: true,
    };
  }

  try {
    const created = await db.$transaction(async (tx) => {
      const row = await tx.teacherCommission.create({
        data: {
          entryType: "COMMISSION",
          transaksiId: ctx.transaksiId,
          teacherId,
          studentId: ctx.userId,
          attributionId: attribution.id,
          attributionSource: attribution.source,
          sourceGroupId: attribution.sourceGroupId,
          eligibleFrom: attribution.eligibleFrom,
          grossAmount: ctx.amount,
          commissionRate: DEFAULT_COMMISSION_RATE,
          commissionAmount,
          status,
          holdingEndsAt: status === "AVAILABLE" ? null : holdingEndsAt,
          availableAt: status === "AVAILABLE" ? now : null,
          settledAt: status === "AVAILABLE" ? now : null,
        },
        select: { id: true },
      });

      if (status === "AVAILABLE") {
        await upsertWalletTx(tx, teacherId, {
          incAvailable: commissionAmount,
          incLifetimeEarned: commissionAmount,
        });
      } else {
        await upsertWalletTx(tx, teacherId, {
          incPending: commissionAmount,
          incLifetimeEarned: commissionAmount,
        });
      }

      await auditCommission(
        {
          action: "COMMISSION_CREATE",
          targetUserId: teacherId,
          transactionId: ctx.transaksiId,
          newValue: { commissionAmount, status, studentId: ctx.userId },
          metadata: { commissionId: row.id, entryType: "COMMISSION" },
        },
        tx,
      );

      return { id: row.id };
    });

    emitCreateEvent(ctx.transaksiId, teacherId, created.id, commissionAmount, status);

    return {
      created: true,
      id: created.id,
      transaksiId: ctx.transaksiId,
      teacherId,
      studentId: ctx.userId,
      commissionAmount,
      status,
      holdingEndsAt: status === "AVAILABLE" ? null : holdingEndsAt,
      idempotent: false,
    };
  } catch (err) {
    if (isP2002(err)) {
      // Race: duplicate create attempt lost — return the winner's row.
      const winner = await db.teacherCommission.findUnique({
        where: {
          transaksiId_teacherId_entryType: {
            transaksiId: ctx.transaksiId,
            teacherId,
            entryType: "COMMISSION",
          },
        },
        select: { id: true, status: true, commissionAmount: true, holdingEndsAt: true },
      });
      if (winner) {
        return {
          created: true,
          id: winner.id,
          transaksiId: ctx.transaksiId,
          teacherId,
          studentId: ctx.userId,
          commissionAmount: winner.commissionAmount,
          status: winner.status,
          holdingEndsAt: winner.holdingEndsAt,
          idempotent: true,
        };
      }
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVALUATE (read-only) — shared by engine + backfill dry-run
// ═══════════════════════════════════════════════════════════════════════════════

export type CommissionEvaluation =
  | { eligible: false; reason: CommissionSkipReason }
  | {
      eligible: true;
      teacherId: string;
      attribution: {
        id: string;
        source: AttributionSource;
        sourceGroupId: string | null;
        eligibleFrom: Date;
      };
      commissionAmount: number;
      status: "ELIGIBLE" | "AVAILABLE";
      holdingEndsAt: Date | null;
    };

/**
 * Read-only validation of a commission candidate. Never writes.
 * Everything derived server-side from Transaksi + TeacherAttribution.
 */
export async function evaluateCommission(
  ctx: CommissionContext & { settledAt: Date },
): Promise<CommissionEvaluation> {
  const now = new Date();

  const attribution = await db.teacherAttribution.findUnique({
    where: { studentId: ctx.userId },
    select: {
      id: true,
      teacherId: true,
      source: true,
      sourceGroupId: true,
      eligibleFrom: true,
      status: true,
      teacher: { select: { role: true, isFounder: true, id: true } },
    },
  });

  if (!attribution || attribution.status !== "ACTIVE") {
    return { eligible: false, reason: "NO_ATTRIBUTION" };
  }
  if (!isEligibleForCommission(attribution.teacher.role, attribution.teacher.isFounder)) {
    return { eligible: false, reason: "TEACHER_EXCLUDED" };
  }
  if (attribution.teacherId === ctx.userId) {
    return { eligible: false, reason: "SELF_REFERRAL" };
  }
  if (ctx.settledAt.getTime() < attribution.eligibleFrom.getTime()) {
    return { eligible: false, reason: "BEFORE_ELIGIBLE_FROM" };
  }

  const commissionAmount = computeCommissionAmount(ctx.amount, DEFAULT_COMMISSION_RATE);
  if (commissionAmount <= 0) return { eligible: false, reason: "ZERO_COMMISSION" };

  const holdingDays = commissionHoldingPeriodDays();
  const status = holdingDays === 0 ? "AVAILABLE" : "ELIGIBLE";

  const wallet = await db.teacherWallet.findUnique({
    where: { teacherId: attribution.teacherId },
    select: { status: true },
  });
  if (wallet && wallet.status !== "ACTIVE") {
    return { eligible: false, reason: "WALLET_SUSPENDED" };
  }

  return {
    eligible: true,
    teacherId: attribution.teacherId,
    attribution: {
      id: attribution.id,
      source: attribution.source,
      sourceGroupId: attribution.sourceGroupId,
      eligibleFrom: attribution.eligibleFrom,
    },
    commissionAmount,
    status,
    holdingEndsAt: status === "AVAILABLE" ? null : computeHoldingEndsAt(now),
  };
}

function emitCreateEvent(
  transaksiId: string,
  teacherId: string,
  commissionId: string,
  amount: number,
  status: string,
): void {
  emitCommissionEvent({
    event: "commission.created",
    teacherId,
    transaksiId,
    commissionId,
    amount,
    actor: "system",
    at: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOLDING RELEASE (§9) — batch-safe, retry-safe, idempotent
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Release ELIGIBLE commissions whose holding period has passed.
 *
 * Each entry is claimed atomically (`updateMany WHERE status=ELIGIBLE`),
 * then the wallet is credited in the SAME transaction. Running the job twice
 * (or concurrently) can never duplicate funds: only the claim winner credits
 * the wallet, and the claim + wallet move are one atomic unit.
 */
export async function releaseEligibleTeacherCommissions(limit = 100): Promise<{
  released: number;
  scanned: number;
}> {
  const now = new Date();

  const due = await db.teacherCommission.findMany({
    where: {
      entryType: "COMMISSION",
      status: "ELIGIBLE",
      holdingEndsAt: { not: null, lte: now },
    },
    take: limit,
    orderBy: { holdingEndsAt: "asc" },
    select: { id: true, teacherId: true, commissionAmount: true, transaksiId: true },
  });

  let released = 0;
  for (const entry of due) {
    try {
      const claimed = await db.$transaction(async (tx) => {
        const claim = await tx.teacherCommission.updateMany({
          where: { id: entry.id, status: "ELIGIBLE" },
          data: { status: "AVAILABLE", availableAt: now, settledAt: now },
        });
        if (claim.count === 0) return false;

        await upsertWalletTx(tx, entry.teacherId, {
          decPending: entry.commissionAmount,
          incAvailable: entry.commissionAmount,
        });

        await auditCommission(
          {
            action: "COMMISSION_RELEASE",
            targetUserId: entry.teacherId,
            transactionId: entry.transaksiId,
            newValue: { status: "AVAILABLE", availableAt: now.toISOString() },
            metadata: { commissionId: entry.id, amount: entry.commissionAmount },
          },
          tx,
        );
        return true;
      });

      if (claimed) {
        released++;
        emitCommissionEvent({
          event: "commission.released",
          teacherId: entry.teacherId,
          commissionId: entry.id,
          amount: entry.commissionAmount,
          actor: "system",
          at: now.toISOString(),
        });
      }
    } catch (err) {
      // Partial failure is fine — the failed entry stays ELIGIBLE and is
      // retried on the next run. Never abort the whole batch.
      console.error("[commission] release gagal untuk:", entry.id, err);
    }
  }

  return { released, scanned: due.length };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVERSAL (§4/§12) — append-only negative entry
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reverse the commission for a transaction (refund/cancellation).
 *
 * §4: the original commission row is NEVER mutated into CANCELLED — its
 * financial snapshot stays intact (only lifecycle status → REVERSED).
 * A NEW negative entry (entryType=REVERSAL, commissionAmount=-X) is appended.
 * Idempotent: one reversal per (transaction × teacher) via unique key +
 * claim-first guard.
 *
 * Wallet effects by prior status:
 * - ELIGIBLE  → pendingBalance -= X
 * - AVAILABLE → availableBalance -= X
 * - PENDING   → no wallet effect (never credited)
 * - PROCESSING/PAID → money already locked/paid out. NO wallet auto-mutation:
 *   the negative ledger entry is the auditable adjustment; reconciliation
 *   surfaces the mismatch for admin/finance to resolve (§12).
 */
export async function reverseCommissionForTransaction(
  transaksiId: string,
  reason: ReversalReason,
  opts?: { performedBy?: string | null; tx?: Prisma.TransactionClient },
): Promise<ReversalResult> {
  const now = new Date();

  const findCommission = async (client: DbClient) =>
    client.teacherCommission.findFirst({
      where: { transaksiId, entryType: "COMMISSION" },
      select: {
        id: true,
        teacherId: true,
        studentId: true,
        attributionId: true,
        attributionSource: true,
        sourceGroupId: true,
        eligibleFrom: true,
        grossAmount: true,
        commissionRate: true,
        commissionAmount: true,
        status: true,
      },
    });

  const commission = await findCommission(opts?.tx ?? db);
  if (!commission) return { reversed: false, reason: "NO_COMMISSION" };
  if (commission.status === "REVERSED") return { reversed: false, reason: "ALREADY_REVERSED" };

  const amount = commission.commissionAmount;

  const run = async (tx: Prisma.TransactionClient) => {
    // Claim-first — concurrent refunds: only one wins.
    const claim = await tx.teacherCommission.updateMany({
      where: { id: commission.id, status: { not: "REVERSED" } },
      data: {
        status: "REVERSED",
        reversedAt: now,
        reversedReason: reason,
        reversedBy: opts?.performedBy ?? null,
      },
    });
    if (claim.count === 0) return null; // already reversed concurrently

    const priorStatus = commission.status;

    // Append-only negative entry (§4). Unique [transaksiId, teacherId, REVERSAL]
    // guarantees at most one reversal entry even under retry.
    const reversal = await tx.teacherCommission.create({
      data: {
        entryType: "REVERSAL",
        transaksiId,
        teacherId: commission.teacherId,
        studentId: commission.studentId,
        attributionId: commission.attributionId,
        attributionSource: commission.attributionSource,
        sourceGroupId: commission.sourceGroupId,
        eligibleFrom: commission.eligibleFrom,
        grossAmount: commission.grossAmount,
        commissionRate: commission.commissionRate,
        commissionAmount: -amount,
        status: "REVERSED",
        holdingEndsAt: null,
        availableAt: null,
        settledAt: null,
        reversedAt: now,
        reversedReason: reason,
        reversedBy: opts?.performedBy ?? null,
      },
      select: { id: true },
    });

    await tx.teacherCommission.update({
      where: { id: commission.id },
      data: { reversalEntryId: reversal.id },
    });

    // Wallet adjustments by prior status (§12).
    if (priorStatus === "ELIGIBLE") {
      await upsertWalletTx(tx, commission.teacherId, {
        decPending: amount,
        incReversed: amount,
      });
    } else if (priorStatus === "AVAILABLE") {
      await upsertWalletTx(tx, commission.teacherId, {
        decAvailable: amount,
        incReversed: amount,
      });
    } else if (priorStatus === "PROCESSING" || priorStatus === "PAID") {
      // Already withdrawn (or mid-withdrawal). Do NOT mutate the historical
      // withdrawal — the negative entry is the auditable adjustment; admin
      // resolves via reconciliation report.
      await upsertWalletTx(tx, commission.teacherId, { incReversed: amount });
    }
    // PENDING → no wallet effect.

    await auditCommission(
      {
        action: "COMMISSION_REVERSE",
        targetUserId: commission.teacherId,
        transactionId: transaksiId,
        previousValue: { status: priorStatus, amount },
        newValue: { status: "REVERSED", reversalEntryId: reversal.id, amount: -amount },
        reason,
        metadata: { commissionId: commission.id, reversalEntryId: reversal.id },
      },
      tx,
    );

    return reversal.id;
  };

  let reversalEntryId: string | null;
  if (opts?.tx) {
    reversalEntryId = await run(opts.tx);
  } else {
    try {
      reversalEntryId = await db.$transaction(run);
    } catch (err) {
      if (isP2002(err)) {
        // Concurrent reversal already created the negative entry.
        const existing = await findCommission(db);
        if (existing?.status === "REVERSED") return { reversed: false, reason: "ALREADY_REVERSED" };
      }
      throw err;
    }
  }

  if (!reversalEntryId) return { reversed: false, reason: "ALREADY_REVERSED" };

  emitReversalEvent(transaksiId, commission.teacherId, commission.id, reversalEntryId, amount, reason);
  return {
    reversed: true,
    commissionId: commission.id,
    reversalEntryId,
    amount,
  };
}

function emitReversalEvent(
  transaksiId: string,
  teacherId: string,
  commissionId: string,
  reversalEntryId: string,
  amount: number,
  reason: string,
): void {
  emitCommissionEvent({
    event: "commission.reversed",
    teacherId,
    transaksiId,
    commissionId,
    amount,
    reason,
    actor: "system",
    at: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH RELEASE helper (loop until drained) — for cron
// ═══════════════════════════════════════════════════════════════════════════════

export async function batchReleaseCommissions(): Promise<number> {
  let total = 0;
  for (let i = 0; i < 50; i++) {
    const { released, scanned } = await releaseEligibleTeacherCommissions(100);
    total += released;
    if (scanned < 100) break;
  }
  return total;
}
