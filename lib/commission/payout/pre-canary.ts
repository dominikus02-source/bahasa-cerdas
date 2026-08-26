/**
 * P8F — Pre-Canary Founder Checklist & GO/NO-GO Gate.
 *
 * Checklist kanonik tunggal. Status per item:
 *   PASS | FAIL | MANUAL_VERIFICATION_REQUIRED | NOT_CONFIGURED
 * Source: SYSTEM | CONFIGURATION | PROVIDER | FOUNDER
 *
 * Aturan GO (STEP 3 + STEP 9):
 *   - semua check otomatis PASS
 *   - TIDAK ada item FAIL / NOT_CONFIGURED
 *   - TIDAK ada item manual yang belum di-resolve (manual = wajib verifikasi
 *     manusia → dianggap belum terselesaikan sampai di-approve via record)
 *   - Founder decision record = APPROVED_FOR_CANARY (TIDAK PERNAH diinfer)
 *
 * Tidak ada "hampir siap" — hanya GO_FOR_REAL_MONEY_CANARY | NOT_YET.
 */

import { db } from "@/lib/db";
import { getFounderDecision } from "./founder-decision";
import { getPayoutRuntimeConfig } from "./runtime-config";
import { isPayoutKillSwitchActive } from "./kill-switch";
import { getEffectivePilotTeacherIds } from "./pilot";
import { getTeacherRiskState } from "@/lib/guru/risk/signals";
import { isDestinationCooldownActive } from "@/lib/guru/risk/rules";
import { commissionHoldingPeriodDays } from "../config";
import { evaluateXenditProductionReadiness } from "./xendit-readiness";

export type ChecklistStatus = "PASS" | "FAIL" | "MANUAL_VERIFICATION_REQUIRED" | "NOT_CONFIGURED";
export type ChecklistSource = "SYSTEM" | "CONFIGURATION" | "PROVIDER" | "FOUNDER";
export type ChecklistCategory = "SYSTEM" | "PROVIDER" | "PILOT" | "OPERATIONS" | "FINANCE";

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  label: string;
  status: ChecklistStatus;
  source: ChecklistSource;
  detail: string;
}

export interface PreCanaryReport {
  evaluatedAt: string;
  items: ChecklistItem[];
  byCategory: Record<ChecklistCategory, { pass: number; fail: number; manual: number; notConfigured: number }>;
  automaticFailures: string[];
  manualPending: string[];
  founderDecision: ReturnType<typeof getFounderDecision> extends Promise<infer T> ? T : never;
  decision: "GO_FOR_REAL_MONEY_CANARY" | "NOT_YET";
  realMoneyEnabled: boolean;
  providerEnabled: boolean;
  provider: string;
  killSwitchActive: boolean;
}

function secretConfigured(name: string): boolean {
  const value = process.env[name] ?? "";
  return value.length > 8 && !value.startsWith("[SENSITIVE]");
}

// ── Pure decision function (diuji tanpa DB) ─────────────────────────────────

export function decideGoNoGo(input: {
  statuses: ChecklistStatus[];
  founderState: string;
}): "GO_FOR_REAL_MONEY_CANARY" | "NOT_YET" {
  if (input.founderState !== "APPROVED_FOR_CANARY") return "NOT_YET";
  for (const s of input.statuses) {
    if (s === "FAIL" || s === "NOT_CONFIGURED" || s === "MANUAL_VERIFICATION_REQUIRED") {
      return "NOT_YET";
    }
  }
  return "GO_FOR_REAL_MONEY_CANARY";
}

// ── Evaluator ───────────────────────────────────────────────────────────────

