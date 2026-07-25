import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import cache from "@/lib/redis";
import { calcLeagueFromXP } from "@/lib/xp";
import { getDisplayName } from "@/lib/nickname";

const LEAGUE_THRESHOLDS = [
  { tier: "DIAMOND", minXP: 8000 },
  { tier: "GOLD", minXP: 3000 },
  { tier: "SILVER", minXP: 1000 },
  { tier: "BRONZE", minXP: 0 },
] as const;

const LEAGUE_LABELS: Record<string, string> = {
  BRONZE: "Perunggu", SILVER: "Perak", GOLD: "Emas", DIAMOND: "Berlian",
};

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await cache.getOrSet(
      `league:peers:${user.id}`,
      async () => {
        const tier = calcLeagueFromXP(user.xp || 0);
        const threshold = LEAGUE_THRESHOLDS.find(t => t.tier === tier)!;
        const nextTier = LEAGUE_THRESHOLDS[LEAGUE_THRESHOLDS.findIndex(t => t.tier === tier) - 1];

        const peersRaw = await db.user.findMany({
          where: {
            xp: { gte: threshold.minXP },
            ...(nextTier ? { xp: { lt: nextTier.minXP } } : {}),
          },
          select: { id: true, fullName: true, nickname: true, avatar: true, xp: true, level: true },
          orderBy: { xp: "desc" },
          take: 30,
        });

        const peers = peersRaw.map(p => ({
          ...p,
          displayName: getDisplayName(p, "peer"),
        }));

        const myRank = peers.findIndex(p => p.id === user.id) + 1;

        return {
          peers,
          myRank,
          myXP: user.xp || 0,
          tier: LEAGUE_LABELS[tier] || "Perunggu",
          nextTier: nextTier ? { label: LEAGUE_LABELS[nextTier.tier] || "", minXP: nextTier.minXP } : null,
        };
      },
      120
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching league:", error);
    return NextResponse.json({ error: "Gagal memuat papan peringkat" }, { status: 500 });
  }
}
