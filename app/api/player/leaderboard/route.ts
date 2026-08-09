import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getLeaderboard, type LeaderboardPeriod, type LeaderboardScope } from "@/lib/gamification/leaderboard";
import { weekKey, seasonPeriodKey, weekRange, seasonRange, weekLabel, seasonLabel } from "@/lib/gamification/season";

const VALID_SCOPES = ["GLOBAL", "SCHOOL", "CLASS", "FRIENDS", "PROVINCE"] as const;
const VALID_PERIODS = ["ALL_TIME", "WEEKLY", "SEASON"] as const;

/** GET /player/leaderboard?scope=GLOBAL&period=WEEKLY&limit=20&groupId=...&province=... */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scopeParam = (searchParams.get("scope") || "GLOBAL").toUpperCase();
  const periodParam = (searchParams.get("period") || "ALL_TIME").toUpperCase();
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
  const groupId = searchParams.get("groupId") || undefined;
  const province = searchParams.get("province") || undefined;

  const scope = (VALID_SCOPES.includes(scopeParam as LeaderboardScope) ? scopeParam : "GLOBAL") as LeaderboardScope;
  const period = (VALID_PERIODS.includes(periodParam as LeaderboardPeriod) ? periodParam : "ALL_TIME") as LeaderboardPeriod;

  const entries = await getLeaderboard({ scope, period, userId: user.id, groupId, province, limit });

  // Metadata periode (WIB) untuk countdown "Berakhir dalam ..." di UI.
  const now = new Date();
  const week = weekKey(now);
  const season = seasonPeriodKey(now);
  const periodMeta = {
    now: now.toISOString(),
    week: { key: week, label: weekLabel(week), startsAt: weekRange(week).startsAt.toISOString(), endsAt: weekRange(week).endsAt.toISOString() },
    season: { key: season, label: seasonLabel(season), startsAt: seasonRange(season).startsAt.toISOString(), endsAt: seasonRange(season).endsAt.toISOString() },
  };

  return NextResponse.json({ scope, period, entries, total: entries.length, periodMeta });
}
