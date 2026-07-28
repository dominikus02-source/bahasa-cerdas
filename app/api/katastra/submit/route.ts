import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calcLevel, calcLeagueFromXP, calcXpForNextLevel } from "@/lib/xp";
import { getUser } from "@/lib/supabase/server";
import { applyXpBoost } from "@/lib/xp-boost";

export async function POST(req: NextRequest) {
  try {
    const dbUser = await getUser();
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { score, correct, wrong, maxStreak, mode } = await req.json();
    if (score == null) return NextResponse.json({ error: "Score required" }, { status: 400 });

    const baseXp = Math.max(0, correct * 15 - wrong * 5);
    const streakBonus = Math.min(maxStreak || 0, 10) * 5;
    const rawXp = baseXp + streakBonus + (score >= 100 ? 10 : 0);
    // Dikalikan dulu, supaya level & liga di bawah memakai XP akhir.
    const { xp: totalXp, boosted } = await applyXpBoost(dbUser.id, rawXp);

    const now = new Date();
    const lastActive = dbUser.lastActiveAt;
    let newStreak = dbUser.streak;

    if (lastActive) {
      const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        // already played today, keep streak
      } else if (diffDays === 1) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    const oldLevel = dbUser.level;
    const newXp = dbUser.xp + totalXp;
    const newLevel = calcLevel(newXp);
    const levelUp = newLevel > oldLevel;
    const newLeague = calcLeagueFromXP(newXp);

    await db.user.update({
      where: { id: dbUser.id },
      data: {
        xp: newXp,
        level: newLevel,
        streak: newStreak,
        lastActiveAt: now,
        league: newLeague,
      },
    });

    return NextResponse.json({
      xpEarned: totalXp,
      baseXp: rawXp,
      boosted,
      totalXp: newXp,
      oldLevel,
      newLevel,
      levelUp,
      streak: newStreak,
      league: newLeague,
      xpForNextLevel: calcXpForNextLevel(newLevel),
      currentXp: newXp,
    });
  } catch (error) {
    console.error("KataStra submit error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
