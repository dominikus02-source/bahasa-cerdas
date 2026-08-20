import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getPlayerProfile, bumpDailyStreak } from "@/lib/gamification/player";
import { evaluateBadges } from "@/lib/gamification/badge-engine";
import { listAchievements } from "@/lib/gamification/achievement-engine";
import { getBalance } from "@/lib/coins";
import { currentPeriodKeys } from "@/lib/gamification/leaderboard";

/** GET /player/profile — profil pemain BC Arena + ringkasan badge/achievement. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await bumpDailyStreak(user.id);

  const [profile, badges, achievements, coin, periods] = await Promise.all([
    getPlayerProfile(user.id),
    evaluateBadges(user.id),
    listAchievements(user.id),
    getBalance(user.id),
    currentPeriodKeys(),
  ]);

  return NextResponse.json({
    profile: { ...profile, coin },
    summary: {
      badges: {
        total: badges.length,
        unlocked: badges.filter((b) => b.unlocked).length,
      },
      achievements: {
        total: achievements.length,
        completed: achievements.filter((a) => a.completed).length,
        claimed: achievements.filter((a) => a.claimed).length,
      },
    },
    periods,
  });
}
