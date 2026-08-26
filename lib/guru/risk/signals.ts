/**
 * P8C — Risk signal service (idempotent) + case lifecycle (append-only).
 *
 * EVENT → SIGNAL → CASE → REVIEW → DECISION → ACTION. SIGNAL ≠ GUILT.
 * - Signal idempotent via @@unique([signalType, dedupeKey]) + P2002 fallback.
 * - Maksimal SATU case aktif per guru (anti-flood).
 * - LOW → hanya signal. MEDIUM → case bila berulang. HIGH → case.
 *   CRITICAL → case + restriction (rule jelas terpenuhi).
 * - Semua keputusan wajib reason + audit (AdminPaymentAuditLog + RiskAction).
 * - TIDAK menyentuh wallet/ledger — layer ini hanya membaca finansial.
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { auditCommission } from "@/lib/commission/audit";
import { riskMediumRepeatMin } from "./config";

type DbClient = Prisma.TransactionClient | typeof db;

function isP2002(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TeacherRiskState = "NORMAL" | "REVIEW" | "RESTRICTED";

export interface RecordSignalInput {
  teacherId: string;
  signalType: string;
  severity: RiskSeverity;
  /** Deterministik — mis. "refund:{transaksiId}", "velocity:{teacherId}:{hari}". */
  dedupeKey: string;
  evidence?: Record<string, unknown>;
}

export type RecordSignalResult =
  | { recorded: true; signalId: string; caseOpened: boolean; caseId: string | null; teacherState: TeacherRiskState }
  | { recorded: false; existing: true; caseId: string | null };

/**
 * Catat signal (idempoten) + evaluasi pembuatan case sesuai §6.
 * Tidak pernah mengubah status finansial apa pun.
 */
