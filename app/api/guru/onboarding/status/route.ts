import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

/**
 * GET /api/guru/onboarding/status?groupId=<id>
 *
 * Operational Teacher Experiment P0 #3c (student milestone visibility) & P0 #5
 * (activation telemetry). Read-only companion to the guided onboarding flow:
 * polls a group's student-join milestone so the teacher sees live first-join
 * (F5) feedback right after sharing the access code.
 *
 * Guard: GURU/founder (isTeacherOrStudent), and the group MUST be owned by the
 * caller teacher (groupId.teacherId === caller) — a teacher never sees another
 * teacher's class here.
 *
 * Response:
 * {
 *   groupId, hasGroup (false when not found),
 *   memberCount,           // distinct GroupMember count (F6 numerator source)
 *   firstJoinedAt,         // earliest GroupMember.joinedAt (F5 proxy source)
 *   firstStudentName,      // best-effort display of first joiner
 *   milestones: { m1, m3 },
 *   activated: true        // ≥1 student joined (F5 reached → class activated)
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) {
      return NextResponse.json({ error: "Hanya guru yang bisa mengakses" }, { status: 403 });
    }

    const groupId = req.nextUrl.searchParams.get("groupId");
    if (!groupId) {
      return NextResponse.json({ error: "groupId wajib diisi", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const group = await db.group.findUnique({
      where: { id: groupId },
      select: { id: true, teacherId: true },
    });

    if (!group) {
      return NextResponse.json({ groupId, hasGroup: false }, { status: 200 });
    }
    if (group.teacherId !== dbUser.id) {
      return NextResponse.json({ error: "Bukan kelas kamu" }, { status: 403 });
    }

    const members = await db.groupMember.findMany({
      where: { groupId },
      select: { joinedAt: true, user: { select: { fullName: true, nickname: true } } },
      orderBy: { joinedAt: "asc" as const },
    });

    const memberCount = members.length;
    const first = members[0] ?? null;
    const firstJoinedAt = first ? first.joinedAt : null;
    const firstStudentName =
      first && first.user.fullName && first.user.fullName.trim().length > 0
        ? first.user.fullName
        : first?.user.nickname || "";

    return NextResponse.json({
      groupId,
      hasGroup: true,
      memberCount,
      firstJoinedAt,
      firstStudentName,
      milestones: { m1: memberCount >= 1, m3: memberCount >= 3 },
      activated: memberCount >= 1,
    });
  } catch (error) {
    console.error("GET /api/guru/onboarding/status error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan saat memuat status kelas" }, { status: 500 });
  }
}
