import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type") || "global";

    const users = await db.user.findMany({
      where: { role: "MURID" },
      orderBy: { xp: "desc" },
      take: limit,
      select: {
        id: true,
        fullName: true,
        avatar: true,
        xp: true,
        level: true,
        streak: true,
        league: true,
      },
    });

    const ranked = users.map((u, i) => ({
      rank: i + 1,
      name: u.fullName,
      avatar: u.avatar,
      xp: u.xp,
      level: u.level,
      streak: u.streak,
      league: u.league,
    }));

    return NextResponse.json({ data: ranked });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
