import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getLeagueFromXP, getLevelFromXP } from "@/lib/premium";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { xpEarned, streakBonus } = body;

    const currentXP = user.xp + (xpEarned || 0);
    const newLevel = getLevelFromXP(currentXP);
    const newLeague = getLeagueFromXP(currentXP);

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        xp: currentXP,
        level: newLevel,
        league: newLeague,
        lastActiveAt: new Date(),
        streak: user.lastActiveAt ? user.streak : 1,
      },
    });

    return NextResponse.json({ xp: updated.xp, level: updated.level, league: updated.league });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}