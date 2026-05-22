import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

const LEAGUE_THRESHOLDS = [
  { tier: "DIAMOND", minXP: 10000 },
  { tier: "GOLD", minXP: 5000 },
  { tier: "SILVER", minXP: 2000 },
  { tier: "BRONZE", minXP: 0 },
] as const;

const LEAGUE_LABELS: Record<string, string> = {
  BRONZE: "Perunggu", SILVER: "Perak", GOLD: "Emas", DIAMOND: "Berlian",
};
const LEAGUE_EMOJIS: Record<string, string> = {
  BRONZE: "🥉", SILVER: "🥈", GOLD: "🥇", DIAMOND: "💎",
};

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tier = LEAGUE_THRESHOLDS.find(t => user.xp >= t.minXP)?.tier || "BRONZE";
    const threshold = LEAGUE_THRESHOLDS.find(t => t.tier === tier)!;
    const nextTier = LEAGUE_THRESHOLDS[LEAGUE_THRESHOLDS.findIndex(t => t.tier === tier) - 1];

    const peers = await db.user.findMany({
      where: {
        xp: { gte: threshold.minXP },
        ...(nextTier ? { xp: { lt: nextTier.minXP } } : {}),
      },
      select: { id: true, fullName: true, avatar: true, xp: true, level: true },
      orderBy: { xp: "desc" },
      take: 30,
    });

    const userRank = peers.findIndex(p => p.id === user.id) + 1;

    const promoted = peers.length >= 30 && userRank <= 3 && tier !== "DIAMOND";
    const demoted = userRank > peers.length * 0.8 && tier !== "BRONZE";

    return NextResponse.json({
      tier,
      label: LEAGUE_LABELS[tier],
      emoji: LEAGUE_EMOJIS[tier],
      rank: userRank || peers.length,
      total: peers.length,
      peers,
      promoted,
      demoted,
      xpToNext: nextTier ? nextTier.minXP - user.xp : 0,
      nextTier: nextTier ? LEAGUE_LABELS[nextTier.tier] : null,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
