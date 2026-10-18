import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { JUMPA_ENABLED } from "@/lib/features";
import { runJumpaSweep } from "@/lib/jumpa/background";

/**
 * JUMPA Fase 2 — sweep tiap 5 menit dari kontainer cron VPS
 * (ops/vps/cron/root.crontab → bc-cron-call /api/cron/jumpa-sweep):
 * - ruang LIVE melewati batas durasi → diakhiri untuk semua (TIME_LIMIT)
 * - ≤10 menit tersisa → peringatan sekali ke peserta
 * - ruang SCHEDULED yang tak pernah dipakai > 24 jam → STALE
 * - obrolan > 90 hari → dihapus permanen (cuplikan laporan tetap)
 *
 * FAIL-CLOSED: tanpa CRON_SECRET → 503 (tidak bisa dipicu siapa pun).
 * Flag JUMPA mati → 200 "dilewati" agar log cron tidak merah.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header ?? "");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET belum diset" }, { status: 503 });
  if (!authorized(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!JUMPA_ENABLED) return NextResponse.json({ dilewati: "JUMPA nonaktif" });
  try {
    const result = await runJumpaSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("JUMPA_SWEEP_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Sweep gagal" }, { status: 500 });
  }
}
