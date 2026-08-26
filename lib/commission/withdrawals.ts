/**
 * Guru Cerdas Sejahtera — Withdrawal engine (P7C §13–§15).
 *
 * State machine (mapped onto the P7B-approved enum):
 *
 *   PENDING      = REQUESTED  — dana DIPINDAHKAN available → locked (atomic)
 *   APPROVED     = PROCESSING — admin menyetujui, payout berjalan
 *   TRANSFERRED  = PAID       — terminal; locked → lifetimeWithdrawn
 *   REJECTED     = FAILED     — terminal; locked → available (dana kembali)
 *   CANCELLED    = guru batal — terminal; locked → available (dana kembali)
 *
 * Idempotency & concurrency (§15):
 * - Request: wallet claim `updateMany WHERE availableBalance >= amount` —
 *   dua tab / dua request bersamaan tidak bisa meloloskan keduanya.
 * - Process: state claim `updateMany WHERE status = expectedFrom` — callback
 *   payout dobel / klik dobel hanya diproses sekali.
 */

import { Prisma } from "@prisma/client";
import type { TeacherWithdrawalStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { teacherCommissionMinimumWithdrawal } from "./config";
import { auditCommission } from "./audit";
import { emitCommissionEvent } from "./events";
import { upsertWalletTx } from "./engine";
import type {
  WithdrawalAction,
  WithdrawalProcessResult,
  WithdrawalRequestInput,
  WithdrawalRequestResult,
} from "./types";

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST (§13/§14/§15)
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_TRANSITIONS: Record<WithdrawalAction, { from: TeacherWithdrawalStatus; to: TeacherWithdrawalStatus }> = {
  APPROVE: { from: "PENDING", to: "APPROVED" },
  REJECT: { from: "PENDING", to: "REJECTED" },
  CANCEL: { from: "PENDING", to: "CANCELLED" },
  TRANSFER: { from: "APPROVED", to: "TRANSFERRED" },
};

/**
 * Request a withdrawal. Dana langsung dipindahkan available → locked dalam
 * satu transaksi atomik — tidak ada jendela di mana dua penarikan bisa
 * memakai uang yang sama.
 */
export async function requestWithdrawal(
  input: WithdrawalRequestInput,
): Promise<WithdrawalRequestResult> {
  const amount = Math.floor(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "INVALID_AMOUNT" };
  }
  const minimum = teacherCommissionMinimumWithdrawal();
  if (amount < minimum) {
    return { ok: false, error: "BELOW_MINIMUM" };
  }
  if (!input.bankName?.trim() || !input.accountNumber?.trim() || !input.accountHolder?.trim()) {
    return { ok: false, error: "BANK_DETAILS_MISSING" };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // ── Claim funds atomically (§15: no double locking) ──
      const claim = await tx.teacherWallet.updateMany({
        where: {
          teacherId: input.teacherId,
          status: "ACTIVE",
          availableBalance: { gte: amount },
        },
        data: {
          availableBalance: { decrement: amount },
          lockedBalance: { increment: amount },
        },
      });

      if (claim.count === 0) {
        const wallet = await tx.teacherWallet.findUnique({
          where: { teacherId: input.teacherId },
          select: { status: true },
        });
        if (!wallet || wallet.status !== "ACTIVE") {
          return { ok: false as const, error: "WALLET_NOT_ACTIVE" as const };
        }
        return { ok: false as const, error: "INSUFFICIENT_BALANCE" as const };
      }

      const withdrawal = await tx.teacherCommissionWithdrawal.create({
        data: {
          walletId: (await tx.teacherWallet.findUnique({
            where: { teacherId: input.teacherId },
            select: { id: true },
          }))!.id,
          teacherId: input.teacherId,
          amount,
          bankName: input.bankName.trim(),
          accountNumber: input.accountNumber.trim(),
          accountHolder: input.accountHolder.trim(),
          status: "PENDING",
        },
        select: { id: true, amount: true, status: true, createdAt: true },
      });

      await auditCommission(
        {
          action: "COMMISSION_WITHDRAWAL_REQUEST",
          targetUserId: input.teacherId,
          newValue: { withdrawalId: withdrawal.id, amount, status: "PENDING" },
          metadata: { withdrawalId: withdrawal.id },
        },
        tx,
      );

      const wallet = await tx.teacherWallet.findUnique({
        where: { teacherId: input.teacherId },
        select: { availableBalance: true, lockedBalance: true },
      });

      return {
        ok: true as const,
        withdrawal,
        newAvailable: wallet?.availableBalance ?? 0,
        newLocked: wallet?.lockedBalance ?? 0,
      };
    });

    if (!result.ok) return result;

    emitCommissionEvent({
      event: "withdrawal.requested",
      teacherId: input.teacherId,
      withdrawalId: result.withdrawal.id,
      amount,
      actor: "teacher",
      at: new Date().toISOString(),
    });

    return result;
  } catch (err) {
    console.error("[commission][withdrawal] request gagal:", err);
    return { ok: false, error: "INSUFFICIENT_BALANCE" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESS (admin approve/reject/transfer, teacher cancel) (§14)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Move a withdrawal through its state machine. Transitional-safe: state is
 * claimed via `updateMany WHERE status = from` inside a transaction; the
 * wallet adjustment happens in the SAME transaction. Duplicate callbacks /
 * concurrent admin clicks → the loser gets ALREADY_PROCESSED (no-op).
 *
 * Wallet effects:
 * - APPROVE:  (no wallet move — funds already locked at request)
 * - TRANSFER: locked -= X, lifetimeWithdrawn += X  (paid)
 * - REJECT / CANCEL: locked -= X, available += X  (funds returned)
 */
export async function processWithdrawal(
  withdrawalId: string,
  action: WithdrawalAction,
  actorUserId: string | null,
): Promise<WithdrawalProcessResult> {
  const transition = VALID_TRANSITIONS[action];
  const now = new Date();

  const target = await db.teacherCommissionWithdrawal.findUnique({
    where: { id: withdrawalId },
    select: { id: true, teacherId: true, amount: true, status: true, walletId: true },
  });

  if (!target) return { ok: false, error: "NOT_FOUND" };
  if (target.status !== transition.from) {
    return { ok: false, error: "INVALID_TRANSITION" };
  }

  try {
    const moved = await db.$transaction(async (tx) => {
      const claim = await tx.teacherCommissionWithdrawal.updateMany({
        where: { id: withdrawalId, status: transition.from },
        data: { status: transition.to, processedAt: now },
      });
      if (claim.count === 0) return false;

      if (action === "TRANSFER") {
        await upsertWalletTx(tx, target.teacherId, {
          decLocked: target.amount,
          incLifetimeWithdrawn: target.amount,
        });
      } else if (action === "REJECT" || action === "CANCEL") {
        await upsertWalletTx(tx, target.teacherId, {
          decLocked: target.amount,
          incAvailable: target.amount,
        });
      }

      await auditCommission(
        {
          action: `COMMISSION_WITHDRAWAL_${action}`,
          actorUserId,
          targetUserId: target.teacherId,
          previousValue: { status: transition.from, amount: target.amount },
          newValue: { status: transition.to },
          metadata: { withdrawalId, amount: target.amount },
        },
        tx,
      );
      return true;
    });

    if (!moved) return { ok: false, error: "ALREADY_PROCESSED" };

    emitCommissionEvent({
      event:
        action === "TRANSFER"
          ? "withdrawal.paid"
          : action === "REJECT" || action === "CANCEL"
            ? "withdrawal.failed"
            : "withdrawal.processing",
      teacherId: target.teacherId,
      withdrawalId,
      amount: target.amount,
      actor: action === "CANCEL" ? "teacher" : "admin",
      at: now.toISOString(),
    });

    return {
      ok: true,
      id: withdrawalId,
      action,
      newStatus: transition.to,
      amount: target.amount,
      walletUpdated: action !== "APPROVE",
    };
  } catch (err) {
    console.error("[commission][withdrawal] process gagal:", err);
    return { ok: false, error: "INVALID_TRANSITION" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// READS
// ═══════════════════════════════════════════════════════════════════════════════

export async function listWithdrawals(
  teacherId: string,
  opts?: { limit?: number; offset?: number },
) {
  const limit = Math.min(opts?.limit ?? 20, 100);
  const offset = Math.max(opts?.offset ?? 0, 0);

  const [items, total] = await Promise.all([
    db.teacherCommissionWithdrawal.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        amount: true,
        status: true,
        notes: true,
        processedAt: true,
        createdAt: true,
        bankName: true,
        accountNumber: true,
        accountHolder: true,
        payout: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
            completedAt: true,
            failedAt: true,
          },
        },
      },
    }),
    db.teacherCommissionWithdrawal.count({ where: { teacherId } }),
  ]);

  return { items, total, limit, offset };
}

/** Admin: list all withdrawals with teacher identity. */
export async function listAllWithdrawals(opts?: { status?: string; limit?: number; offset?: number }) {
  const limit = Math.min(opts?.limit ?? 20, 100);
  const offset = Math.max(opts?.offset ?? 0, 0);

  const where: Prisma.TeacherCommissionWithdrawalWhereInput = opts?.status
    ? { status: opts.status as Prisma.TeacherCommissionWithdrawalWhereInput["status"] }
    : {};

  const [items, total] = await Promise.all([
    db.teacherCommissionWithdrawal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        teacherId: true,
        amount: true,
        status: true,
        notes: true,
        processedAt: true,
        createdAt: true,
        bankName: true,
        accountNumber: true,
        accountHolder: true,
        teacher: { select: { id: true, fullName: true, email: true } },
      },
    }),
    db.teacherCommissionWithdrawal.count({ where }),
  ]);

  return { items, total, limit, offset };
}
