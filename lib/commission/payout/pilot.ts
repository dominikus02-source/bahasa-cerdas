/**
 * P8E §6/§7 — Pilot control (allowlist + pause + exposure limit).
 *
 * Pilot = ALLOWLIST ONLY. List efektif = env CSV ∪ SiteSetting CSV (admin
 * add/remove tanpa redeploy, teraudit). Pause = SiteSetting "payout_pilot_paused".
 * Exposure pilot dibatasi PAYOUT_PILOT_GLOBAL_LIMIT (default Rp1.000.000/hari).
 */

import { db } from "@/lib/db";
import { payoutPilotTeacherIds } from "./config";

const PILOT_IDS_KEY = "payout_pilot_teacher_ids";
const PILOT_PAUSED_KEY = "payout_pilot_paused";

/** List guru pilot efektif: gabungan env + SiteSetting (admin-managed). */
export async function getEffectivePilotTeacherIds(): Promise<Set<string>> {
  const ids = new Set(payoutPilotTeacherIds());
  try {
    const setting = await db.siteSetting.findUnique({ where: { key: PILOT_IDS_KEY } });
    if (setting?.value) {
      setting.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((id) => ids.add(id));
    }
  } catch (err) {
    console.error("[payout][pilot] gagal membaca SiteSetting:", err);
  }
  return ids;
}

/** Pilot dipause via admin (SiteSetting). Env tetap sumber utama enable. */
export async function isPilotPaused(): Promise<boolean> {
  try {
    const setting = await db.siteSetting.findUnique({ where: { key: PILOT_PAUSED_KEY } });
    return setting?.value === "true";
  } catch {
    return false;
  }
}

/** Tambah/hapus guru pilot (admin) — memodifikasi SiteSetting, bukan env. */
export async function setPilotTeacherIds(ids: string[]): Promise<void> {
  await db.siteSetting.upsert({
    where: { key: PILOT_IDS_KEY },
    create: { key: PILOT_IDS_KEY, value: ids.join(",") },
    update: { value: ids.join(",") },
  });
}

export async function setPilotPaused(paused: boolean): Promise<void> {
  await db.siteSetting.upsert({
    where: { key: PILOT_PAUSED_KEY },
    create: { key: PILOT_PAUSED_KEY, value: paused ? "true" : "false" },
    update: { value: paused ? "true" : "false" },
  });
}

/** Total payout hari ini untuk guru-guru PILOT (WIB) — dasar exposure pilot. */
export async function pilotDailyPayoutTotal(): Promise<number> {
  const ids = await getEffectivePilotTeacherIds();
  if (ids.size === 0) return 0;
  const wib = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  const start = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - 7 * 60 * 60 * 1000);
  const agg = await db.teacherPayout.aggregate({
    where: {
      teacherId: { in: [...ids] },
      createdAt: { gte: start },
      status: { not: "FAILED" },
    },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}
