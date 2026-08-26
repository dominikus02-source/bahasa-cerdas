/**
 * P8E §21 — Alert conditions (deterministic, actionable — bukan noise).
 *
 * Evaluasi on-demand dari data nyata. Setiap kondisi aktif = perlu tindakan.
 * Tidak ada sistem notifikasi massal — hasil ditampilkan di admin control
 * center + diaudit di reconciliation cron yang sudah ada.
 */

import { db } from "@/lib/db";
import { detectPayoutAnomalies } from "./orchestrator";
import { globalDailyPayoutTotal } from "./safety";
import { payoutDailyLimit, payoutGlobalDailyLimit, payoutPilotGlobalLimit, isPayoutPilotEnabled } from "./config";
import { pilotDailyPayoutTotal } from "./pilot";

export interface AlertCondition {
  code: string;
  severity: "WARNING" | "CRITICAL";
  detail: string;
  actionable: boolean;
}

/** Evaluasi kondisi alert saat ini (bounded queries, tanpa scan penuh). */
export async function evaluateAlertConditions(): Promise<AlertCondition[]> {
  const alerts: AlertCondition[] = [];
  const now = new Date();

  try {
    // 1. Anomali payout (reuse P7D detection — mismatch, stale, dll).
    const anomalies = await detectPayoutAnomalies();
    if (anomalies.count > 0) {
      alerts.push({
        code: "PAYOUT_RECONCILIATION_MISMATCH",
        severity: "CRITICAL",
        detail: `${anomalies.count} anomali payout terdeteksi (lihat antrean rekonsiliasi).`,
        actionable: true,
      });
    }

    // 2. Daily limit tercapai (guru) — bukan error, tetapi sinyal kapasitas.
    const todayTeacherLimit = payoutDailyLimit();
    const teachersAtLimit = await db.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*) AS n FROM (
         SELECT "teacherId" FROM "TeacherPayout"
         WHERE "createdAt" >= $1 AND "status" <> 'FAILED'
         GROUP BY "teacherId"
         HAVING SUM("amount") >= $2
       ) t`,
      startOfTodayWIB(),
      todayTeacherLimit
    ).catch(() => [{ n: 0 as unknown as bigint }]);
    if (Number(teachersAtLimit[0]?.n ?? 0) > 0) {
      alerts.push({
        code: "TEACHER_DAILY_LIMIT_REACHED",
        severity: "WARNING",
        detail: `${teachersAtLimit[0].n} guru mencapai batas harian.`,
        actionable: false,
      });
    }

    // 3. Global daily limit tercapai.
    const globalTotal = await globalDailyPayoutTotal();
    if (globalTotal >= payoutGlobalDailyLimit()) {
      alerts.push({
        code: "GLOBAL_DAILY_LIMIT_REACHED",
        severity: "CRITICAL",
        detail: `Total payout hari ini ${globalTotal} ≥ batas global.`,
        actionable: true,
      });
    }

    // 4. Pilot limit tercapai.
    if (isPayoutPilotEnabled()) {
      const pilotTotal = await pilotDailyPayoutTotal();
      if (pilotTotal >= payoutPilotGlobalLimit()) {
        alerts.push({
          code: "PAYOUT_PILOT_LIMIT_REACHED",
          severity: "CRITICAL",
          detail: `Exposure pilot ${pilotTotal} ≥ batas pilot.`,
          actionable: true,
        });
      }
    }

    // 5. Duplicate payout attempt (idempotency defenses aktif) — indikasi abuse.
    const dupAttempts = await db.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*) AS n FROM "TeacherPayout"
       WHERE "createdAt" >= $1 AND "status" = 'RECONCILIATION_REQUIRED'
         AND "lastErrorCode" = 'AMOUNT_MISMATCH'`,
      startOfTodayWIB()
    ).catch(() => [{ n: 0 as unknown as bigint }]);
    if (Number(dupAttempts[0]?.n ?? 0) > 0) {
      alerts.push({
        code: "AMOUNT_MISMATCH_DETECTED",
        severity: "CRITICAL",
        detail: `${dupAttempts[0].n} payout amount-mismatch hari ini.`,
        actionable: true,
      });
    }
  } catch (err) {
    console.error("[payout][alerts] evaluasi gagal:", err);
  }

  void now;
  return alerts;
}

function startOfTodayWIB(): Date {
  const wib = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - 7 * 60 * 60 * 1000);
}
