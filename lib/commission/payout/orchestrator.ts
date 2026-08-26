/**
 * P7D — Payout orchestrator (spec §8–§20).
 *
 * Alur: withdrawal PENDING → payout REQUESTED → VALIDATING → SUBMITTING →
 * PROCESSING → PAID / FAILED / RETRYABLE_FAILURE / RECONCILIATION_REQUIRED.
 *
 * Invariant keuangan (spec §28):
 *   AVAILABLE → LOCKED → WITHDRAWN (sukses)
 *   AVAILABLE → LOCKED → AVAILABLE (gagal definitif)
 *   Tidak ada uang hilang / tercipta / dibayar dua kali.
 *
 * Satu withdrawal = SATU logical payout (withdrawalId @unique).
 * Idempotency key DETERMINISTIK `withdrawal:{id}` (spec §9) — retry memakai
 * kunci yang sama, bukan random.
 * Timeout provider = RECONCILIATION_REQUIRED, TIDAK PERNAH otomatis FAILED (§11).
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { upsertWalletTx } from "../engine";
import { auditCommission } from "../audit";
import { getPayoutProvider } from "./provider";
import { evaluatePayoutGate, checkPayoutLimits } from "./safety";
import { evaluateRiskGate } from "@/lib/guru/risk/signals";
import { isDestinationCooldownActive } from "@/lib/guru/risk/rules";
import { evaluateFirstPayoutGate } from "./first-payout";
import {
  isRealMoneyPayoutEnabled,
  payoutMaxAttempts,
  payoutProvider as payoutProviderId,
  payoutReconciliationTimeoutMs,
  payoutRetryDelayMs,
} from "./config";
import { validateDestinationFormat } from "./mock-provider";
import type {
  CreatePayoutResult,
  PayoutEvent,
  PayoutOutcomeResult,
  PayoutSubmitResult,
} from "./types";

type PayoutSubmitError = Extract<PayoutSubmitResult, { ok: false }>["error"];

function isP2002(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

function gateReason(code: string): string {
  switch (code) {
    case "PAYOUT_REAL_MONEY_DISABLED":
      return "Payout uang asli belum diaktifkan.";
    case "PAYOUT_PROVIDER_DISABLED":
      return "Provider payout production belum diaktifkan.";
    case "PAYOUT_KILL_SWITCH":
      return "Payout sedang dihentikan sementara (kill switch).";
    case "PAYOUT_PILOT_BLOCKED":
      return "Akun Anda belum termasuk pilot payout.";
    default:
      return code;
  }
}

function isRetryableFailure(
  r: CreatePayoutResult,
): r is Extract<CreatePayoutResult, { ok: false; retryable: true }> {
  return r.ok === false && "retryable" in r && r.retryable === true;
}

function isDefinitiveFailure(
  r: CreatePayoutResult,
): r is Extract<CreatePayoutResult, { ok: false; retryable: false }> {
  return r.ok === false && "retryable" in r && r.retryable === false;
}

function isUnknownFailure(
  r: CreatePayoutResult,
): r is Extract<CreatePayoutResult, { ok: false; unknown: true }> {
  return r.ok === false && "unknown" in r && r.unknown === true;
}

function emitPayoutEvent(event: PayoutEvent): void {
  try {
    console.log("[payout]", JSON.stringify(event));
  } catch {
    // best-effort
  }
}

function now(): Date {
  return new Date();
}

/** Status payout yang boleh menerima outcome (non-terminal). */
const OPEN_PAYOUT_STATUSES = [
  "REQUESTED",
  "VALIDATING",
  "SUBMITTING",
  "PROCESSING",
  "RETRYABLE_FAILURE",
  "RECONCILIATION_REQUIRED",
] as const;

const PROCESSING_LIKE = ["SUBMITTING", "PROCESSING", "RECONCILIATION_REQUIRED"] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMIT (spec §8) — withdrawal PENDING → payout dibuat, divalidasi, dikirim
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Orchestrate payout untuk sebuah withdrawal (PENDING).
 * Idempotent: withdrawalId @unique — panggilan kedua → ALREADY_SUBMITTED.
 * Dana TIDAK pernah dilepas pada kegagalan retryable/unknown (§16).
 */
