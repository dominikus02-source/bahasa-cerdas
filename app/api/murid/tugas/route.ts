import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const memberships = await db.groupMember.findMany({
      where: { userId: dbUser.id },
      select: { groupId: true },
    });
    const groupIds = memberships.map(m => m.groupId);

    if (groupIds.length === 0) {
      return NextResponse.json({ assignments: [], available: [], inProgress: [], completed: [] });
    }

    const assignments = await db.quizAssignment.findMany({
      where: {
        groupId: { in: groupIds },
        isPublished: true,
      },
      include: {
        quiz: {
          select: {
            id: true, title: true, description: true, type: true,
            timeLimit: true, maxAttempts: true, passingScore: true,
            kelas: true, subject: true, topik: true, difficulty: true,
            _count: { select: { questions: true } },
          },
        },
        group: { select: { id: true, name: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { assignedAt: "desc" },
    });

    const submissions = await db.quizSubmission.findMany({
      where: { userId: dbUser.id },
      select: { assignmentId: true, status: true, score: true, attemptNumber: true, submittedAt: true },
    });
    const submissionMap = new Map(submissions.map(s => [s.assignmentId, s]));

    const now = new Date();
    const available: any[] = [];
    const inProgress: any[] = [];
    const completed: any[] = [];

    for (const a of assignments) {
      const sub = submissionMap.get(a.id);
      const item = {
        ...a,
        submission: sub || null,
        isOverdue: a.dueDate ? new Date(a.dueDate) < now : false,
      };

      if (sub?.status === "SUBMITTED" || sub?.status === "GRADED") {
        completed.push(item);
      } else if (sub?.status === "IN_PROGRESS") {
        inProgress.push(item);
      } else {
        available.push(item);
      }
    }

    return NextResponse.json({ available, inProgress, completed });
  } catch (error) {
    console.error("GET /api/murid/tugas error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
