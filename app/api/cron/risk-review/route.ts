import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submitPayoutForWithdrawal } from "@/lib/commission/payout/orchestrator";
import { getTeacherRiskState } from "@/lib/guru/risk/signals";
import { isDestinationCooldownActive } from "@/lib/guru/risk/rules";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/risk-review
 * P8C §24 — job review risk: resume withdrawal yang ditahan setelah guru
 * kembali NORMAL (case cleared). Idempotent & non-destructive:
 * - hanya withdrawal PENDING tanpa payout
 * - guru state NORMAL + destinasi tidak dalam cooldown
 * - bounded (20) — tidak memindai seluruh DB
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
    const held = await db.teacherCommissionWithdrawal.findMany({
      where: { status: "PENDING", payout: null },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { id: true, teacherId: true },
    });

    let resumed = 0;
    let skipped = 0;
    for (const w of held) {
      try {
        const state = await getTeacherRiskState(w.teacherId);
        if (state !== "NORMAL") {
          skipped++;
          continue;
        }
        const profile = await db.teacherPayoutProfile.findUnique({
          where: { teacherId: w.teacherId },
          select: { updatedAt: true },
        });
        if (profile && isDestinationCooldownActive({ profileUpdatedAt: profile.updatedAt })) {
          skipped++;
          continue;
        }
        const res = await submitPayoutForWithdrawal(w.id, { actor: "system" });
        if (res.ok || res.error === "ALREADY_SUBMITTED") resumed++;
        else skipped++;
      } catch (err) {
        console.error("[cron] risk-review resume gagal:", w.id, err);
        skipped++;
      }
    }

    return NextResponse.json({ ok: true, scanned: held.length, resumed, skipped });
  } catch (err) {
    console.error("[cron] risk-review gagal:", err);
    return NextResponse.json({ error: "Gagal" }, { status: 500 });
  }
}