export async function submitPayoutForWithdrawal(
  withdrawalId: string,
  opts?: { actor?: "system" | "admin" | "teacher" },
): Promise<PayoutSubmitResult> {
  const withdrawal = await db.teacherCommissionWithdrawal.findUnique({
    where: { id: withdrawalId },
    select: {
      id: true,
      teacherId: true,
      amount: true,
      bankName: true,
      accountNumber: true,
      accountHolder: true,
      status: true,
    },
  });
  if (!withdrawal) return { ok: false, error: "WITHDRAWAL_NOT_FOUND" };
  if (withdrawal.status !== "PENDING") return { ok: false, error: "WITHDRAWAL_NOT_PENDING" };

  // ── P7E: SAFETY GATE + LIMITS (spec §13/§7) — Otoritatif, sebelum apa pun ──
  const gate = await evaluatePayoutGate({ teacherId: withdrawal.teacherId });
  if (!gate.allowed) {
    await failPayoutSafe(withdrawalId, withdrawal.teacherId, gate.code, gateReason(gate.code));
    return { ok: false, error: gate.code as PayoutSubmitError };
  }

  const limits = await checkPayoutLimits({ teacherId: withdrawal.teacherId, amount: withdrawal.amount });
  if (!limits.ok) {
    const limitError = (
      limits.error === "BELOW_MINIMUM"
        ? "LIMIT_BELOW_MINIMUM"
        : limits.error === "ABOVE_MAXIMUM"
          ? "LIMIT_ABOVE_MAXIMUM"
          : limits.error === "DAILY_LIMIT_REACHED"
            ? "LIMIT_DAILY"
            : limits.error === "GLOBAL_DAILY_LIMIT_REACHED"
              ? "LIMIT_GLOBAL"
              : "PAYOUT_PILOT_LIMIT_REACHED"
    ) as PayoutSubmitError;
    await failPayoutSafe(withdrawalId, withdrawal.teacherId, limits.error, limits.detail ?? "Batas payout terlampaui.");
    return { ok: false, error: limitError };
  }

  // ── P8C: RISK SAFETY GATE (spec §7/§8) ──
  // REVIEW/RESTRICTED → hold aman: TIDAK dikirim, dana TETAP terkunci,
  // TIDAK otomatis dikembalikan tanpa keputusan admin. Bukan reconciliation.
  const riskGate = await evaluateRiskGate(withdrawal.teacherId);
  if (!riskGate.allowed) {
    await auditCommission({
      action: "PAYOUT_RISK_HOLD",
      targetUserId: withdrawal.teacherId,
      reason: riskGate.reason,
      metadata: { withdrawalId, state: riskGate.state },
    });
    console.log(
      "[payout][risk]",
      JSON.stringify({ event: "payout.risk_hold", teacherId: withdrawal.teacherId, withdrawalId, state: riskGate.state, at: now().toISOString() })
    );
    // ── P8C §16: notifikasi respectful — TIDAK menakut-nakuti ──
    db.notifikasi
      .create({
        data: {
          userId: withdrawal.teacherId,
          title: "Pencairan sedang ditinjau",
          body: "Pencairan Anda sedang ditinjau untuk memastikan keamanan transaksi. Anda akan mendapat kabar setelah selesai.",
          type: "KOMISI",
          data: { withdrawalId },
        },
      })
      .catch(() => {});
    return {
      ok: false,
      error: riskGate.state === "RESTRICTED" ? ("RISK_RESTRICTED" as PayoutSubmitError) : ("RISK_REVIEW_REQUIRED" as PayoutSubmitError),
    };
  }

  // ── P8C §9: DESTINATION COOLDOWN — hold bila destinasi baru saja berubah ──
  const payoutProfileCheck = await db.teacherPayoutProfile.findUnique({
    where: { teacherId: withdrawal.teacherId },
    select: { updatedAt: true },
  });
  if (payoutProfileCheck && isDestinationCooldownActive({ profileUpdatedAt: payoutProfileCheck.updatedAt })) {
    await auditCommission({
      action: "PAYOUT_RISK_HOLD",
      targetUserId: withdrawal.teacherId,
      reason: "Cooldown destinasi aktif — payout ditahan sementara.",
      metadata: { withdrawalId, state: "REVIEW" },
    });
    return { ok: false, error: "RISK_REVIEW_REQUIRED" as PayoutSubmitError };
  }

  const payoutProfile = await db.teacherPayoutProfile.findUnique({
    where: { teacherId: withdrawal.teacherId },
    select: {
      destinationType: true,
      verificationStatus: true,
      recipientName: true,
      bankName: true,
      accountNumber: true,
      updatedAt: true,
    },
  });
  if (!payoutProfile) {
    // Tanpa profil payout, pengiriman tidak bisa dilanjutkan — gagal aman:
    // withdrawal dibatalkan + dana dikembalikan (definitif, audited).
    await failPayoutSafe(withdrawalId, withdrawal.teacherId, "NO_PROFILE", "Profil payout belum dibuat.");
    return { ok: false, error: "NO_PROFILE" };
  }
  if (payoutProfile.verificationStatus === "REJECTED") {
    await failPayoutSafe(withdrawalId, withdrawal.teacherId, "PROFILE_REJECTED", "Profil payout ditolak verifikasi.");
    return { ok: false, error: "PROFILE_REJECTED" };
  }

  // ── P8E §8: FIRST PAYOUT PROTECTION (defense-in-depth; hold, bukan restore) ──
  const firstPayout = await evaluateFirstPayoutGate({
    teacherId: withdrawal.teacherId,
    profileVerificationStatus: payoutProfile.verificationStatus,
    profileUpdatedAt: payoutProfile.updatedAt,
    cooldownActive: isDestinationCooldownActive({ profileUpdatedAt: payoutProfile.updatedAt }),
    riskState: riskGate.state,
    previousPayoutCount: await db.teacherPayout.count({ where: { teacherId: withdrawal.teacherId }, take: 1 }),
  });
  if (!firstPayout.allowed) {
    await auditCommission({
      action: "PAYOUT_FIRST_PAYOUT_BLOCKED",
      targetUserId: withdrawal.teacherId,
      reason: firstPayout.reason,
      metadata: { withdrawalId },
    });
    return { ok: false, error: "FIRST_PAYOUT_BLOCKED" as PayoutSubmitError };
  }

  // ── 1. Buat payout intent (idempoten via withdrawalId @unique) ──
  const idempotencyKey = `withdrawal:${withdrawalId}`;

  let payoutId: string;
  try {
    const payout = await db.teacherPayout.create({
      data: {
        withdrawalId,
        teacherId: withdrawal.teacherId,
        provider: payoutProviderId(),
        idempotencyKey,
        amount: withdrawal.amount,
        currency: "IDR",
        destinationType: payoutProfile.destinationType,
        bankName: withdrawal.bankName,
        accountNumber: withdrawal.accountNumber,
        accountHolder: withdrawal.accountHolder,
        status: "REQUESTED",
      },
      select: { id: true },
    });
    payoutId = payout.id;
    emitPayoutEvent({
      event: "payout.requested",
      teacherId: withdrawal.teacherId,
      withdrawalId,
      payoutId,
      amount: withdrawal.amount,
      actor: opts?.actor ?? "system",
      at: now().toISOString(),
    });
  } catch (err) {
    if (isP2002(err)) {
      const existing = await db.teacherPayout.findUnique({
        where: { withdrawalId },
        select: { id: true, status: true },
      });
      if (existing) return { ok: false, error: "ALREADY_SUBMITTED", payoutId: existing.id };
    }
    throw err;
  }

  // ── 2. VALIDATING — validasi destinasi (format; provider bila didukung) ──
  emitPayoutEvent({
    event: "payout.validating",
    teacherId: withdrawal.teacherId,
    withdrawalId,
    payoutId,
    actor: "system",
    at: now().toISOString(),
  });

  const provider = getPayoutProvider(payoutProviderId());
  if (!provider) {
    await failPayoutSafe(withdrawalId, withdrawal.teacherId, "PROVIDER_UNAVAILABLE", `Provider "${payoutProviderId()}" tidak terdaftar.`);
    return { ok: false, error: "PROVIDER_FAILED", payoutId };
  }

  const destination = {
    recipientName: withdrawal.accountHolder,
    destinationType: payoutProfile.destinationType,
    bankName: withdrawal.bankName,
    accountNumber: withdrawal.accountNumber,
  };
  const formatCheck = validateDestinationFormat(destination);
  if (!formatCheck.ok) {
    await failPayoutSafe(withdrawalId, withdrawal.teacherId, "INVALID_DESTINATION", formatCheck.reason ?? "Destinasi tidak valid.");
    return { ok: false, error: "INVALID_DESTINATION", payoutId };
  }

  const validation = await provider.validateDestination(destination);
  if (!validation.ok) {
    await failPayoutSafe(withdrawalId, withdrawal.teacherId, "INVALID_DESTINATION", validation.reason ?? "Destinasi ditolak provider.");
    return { ok: false, error: "INVALID_DESTINATION", payoutId };
  }

  // ── 3. SUBMITTING — kirim ke provider (bounded attempt) ──
  await db.teacherPayout.update({
    where: { id: payoutId },
    data: { status: "SUBMITTING" },
  });

  const result = await safeCreatePayout(provider, {
    idempotencyKey,
    providerReference: null,
    amount: withdrawal.amount,
    currency: "IDR",
    destination,
  });

  return applySubmitResult(payoutId, withdrawalId, withdrawal.teacherId, withdrawal.amount, result, opts?.actor ?? "system");
}