export async function recordRiskSignal(
  input: RecordSignalInput,
): Promise<RecordSignalResult> {
  // ── Idempotensi: signal sama (type+dedupeKey) tidak dobel ──
  const existing = await db.teacherRiskSignal.findUnique({
    where: { signalType_dedupeKey: { signalType: input.signalType, dedupeKey: input.dedupeKey } },
    select: { id: true, riskCaseId: true },
  });
  if (existing) {
    return { recorded: false, existing: true, caseId: existing.riskCaseId };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // ── §6: keputusan pembuatan case ──
      let decision: "NONE" | "CASE" | "RESTRICT";
      if (input.severity === "LOW") decision = "NONE";
      else if (input.severity === "HIGH") decision = "CASE";
      else if (input.severity === "CRITICAL") decision = "RESTRICT";
      else decision = await shouldOpenCaseForMedium(input.teacherId, tx);

      let caseId: string | null = null;
      let caseOpened = false;

      if (decision !== "NONE") {
        const active = await tx.teacherRiskCase.findFirst({
          where: { teacherId: input.teacherId, status: { in: ["REVIEW", "RESTRICTED"] } },
          select: { id: true, severity: true },
        });
        if (active) {
          caseId = active.id;
          // Eskalasi severity (max) — tidak pernah menurunkan.
          const escalated = severityRank(input.severity) > severityRank(active.severity)
            ? input.severity
            : active.severity;
          if (escalated !== active.severity || (decision === "RESTRICT" && (await tx.teacherRiskCase.findUnique({ where: { id: active.id }, select: { status: true } }))?.status !== "RESTRICTED")) {
            await tx.teacherRiskCase.updateMany({
              where: { id: active.id },
              data: {
                severity: escalated,
                ...(decision === "RESTRICT" ? { status: "RESTRICTED" } : {}),
              },
            });
          }
        } else {
          const created = await tx.teacherRiskCase.create({
            data: {
              teacherId: input.teacherId,
              status: decision === "RESTRICT" ? "RESTRICTED" : "REVIEW",
              severity: input.severity,
              reason: `Signal ${input.signalType} memenuhi ambang pembuatan case.`,
              openedAt: new Date(),
            },
            select: { id: true },
          });
          caseId = created.id;
          caseOpened = true;
        }

        const signal = await tx.teacherRiskSignal.create({
          data: {
            teacherId: input.teacherId,
            riskCaseId: caseId,
            signalType: input.signalType,
            severity: input.severity,
            dedupeKey: input.dedupeKey,
            evidence: (input.evidence ?? {}) as Prisma.InputJsonValue,
            detectedAt: new Date(),
          },
          select: { id: true },
        });

        await tx.teacherRiskAction.create({
          data: {
            teacherId: input.teacherId,
            riskCaseId: caseId,
            actionType: caseOpened ? "CASE_OPENED" : "SIGNAL_RECORDED",
            actorType: "SYSTEM",
            reason: `Signal ${input.signalType} (${input.severity})`,
          },
        });

        if (caseOpened) {
          await auditCommission(
            {
              action: "RISK_CASE_OPENED",
              targetUserId: input.teacherId,
              reason: `Case dibuka otomatis dari signal ${input.signalType} (${input.severity})`,
              metadata: { caseId, signalId: signal.id, signalType: input.signalType },
            },
            tx,
          );
        }

        return { signalId: signal.id, caseId, caseOpened };
      }

      // LOW / MEDIUM-belum-berulang: signal tanpa case.
      const signal = await tx.teacherRiskSignal.create({
        data: {
          teacherId: input.teacherId,
          signalType: input.signalType,
          severity: input.severity,
          dedupeKey: input.dedupeKey,
          evidence: (input.evidence ?? {}) as Prisma.InputJsonValue,
          detectedAt: new Date(),
        },
        select: { id: true },
      });
      return { signalId: signal.id, caseId: null, caseOpened: false };
    });

    const teacherState = await getTeacherRiskState(input.teacherId);
    return {
      recorded: true,
      signalId: result.signalId,
      caseOpened: result.caseOpened,
      caseId: result.caseId,
      teacherState,
    };
  } catch (err) {
    if (isP2002(err)) {
      // Race — signal sudah tercatat.
      const winner = await db.teacherRiskSignal.findUnique({
        where: { signalType_dedupeKey: { signalType: input.signalType, dedupeKey: input.dedupeKey } },
        select: { riskCaseId: true },
      });
      return { recorded: false, existing: true, caseId: winner?.riskCaseId ?? null };
    }
    throw err;
  }
}

function severityRank(s: RiskSeverity): number {
  return { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }[s] ?? 0;
}

/**
 * MEDIUM → case hanya bila berulang: hitung signal MEDIUM 30 hari terakhir.
 */
async function shouldOpenCaseForMedium(teacherId: string, tx: DbClient): Promise<"NONE" | "CASE"> {
  const min = riskMediumRepeatMin();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const count = await tx.teacherRiskSignal.count({
    where: { teacherId, severity: "MEDIUM", createdAt: { gte: since } },
  });
  return count >= min ? "CASE" : "NONE";
}

