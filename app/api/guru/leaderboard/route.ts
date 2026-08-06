import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getTeacherLeaderboard } from "@/lib/gamification/teacher-xp";

/** GET /api/guru/leaderboard — peringkat guru berdasarkan TEACHER XP (sumber
 * GURU_* di XPTransaction), BUKAN Player XP. Role-gated guru/founder. */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "GURU" && !user.isFounder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { entries, myRank } = await getTeacherLeaderboard({ limit: 20, selfUserId: user.id });

  return NextResponse.json({ entries, myRank });
}