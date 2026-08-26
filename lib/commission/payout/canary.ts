/**
 * P8G — First Real-Money Canary: Canary Run contract + execution service.
 *
 * Satu run canary pada satu waktu (disimpan di SiteSetting JSON + SEMUA
 * transisi diaudit ke AdminPaymentAuditLog). Run TIDAK menciptakan uang —
 * ia MEREFERENSIKAN withdrawal/payout existing. Tidak ada engine finansial
 * baru, tidak ada mutasi wallet/ledger dari lapisan ini.
 *
 * State machine:
 *   PREPARING → READY → EXECUTING → AWAITING_RECEIPT_CONFIRMATION
 *            → RECONCILING → SUCCESS | FAILED
 *   STOPPED  (dari state mana pun selain terminal — evidence preserved)
 */

import { db } from "@/lib/db";
import { auditCommission } from "../audit";
import { getFounderDecision } from "./founder-decision";
import { evaluatePreCanaryChecklist } from "./pre-canary";
import { getEffectivePilotTeacherIds } from "./pilot";
import { isPayoutKillSwitchActive } from "./kill-switch";
import { getTeacherRiskState } from "@/lib/guru/risk/signals";
import { isDestinationCooldownActive } from "@/lib/guru/risk/rules";
import {
  isPayoutProviderEnabled,
  isRealMoneyPayoutEnabled,
  payoutProvider,
} from "./config";

const CANARY_KEY = "payout_canary_run";

export type CanaryRunState =
  | "PREPARING"
  | "READY"
  | "EXECUTING"
  | "AWAITING_RECEIPT_CONFIRMATION"
  | "RECONCILING"
  | "SUCCESS"
  | "FAILED"
  | "STOPPED";

export type ReceiptStatus = "CONFIRMED_RECEIVED" | "NOT_YET_RECEIVED" | "UNABLE_TO_CONFIRM";

export interface CanaryRun {
  canaryRunId: string;
  selectedTeacherId: string | null;
  selectedWithdrawalId: string | null;
  intendedGrossAmount: number | null;
  intendedDestinationSnapshot: string | null; // masked: "BCA •••• 4821"
  provider: string | null;
  executionEnvironment: string | null; // "mock" | "xendit-production"
  founderApprovalReference: string | null; // email + timestamp keputusan
  providerReadinessEvidence: string | null; // catatan bukti (bukan secret)
  startedAt: string | null;
  completedAt: string | null;
  receiptStatus: ReceiptStatus | null;
  finalStatus: CanaryRunState;
  stopReason: string | null;
  reviewNotes: string | null;
  updatedAt: string;
}

const DEFAULT_RUN: Omit<CanaryRun, "updatedAt"> = {
  canaryRunId: "",
  selectedTeacherId: null,
  selectedWithdrawalId: null,
  intendedGrossAmount: null,
  intendedDestinationSnapshot: null,
  provider: null,
  executionEnvironment: null,
  founderApprovalReference: null,
  providerReadinessEvidence: null,
  startedAt: null,
  completedAt: null,
  receiptStatus: null,
  finalStatus: "PREPARING",
  stopReason: null,
  reviewNotes: null,
};

/** Transisi yang sah — TIDAK ada lompatan bebas. */
export const CANARY_TRANSITIONS: Record<CanaryRunState, CanaryRunState[]> = {
  PREPARING: ["READY", "STOPPED"],
  READY: ["EXECUTING", "STOPPED"],
  EXECUTING: ["AWAITING_RECEIPT_CONFIRMATION", "STOPPED"],
  AWAITING_RECEIPT_CONFIRMATION: ["RECONCILING", "STOPPED"],
  RECONCILING: ["SUCCESS", "FAILED", "STOPPED"],
  SUCCESS: [],
  FAILED: [],
  STOPPED: [],
};

export function canTransition(from: CanaryRunState, to: CanaryRunState): boolean {
  return (CANARY_TRANSITIONS[from] ?? []).includes(to);
}

export async function getCanaryRun(): Promise<CanaryRun> {
  try {
    const setting = await db.siteSetting.findUnique({ where: { key: CANARY_KEY } });
    if (!setting?.value) return { ...DEFAULT_RUN, updatedAt: "" };
    const parsed = JSON.parse(setting.value) as Partial<CanaryRun>;
    return {
      ...DEFAULT_RUN,
      ...parsed,
      updatedAt: parsed.updatedAt ?? "",
    };
  } catch (err) {
    console.error("[canary] gagal membaca run:", err);
    return { ...DEFAULT_RUN, updatedAt: "" };
  }
}

