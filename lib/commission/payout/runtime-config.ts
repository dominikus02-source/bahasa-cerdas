/**
 * P8E §3 — Single authoritative payout runtime configuration.
 *
 * SATU sumber agregasi kebijakan finansial server-side. Env checks TIDAK
 * boleh tersebar lagi — komponen lain membaca dari sini atau dari config.ts
 * (fungsi tunggal per nilai). Tidak pernah trust nilai klien.
 */

import {
  isEnvKillSwitchActive,
  isPayoutPilotEnabled,
  isPayoutProviderEnabled,
  isRealMoneyPayoutEnabled,
  payoutDailyLimit,
  payoutGlobalDailyLimit,
  payoutMaximumAmount,
  payoutMinimumAmount,
  payoutProvider,
  payoutReconciliationTimeoutMinutes,
  payoutMaxAttempts,
  payoutPilotGlobalLimit,
} from "./config";
import { commissionHoldingPeriodDays } from "../config";
import { isPayoutKillSwitchActive } from "./kill-switch";
import { isPilotPaused, getEffectivePilotTeacherIds } from "./pilot";

export interface PayoutRuntimeConfig {
  realMoneyEnabled: boolean;
  providerEnabled: boolean;
  provider: string;
  pilotEnabled: boolean;
  pilotPaused: boolean;
  pilotTeacherIds: string[];
  pilotGlobalLimit: number;
  killSwitchActive: boolean;
  minimumAmount: number;
  maximumAmount: number;
  teacherDailyLimit: number;
  globalDailyLimit: number;
  riskGateEnabled: boolean; // P8C selalu aktif — flag untuk observability
  holdingPeriodDays: number;
  maxAttempts: number;
  reconciliationTimeoutMinutes: number;
}

/** Konfigurasi runtime terpusat — dipakai admin control center + audit. */
export async function getPayoutRuntimeConfig(): Promise<PayoutRuntimeConfig> {
  const [killSwitchActive, pilotPaused, pilotTeacherIds] = await Promise.all([
    isPayoutKillSwitchActive(),
    isPilotPaused(),
    getEffectivePilotTeacherIds(),
  ]);

  return {
    realMoneyEnabled: isRealMoneyPayoutEnabled(),
    providerEnabled: isPayoutProviderEnabled(),
    provider: payoutProvider(),
    pilotEnabled: isPayoutPilotEnabled(),
    pilotPaused,
    pilotTeacherIds: [...pilotTeacherIds],
    pilotGlobalLimit: payoutPilotGlobalLimit(),
    killSwitchActive,
    minimumAmount: payoutMinimumAmount(),
    maximumAmount: payoutMaximumAmount(),
    teacherDailyLimit: payoutDailyLimit(),
    globalDailyLimit: payoutGlobalDailyLimit(),
    riskGateEnabled: true,
    holdingPeriodDays: commissionHoldingPeriodDays(),
    maxAttempts: payoutMaxAttempts(),
    reconciliationTimeoutMinutes: payoutReconciliationTimeoutMinutes(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// P8E §4 — FOUR-STATE MONEY SAFETY
// ═══════════════════════════════════════════════════════════════════════════════

export type MoneySafetyState = "DISABLED" | "PILOT" | "PRODUCTION" | "EMERGENCY_STOP";

/**
 * Derivasi deterministik state keamanan uang:
 * - EMERGENCY_STOP : kill switch aktif (env ATAU SiteSetting)
 * - PILOT          : real money on + provider on + non-mock + pilot on
 * - PRODUCTION     : real money on + provider on + non-mock + pilot off
 * - DISABLED       : selainnya (default — mock)
 *
 * TIDAK ada state transisi otomatis menuju produksi — hanya via env founder.
 */
export async function getMoneySafetyState(): Promise<{
  state: MoneySafetyState;
  detail: string;
}> {
  const cfg = await getPayoutRuntimeConfig();

  if (cfg.killSwitchActive) {
    return {
      state: "EMERGENCY_STOP",
      detail: "Kill switch aktif — tidak ada pengiriman payout baru.",
    };
  }

  if (cfg.realMoneyEnabled && cfg.providerEnabled && cfg.provider !== "mock") {
    if (cfg.pilotEnabled) {
      return {
        state: "PILOT",
        detail: cfg.pilotPaused
          ? "Pilot AKTIF tetapi DIPAU (tidak ada pengiriman baru)."
          : "Pilot aktif — hanya guru dalam daftar pilot yang dapat dicairkan.",
      };
    }
    return { state: "PRODUCTION", detail: "Mode produksi penuh." };
  }

  return {
    state: "DISABLED",
    detail: "Real money nonaktif — payout berjalan di sandbox (mock).",
  };
}
