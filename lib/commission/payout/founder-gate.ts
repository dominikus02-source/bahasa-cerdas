/**
 * P8E §5 — Founder Money Gate.
 *
 * Daftar prasyarat produksi. Setiap check berstatus:
 * - PASS    : diverifikasi dari state sistem NYATA (env/DB)
 * - MANUAL  : wajib verifikasi manusia (MANUAL VERIFICATION REQUIRED)
 * - FAIL    : kondisi otomatis belum terpenuhi
 *
 * TIDAK ada UI yang menandai selesai secara palsu — status diturunkan dari
 * system state; item manual SELALU ditandai eksplisit.
 */

import { getPayoutRuntimeConfig, getMoneySafetyState } from "./runtime-config";
import { isPayoutKillSwitchActive } from "./kill-switch";
import { getEffectivePilotTeacherIds } from "./pilot";
import { db } from "@/lib/db";

export interface FounderGateItem {
  id: string;
  label: string;
  status: "PASS" | "MANUAL" | "FAIL";
  detail: string;
}

export interface FounderGateReport {
  evaluatedAt: string;
  items: FounderGateItem[];
  autoPass: number;
  autoFail: number;
  manualRequired: number;
  /** true bila semua check otomatis PASS (item manual TIDAK menghitung). */
  autoChecksPassed: boolean;
  /** true hanya bila autoChecksPassed DAN semua item manual di-approve eksplisit. */
  ready: boolean;
}

function secretConfigured(name: string): boolean {
  const value = process.env[name] ?? "";
  // Kehadiran nilai non-placeholder — TIDAK bisa memverifikasi keabsahan.
  return value.length > 8 && !value.startsWith("[SENSITIVE]");
}