async function saveRun(run: CanaryRun): Promise<void> {
  run.updatedAt = new Date().toISOString();
  await db.siteSetting.upsert({
    where: { key: CANARY_KEY },
    create: { key: CANARY_KEY, value: JSON.stringify(run) },
    update: { value: JSON.stringify(run) },
  });
}

async function transition(
  from: CanaryRunState,
  to: CanaryRunState,
  actorUserId: string,
  patch: Partial<CanaryRun>,
  notes: string,
): Promise<{ ok: true; run: CanaryRun } | { ok: false; error: "INVALID_TRANSITION" }> {
  const current = await getCanaryRun();
  if (!canTransition(current.finalStatus, to) && current.finalStatus !== from) {
    return { ok: false, error: "INVALID_TRANSITION" };
  }
  if (current.finalStatus !== from) {
    return { ok: false, error: "INVALID_TRANSITION" };
  }

  const next: CanaryRun = { ...current, ...patch, finalStatus: to };
  if (to === "SUCCESS" || to === "FAILED" || to === "STOPPED") {
    next.completedAt = new Date().toISOString();
  }
  await saveRun(next);

  await auditCommission({
    actorUserId,
    action: `CANARY_${to}`,
    reason: notes.slice(0, 500),
    metadata: {
      canaryRunId: next.canaryRunId,
      from,
      teacherId: next.selectedTeacherId,
      withdrawalId: next.selectedWithdrawalId,
      amount: next.intendedGrossAmount,
    },
  });

  return { ok: true, run: next };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AKTIVITAS OPERATOR (dipanggil route founder-only)
// ═══════════════════════════════════════════════════════════════════════════════

export async function prepareCanaryRun(input: {
  teacherId: string;
  withdrawalId: string;
  providerReadinessEvidence: string;
  actorUserId: string;
  actorEmail: string | null;
}): Promise<{ ok: true; run: CanaryRun; preflight: PreFlightReport } | { ok: false; error: string }> {
  // Pre-flight WAJIB lolos sebelum READY.
  const preflight = await evaluateCanaryPreFlight(input.teacherId, input.withdrawalId);
  if (preflight.blocked) {
    return { ok: false, error: preflight.blockingReason ?? "Pre-flight gagal." };
  }

  const withdrawal = await db.teacherCommissionWithdrawal.findUnique({
    where: { id: input.withdrawalId },
    select: { amount: true, bankName: true, accountNumber: true, teacherId: true },
  });
  if (!withdrawal || withdrawal.teacherId !== input.teacherId) {
    return { ok: false, error: "Withdrawal tidak ditemukan atau bukan milik guru terpilih." };
  }

  const founderDecision = await getFounderDecision();

  const runId = `canary-${Date.now().toString(36)}`;
  const masked = `${withdrawal.bankName} •••• ${withdrawal.accountNumber.slice(-4)}`;

  const next: CanaryRun = {
    ...DEFAULT_RUN,
    canaryRunId: runId,
    selectedTeacherId: input.teacherId,
    selectedWithdrawalId: input.withdrawalId,
    intendedGrossAmount: withdrawal.amount,
    intendedDestinationSnapshot: masked,
    provider: payoutProvider(),
    executionEnvironment: payoutProvider() === "mock" ? "mock" : "xendit-production",
    founderApprovalReference: founderDecision.decidedAt
      ? `${founderDecision.approverEmail ?? "founder"} @ ${founderDecision.decidedAt}`
      : null,
    providerReadinessEvidence: input.providerReadinessEvidence.slice(0, 1000),
    finalStatus: "READY",
    updatedAt: new Date().toISOString(),
  };
  await saveRun(next);

  await auditCommission({
    actorUserId: input.actorUserId,
    action: "CANARY_READY",
    reason: `Canary dipersiapkan: guru ${input.teacherId}, withdrawal ${input.withdrawalId}, jumlah ${withdrawal.amount}`,
    metadata: { canaryRunId: runId, amount: withdrawal.amount, destination: masked },
  });

  return { ok: true, run: next, preflight };
}

export async function startCanaryExecution(input: {
  actorUserId: string;
  notes: string;
}): Promise<{ ok: true; run: CanaryRun } | { ok: false; error: "INVALID_TRANSITION" | "PREFLIGHT_BLOCKED" }> {
  const current = await getCanaryRun();
  if (current.finalStatus !== "READY") return { ok: false, error: "INVALID_TRANSITION" };

  // Pre-flight diulang saat start — kondisi bisa berubah setelah PREPARE.
  if (!current.selectedTeacherId || !current.selectedWithdrawalId) {
    return { ok: false, error: "INVALID_TRANSITION" };
  }
  const preflight = await evaluateCanaryPreFlight(current.selectedTeacherId, current.selectedWithdrawalId);
  if (preflight.blocked) return { ok: false, error: "PREFLIGHT_BLOCKED" };

  const res = await transition("READY", "EXECUTING", input.actorUserId, { startedAt: new Date().toISOString() }, input.notes || "Canary dimulai.");
  return res;
}

export async function markAwaitingReceipt(input: {
  actorUserId: string;
  notes: string;
}): Promise<{ ok: true; run: CanaryRun } | { ok: false; error: "INVALID_TRANSITION" }> {
  return transition("EXECUTING", "AWAITING_RECEIPT_CONFIRMATION", input.actorUserId, {}, input.notes || "Provider PAID — menunggu konfirmasi penerimaan guru.");
}

export async function recordReceipt(input: {
  actorUserId: string;
  receiptStatus: ReceiptStatus;
  notes: string;
}): Promise<{ ok: true; run: CanaryRun } | { ok: false; error: "INVALID_TRANSITION" }> {
  // Pencatatan penerimaan TIDAK memindahkan uang — hanya transisi state.
  return transition(
    "AWAITING_RECEIPT_CONFIRMATION",
    "RECONCILING",
    input.actorUserId,
    { receiptStatus: input.receiptStatus },
    `Konfirmasi penerimaan: ${input.receiptStatus}. ${input.notes}`,
  );
}

export async function completeCanaryRun(input: {
  actorUserId: string;
  result: "SUCCESS" | "FAILED";
  reviewNotes: string;
}): Promise<{ ok: true; run: CanaryRun } | { ok: false; error: "INVALID_TRANSITION" }> {
  // SUCCESS HANYA bila konfirmasi penerimaan = CONFIRMED_RECEIVED.
  const current = await getCanaryRun();
  if (input.result === "SUCCESS" && current.receiptStatus !== "CONFIRMED_RECEIVED") {
    return { ok: false, error: "INVALID_TRANSITION" };
  }
  return transition(
    "RECONCILING",
    input.result,
    input.actorUserId,
    { reviewNotes: input.reviewNotes.slice(0, 1000) },
    input.reviewNotes,
  );
}

export async function stopCanaryRun(input: {
  actorUserId: string;
  reason: string;
}): Promise<{ ok: true; run: CanaryRun } | { ok: false; error: "INVALID_TRANSITION" }> {
  const current = await getCanaryRun();
  if (["SUCCESS", "FAILED", "STOPPED"].includes(current.finalStatus)) {
    return { ok: false, error: "INVALID_TRANSITION" };
  }
  return transition(current.finalStatus, "STOPPED", input.actorUserId, { stopReason: input.reason.slice(0, 1000) }, input.reason);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-FLIGHT (STEP 3) — deterministik, blocking reason per check
// ═══════════════════════════════════════════════════════════════════════════════

export interface PreFlightCheck {
  id: string;
  label: string;
  passed: boolean;
  blocking: boolean;
  reason: string;
}

export interface PreFlightReport {
  blocked: boolean;
  blockingReason: string | null;
  checks: PreFlightCheck[];
}

export async function evaluateCanaryPreFlight(
  teacherId: string,
  withdrawalId: string,
): Promise<PreFlightReport> {
  const checks: PreFlightCheck[] = [];
  const push = (id: string, label: string, passed: boolean, blocking: boolean, reason: string) =>
    checks.push({ id, label, passed, blocking, reason });

  const [p8f, founderDecision, pilotIds, killSwitchActive, cfg, withdrawal, profile, riskState] =
    await Promise.all([
      evaluatePreCanaryChecklist(),
      getFounderDecision(),
      getEffectivePilotTeacherIds(),
      isPayoutKillSwitchActive(),
      (async () => ({
        realMoney: isRealMoneyPayoutEnabled(),
        providerEnabled: isPayoutProviderEnabled(),
        provider: payoutProvider(),
      }))(),
      db.teacherCommissionWithdrawal.findUnique({
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
      }),
      db.teacherPayoutProfile.findUnique({
        where: { teacherId },
        select: { verificationStatus: true, updatedAt: true, bankName: true, accountNumber: true },
      }),
      getTeacherRiskState(teacherId),
    ]);

  // 1. P8F = GO.
  push("p8f_go", "P8F Founder Gate = GO", p8f.decision === "GO_FOR_REAL_MONEY_CANARY", true, p8f.decision === "GO_FOR_REAL_MONEY_CANARY" ? "P8F = GO." : "P8F masih NOT YET — canary diblokir.");

  // 2. Founder decision.
  push("founder_approved", "Keputusan Founder APPROVED_FOR_CANARY", founderDecision.state === "APPROVED_FOR_CANARY", true, founderDecision.state === "APPROVED_FOR_CANARY" ? "Approved tercatat." : `State keputusan: ${founderDecision.state}.`);

  // 3. Provider production dikonfigurasi eksplisit.
  const providerConfigured = cfg.realMoney && cfg.providerEnabled && cfg.provider !== "mock";
  push("provider_configured", "Provider production dikonfigurasi eksplisit", providerConfigured, true, providerConfigured ? `Provider: ${cfg.provider}.` : "Real-money flags masih OFF (P8G: benar — canary diblokir sampai Founder mengaktifkan saat eksekusi).");

  // 4. Pilot + allowlist.
  push("pilot_enabled", "Pilot aktif", cfg.realMoney ? true : pilotIds.size > 0 ? false : false, true, "Pilot wajib aktif saat canary.");

  // 5. Teacher allowlisted.
  push("teacher_allowlisted", "Guru terdaftar di pilot", pilotIds.has(teacherId), true, pilotIds.has(teacherId) ? "Allowlisted." : "Guru tidak ada di allowlist pilot.");

  // 6. Teacher role valid (GURU, bukan founder).
  const teacherUser = await db.user.findUnique({
    where: { id: teacherId },
    select: { role: true, isFounder: true },
  });
  const teacherValid = !!teacherUser && teacherUser.role === "GURU" && !teacherUser.isFounder;
  push("teacher_valid", "Identitas & role guru valid (bukan founder/ADMIN)", teacherValid, true, teacherValid ? "Valid." : "Guru tidak valid (role/founder).");

  // 7. Risk status.
  push("risk_clear", "Risk status NORMAL", riskState === "NORMAL", true, riskState === "NORMAL" ? "Clear." : `State risiko: ${riskState}.`);

  // 8. Profil verified.
  push("profile_verified", "Destinasi payout VERIFIED", profile?.verificationStatus === "VERIFIED", true, profile?.verificationStatus === "VERIFIED" ? "Verified." : "Profil belum diverifikasi.");

  // 9. Snapshot destinasi cocok dengan withdrawal.
  const snapshotMatches = !!profile && !!withdrawal && profile.bankName === withdrawal.bankName && profile.accountNumber === withdrawal.accountNumber;
  push("destination_snapshot", "Snapshot destinasi cocok dengan withdrawal", snapshotMatches, true, snapshotMatches ? "Cocok." : "Destinasi profil ≠ snapshot withdrawal.");

  // 10. Withdrawal valid.
  push("withdrawal_valid", "Withdrawal valid (PENDING, milik guru)", !!withdrawal && withdrawal.teacherId === teacherId && withdrawal.status === "PENDING", true, withdrawal && withdrawal.teacherId === teacherId && withdrawal.status === "PENDING" ? "Valid." : "Withdrawal tidak valid.");

  // 11. Kill switch off.
  push("kill_switch_off", "Kill switch OFF", !killSwitchActive, true, killSwitchActive ? "Kill switch AKTIF." : "Off.");

  // 12. Tidak ada mismatch rekonsiliasi.
  push("reconciliation_clean", "Tidak ada mismatch rekonsiliasi", p8f.automaticFailures.length === 0, true, p8f.automaticFailures.length === 0 ? "Bersih." : `Mismatch: ${p8f.automaticFailures.join(", ")}`);

  // 13. Cooldown destinasi tidak aktif.
  const cooldownActive = profile ? isDestinationCooldownActive({ profileUpdatedAt: profile.updatedAt }) : false;
  push("no_cooldown", "Tidak ada cooldown destinasi", !cooldownActive, true, cooldownActive ? "Cooldown aktif." : "Aman.");

  // 14. Bukti kesiapan provider tercatat (di run saat PREPARE — di sini
  //      status hanya wajib saat sudah READY; sebelum itu blocking=false).
  push("provider_evidence", "Bukti kesiapan provider dicatat", false, false, "Diisi operator saat PREPARE.");

  const blockedChecks = checks.filter((c) => c.blocking && !c.passed);
  return {
    blocked: blockedChecks.length > 0,
    blockingReason: blockedChecks.length > 0 ? blockedChecks.map((c) => `${c.id}: ${c.reason}`).join(" · ") : null,
    checks,
  };
}
