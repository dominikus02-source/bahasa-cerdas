/**
 * P7E §13/§18 — Real-money safety gate + payout limits.
 *
 * Real-money payout hanya bila SEMUA kondisi terpenuhi:
 *   PAYOUT_REAL_MONEY_ENABLED=true
 *   AND PAYOUT_PROVIDER_ENABLED=true
 *   AND provider != mock
 *   AND kill switch off (env + DB)
 *   AND (bila pilot aktif) teacher ∈ daftar pilot
 *
 * Kalau satu pun gagal: DO NOT SEND MONEY. Error deterministik.
 *
 * Provider mock = sandbox — tetap diizinkan untuk testing QA, dan tetap
 * dikenai batas nominal (supaya QA limit ikut teruji).
 */

import { db } from "@/lib/db";
import {
  isRealMoneyPayoutEnabled,
  isPayoutProviderEnabled,
  isPayoutPilotEnabled,
  payoutPilotGlobalLimit,
  payoutProvider,
  payoutMinimumAmount,
  payoutMaximumAmount,
  payoutDailyLimit,
  payoutGlobalDailyLimit,
} from "./config";
import { isPayoutKillSwitchActive } from "./kill-switch";
import { getEffectivePilotTeacherIds, isPilotPaused, pilotDailyPayoutTotal } from "./pilot";

export type PayoutGateResult =
  | { allowed: true; realMoney: boolean }
  | {
      allowed: false;
      code:
        | "PAYOUT_REAL_MONEY_DISABLED"
        | "PAYOUT_PROVIDER_DISABLED"
        | "PAYOUT_KILL_SWITCH"
        | "PAYOUT_PILOT_BLOCKED";
    };

export async function evaluatePayoutGate(input: { teacherId: string }): Promise<PayoutGateResult> {
  const provider = payoutProvider();
  const isMock = provider === "mock";

  if (isMock) {
    // Sandbox — diizinkan (bukan uang asli). Kill switch TETAP dihormati agar
    // admin bisa menghentikan segala aktivitas payout.
    if (await isPayoutKillSwitchActive()) {
      return { allowed: false, code: "PAYOUT_KILL_SWITCH" };
    }
    return { allowed: true, realMoney: false };
  }

  // ── REAL-MONEY RAIL (spec §13): semua kondisi wajib ──
  if (!isRealMoneyPayoutEnabled()) {
    return { allowed: false, code: "PAYOUT_REAL_MONEY_DISABLED" };
  }
  if (!isPayoutProviderEnabled()) {
    return { allowed: false, code: "PAYOUT_PROVIDER_DISABLED" };
  }
  if (await isPayoutKillSwitchActive()) {
    return { allowed: false, code: "PAYOUT_KILL_SWITCH" };
  }
  if (isPayoutPilotEnabled()) {
    // P8E: list pilot efektif = env payoutPilotTeacherIds ∪ SiteSetting
    // (admin add/remove via pilot.ts — teraudit).
    const pilotIds = await getEffectivePilotTeacherIds();
    if (!pilotIds.has(input.teacherId)) {
      return { allowed: false, code: "PAYOUT_PILOT_BLOCKED" };
    }
    if (await isPilotPaused()) {
      return { allowed: false, code: "PAYOUT_PILOT_BLOCKED" };
    }
  }

  return { allowed: true, realMoney: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITS (P7E §7) — enforced server-side, configurable via env
// ═══════════════════════════════════════════════════════════════════════════════

export type PayoutLimitResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "BELOW_MINIMUM"
        | "ABOVE_MAXIMUM"
        | "DAILY_LIMIT_REACHED"
        | "GLOBAL_DAILY_LIMIT_REACHED"
        | "PILOT_LIMIT_REACHED";
      detail?: string;
    };

/** Awal hari WIB (UTC+7) — batas harian dihitung per hari WIB. */
export function startOfDayWIB(now: Date): Date {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  wib.setUTCHours(0, 0, 0, 0);
  return new Date(wib.getTime() - 7 * 60 * 60 * 1000);
}

/** Total payout guru HARI INI (WIB) — tidak termasuk FAILED (dana sudah kembali). */
export async function teacherDailyPayoutTotal(teacherId: string): Promise<number> {
  const start = startOfDayWIB(new Date());
  const agg = await db.teacherPayout.aggregate({
    where: {
      teacherId,
      createdAt: { gte: start },
      status: { not: "FAILED" },
    },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/** Total payout SEMUA guru HARI INI (WIB). */
export async function globalDailyPayoutTotal(): Promise<number> {
  const start = startOfDayWIB(new Date());
  const agg = await db.teacherPayout.aggregate({
    where: {
      createdAt: { gte: start },
      status: { not: "FAILED" },
    },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/**
 * Cek semua batas (minimum, maksimum, harian guru, harian global).
 * Murni terhadap parameter yang diberikan — evaluasi di satu titik
 * (orchestrator) + pre-check endpoint untuk umpan balik cepat.
 */
export async function checkPayoutLimits(input: {
  teacherId: string;
  amount: number;
  todayTeacherTotal?: number;
  todayGlobalTotal?: number;
  todayPilotTotal?: number;
}): Promise<PayoutLimitResult> {
  const amount = input.amount;

  if (amount < payoutMinimumAmount()) {
    return {
      ok: false,
      error: "BELOW_MINIMUM",
      detail: `Minimum Rp ${payoutMinimumAmount().toLocaleString("id")}`,
    };
  }
  if (amount > payoutMaximumAmount()) {
    return {
      ok: false,
      error: "ABOVE_MAXIMUM",
      detail: `Maksimum per penarikan Rp ${payoutMaximumAmount().toLocaleString("id")}`,
    };
  }

  const teacherTotal = input.todayTeacherTotal ?? (await teacherDailyPayoutTotal(input.teacherId));
  const teacherLimit = payoutDailyLimit();
  if (teacherTotal + amount > teacherLimit) {
    return {
      ok: false,
      error: "DAILY_LIMIT_REACHED",
      detail: `Batas harian guru Rp ${teacherLimit.toLocaleString("id")} (sudah terpakai Rp ${teacherTotal.toLocaleString("id")})`,
    };
  }

  const globalTotal = input.todayGlobalTotal ?? (await globalDailyPayoutTotal());
  const globalLimit = payoutGlobalDailyLimit();
  if (globalTotal + amount > globalLimit) {
    return {
      ok: false,
      error: "GLOBAL_DAILY_LIMIT_REACHED",
      detail: `Batas harian global tercapai`,
    };
  }

  // ── P8E §7: PILOT EXPOSURE LIMIT — langit-langit total selama pilot ──
  if (isPayoutPilotEnabled()) {
    const pilotLimit = payoutPilotGlobalLimit();
    const pilotTotal = input.todayPilotTotal ?? (await pilotDailyPayoutTotal());
    if (pilotTotal + amount > pilotLimit) {
      return {
        ok: false,
        error: "PILOT_LIMIT_REACHED",
        detail: `Batas total pencairan pilot hari ini (Rp ${pilotLimit.toLocaleString("id")}) tercapai.`,
      };
    }
  }

  return { ok: true };
}
