import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { JUMPA_ENABLED } from "@/lib/features";
import { runJumpaReminders } from "@/lib/jumpa/scheduling";

/**
 * Alur JUMPA — pengingat jadwal, tiap menit dari kontainer cron VPS
 * (ops/vps/cron/root.crontab → bc-cron-call /api/cron/jumpa-reminders),
 * mekanisme yang sama dengan /api/cron/jumpa-sweep:
 * - ruang SCHEDULED yang mulai ≤ 10 menit lagi → "JUMPA 10 menit lagi"
 *   ke penerima + pembuat, sekali per jam mulai (JumpaNotice.dedupeKey).
 *
 * FAIL-CLOSED: tanpa CRON_SECRET → 503. Flag JUMPA mati → 200 "dilewati".
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
    const result = await runJumpaReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("JUMPA_REMINDERS_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Pengingat gagal" }, { status: 500 });
  }
}