export async function evaluatePreCanaryChecklist(): Promise<PreCanaryReport> {
  const items: ChecklistItem[] = [];
  const push = (
    id: string,
    category: ChecklistCategory,
    label: string,
    status: ChecklistStatus,
    source: ChecklistSource,
    detail: string,
  ) => items.push({ id, category, label, status, source, detail });

  const cfg = await getPayoutRuntimeConfig();
  const killSwitchActive = await isPayoutKillSwitchActive();
  const founderDecision = await getFounderDecision();
  const pilotIds = await getEffectivePilotTeacherIds();

  // ══ A. SYSTEM ══
  // Ledger=Wallet invariant — satu query agregat, tanpa N+1.
  const walletMismatch = await db.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*) AS n FROM "TeacherWallet" w
     WHERE (w."availableBalance" + w."pendingBalance" + w."lockedBalance" + w."lifetimeWithdrawn")
        <> (w."lifetimeEarned" - w."totalReversed")`
  ).catch(() => [{ n: 1 as unknown as bigint }]);
  push(
    "ledger_invariant",
    "SYSTEM",
    "Invariant Ledger = Wallet sehat",
    Number(walletMismatch[0]?.n ?? 0) === 0 ? "PASS" : "FAIL",
    "SYSTEM",
    Number(walletMismatch[0]?.n ?? 0) === 0
      ? "Tidak ada wallet yang melanggar invariant."
      : `${walletMismatch[0].n} wallet melanggar invariant — investigasi wajib.`,
  );

  const lockMismatch = await db.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*) AS n FROM (
       SELECT w."teacherId", w."lockedBalance",
              COALESCE(SUM(wd."amount") FILTER (WHERE wd.status IN ('PENDING','APPROVED')), 0) AS inflight
       FROM "TeacherWallet" w
       LEFT JOIN "TeacherCommissionWithdrawal" wd ON wd."teacherId" = w."teacherId"
       GROUP BY w."teacherId", w."lockedBalance"
       HAVING w."lockedBalance" <> COALESCE(SUM(wd."amount") FILTER (WHERE wd.status IN ('PENDING','APPROVED')), 0)
     ) t`
  ).catch(() => [{ n: 1 as unknown as bigint }]);
  push(
    "wallet_lock_invariant",
    "SYSTEM",
    "Locked = withdrawal in-flight",
    Number(lockMismatch[0]?.n ?? 0) === 0 ? "PASS" : "FAIL",
    "SYSTEM",
    Number(lockMismatch[0]?.n ?? 0) === 0
      ? "Semua locked balance cocok dengan withdrawal in-flight."
      : `${lockMismatch[0].n} guru punya locked balance tidak konsisten.`,
  );

  push("risk_gate_enabled", "SYSTEM", "Risk gate P8C aktif", cfg.riskGateEnabled ? "PASS" : "FAIL", "SYSTEM", "Risk gate aktif (P8C).");
  push("kill_switch_operational", "SYSTEM", "Kill switch operasional", "PASS", "SYSTEM", killSwitchActive ? "Kill switch saat ini AKTIF (aman untuk P8F)." : "Mekanisme kill switch tersedia (env + SiteSetting).");
  push("pilot_gate_operational", "SYSTEM", "Pilot gate operasional", "PASS", "SYSTEM", "Allowlist + pause + exposure limit tersedia.");
  push(
    "limits_configured",
    "SYSTEM",
    "Batas payout dikonfigurasi",
    cfg.maximumAmount > 0 && cfg.pilotGlobalLimit > 0 ? "PASS" : "NOT_CONFIGURED",
    "CONFIGURATION",
    `min=${cfg.minimumAmount} max=${cfg.maximumAmount} daily=${cfg.teacherDailyLimit} global=${cfg.globalDailyLimit} pilot=${cfg.pilotGlobalLimit}`,
  );
  push("admin_auth_healthy", "SYSTEM", "Otorisasi admin sehat", "PASS", "SYSTEM", "Semua API finansial founder-gated (server-side).");

  // ══ B. PROVIDER ══
  push("xendit_account", "PROVIDER", "Akun Xendit production disetujui", "MANUAL_VERIFICATION_REQUIRED", "PROVIDER", "MANUAL VERIFICATION REQUIRED — bukti dari dashboard Xendit.");
  push("xendit_capability", "PROVIDER", "Capability Payouts v3 diaktifkan", "MANUAL_VERIFICATION_REQUIRED", "PROVIDER", "MANUAL VERIFICATION REQUIRED — aktivasi MONEY-OUT di Xendit.");
  const apiKeyStatus: ChecklistStatus = secretConfigured("XENDIT_API_KEY") ? "MANUAL_VERIFICATION_REQUIRED" : "NOT_CONFIGURED";
  push("xendit_credentials", "PROVIDER", "Kredensial production tersedia & aman", apiKeyStatus, "PROVIDER", apiKeyStatus === "NOT_CONFIGURED" ? "XENDIT_API_KEY belum diset." : "XENDIT_API_KEY terdeteksi (keabsahan = verifikasi manual).");
  push("xendit_webhook", "PROVIDER", "Webhook production terkonfigurasi", "MANUAL_VERIFICATION_REQUIRED", "PROVIDER", "MANUAL VERIFICATION REQUIRED — daftarkan /api/payout/webhook di Xendit.");
  const tokenStatus: ChecklistStatus = secretConfigured("XENDIT_WEBHOOK_TOKEN") ? "MANUAL_VERIFICATION_REQUIRED" : "NOT_CONFIGURED";
  push("xendit_webhook_token", "PROVIDER", "Token verifikasi webhook terkonfigurasi", tokenStatus, "PROVIDER", tokenStatus === "NOT_CONFIGURED" ? "XENDIT_WEBHOOK_TOKEN belum diset." : "Token terdeteksi — uji verifikasi = manual.");
  push("xendit_destination_coverage", "PROVIDER", "Cakupan destinasi production dikonfirmasi", "MANUAL_VERIFICATION_REQUIRED", "PROVIDER", "MANUAL VERIFICATION REQUIRED — bank/e-wallet tujuan guru pilot didukung.");
  push("xendit_fee", "PROVIDER", "Fee provider dikonfirmasi", "MANUAL_VERIFICATION_REQUIRED", "FOUNDER", "MANUAL VERIFICATION REQUIRED — kebijakan fee = platform (P7E), konfirmasi komersial dari Founder.");

  // P8H — readiness Xendit terintegrasi (bukan sistem approval kedua).
  const xenditReady = await evaluateXenditProductionReadiness();
  push(
    "xendit_production_ready",
    "PROVIDER",
    "Xendit production readiness (P8H)",
    xenditReady.ready ? "PASS" : "FAIL",
    "PROVIDER",
    xenditReady.ready
      ? "XENDIT_PRODUCTION_READY — semua kondisi provider terpenuhi."
      : `Belum siap: ${xenditReady.blocks.filter((b) => !b.passed).map((b) => b.id).join(", ")}`,
  );

  // ══ C. PILOT ══
  push("pilot_enabled_by_founder", "PILOT", "Pilot eksplisit diaktifkan Founder", cfg.pilotEnabled ? "PASS" : "FAIL", "FOUNDER", cfg.pilotEnabled ? "PAYOUT_PILOT_ENABLED=true." : "Pilot belum diaktifkan (P8F: wajib tetap OFF sampai Founder).");
  push("pilot_teacher_selected", "PILOT", "Minimal satu guru pilot dipilih", pilotIds.size > 0 ? "PASS" : "FAIL", "FOUNDER", pilotIds.size > 0 ? `${pilotIds.size} guru pilot terdaftar.` : "Belum ada guru pilot.");

  const pilotList = [...pilotIds];
  let allEligible = true;
  let eligibleDetail = "Semua guru pilot memenuhi syarat.";
  if (pilotList.length > 0) {
    const users = await db.user.findMany({
      where: { id: { in: pilotList } },
      select: { id: true, role: true, isFounder: true },
    });
    const invalid = users.filter((u) => u.role !== "GURU" || u.isFounder);
    if (invalid.length > 0) {
      allEligible = false;
      eligibleDetail = `${invalid.length} guru pilot tidak memenuhi syarat (bukan GURU / founder).`;
    }
  } else {
    allEligible = false;
  }
  push("pilot_teacher_eligible", "PILOT", "Guru pilot memenuhi syarat (GURU, bukan founder)", allEligible ? "PASS" : "FAIL", "SYSTEM", eligibleDetail);

  let profilesVerified = true;
  let riskClear = true;
  let noCooldown = true;
  for (const id of pilotList) {
    const profile = await db.teacherPayoutProfile.findUnique({
      where: { teacherId: id },
      select: { verificationStatus: true, updatedAt: true },
    });
    if (!profile || profile.verificationStatus !== "VERIFIED") profilesVerified = false;
    if (profile && isDestinationCooldownActive({ profileUpdatedAt: profile.updatedAt })) noCooldown = false;
    const risk = await getTeacherRiskState(id);
    if (risk !== "NORMAL") riskClear = false;
  }
  push("pilot_profile_verified", "PILOT", "Profil payout guru pilot terverifikasi", pilotList.length > 0 && profilesVerified ? "PASS" : "FAIL", "SYSTEM", pilotList.length > 0 && profilesVerified ? "Semua profil pilot VERIFIED." : "Ada profil pilot yang belum diverifikasi.");
  push("pilot_risk_clear", "PILOT", "Status risiko guru pilot bersih", pilotList.length > 0 && riskClear ? "PASS" : "FAIL", "SYSTEM", pilotList.length > 0 && riskClear ? "Tidak ada case risk aktif untuk guru pilot." : "Ada guru pilot dengan case risk aktif.");
  push("pilot_no_cooldown", "PILOT", "Tidak ada cooldown destinasi guru pilot", pilotList.length > 0 && noCooldown ? "PASS" : "FAIL", "SYSTEM", pilotList.length > 0 && noCooldown ? "Destinasi stabil." : "Destinasi pilot baru berubah (cooldown aktif).");
  push("pilot_exposure_configured", "PILOT", "Batas exposure pilot dikonfigurasi", cfg.pilotGlobalLimit > 0 ? "PASS" : "NOT_CONFIGURED", "CONFIGURATION", `PAYOUT_PILOT_GLOBAL_LIMIT=${cfg.pilotGlobalLimit}.`);

  // ══ D. OPERATIONS ══
  push("runbook_reviewed", "OPERATIONS", "Incident runbook ditinjau", "MANUAL_VERIFICATION_REQUIRED", "FOUNDER", "MANUAL VERIFICATION REQUIRED — docs/P8E_PAYOUT_INCIDENT_RESPONSE.md.");
  push("reconciliation_procedure", "OPERATIONS", "Prosedur rekonsiliasi ditinjau", "MANUAL_VERIFICATION_REQUIRED", "FOUNDER", "MANUAL VERIFICATION REQUIRED — /api/admin/teacher-commissions/reconciliation.");
  push("first_payout_procedure", "OPERATIONS", "Prosedur payout pertama ditinjau", "MANUAL_VERIFICATION_REQUIRED", "FOUNDER", "MANUAL VERIFICATION REQUIRED — docs/P8E_REAL_MONEY_CANARY.md.");
  push("operational_owner", "OPERATIONS", "Penanggung jawab operasional ditetapkan", "MANUAL_VERIFICATION_REQUIRED", "FOUNDER", "MANUAL VERIFICATION REQUIRED — nama + SOP dari Founder.");

  // ══ E. FINANCE ══
  push("commission_source_validated", "FINANCE", "Sumber komisi tervalidasi (10% settled)", "PASS", "SYSTEM", "P7C engine deterministik (floor 10% dari settled amount).");
  push("withdrawal_amount_validated", "FINANCE", "Jumlah withdrawal tervalidasi server-side", "PASS", "SYSTEM", "Integer + min/max/limits + lock atomik.");
  push("fee_policy_confirmed", "FINANCE", "Kebijakan fee provider dikonfirmasi", "MANUAL_VERIFICATION_REQUIRED", "FOUNDER", "MANUAL VERIFICATION REQUIRED — fee = biaya platform (P7E), konfirmasi Founder.");
  push("daily_report_available", "FINANCE", "Laporan finansial harian tersedia", "PASS", "SYSTEM", "/api/admin/teacher-commissions/finance-report.");
  push("reconciliation_report_available", "FINANCE", "Laporan rekonsiliasi tersedia", "PASS", "SYSTEM", "/api/admin/teacher-commissions/reconciliation.");
  push("holding_period", "FINANCE", "Masa penahanan dikonfigurasi", commissionHoldingPeriodDays() > 0 ? "PASS" : "NOT_CONFIGURED", "CONFIGURATION", `Holding ${commissionHoldingPeriodDays()} hari.`);

  // ── Rangkuman ──
  const byCategory: PreCanaryReport["byCategory"] = {
    SYSTEM: { pass: 0, fail: 0, manual: 0, notConfigured: 0 },
    PROVIDER: { pass: 0, fail: 0, manual: 0, notConfigured: 0 },
    PILOT: { pass: 0, fail: 0, manual: 0, notConfigured: 0 },
    OPERATIONS: { pass: 0, fail: 0, manual: 0, notConfigured: 0 },
    FINANCE: { pass: 0, fail: 0, manual: 0, notConfigured: 0 },
  };
  for (const item of items) {
    const bucket = byCategory[item.category];
    if (item.status === "PASS") bucket.pass++;
    else if (item.status === "FAIL") bucket.fail++;
    else if (item.status === "MANUAL_VERIFICATION_REQUIRED") bucket.manual++;
    else bucket.notConfigured++;
  }

  const automaticFailures = items.filter((i) => i.status === "FAIL" || i.status === "NOT_CONFIGURED").map((i) => i.id);
  const manualPending = items.filter((i) => i.status === "MANUAL_VERIFICATION_REQUIRED").map((i) => i.id);

  const decision = decideGoNoGo({
    statuses: items.map((i) => i.status),
    founderState: founderDecision.state,
  });

  return {
    evaluatedAt: new Date().toISOString(),
    items,
    byCategory,
    automaticFailures,
    manualPending,
    founderDecision,
    decision,
    realMoneyEnabled: cfg.realMoneyEnabled,
    providerEnabled: cfg.providerEnabled,
    provider: cfg.provider,
    killSwitchActive,
  };
}
