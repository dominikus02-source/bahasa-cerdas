/**
 * P7E §6/§19 — Production kill switch.
 *
 * Dua lapis:
 *   1. ENV `PAYOUT_KILL_SWITCH=true` (immutable tanpa redeploy)
 *   2. SiteSetting "payout_kill_switch" (admin toggle via API, audited)
 *
 * Ketika aktif:
 * - wallet/ledger/withdrawal existing UTUH (tidak ada data dihapus)
 * - tidak ada pengiriman payout baru
 * - rekonsiliasi tetap berjalan
 * - error deterministik: PAYOUT_KILL_SWITCH
 */

import { db } from "@/lib/db";
import { isEnvKillSwitchActive } from "./config";

const KILL_SWITCH_KEY = "payout_kill_switch";

/** Nilai DB (SiteSetting) — "true" = stop. */
export async function getDbKillSwitch(): Promise<boolean> {
  try {
    const setting = await db.siteSetting.findUnique({ where: { key: KILL_SWITCH_KEY } });
    return setting?.value === "true";
  } catch (err) {
    console.error("[payout][kill-switch] gagal membaca SiteSetting:", err);
    return false;
  }
}

/** Kill switch aktif bila ENV ATAU DB aktif (fail-open ke env). */
export async function isPayoutKillSwitchActive(): Promise<boolean> {
  if (isEnvKillSwitchActive()) return true;
  return getDbKillSwitch();
}

/** Set state kill switch di DB (admin, audited terpisah di route). */
export async function setDbKillSwitch(value: boolean): Promise<void> {
  await db.siteSetting.upsert({
    where: { key: KILL_SWITCH_KEY },
    create: { key: KILL_SWITCH_KEY, value: value ? "true" : "false" },
    update: { value: value ? "true" : "false" },
  });
}