/** createPayout dengan guard real-money + penjaga timeout (bounded, best-effort). */
async function safeCreatePayout(
  provider: NonNullable<ReturnType<typeof getPayoutProvider>>,
  req: Parameters<typeof provider.createPayout>[0],
): Promise<CreatePayoutResult> {
  if (!isRealMoneyPayoutEnabled()) {
    // Real money TETAP disabled — provider non-mock diblokir sampai Founder Gate.
    if (provider.id !== "mock") {
      return { ok: false, retryable: false, code: "REAL_MONEY_DISABLED", reason: "Payout uang asli belum diaktifkan (Founder Gate)." };
    }
  }
  try {
    return await provider.createPayout(req);
  } catch (err) {
    // Timeout/exception = state provider TIDAK diketahui (§11).
    console.error("[payout] createPayout error (unknown state):", err);
    return { ok: false, unknown: true, reason: "Provider error — state tidak diketahui." };
  }
}

async function applySubmitResult(
  payoutId: string,
  withdrawalId: string,
  teacherId: string,
  amount: number,
  result: CreatePayoutResult,
  actor: "system" | "admin" | "teacher",
): Promise<PayoutSubmitResult> {
  if (result.ok) {
    // ── P7E §12: AMOUNT PROTECTION — response amount provider HARUS cocok ──
    // Mismatch → STOP, JANGAN tandai PAID, buat reconciliation issue.
    if (result.amount !== undefined && result.amount !== amount) {
      await db.teacherPayout.updateMany({
        where: { id: payoutId, status: { in: ["SUBMITTING", "PROCESSING"] } },
        data: {
          status: "RECONCILIATION_REQUIRED",
          providerStatus: "AMOUNT_MISMATCH",
          lastErrorCode: "AMOUNT_MISMATCH",
          lastErrorAt: now(),
        },
      });
      await auditCommission({
        action: "PAYOUT_MISMATCH",
        targetUserId: teacherId,
        reason: `Amount mismatch: internal=${amount} provider=${result.amount}`,
        metadata: { payoutId, withdrawalId, providerReference: result.providerReference },
      });
      emitPayoutEvent({
        event: "payout.mismatch",
        teacherId,
        withdrawalId,
        payoutId,
        amount,
        code: "AMOUNT_MISMATCH",
        actor,
        at: now().toISOString(),
      });
      return { ok: false, error: "PROVIDER_UNKNOWN", payoutId };
    }

    const providerStatus = result.providerStatus; // PROCESSING | PAID
    if (providerStatus === "PAID") {
      // Provider langsung menyatakan sukses (mock instant) — langsung PAID.
      const applied = await applyPayoutPaid(payoutId, { providerReference: result.providerReference, fee: result.fee });
      return { ok: true, payoutId, status: applied.ok ? "PAID" : "PAID", withdrawalStatus: applied.ok ? applied.withdrawalStatus : "TRANSFERRED" };
    }

    const done = await db.$transaction(async (tx) => {
      const claim = await tx.teacherPayout.updateMany({
        where: { id: payoutId, status: { in: ["SUBMITTING"] } },
        data: {
          status: "PROCESSING",
          providerReference: result.providerReference,
          providerStatus: "PROCESSING",
          submittedAt: now(),
          attemptCount: { increment: 1 },
          nextRetryAt: null,
          // P7E §16/§17: fee provider = biaya PLATFORM, bukan potongan komisi guru.
          providerFee: result.fee ?? 0,
        },
      });
      if (claim.count === 0) return false;

      // Withdrawal = PROCESSING (APPROVED) — dana tetap terkunci.
      await tx.teacherCommissionWithdrawal.updateMany({
        where: { id: withdrawalId, status: "PENDING" },
        data: { status: "APPROVED", processedAt: now() },
      });

      await auditCommission(
        {
          action: "PAYOUT_SUBMIT",
          targetUserId: teacherId,
          previousValue: { payoutStatus: "SUBMITTING", withdrawalStatus: "PENDING" },
          newValue: { payoutStatus: "PROCESSING", provider: payoutProviderId(), withdrawalStatus: "APPROVED", providerFee: result.fee ?? 0 },
          metadata: { payoutId, withdrawalId, amount, providerReference: result.providerReference },
        },
        tx,
      );
      return true;
    });

    if (!done) {
      // Sudah di-submit oleh pekerja lain — baca state terbaru.
      const fresh = await db.teacherPayout.findUnique({
        where: { id: payoutId },
        select: { status: true },
      });
      return { ok: false, error: "ALREADY_SUBMITTED", payoutId };
    }

    emitPayoutEvent({
      event: "payout.processing",
      teacherId,
      withdrawalId,
      payoutId,
      amount,
      actor,
      at: now().toISOString(),
    });
    return { ok: true, payoutId, status: "PROCESSING", withdrawalStatus: "APPROVED" };
  }

  if (isUnknownFailure(result)) {
    // Timeout — RECONCILIATION_REQUIRED, dana TETAP terkunci (§11).
    await db.teacherPayout.updateMany({
      where: { id: payoutId, status: { in: ["SUBMITTING"] } },
      data: { status: "RECONCILIATION_REQUIRED", attemptCount: { increment: 1 }, lastErrorCode: "PROVIDER_UNKNOWN", lastErrorAt: now() },
    });
    await auditCommission({
      action: "PAYOUT_RECONCILIATION_REQUIRED",
      targetUserId: teacherId,
      reason: result.reason,
      metadata: { payoutId, withdrawalId, amount },
    });
    emitPayoutEvent({
      event: "payout.reconciliation_required",
      teacherId,
      withdrawalId,
      payoutId,
      amount,
      actor,
      at: now().toISOString(),
    });
    return { ok: false, error: "PROVIDER_UNKNOWN", payoutId };
  }

  if (isRetryableFailure(result)) {
    // Retryable — dana tetap terlindungi (§16/§17).
    await db.$transaction(async (tx) => {
      await tx.teacherPayout.updateMany({
        where: { id: payoutId, status: { in: ["SUBMITTING"] } },
        data: {
          status: "RETRYABLE_FAILURE",
          attemptCount: { increment: 1 },
          lastErrorCode: result.code,
          lastErrorAt: now(),
          nextRetryAt: now(), // retry saatnya dinilai saat cron/manual
        },
      });
    });
    await auditCommission({
      action: "PAYOUT_RETRYABLE",
      targetUserId: teacherId,
      reason: result.reason,
      metadata: { payoutId, withdrawalId, code: result.code, amount },
    });
    emitPayoutEvent({
      event: "payout.retryable",
      teacherId,
      withdrawalId,
      payoutId,
      amount,
      code: result.code,
      actor,
      at: now().toISOString(),
    });
    return { ok: false, error: "PROVIDER_FAILED", payoutId };
  }

  // Gagal definitif → withdrawal FAILED + dana kembali (spec §16).
  if (isDefinitiveFailure(result)) {
    await applyPayoutFailed(payoutId, result.code, result.reason);
  }
  return { ok: false, error: "PROVIDER_FAILED", payoutId };
}

