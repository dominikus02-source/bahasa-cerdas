/**
 * P8H — Xendit Production Readiness Bridge.
 *
 * Jembatan: XENDIT PRODUCTION → BAHASACERDAS → FOUNDER MONEY GATE.
 * TIDAK mengirim payout nyata, TIDAK mengubah flag, TIDAK mengarang bukti.
 *
 * Bagian:
 * 1. validatePayoutProductionConfig() — validasi config TANPA menampilkan nilai secret
 * 2. Readiness evidence record (9 kategori eksternal, PENDING/VERIFIED/REJECTED)
 * 3. evaluateXenditProductionReadiness() — SATU hasil kanonik XENDIT_PRODUCTION_READY
 * 4. evaluatePilotTeacherReadiness() — checklist final guru pilot
 * 5. buildMoneySafetySnapshot() — snapshot read-only untuk keputusan Founder
 * 6. recordFounderConfirmation() — konfirmasi manusia eksplisit (bukan otomatis)
 */

import { db } from "@/lib/db";
import { auditCommission } from "../audit";
import { getFounderDecision } from "./founder-decision";
import { evaluatePreCanaryChecklist } from "./pre-canary";
import { getPayoutRuntimeConfig, getMoneySafetyState } from "./runtime-config";
import { getEffectivePilotTeacherIds } from "./pilot";
import { getTeacherRiskState } from "@/lib/guru/risk/signals";
import { isDestinationCooldownActive } from "@/lib/guru/risk/rules";
import { globalDailyPayoutTotal } from "./safety";
import { payoutPilotGlobalLimit, payoutMinimumAmount } from "./config";
import { pilotDailyPayoutTotal } from "./pilot";

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — PRODUCTION CONFIGURATION VALIDATOR (tanpa nilai secret)
// ═══════════════════════════════════════════════════════════════════════════════

export type ConfigFieldStatus = "CONFIGURED" | "NOT_CONFIGURED" | "INVALID";

export interface ConfigFieldCheck {
  key: string;
  label: string;
  status: ConfigFieldStatus;
  present: boolean;
  detail: string;
}

function secretConfigured(name: string): boolean {
  const value = process.env[name] ?? "";
  return value.length > 8 && !value.startsWith("[SENSITIVE]");
}

