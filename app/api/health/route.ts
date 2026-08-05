/**
 * GET /api/health — lightweight liveness/readiness probe for uptime monitors.
 * Pings the database (SELECT 1). Returns 200 when healthy, 503 when the DB is
 * unreachable. No auth so external monitors (UptimeRobot, Better Uptime, Vercel)
 * can hit it. Does not expose any sensitive data.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;

    // Kesiapan push dilaporkan di sini karena kegagalannya diam: tombol
    // "Nyalakan pengingat tugas" hanya gagal di ponsel murid, dan tidak ada cara
    // lain memeriksa dari luar apakah tabelnya sudah dibuat atau kunci VAPID
    // sudah terpasang. Hanya boolean — tidak ada nilai rahasia yang dibocorkan.
    let tabelPush = false;
    try {
      const ada = await db.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*)::bigint AS n FROM information_schema.tables
        WHERE table_name = 'PushSubscription'`;
      tabelPush = Number(ada?.[0]?.n ?? 0) > 0;
    } catch {
      tabelPush = false;
    }

    return NextResponse.json(
      {
        status: "ok",
        db: "up",
        push: {
          tabel: tabelPush,
          vapidPublik: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          vapidPrivat: !!process.env.VAPID_PRIVATE_KEY,
        },
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "degraded", db: "down", latencyMs: Date.now() - startedAt, timestamp: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
