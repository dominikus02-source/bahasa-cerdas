import { NextRequest, NextResponse } from "next/server";
import { batchReleaseCommissions } from "@/lib/commission/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/teacher-commissions-release
 * Melepas komisi ELIGIBLE yang masa holding-nya sudah lewat → AVAILABLE.
 *
 * §9: batch-safe, retry-safe, idempotent — setiap entry diklaim atomik
 * (`updateMany WHERE status=ELIGIBLE`) lalu wallet dikredit dalam transaksi
 * yang sama. Job jalan dua kali TIDAK menggandakan dana.
 * Dijadwalkan via vercel.json (setiap jam).
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
    const released = await batchReleaseCommissions();
    return NextResponse.json({ ok: true, released });
  } catch (err) {
    console.error("[cron] teacher-commissions-release gagal:", err);
    return NextResponse.json({ error: "Gagal" }, { status: 500 });
  }
}