export function validatePayoutProductionConfig(): {
  fields: ConfigFieldCheck[];
  overall: ConfigFieldStatus;
} {
  const provider = process.env.PAYOUT_PROVIDER ?? "mock";
  const realMoney = process.env.PAYOUT_REAL_MONEY_ENABLED === "true";
  const providerEnabled = process.env.PAYOUT_PROVIDER_ENABLED === "true";
  const apiVersion = process.env.PAYOUT_XENDIT_API_VERSION ?? "2025-09-01";

  const fields: ConfigFieldCheck[] = [
    {
      key: "provider",
      label: "Provider payout",
      status: provider === "xendit" ? "CONFIGURED" : provider === "mock" ? "NOT_CONFIGURED" : "INVALID",
      present: true,
      detail: `PAYOUT_PROVIDER=${provider}`,
    },
    {
      key: "real_money_flag",
      label: "Flag real money (wajib OFF selama P8H)",
      status: realMoney ? "INVALID" : "CONFIGURED",
      present: true,
      detail: realMoney ? "PAYOUT_REAL_MONEY_ENABLED=true — P8H MELARANG ini aktif." : "OFF (benar untuk P8H).",
    },
    {
      key: "provider_enabled_flag",
      label: "Flag provider enabled (wajib OFF selama P8H)",
      status: providerEnabled ? "INVALID" : "CONFIGURED",
      present: true,
      detail: providerEnabled ? "PAYOUT_PROVIDER_ENABLED=true — P8H MELARANG ini aktif." : "OFF (benar untuk P8H).",
    },
    {
      key: "api_credential",
      label: "Kredensial API Xendit (server-side)",
      status: secretConfigured("XENDIT_API_KEY") ? "CONFIGURED" : "NOT_CONFIGURED",
      present: secretConfigured("XENDIT_API_KEY"),
      detail: secretConfigured("XENDIT_API_KEY") ? "Terdeteksi (nilai tidak pernah ditampilkan)." : "XENDIT_API_KEY belum diset.",
    },
    {
      key: "webhook_token",
      label: "Token verifikasi webhook Xendit",
      status: secretConfigured("XENDIT_WEBHOOK_TOKEN") ? "CONFIGURED" : "NOT_CONFIGURED",
      present: secretConfigured("XENDIT_WEBHOOK_TOKEN"),
      detail: secretConfigured("XENDIT_WEBHOOK_TOKEN") ? "Terdeteksi (nilai tidak pernah ditampilkan)." : "XENDIT_WEBHOOK_TOKEN belum diset.",
    },
    {
      key: "api_version",
      label: "Versi API Xendit",
      status: /^\d{4}-\d{2}-\d{2}$/.test(apiVersion) ? "CONFIGURED" : "INVALID",
      present: true,
      detail: `api-version=${apiVersion}`,
    },
    {
      key: "environment_consistency",
      label: "Konsistensi environment",
      status: realMoney && provider !== "xendit" ? "INVALID" : "CONFIGURED",
      present: true,
      detail: realMoney && provider !== "xendit" ? "Real money ON tapi provider bukan xendit." : "Konsisten.",
    },
  ];

  const overall: ConfigFieldStatus = fields.some((f) => f.status === "INVALID")
    ? "INVALID"
    : fields.every((f) => f.status === "CONFIGURED")
      ? "CONFIGURED"
      : "NOT_CONFIGURED";

  return { fields, overall };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3 — XENDIT READINESS EVIDENCE (auditable, tanpa secret)
// ═══════════════════════════════════════════════════════════════════════════════

export type EvidenceStatus = "PENDING" | "VERIFIED" | "REJECTED";

export const XENDIT_EVIDENCE_CATEGORIES = [
  "BUSINESS_KYB",
  "PAYOUT_CAPABILITY",
  "PRODUCTION_ACCOUNT",
  "PRODUCTION_CREDENTIAL",
  "WEBHOOK",
  "DESTINATION_COVERAGE",
  "PROVIDER_FEE",
  "OPERATIONAL_CONTACT",
  "PROVIDER_LIMITS",
] as const;

export type EvidenceCategory = (typeof XENDIT_EVIDENCE_CATEGORIES)[number];

export interface EvidenceItem {
  category: EvidenceCategory;
  status: EvidenceStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  evidenceReference: string | null; // referensi aman (dokumen ID, URL dashboard) — BUKAN secret
  notes: string | null;
}

export interface EvidenceRecord {
  items: EvidenceItem[];
  updatedAt: string | null;
}

const EVIDENCE_KEY = "payout_xendit_readiness";

export async function getEvidenceRecord(): Promise<EvidenceRecord> {
  try {
    const setting = await db.siteSetting.findUnique({ where: { key: EVIDENCE_KEY } });
    if (!setting?.value) {
      return {
        items: XENDIT_EVIDENCE_CATEGORIES.map((category) => ({
          category,
          status: "PENDING" as EvidenceStatus,
          verifiedAt: null,
          verifiedBy: null,
          evidenceReference: null,
          notes: null,
        })),
        updatedAt: null,
      };
    }
    const parsed = JSON.parse(setting.value) as { items?: EvidenceItem[]; updatedAt?: string };
    const items = XENDIT_EVIDENCE_CATEGORIES.map((category) => {
      const found = parsed.items?.find((i) => i.category === category);
      return (
        found ?? {
          category,
          status: "PENDING" as EvidenceStatus,
          verifiedAt: null,
          verifiedBy: null,
          evidenceReference: null,
          notes: null,
        }
      );
    });
    return { items, updatedAt: parsed.updatedAt ?? null };
  } catch (err) {
    console.error("[xendit-readiness] gagal membaca evidence:", err);
    return {
      items: XENDIT_EVIDENCE_CATEGORIES.map((category) => ({
        category,
        status: "PENDING" as EvidenceStatus,
        verifiedAt: null,
        verifiedBy: null,
        evidenceReference: null,
        notes: null,
      })),
      updatedAt: null,
    };
  }
}

/**
 * Catat bukti readiness (founder-only di route). Evidence TIDAK BOLEH
 * mengandung secret — hanya metadata/referensi aman.
 */
export async function recordEvidence(input: {
  category: EvidenceCategory;
  status: EvidenceStatus;
  verifiedBy: string;
  verifiedByEmail: string | null;
  evidenceReference: string;
  notes: string;
}): Promise<EvidenceRecord> {
  const current = await getEvidenceRecord();
  const items = current.items.map((i) =>
    i.category === input.category
      ? {
          ...i,
          status: input.status,
          verifiedAt: new Date().toISOString(),
          verifiedBy: input.verifiedByEmail ?? input.verifiedBy,
          evidenceReference: input.evidenceReference.slice(0, 300),
          notes: input.notes.slice(0, 1000),
        }
      : i,
  );

  const record: EvidenceRecord = { items, updatedAt: new Date().toISOString() };
  await db.siteSetting.upsert({
    where: { key: EVIDENCE_KEY },
    create: { key: EVIDENCE_KEY, value: JSON.stringify(record) },
    update: { value: JSON.stringify(record) },
  });

  await auditCommission({
    actorUserId: input.verifiedBy,
    action: `XENDIT_EVIDENCE_${input.category}_${input.status}`,
    reason: input.notes.slice(0, 500),
    metadata: { category: input.category, evidenceReference: input.evidenceReference.slice(0, 200) },
  });

  return record;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5 — PRODUCTION SAFETY GATE (SATU hasil kanonik)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReadinessBlock {
  id: string;
  label: string;
  passed: boolean;
  reason: string;
}

export interface XenditReadinessResult {
  ready: boolean;
  blocks: ReadinessBlock[];
}

export async function evaluateXenditProductionReadiness(): Promise<XenditReadinessResult> {
  const blocks: ReadinessBlock[] = [];

  // Evidence: SEMUA kategori VERIFIED.
  const evidence = await getEvidenceRecord();
  const unverified = evidence.items.filter((i) => i.status !== "VERIFIED");
  blocks.push({
    id: "evidence_all_verified",
    label: "Bukti readiness eksternal (9 kategori) VERIFIED",
    passed: unverified.length === 0,
    reason: unverified.length === 0 ? "Semua kategori terverifikasi." : `Belum terverifikasi: ${unverified.map((i) => i.category).join(", ")}`,
  });

  // Config: credential + token CONFIGURED, tanpa INVALID.
  const config = validatePayoutProductionConfig();
  const credentialOk = config.fields.find((f) => f.key === "api_credential")?.status === "CONFIGURED";
  const tokenOk = config.fields.find((f) => f.key === "webhook_token")?.status === "CONFIGURED";
  blocks.push({
    id: "credential_configured",
    label: "Kredensial production terkonfigurasi",
    passed: credentialOk,
    reason: credentialOk ? "XENDIT_API_KEY terdeteksi." : "XENDIT_API_KEY belum diset.",
  });
  blocks.push({
    id: "webhook_token_configured",
    label: "Token webhook terkonfigurasi",
    passed: tokenOk,
    reason: tokenOk ? "XENDIT_WEBHOOK_TOKEN terdeteksi." : "XENDIT_WEBHOOK_TOKEN belum diset.",
  });

  // P8E safety controls healthy (risk gate + kill switch mechanism).
  const runtime = await getPayoutRuntimeConfig();
  blocks.push({
    id: "safety_controls",
    label: "Kontrol keamanan P7E/P8C sehat",
    passed: runtime.riskGateEnabled,
    reason: runtime.riskGateEnabled ? "Risk gate aktif; kill switch tersedia." : "Risk gate tidak aktif.",
  });

  // P8F founder gate auto checks.
  const p8f = await evaluatePreCanaryChecklist();
  blocks.push({
    id: "p8f_auto_checks",
    label: "P8F founder gate: check otomatis PASS",
    passed: p8f.automaticFailures.length === 0,
    reason: p8f.automaticFailures.length === 0 ? "Tidak ada kegagalan otomatis." : `Gagal: ${p8f.automaticFailures.join(", ")}`,
  });

  // Limits verified (evidence + config).
  const limitsEvidence = evidence.items.find((i) => i.category === "PROVIDER_LIMITS")?.status === "VERIFIED";
  blocks.push({
    id: "limits_verified",
    label: "Batas provider dikonfirmasi",
    passed: limitsEvidence,
    reason: limitsEvidence ? "PROVIDER_LIMITS terverifikasi." : "Bukti PROVIDER_LIMITS belum diverifikasi.",
  });

  // Webhook verification tested (evidence WEBHOOK VERIFIED).
  const webhookEvidence = evidence.items.find((i) => i.category === "WEBHOOK")?.status === "VERIFIED";
  blocks.push({
    id: "webhook_verified",
    label: "Webhook production diverifikasi (termasuk uji non-money)",
    passed: webhookEvidence,
    reason: webhookEvidence ? "WEBHOOK terverifikasi." : "Bukti WEBHOOK belum diverifikasi.",
  });

  // Real money tetap OFF selama P8H — readiness adalah kesiapan, bukan aktivasi.
  blocks.push({
    id: "real_money_off",
    label: "Real money tetap OFF (P8H tidak mengaktifkan)",
    passed: !runtime.realMoneyEnabled && !runtime.providerEnabled,
    reason: runtime.realMoneyEnabled || runtime.providerEnabled ? "Flag real money AKTIF — P8H melarang." : "OFF (benar).",
  });

  return { ready: blocks.every((b) => b.passed), blocks };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 7 — PILOT TEACHER READINESS (final checklist)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PilotTeacherCheck {
  id: string;
  label: string;
  passed: boolean;
  reason: string;
}

export async function evaluatePilotTeacherReadiness(teacherId: string): Promise<{
  ready: boolean;
  checks: PilotTeacherCheck[];
}> {
  const checks: PilotTeacherCheck[] = [];
  const push = (id: string, label: string, passed: boolean, reason: string) =>
    checks.push({ id, label, passed, reason });

  const user = await db.user.findUnique({
    where: { id: teacherId },
    select: { role: true, isFounder: true },
  });
  push("role", "Role GURU", !!user && user.role === "GURU", user ? `role=${user.role}` : "tidak ditemukan");
  push("not_founder", "Bukan founder/ADMIN", !!user && !user.isFounder, user?.isFounder ? "founder" : "ok");

  const wallet = await db.teacherWallet.findUnique({
    where: { teacherId },
    select: { availableBalance: true },
  });
  const minimum = payoutMinimumAmount();
  push(
    "balance",
    "Saldo tersedia ≥ minimum",
    (wallet?.availableBalance ?? 0) >= minimum,
    `available=${wallet?.availableBalance ?? 0}, min=${minimum}`,
  );

  const profile = await db.teacherPayoutProfile.findUnique({
    where: { teacherId },
    select: { verificationStatus: true, updatedAt: true },
  });
  push("profile_verified", "Profil payout VERIFIED", profile?.verificationStatus === "VERIFIED", profile ? `status=${profile.verificationStatus}` : "tanpa profil");
  push(
    "no_cooldown",
    "Tanpa cooldown destinasi",
    profile ? !isDestinationCooldownActive({ profileUpdatedAt: profile.updatedAt }) : false,
    profile ? (isDestinationCooldownActive({ profileUpdatedAt: profile.updatedAt }) ? "cooldown aktif" : "ok") : "tanpa profil",
  );

  const riskState = await getTeacherRiskState(teacherId);
  push("risk_normal", "Risk NORMAL (tanpa case aktif)", riskState === "NORMAL", `state=${riskState}`);

  const pilotIds = await getEffectivePilotTeacherIds();
  push("allowlisted", "Termasuk allowlist pilot", pilotIds.has(teacherId), pilotIds.has(teacherId) ? "allowlisted" : "tidak ada di pilot");

  const founderDecision = await getFounderDecision();
  push(
    "founder_selected",
    "Dipilih eksplisit oleh Founder",
    founderDecision.state === "APPROVED_FOR_CANARY",
    `keputusan=${founderDecision.state}`,
  );

  return { ready: checks.every((c) => c.passed), checks };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 8 — MONEY SAFETY SNAPSHOT (read-only, untuk keputusan Founder)
// ═══════════════════════════════════════════════════════════════════════════════

export interface MoneySafetySnapshot {
  teacher: { id: string; maskedIdentity: string };
  commission: number | null;
  withdrawal: { id: string | null; amount: number | null };
  destination: string | null; // "BANK •••• XXXX"
  provider: string;
  providerFee: string; // "Ditanggung BahasaCerdas"
  teacherReceives: number | null;
  risk: string;
  exposureRemaining: number | null;
  dailyGlobalExposure: number;
  killSwitch: boolean;
  pilot: boolean;
  founderGateReady: boolean;
  generatedAt: string;
}

export async function buildMoneySafetySnapshot(input: {
  teacherId: string;
  withdrawalId?: string | null;
}): Promise<MoneySafetySnapshot> {
  const [runtime, safety, p8f, riskState, wallet, profile, user] = await Promise.all([
    getPayoutRuntimeConfig(),
    getMoneySafetyState(),
    evaluatePreCanaryChecklist(),
    getTeacherRiskState(input.teacherId),
    db.teacherWallet.findUnique({ where: { teacherId: input.teacherId }, select: { availableBalance: true } }),
    db.teacherPayoutProfile.findUnique({
      where: { teacherId: input.teacherId },
      select: { destinationType: true, bankName: true, accountNumber: true },
    }),
    db.user.findUnique({ where: { id: input.teacherId }, select: { fullName: true } }),
  ]);

  let withdrawal: { id: string | null; amount: number | null } = { id: null, amount: null };
  if (input.withdrawalId) {
    const w = await db.teacherCommissionWithdrawal.findUnique({
      where: { id: input.withdrawalId },
      select: { id: true, amount: true },
    });
    if (w) withdrawal = { id: w.id, amount: w.amount };
  }

  const dailyTotal = await globalDailyPayoutTotal();
  const pilotTotal = await pilotDailyPayoutTotal();

  const masked = profile
    ? `${profile.destinationType === "EWALLET" ? "E-WALLET" : "BANK"} •••• ${profile.accountNumber.slice(-4)}`
    : null;

  return {
    teacher: {
      id: input.teacherId,
      maskedIdentity: user?.fullName ? `${user.fullName.charAt(0)}. ${user.fullName.split(" ").slice(-1)[0]}` : "—",
    },
    commission: wallet?.availableBalance ?? 0,
    withdrawal: { id: withdrawal.id, amount: withdrawal.amount },
    destination: masked,
    provider: runtime.provider === "mock" ? "MOCK (sandbox)" : "XENDIT",
    providerFee: "Ditanggung BahasaCerdas",
    teacherReceives: withdrawal.amount,
    risk: riskState,
    exposureRemaining: Math.max(0, runtime.pilotGlobalLimit - pilotTotal),
    dailyGlobalExposure: dailyTotal,
    killSwitch: runtime.killSwitchActive,
    pilot: runtime.pilotEnabled,
    founderGateReady: p8f.decision === "GO_FOR_REAL_MONEY_CANARY",
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 9 — FINAL HUMAN CONFIRMATION (eksplisit, teraudit — bukan otomatis)
// ═══════════════════════════════════════════════════════════════════════════════

export const FOUNDER_CONFIRMATION_TEXT =
  "I confirm that the Xendit production money rail has been verified and I authorize the first controlled real-money canary.";

const CONFIRMATION_KEY = "payout_founder_confirmation";

export interface FounderConfirmation {
  confirmed: boolean;
  founderId: string | null;
  founderEmail: string | null;
  timestamp: string | null;
  confirmationText: string | null;
  canaryTeacherId: string | null;
  withdrawalId: string | null;
  provider: string | null;
  amount: number | null;
  approvalReference: string | null;
}

export async function getFounderConfirmation(): Promise<FounderConfirmation> {
  try {
    const setting = await db.siteSetting.findUnique({ where: { key: CONFIRMATION_KEY } });
    if (!setting?.value) {
      return {
        confirmed: false,
        founderId: null,
        founderEmail: null,
        timestamp: null,
        confirmationText: null,
        canaryTeacherId: null,
        withdrawalId: null,
        provider: null,
        amount: null,
        approvalReference: null,
      };
    }
    return JSON.parse(setting.value) as FounderConfirmation;
  } catch {
    return {
      confirmed: false,
      founderId: null,
      founderEmail: null,
      timestamp: null,
      confirmationText: null,
      canaryTeacherId: null,
      withdrawalId: null,
      provider: null,
      amount: null,
      approvalReference: null,
    };
  }
}

export async function recordFounderConfirmation(input: {
  founderId: string;
  founderEmail: string | null;
  confirmationText: string;
  canaryTeacherId: string;
  withdrawalId: string;
  amount: number | null;
}): Promise<FounderConfirmation> {
  // Teks konfirmasi harus PERSIS — konfirmasi bukan sekadar klik.
  if (input.confirmationText.trim() !== FOUNDER_CONFIRMATION_TEXT) {
    throw new Error("Confirmation text mismatch");
  }

  const confirmation: FounderConfirmation = {
    confirmed: true,
    founderId: input.founderId,
    founderEmail: input.founderEmail,
    timestamp: new Date().toISOString(),
    confirmationText: input.confirmationText,
    canaryTeacherId: input.canaryTeacherId,
    withdrawalId: input.withdrawalId,
    provider: "xendit",
    amount: input.amount,
    approvalReference: `founder:${input.founderId}:${Date.now().toString(36)}`,
  };

  await db.siteSetting.upsert({
    where: { key: CONFIRMATION_KEY },
    create: { key: CONFIRMATION_KEY, value: JSON.stringify(confirmation) },
    update: { value: JSON.stringify(confirmation) },
  });

  await auditCommission({
    actorUserId: input.founderId,
    action: "XENDIT_FOUNDER_CONFIRMATION",
    reason: "Founder mengonfirmasi kesiapan rail Xendit dan mengotorisasi canary pertama.",
    metadata: {
      canaryTeacherId: input.canaryTeacherId,
      withdrawalId: input.withdrawalId,
      approvalReference: confirmation.approvalReference,
    },
  });

  return confirmation;
}
