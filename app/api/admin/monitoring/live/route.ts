/**
 * GET /api/admin/monitoring/live — real-time load snapshot for the admin panel.
 *
 * Read-only aggregation over existing tables (no schema changes):
 *  - activeUsers: distinct users with lastActiveAt within a window (5/15/60 min)
 *  - aiRequests:  AIUsage rows in the last minute + error rate + avg latency
 *  - aiQueue:     AIJob rows currently PENDING / PROCESSING (backlog signal)
 *  - throughput:  AI requests per minute over the last 15 min (sparkline)
 *
 * Auth: Founder only (mirrors /api/admin/ai-analytics).
 * Meant to be polled every ~5–10s by the dashboard page.
 */
import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db as prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user || !user.isFounder) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const now = Date.now();
  const min = (m: number) => new Date(now - m * 60_000);

  try {
    const [
      active5m,
      active15m,
      active60m,
      aiLastMin,
      aiErrLastMin,
      latencyAgg,
      queuePending,
      queueProcessing,
      perMinuteRaw,
    ] = await Promise.all([
      prisma.user.count({ where: { lastActiveAt: { gte: min(5) } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: min(15) } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: min(60) } } }),
      prisma.aIUsage.count({ where: { createdAt: { gte: min(1) } } }),
      prisma.aIUsage.count({
        where: { createdAt: { gte: min(1) }, status: { in: ["error", "failed", "ERROR", "FAILED"] } },
      }),
      prisma.aIUsage.aggregate({
        where: { createdAt: { gte: min(5) }, latencyMs: { not: null } },
        _avg: { latencyMs: true },
        _count: { _all: true },
      }),
      prisma.aIJob.count({ where: { status: "PENDING" } }),
      prisma.aIJob.count({ where: { status: "PROCESSING" } }),
      // Per-minute counts for the last 15 minutes (one grouped query).
      prisma.$queryRaw<{ minute: Date; count: bigint }[]>`
        SELECT date_trunc('minute', "createdAt") AS minute, COUNT(*)::bigint AS count
        FROM "AIUsage"
        WHERE "createdAt" >= ${min(15)}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    ]);

    const perMinute = perMinuteRaw.map((r) => ({
      minute: r.minute.toISOString(),
      count: Number(r.count),
    }));

    return NextResponse.json({
      success: true,
      generatedAt: new Date(now).toISOString(),
      activeUsers: { last5m: active5m, last15m: active15m, last60m: active60m },
      ai: {
        requestsPerMinute: aiLastMin,
        errorsLastMinute: aiErrLastMin,
        errorRate: aiLastMin > 0 ? aiErrLastMin / aiLastMin : 0,
        avgLatencyMs: Math.round(latencyAgg._avg.latencyMs ?? 0),
        sampleSize5m: latencyAgg._count._all,
      },
      aiQueue: { pending: queuePending, processing: queueProcessing },
      throughput: perMinute,
    });
  } catch (error) {
    console.error("GET /api/admin/monitoring/live error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
