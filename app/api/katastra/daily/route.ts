import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActive = dbUser.lastActiveAt;
    const playedToday = lastActive ? lastActive >= today : false;

    const dailyRewards = [
      { day: 1, reward: "50 XP" },
      { day: 2, reward: "75 XP" },
      { day: 3, reward: "100 XP + Mystery Box" },
      { day: 4, reward: "150 XP" },
      { day: 5, reward: "200 XP + Rare Frame" },
      { day: 6, reward: "250 XP" },
      { day: 7, reward: "500 XP + Legendary Title" },
    ];

    return NextResponse.json({
      streak: dbUser.streak,
      level: dbUser.level,
      xp: dbUser.xp,
      league: dbUser.league,
      playedToday,
      dailyRewards,
      lastActiveAt: dbUser.lastActiveAt,
    });
  } catch (error) {
    console.error("Daily GET error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