// Export a wrapped severity decision that includes the MEDIUM repeat check.
export async function evaluateCaseDecision(
  teacherId: string,
  severity: RiskSeverity,
): Promise<"NONE" | "CASE" | "RESTRICT"> {
  if (severity === "LOW") return "NONE";
  if (severity === "HIGH") return "CASE";
  if (severity === "CRITICAL") return "RESTRICT";
  return shouldOpenCaseForMedium(teacherId, db);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE & LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

/** State risiko guru saat ini (dari case aktif). NORMAL bila tidak ada case aktif. */
export async function getTeacherRiskState(teacherId: string): Promise<TeacherRiskState> {
  const active = await db.teacherRiskCase.findFirst({
    where: { teacherId, status: { in: ["REVIEW", "RESTRICTED"] } },
    orderBy: { openedAt: "desc" },
    select: { status: true },
  });
  if (!active) return "NORMAL";
  return active.status === "RESTRICTED" ? "RESTRICTED" : "REVIEW";
}

/**
 * Keputusan admin (spec §12): CLEAR / RESTRICT / KEEP_REVIEW.
 * Wajib reason + actorId. Append-only: case di-update + RiskAction + audit.
 */
export async function resolveRiskCase(input: {
  caseId: string;
  decision: "CLEAR" | "RESTRICT" | "KEEP_REVIEW";
  adminUserId: string;
  reason: string;
}): Promise<{ ok: true; caseId: string; newStatus: string } | { ok: false; error: "NOT_FOUND" | "INVALID_STATE" | "REASON_REQUIRED" }> {
  if (!input.reason.trim()) return { ok: false, error: "REASON_REQUIRED" };

  const riskCase = await db.teacherRiskCase.findUnique({
    where: { id: input.caseId },
    select: { id: true, teacherId: true, status: true, resolvedAt: true, resolvedBy: true },
  });
  if (!riskCase) return { ok: false, error: "NOT_FOUND" };
  if (riskCase.status === "CLEARED") return { ok: false, error: "INVALID_STATE" };

  const now = new Date();
  const newStatus = input.decision === "CLEAR" ? "CLEARED" : input.decision === "RESTRICT" ? "RESTRICTED" : riskCase.status;

  await db.$transaction(async (tx) => {
    await tx.teacherRiskCase.update({
      where: { id: input.caseId },
      data: {
        status: newStatus,
        resolvedAt: input.decision === "CLEAR" ? now : riskCase.resolvedAt,
        resolvedBy: input.decision === "CLEAR" ? input.adminUserId : riskCase.resolvedBy,
        resolution: input.decision === "CLEAR" ? "CLEARED" : input.reason.slice(0, 200),
      },
    });

    await tx.teacherRiskAction.create({
      data: {
        teacherId: riskCase.teacherId,
        riskCaseId: input.caseId,
        actionType:
          input.decision === "CLEAR"
            ? "CLEARED"
            : input.decision === "RESTRICT"
              ? "RESTRICTED"
              : "CASE_REVIEWED",
        actorType: "ADMIN",
        actorId: input.adminUserId,
        reason: input.reason.slice(0, 500),
      },
    });

    await auditCommission(
      {
        actorUserId: input.adminUserId,
        action: input.decision === "CLEAR" ? "RISK_CASE_CLEARED" : input.decision === "RESTRICT" ? "RISK_CASE_RESTRICTED" : "RISK_CASE_REVIEWED",
        targetUserId: riskCase.teacherId,
        reason: input.reason,
        metadata: { caseId: input.caseId, decision: input.decision },
      },
      tx,
    );
  });

  return { ok: true, caseId: input.caseId, newStatus };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYOUT SAFETY GATE (§7/§8)
// ═══════════════════════════════════════════════════════════════════════════════

export type RiskGateResult =
  | { allowed: true; state: TeacherRiskState }
  | { allowed: false; state: TeacherRiskState; reason: string };

/**
 * Gate sebelum payout BARU dikirim ke provider.
 * - NORMAL → lanjut.
 * - REVIEW → hold aman (dana tetap terkunci, TIDAK dikirim, TIDAK dikembalikan).
 * - RESTRICTED → blokir pengiriman baru (dana tetap terpelihara).
 * BUKAN reconciliation — hold terpisah dari RECONCILIATION_REQUIRED.
 */
export async function evaluateRiskGate(teacherId: string): Promise<RiskGateResult> {
  const state = await getTeacherRiskState(teacherId);
  if (state === "NORMAL") return { allowed: true, state };
  if (state === "RESTRICTED") {
    return { allowed: false, state, reason: "Guru sedang dibatasi (RESTRICTED) — pengiriman payout baru diblokir." };
  }
  return { allowed: false, state, reason: "Guru dalam review (REVIEW) — payout ditahan aman." };
}