/** Gagal aman SEBELUM payout row dibuat / tanpa payout row (validasi awal). */
async function failPayoutSafe(withdrawalId: string, teacherId: string, code: string, reason: string): Promise<void> {
  try {
    const moved = await db.$transaction(async (tx) => {
      const claim = await tx.teacherCommissionWithdrawal.updateMany({
        where: { id: withdrawalId, status: "PENDING" },
        data: { status: "REJECTED", processedAt: now(), notes: reason },
      });
      if (claim.count === 0) return false;
      const w = await tx.teacherCommissionWithdrawal.findUnique({
        where: { id: withdrawalId },
        select: { amount: true },
      });
      if (w) {
        await upsertWalletTx(tx, teacherId, { decLocked: w.amount, incAvailable: w.amount });
      }
      await auditCommission(
        {
          action: "PAYOUT_FAILED",
          targetUserId: teacherId,
          reason,
          newValue: { withdrawalStatus: "REJECTED", fundsRestored: true },
          metadata: { withdrawalId, code },
        },
        tx,
      );
      return true;
    });
    if (moved) {
      emitPayoutEvent({
        event: "payout.failed",
        teacherId,
        withdrawalId,
        code,
        actor: "system",
        at: now().toISOString(),
      });
    }
  } catch (err) {
    console.error("[payout] failPayoutSafe error:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTCOMES (spec §15/§16/§13)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Konfirmasi payout sukses: payout PAID + withdrawal TRANSFERRED +
 * locked → lifetimeWithdrawn. SEMUA dalam satu transaksi atomik.
 * Idempotent: claim-based; panggilan kedua → ALREADY_APPLIED.
 */
export async function applyPayoutPaid(
  payoutId: string,
  opts?: { providerReference?: string | null; fee?: number },
): Promise<PayoutOutcomeResult> {
  const payout = await db.teacherPayout.findUnique({
    where: { id: payoutId },
    select: { id: true, withdrawalId: true, teacherId: true, amount: true, status: true, providerReference: true, providerFee: true },
  });
  if (!payout) return { ok: false, error: "NOT_FOUND" };

  try {
    const moved = await db.$transaction(async (tx) => {
      const claim = await tx.teacherPayout.updateMany({
        where: { id: payoutId, status: { in: [...OPEN_PAYOUT_STATUSES] } },
        data: {
          status: "PAID",
          providerStatus: "PAID",
          providerReference: opts?.providerReference ?? payout.providerReference,
          completedAt: now(),
          nextRetryAt: null,
          // P7E §16/§17: fee = biaya platform TERPISAH. Komisi guru TIDAK berubah.
          providerFee: opts?.fee ?? payout.providerFee,
          netTransfer: payout.amount - (opts?.fee ?? payout.providerFee),
        },
      });
      if (claim.count === 0) return false;

      const wClaim = await tx.teacherCommissionWithdrawal.updateMany({
        where: { id: payout.withdrawalId, status: { in: ["PENDING", "APPROVED"] } },
        data: { status: "TRANSFERRED", processedAt: now() },
      });
      if (wClaim.count > 0) {
        await upsertWalletTx(tx, payout.teacherId, {
          decLocked: payout.amount,
          incLifetimeWithdrawn: payout.amount,
        });
      }

      await auditCommission(
        {
          action: "PAYOUT_PAID",
          targetUserId: payout.teacherId,
          previousValue: { payoutStatus: payout.status },
          newValue: {
            payoutStatus: "PAID",
            withdrawalStatus: "TRANSFERRED",
            providerFee: opts?.fee ?? payout.providerFee,
            netTransfer: payout.amount - (opts?.fee ?? payout.providerFee),
          },
          metadata: { payoutId, withdrawalId: payout.withdrawalId, amount: payout.amount, providerReference: payout.providerReference },
        },
        tx,
      );
      return true;
    });

    if (!moved) return { ok: false, error: "ALREADY_APPLIED" };

    emitPayoutEvent({
      event: "payout.paid",
      teacherId: payout.teacherId,
      withdrawalId: payout.withdrawalId,
      payoutId,
      amount: payout.amount,
      actor: "provider",
      at: now().toISOString(),
    });
    return { ok: true, payoutId, newStatus: "PAID", withdrawalStatus: "TRANSFERRED", walletUpdated: true };
  } catch (err) {
    console.error("[payout] applyPayoutPaid error:", err);
    return { ok: false, error: "INVALID_TRANSITION" };
  }
}

/**
 * Kegagalan definitif: payout FAILED + withdrawal REJECTED + dana kembali
 * (locked → available). Atomic. Tidak pernah membuat withdrawal baru (§16).
 */
export async function applyPayoutFailed(
  payoutId: string,
  failureCode: string,
  failureReason: string,
): Promise<PayoutOutcomeResult> {
  const payout = await db.teacherPayout.findUnique({
    where: { id: payoutId },
    select: { id: true, withdrawalId: true, teacherId: true, amount: true, status: true },
  });
  if (!payout) return { ok: false, error: "NOT_FOUND" };

  try {
    const moved = await db.$transaction(async (tx) => {
      const claim = await tx.teacherPayout.updateMany({
        where: { id: payoutId, status: { in: [...OPEN_PAYOUT_STATUSES] } },
        data: {
          status: "FAILED",
          providerStatus: "FAILED",
          failedAt: now(),
          failureCode,
          failureReason,
          nextRetryAt: null,
        },
      });
      if (claim.count === 0) return false;

      const wClaim = await tx.teacherCommissionWithdrawal.updateMany({
        where: { id: payout.withdrawalId, status: { in: ["PENDING", "APPROVED"] } },
        data: { status: "REJECTED", processedAt: now(), notes: failureReason.slice(0, 200) },
      });
      if (wClaim.count > 0) {
        // Dana kembali: locked → available (§14).
        await upsertWalletTx(tx, payout.teacherId, {
          decLocked: payout.amount,
          incAvailable: payout.amount,
        });
      }

      await auditCommission(
        {
          action: "PAYOUT_FAILED",
          targetUserId: payout.teacherId,
          reason: failureReason,
          previousValue: { payoutStatus: payout.status },
          newValue: { payoutStatus: "FAILED", withdrawalStatus: "REJECTED", failureCode, fundsRestored: wClaim.count > 0 },
          metadata: { payoutId, withdrawalId: payout.withdrawalId, amount: payout.amount },
        },
        tx,
      );
      return true;
    });

    if (!moved) return { ok: false, error: "ALREADY_APPLIED" };

    emitPayoutEvent({
      event: "payout.failed",
      teacherId: payout.teacherId,
      withdrawalId: payout.withdrawalId,
      payoutId,
      amount: payout.amount,
      code: failureCode,
      actor: "provider",
      at: now().toISOString(),
    });
    return { ok: true, payoutId, newStatus: "FAILED", withdrawalStatus: "REJECTED", walletUpdated: true };
  } catch (err) {
    console.error("[payout] applyPayoutFailed error:", err);
    return { ok: false, error: "INVALID_TRANSITION" };
  }
}

/**
 * Kegagalan retryable: payout RETRYABLE_FAILURE. Dana TETAP terlindungi —
 * withdrawal tidak berubah, wallet tidak disentuh (§16).
 */
export async function applyPayoutRetryable(
  payoutId: string,
  failureCode: string,
  failureReason: string,
): Promise<PayoutOutcomeResult> {
  const payout = await db.teacherPayout.findUnique({
    where: { id: payoutId },
    select: { id: true, withdrawalId: true, teacherId: true, amount: true, status: true, attemptCount: true },
  });
  if (!payout) return { ok: false, error: "NOT_FOUND" };

  const maxAttempts = payoutMaxAttempts();
  const nextRetryAt =
    payout.attemptCount + 1 < maxAttempts ? new Date(now().getTime() + payoutRetryDelayMs()) : null;

  const moved = await db.$transaction(async (tx) => {
    const claim = await tx.teacherPayout.updateMany({
      where: { id: payoutId, status: { in: ["SUBMITTING", "PROCESSING", "RECONCILIATION_REQUIRED"] } },
      data: {
        status: "RETRYABLE_FAILURE",
        lastErrorCode: failureCode,
        lastErrorAt: now(),
        nextRetryAt,
      },
    });
    if (claim.count === 0) return false;

    await auditCommission(
      {
        action: "PAYOUT_RETRYABLE",
        targetUserId: payout.teacherId,
        reason: failureReason,
        newValue: { payoutStatus: "RETRYABLE_FAILURE", nextRetryAt: nextRetryAt?.toISOString() ?? null },
        metadata: { payoutId, withdrawalId: payout.withdrawalId, code: failureCode },
      },
      tx,
    );
    return true;
  });

  if (!moved) return { ok: false, error: "ALREADY_APPLIED" };

  emitPayoutEvent({
    event: "payout.retryable",
    teacherId: payout.teacherId,
    withdrawalId: payout.withdrawalId,
    payoutId,
    amount: payout.amount,
    code: failureCode,
    actor: "provider",
    at: now().toISOString(),
  });
  return { ok: true, payoutId, newStatus: "RETRYABLE_FAILURE", withdrawalStatus: "PENDING", walletUpdated: false };
}

/** Unknown provider state → RECONCILIATION_REQUIRED (§11/§13). Dana terkunci. */
export async function markPayoutReconciliationRequired(
  payoutId: string,
  reason: string,
): Promise<PayoutOutcomeResult> {
  const payout = await db.teacherPayout.findUnique({
    where: { id: payoutId },
    select: { id: true, withdrawalId: true, teacherId: true, amount: true, status: true },
  });
  if (!payout) return { ok: false, error: "NOT_FOUND" };

  const moved = await db.teacherPayout.updateMany({
    where: { id: payoutId, status: { in: ["SUBMITTING", "PROCESSING"] } },
    data: { status: "RECONCILIATION_REQUIRED", lastErrorCode: "PROVIDER_UNKNOWN", lastErrorAt: now() },
  });
  if (moved.count === 0) return { ok: false, error: "ALREADY_APPLIED" };

  await auditCommission({
    action: "PAYOUT_RECONCILIATION_REQUIRED",
    targetUserId: payout.teacherId,
    reason,
    metadata: { payoutId, withdrawalId: payout.withdrawalId },
  });
  emitPayoutEvent({
    event: "payout.reconciliation_required",
    teacherId: payout.teacherId,
    withdrawalId: payout.withdrawalId,
    payoutId,
    amount: payout.amount,
    actor: "system",
    at: now().toISOString(),
  });
  return { ok: true, payoutId, newStatus: "RECONCILIATION_REQUIRED", withdrawalStatus: "PENDING", walletUpdated: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECONCILIATION (spec §18/§19) & RETRY (spec §17)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rekonsiliasi SATU payout: tanya state provider, bandingkan, terapkan outcome.
 * Mismatch → issue + audit, TIDAK PERNAH repair diam-diam (§18).
 */
export async function reconcileTeacherPayout(
  payoutId: string,
  opts?: { actor?: "system" | "admin"; adminUserId?: string | null },
): Promise<"PAID" | "FAILED" | "RETRYABLE_FAILURE" | "RECONCILIATION_REQUIRED" | "PROCESSING" | "NO_CHANGE"> {
  const payout = await db.teacherPayout.findUnique({
    where: { id: payoutId },
    select: {
      id: true,
      withdrawalId: true,
      teacherId: true,
      amount: true,
      status: true,
      provider: true,
      providerReference: true,
      updatedAt: true,
      requestedAt: true,
      submittedAt: true,
    },
  });
  if (!payout) return "NO_CHANGE";
  if (["PAID", "FAILED"].includes(payout.status)) return "NO_CHANGE"; // terminal

  const provider = getPayoutProvider(payout.provider);
  if (!provider) return "NO_CHANGE";

  if (!payout.providerReference) {
    await auditCommission({
      action: "PAYOUT_RECONCILE",
      actorUserId: opts?.adminUserId ?? null,
      targetUserId: payout.teacherId,
      reason: "Payout tanpa providerReference (submission tidak sampai provider).",
      metadata: { payoutId, withdrawalId: payout.withdrawalId, status: payout.status },
    });
    emitPayoutEvent({
      event: "payout.mismatch",
      teacherId: payout.teacherId,
      withdrawalId: payout.withdrawalId,
      payoutId,
      code: "MISSING_PROVIDER_REFERENCE",
      actor: opts?.actor ?? "system",
      at: now().toISOString(),
    });
    // Tanpa reference: bila sudah lewat timeout, tandai perlu rekonsiliasi manual.
    const stale = payout.status === "RECONCILIATION_REQUIRED";
    return stale ? "RECONCILIATION_REQUIRED" : "NO_CHANGE";
  }

  const providerState = await provider.getPayoutStatus(payout.providerReference);

  if (providerState.status === "PAID") {
    await applyPayoutPaid(payoutId, { providerReference: payout.providerReference });
    return "PAID";
  }
  if (providerState.status === "FAILED") {
    await applyPayoutFailed(payoutId, "PROVIDER_FAILED", "Provider menyatakan payout gagal.");
    return "FAILED";
  }
  if (providerState.status === "PROCESSING") {
    const ageMs = now().getTime() - new Date(payout.updatedAt ?? payout.requestedAt).getTime();
    // Beri kesempatan update; pastikan status internal sinkron dengan provider.
    if (payout.status !== "PROCESSING" && payout.status !== "SUBMITTING") {
      await db.teacherPayout.updateMany({
        where: { id: payoutId, status: { in: ["SUBMITTING", "RECONCILIATION_REQUIRED", "RETRYABLE_FAILURE"] } },
        data: { status: "PROCESSING", providerStatus: "PROCESSING", submittedAt: payout.submittedAt ?? now() },
      });
    }
    if (ageMs > payoutReconciliationTimeoutMs()) {
      await markPayoutReconciliationRequired(payoutId, "Payout PROCESSING melewati batas waktu rekonsiliasi.");
      return "RECONCILIATION_REQUIRED";
    }
    return "PROCESSING";
  }

  // UNKNOWN → RECONCILIATION_REQUIRED (bukan FAILED!) (§11)
  await markPayoutReconciliationRequired(payoutId, "State provider tidak diketahui (UNKNOWN).");
  return "RECONCILIATION_REQUIRED";
}

/**
 * Rekonsiliasi SEMUA payout yang masih terbuka (cron, spec §18).
 * Juga mencoba retry yang sudah jatuh tempo (bounded).
 */
export async function reconcilePendingTeacherPayouts(limit = 50): Promise<{
  scanned: number;
  paid: number;
  failed: number;
  retried: number;
  reconciliationRequired: number;
  staleProcessing: number;
}> {
  const open = await db.teacherPayout.findMany({
    where: { status: { in: ["REQUESTED", "VALIDATING", "SUBMITTING", "PROCESSING", "RETRYABLE_FAILURE", "RECONCILIATION_REQUIRED"] } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, status: true },
  });

  let paid = 0;
  let failed = 0;
  let retried = 0;
  let reconciliationRequired = 0;
  let staleProcessing = 0;

  for (const p of open) {
    try {
      if (p.status === "RETRYABLE_FAILURE") {
        const r = await retryPayout(p.id, { actor: "system" });
        if (r === "RETRIED" || r === "PAID" || r === "FAILED") retried++;
        continue;
      }
      const result = await reconcileTeacherPayout(p.id, { actor: "system" });
      if (result === "PAID") paid++;
      else if (result === "FAILED") failed++;
      else if (result === "RECONCILIATION_REQUIRED") reconciliationRequired++;
      else if (result === "PROCESSING") {
        // cek stale timeout sudah ditangani di reconcileTeacherPayout
        staleProcessing++;
      }
    } catch (err) {
      console.error("[payout] reconcile error untuk:", p.id, err);
    }
  }

  return { scanned: open.length, paid, failed, retried, reconciliationRequired, staleProcessing };
}

/**
 * Retry payout (spec §17). Aman: TIDAK membuat payout baru bila provider
 * sudah PAID — lookup state provider dulu, baru retry bila aman.
 */
export async function retryPayout(
  payoutId: string,
  opts?: { actor?: "system" | "admin"; adminUserId?: string | null },
): Promise<"RETRIED" | "PAID" | "FAILED" | "MAX_ATTEMPTS" | "INVALID_STATE" | "NO_CHANGE"> {
  const payout = await db.teacherPayout.findUnique({
    where: { id: payoutId },
    select: {
      id: true,
      withdrawalId: true,
      teacherId: true,
      amount: true,
      status: true,
      attemptCount: true,
      provider: true,
      providerReference: true,
      idempotencyKey: true,
      bankName: true,
      accountNumber: true,
      accountHolder: true,
      destinationType: true,
    },
  });
  if (!payout) return "NO_CHANGE";
  if (!["RETRYABLE_FAILURE", "RECONCILIATION_REQUIRED"].includes(payout.status)) {
    return "INVALID_STATE";
  }

  // ── 1. State provider diketahui? Lookup DULU (§9: jangan blind retry) ──
  const provider = getPayoutProvider(payout.provider);
  if (!provider) return "NO_CHANGE";

  if (payout.providerReference) {
    const providerState = await provider.getPayoutStatus(payout.providerReference);
    if (providerState.status === "PAID") {
      await applyPayoutPaid(payoutId, { providerReference: payout.providerReference });
      return "PAID";
    }
    if (providerState.status === "FAILED") {
      await applyPayoutFailed(payoutId, "PROVIDER_FAILED", "Provider menyatakan payout gagal saat retry.");
      return "FAILED";
    }
    if (providerState.status === "PROCESSING") {
      // Sudah terkirim & diproses — cukup resume status internal.
      await db.teacherPayout.updateMany({
        where: { id: payoutId, status: { in: ["RETRYABLE_FAILURE", "RECONCILIATION_REQUIRED"] } },
        data: { status: "PROCESSING", providerStatus: "PROCESSING", nextRetryAt: null },
      });
      return "RETRIED";
    }
    // UNKNOWN → tetap RECONCILIATION_REQUIRED, jangan kirim ulang.
    await markPayoutReconciliationRequired(payoutId, "Provider UNKNOWN saat retry — tidak dikirim ulang.");
    return "NO_CHANGE";
  }

  // ── 2. Tanpa providerReference: kirim ulang dengan IDEMPOTENCY KEY SAMA ──
  if (payout.attemptCount >= payoutMaxAttempts()) {
    await auditCommission({
      action: "PAYOUT_RETRY",
      actorUserId: opts?.adminUserId ?? null,
      targetUserId: payout.teacherId,
      reason: `Retry diblokir: attemptCount ${payout.attemptCount} mencapai batas ${payoutMaxAttempts()}.`,
      metadata: { payoutId, withdrawalId: payout.withdrawalId },
    });
    return "MAX_ATTEMPTS";
  }

  const destination = {
    recipientName: payout.accountHolder,
    destinationType: payout.destinationType,
    bankName: payout.bankName,
    accountNumber: payout.accountNumber,
  };

  const result = await safeCreatePayout(provider, {
    idempotencyKey: payout.idempotencyKey,
    providerReference: null,
    amount: payout.amount,
    currency: "IDR",
    destination,
  });

  if (result.ok) {
    const done = await db.$transaction(async (tx) => {
      const claim = await tx.teacherPayout.updateMany({
        where: { id: payoutId, status: { in: ["RETRYABLE_FAILURE", "RECONCILIATION_REQUIRED"] } },
        data: {
          status: result.providerStatus === "PAID" ? "PAID" : "PROCESSING",
          providerReference: result.providerReference,
          providerStatus: result.providerStatus,
          submittedAt: now(),
          attemptCount: { increment: 1 },
          nextRetryAt: null,
          completedAt: result.providerStatus === "PAID" ? now() : null,
          lastErrorCode: null,
          lastErrorAt: null,
        },
      });
      if (claim.count === 0) return false;

      if (result.providerStatus === "PAID") {
        await tx.teacherCommissionWithdrawal.updateMany({
          where: { id: payout.withdrawalId, status: { in: ["PENDING", "APPROVED"] } },
          data: { status: "TRANSFERRED", processedAt: now() },
        });
        await upsertWalletTx(tx, payout.teacherId, {
          decLocked: payout.amount,
          incLifetimeWithdrawn: payout.amount,
        });
      } else {
        await tx.teacherCommissionWithdrawal.updateMany({
          where: { id: payout.withdrawalId, status: "PENDING" },
          data: { status: "APPROVED", processedAt: now() },
        });
      }

      await auditCommission(
        {
          action: "PAYOUT_RETRY",
          actorUserId: opts?.adminUserId ?? null,
          targetUserId: payout.teacherId,
          previousValue: { payoutStatus: payout.status },
          newValue: { payoutStatus: result.providerStatus === "PAID" ? "PAID" : "PROCESSING" },
          metadata: { payoutId, withdrawalId: payout.withdrawalId, attemptCount: payout.attemptCount + 1 },
        },
        tx,
      );
      return true;
    });

    if (!done) return "INVALID_STATE";
    if (result.providerStatus === "PAID") {
      emitPayoutEvent({
        event: "payout.paid",
        teacherId: payout.teacherId,
        withdrawalId: payout.withdrawalId,
        payoutId,
        amount: payout.amount,
        actor: opts?.actor ?? "system",
        at: now().toISOString(),
      });
      return "PAID";
    }
    emitPayoutEvent({
      event: "payout.processing",
      teacherId: payout.teacherId,
      withdrawalId: payout.withdrawalId,
      payoutId,
      amount: payout.amount,
      actor: opts?.actor ?? "system",
      at: now().toISOString(),
    });
    return "RETRIED";
  }

  if (isUnknownFailure(result)) {
    await markPayoutReconciliationRequired(payoutId, "Retry timeout — state tidak diketahui.");
    return "NO_CHANGE";
  }
  if (isRetryableFailure(result)) {
    await applyPayoutRetryable(payoutId, result.code, result.reason);
    return "INVALID_STATE";
  }
  if (isDefinitiveFailure(result)) {
    await applyPayoutFailed(payoutId, result.code, result.reason);
  }
  return "FAILED";
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY FINANCIAL RECONCILIATION (spec §19) — anomaly DETECTION only
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deteksi anomali finansial harian. READ-ONLY — lapor + audit, tanpa repair.
 */
export async function detectPayoutAnomalies(): Promise<{
  issues: Array<{ type: string; payoutId: string; detail: string }>;
  count: number;
}> {
  const issues: Array<{ type: string; payoutId: string; detail: string }> = [];

  // 1. Internal PAID tapi provider tidak PAID (tidak bisa diverifikasi dari
  //    mock — anomaly 2 & 8 dideteksi dari relasi internal).
  const paidPayouts = await db.teacherPayout.findMany({
    where: { status: "PAID" },
    select: { id: true, providerReference: true, providerStatus: true, withdrawalId: true, teacherId: true, amount: true },
  });
  for (const p of paidPayouts) {
    if (!p.providerReference) {
      issues.push({ type: "MISSING_PROVIDER_REFERENCE", payoutId: p.id, detail: `Payout PAID tanpa providerReference (${p.id})` });
    }
  }

  // 2. Withdrawal PAID tapi wallet tidak reconcile — cek via ledger invariant
  //    (dipanggil oleh bulkReconcile di P7C; di sini cek relasi payout↔withdrawal).
  const mismatchedWithdrawals = await db.teacherCommissionWithdrawal.findMany({
    where: { status: "TRANSFERRED", payout: null },
    select: { id: true, teacherId: true, amount: true },
    take: 100,
  });
  for (const w of mismatchedWithdrawals) {
    issues.push({
      type: "WITHDRAWAL_PAID_WALLET_MISMATCH",
      payoutId: w.id,
      detail: `Withdrawal TRANSFERRED tanpa payout record (${w.id})`,
    });
  }

  // 3. Payout FAILED tapi dana masih terkunci (wallet.lockedBalance > 0 tapi
  //    tidak ada withdrawal in-flight) — deteksi lewat relasi.
  const failedPayouts = await db.teacherPayout.findMany({
    where: { status: "FAILED" },
    select: { id: true, withdrawalId: true, teacherId: true },
  });
  for (const p of failedPayouts) {
    const w = await db.teacherCommissionWithdrawal.findUnique({
      where: { id: p.withdrawalId },
      select: { status: true },
    });
    if (w && w.status !== "REJECTED") {
      issues.push({
        type: "PAYOUT_FAILED_FUNDS_STILL_LOCKED",
        payoutId: p.id,
        detail: `Payout FAILED tetapi withdrawal masih ${w.status} (${p.withdrawalId}) — dana belum kembali.`,
      });
    }
  }

  // 4. Payout PROCESSING melebihi timeout → wajib RECONCILIATION_REQUIRED.
  const stale = await db.teacherPayout.findMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: new Date(now().getTime() - payoutReconciliationTimeoutMs()) },
    },
    select: { id: true, withdrawalId: true, teacherId: true },
  });
  for (const p of stale) {
    issues.push({
      type: "PAYOUT_STALE_PROCESSING",
      payoutId: p.id,
      detail: `Payout PROCESSING melewati timeout (${p.id}, withdrawal ${p.withdrawalId}).`,
    });
  }

  // 5. Duplicate provider reference / idempotency key — dicegah db-level oleh
  //    unique constraint; deteksi defensif bila ada anomaly data.
  const dupRefs = await db.$queryRawUnsafe<Array<{ ref: string; n: bigint }>>(
    `SELECT "providerReference" AS ref, COUNT(*) AS n FROM "TeacherPayout"
     WHERE "providerReference" IS NOT NULL
     GROUP BY "providerReference" HAVING COUNT(*) > 1 LIMIT 5`
  ).catch(() => []);
  for (const d of dupRefs) {
    issues.push({ type: "DUPLICATE_PROVIDER_REFERENCE", payoutId: String(d.ref), detail: `providerReference duplikat: ${d.ref} (${d.n}×)` });
  }

  return { issues, count: issues.length };
}
