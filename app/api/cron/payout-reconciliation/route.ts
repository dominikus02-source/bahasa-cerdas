import { NextRequest, NextResponse } from "next/server";
import {
  reconcilePendingTeacherPayouts,
  detectPayoutAnomalies,
} from "@/lib/commission/payout/orchestrator";
import { auditCommission } from "@/lib/commission/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/payout-reconciliation
 * Rekonsiliasi payout terbuka + deteksi anomali finansial harian (spec §18/§19).
 * Read-only terhadap wallet kecuali outcome yang sah — mismatch TIDAK pernah
 * di-repair diam-diam; dilaporkan + diaudit.
 */
export async function GET(req: NextRequest) {
  const rahasia = process.env.CRON_SECRET;
  if (rahasia) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${rahasia}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const [recon, anomalies] = await Promise.all([
      reconcilePendingTeacherPayouts(),
      detectPayoutAnomalies(),
    ]);

    if (anomalies.count > 0) {
      await auditCommission({
        actorUserId: null,
        action: "PAYOUT_RECONCILIATION",
        reason: `Cron: ${anomalies.count} anomali payout terdeteksi`,
        metadata: {
          anomalies: anomalies.issues.slice(0, 20).map((i) => ({ type: i.type, payoutId: i.payoutId })),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      reconciliation: recon,
      anomalies: anomalies.count,
    });
  } catch (err) {
    console.error("[cron] payout-reconciliation gagal:", err);
    return NextResponse.json({ error: "Gagal" }, { status: 500 });
  }
}