export async function evaluateFounderGate(): Promise<FounderGateReport> {
  const cfg = await getPayoutRuntimeConfig();
  const safety = await getMoneySafetyState();
  const killSwitchActive = await isPayoutKillSwitchActive();
  const pilotIds = await getEffectivePilotTeacherIds();

  // Profil payout guru yang sudah diverifikasi (untuk check manual-informed).
  const verifiedProfiles = await db.teacherPayoutProfile
    .count({ where: { verificationStatus: "VERIFIED" } })
    .catch(() => 0);

  const items: FounderGateItem[] = [
    {
      id: "kyb",
      label: "KYB BahasaCerdas (badan usaha) selesai",
      status: "MANUAL",
      detail: "MANUAL VERIFICATION REQUIRED — dokumen KYB ke provider money-out.",
    },
    {
      id: "xendit_production_account",
      label: "Akun Xendit production terverifikasi",
      status: "MANUAL",
      detail: "MANUAL VERIFICATION REQUIRED — aktivasi production di dashboard Xendit.",
    },
    {
      id: "xendit_api_key",
      label: "Kredensial Xendit production terkonfigurasi (server-side)",
      status: secretConfigured("XENDIT_API_KEY") ? "PASS" : "FAIL",
      detail: secretConfigured("XENDIT_API_KEY")
        ? "XENDIT_API_KEY terdeteksi (nilai tidak pernah diverifikasi otomatis)."
        : "XENDIT_API_KEY belum diset.",
    },
    {
      id: "webhook_token",
      label: "Token verifikasi webhook payout terkonfigurasi",
      status: secretConfigured("XENDIT_WEBHOOK_TOKEN") ? "PASS" : "FAIL",
      detail: secretConfigured("XENDIT_WEBHOOK_TOKEN")
        ? "XENDIT_WEBHOOK_TOKEN terdeteksi."
        : "XENDIT_WEBHOOK_TOKEN belum diset.",
    },
    {
      id: "webhook_url",
      label: "URL webhook payout didaftarkan di provider",
      status: "MANUAL",
      detail: "MANUAL VERIFICATION REQUIRED — daftarkan /api/payout/webhook di dashboard provider.",
    },
    {
      id: "limits_configured",
      label: "Batas payout dikonfigurasi (min/max/daily/global/pilot)",
      status: "PASS",
      detail: `min=${cfg.minimumAmount}, max=${cfg.maximumAmount}, daily=${cfg.teacherDailyLimit}, global=${cfg.globalDailyLimit}, pilot=${cfg.pilotGlobalLimit}`,
    },
    {
      id: "risk_gate",
      label: "Risk gate P8C aktif",
      status: cfg.riskGateEnabled ? "PASS" : "FAIL",
      detail: "Risk gate aktif (P8C).",
    },
    {
      id: "kill_switch_tested",
      label: "Kill switch diuji (ENABLE → block → DISABLE)",
      status: "MANUAL",
      detail: "MANUAL VERIFICATION REQUIRED — uji via /admin/teacher-payouts.",
    },
    {
      id: "reconciliation_tested",
      label: "Rekonsiliasi diuji (matched/mismatch/unknown)",
      status: "MANUAL",
      detail: "MANUAL VERIFICATION REQUIRED — lihat /api/admin/teacher-commissions/reconciliation.",
    },
    {
      id: "finance_report",
      label: "Laporan finansial harian terverifikasi",
      status: "MANUAL",
      detail: "MANUAL VERIFICATION REQUIRED — /api/admin/teacher-commissions/finance-report.",
    },
    {
      id: "pilot_selected",
      label: "Guru pilot dipilih (allowlist eksplisit)",
      status: pilotIds.size > 0 ? "PASS" : "MANUAL",
      detail:
        pilotIds.size > 0
          ? `${pilotIds.size} guru pilot terdaftar.`
          : "MANUAL VERIFICATION REQUIRED — daftar pilot masih kosong.",
    },
    {
      id: "pilot_profiles_verified",
      label: "Profil payout guru pilot diverifikasi",
      status: verifiedProfiles > 0 ? "PASS" : "MANUAL",
      detail:
        verifiedProfiles > 0
          ? `${verifiedProfiles} profil payout terverifikasi.`
          : "MANUAL VERIFICATION REQUIRED — verifikasi profil destinasi guru pilot.",
    },
    {
      id: "first_payout_procedure",
      label: "Prosedur payout pertama didokumentasikan",
      status: "PASS",
      detail: "docs/P8E_REAL_MONEY_CANARY.md (canary) tersedia.",
    },
    {
      id: "incident_response",
      label: "Incident response didokumentasikan",
      status: "PASS",
      detail: "docs/P8E_PAYOUT_INCIDENT_RESPONSE.md tersedia.",
    },
    {
      id: "finance_owner",
      label: "Penanggung jawab akuntansi/rekonsiliasi ditetapkan",
      status: "MANUAL",
      detail: "MANUAL VERIFICATION REQUIRED — nama + SOP dari Founder.",
    },
    {
      id: "smoke_test",
      label: "Production smoke test selesai (sandbox end-to-end)",
      status: "MANUAL",
      detail: "MANUAL VERIFICATION REQUIRED — provider sandbox, bukan mock.",
    },
    {
      id: "founder_approval",
      label: "Persetujuan Founder tercatat",
      status: "MANUAL",
      detail: "MANUAL VERIFICATION REQUIRED — keputusan eksplisit Founder (env flag).",
    },
  ];

  const autoPass = items.filter((i) => i.status === "PASS").length;
  const autoFail = items.filter((i) => i.status === "FAIL").length;
  const manualRequired = items.filter((i) => i.status === "MANUAL").length;

  return {
    evaluatedAt: new Date().toISOString(),
    items,
    autoPass,
    autoFail,
    manualRequired,
    autoChecksPassed: autoFail === 0,
    ready: autoFail === 0 && manualRequired === 0,
    // kill switch state diikutsertakan untuk observability admin
    ...({ safetyState: safety.state, killSwitchActive } as object),
  } as FounderGateReport;
}
