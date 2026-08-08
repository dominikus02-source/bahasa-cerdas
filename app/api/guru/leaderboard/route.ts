import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getTeacherLeaderboard, type TeacherLeaderboardPeriod } from "@/lib/gamification/teacher-xp";
import { isTeacherOrStudent } from "@/lib/teacher/students";

const PERIODS: TeacherLeaderboardPeriod[] = ["ALL_TIME", "WEEKLY", "SEASON"];

/** GET /api/guru/leaderboard — peringkat guru berdasarkan TEACHER XP (sumber
 * GURU_* di XPTransaction), BUKAN Player XP. Role-gated guru/founder.
 * Query: ?period=ALL_TIME|WEEKLY|SEASON (default ALL_TIME, backward compatible). */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTeacherOrStudent(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const periodParam = new URL(req.url).searchParams.get("period") as TeacherLeaderboardPeriod | null;
  const period = periodParam && PERIODS.includes(periodParam) ? periodParam : "ALL_TIME";

  const { entries, myRank, myXp, participants } = await getTeacherLeaderboard({ limit: 20, selfUserId: user.id, period });

  return NextResponse.json({ entries, myRank, myXp, participants, period });
}