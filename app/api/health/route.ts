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
    return NextResponse.json(
      { status: "ok", db: "up", latencyMs: Date.now() - startedAt, timestamp: new Date().toISOString() },
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
