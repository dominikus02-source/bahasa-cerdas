import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== "GURU") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const paketId = searchParams.get("paketId");
    if (!paketId) return NextResponse.json({ error: "paketId required" }, { status: 400 });

    // Get results from the test sessions
    const results = await db.progresKompetensi.findMany({
      where: { paketId },
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { percentage: "desc" },
      take: 50,
    });

    return NextResponse.json({
      results: results.map(r => ({
        id: r.id,
        userId: r.userId,
        user: r.user,
        score: r.percentage || r.totalScore || 0,
        status: r.status,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        timeSpent: r.timeSpent,
      })),
    });
  } catch { return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}
