import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Hanya guru" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });

    const group = await db.group.findUnique({ where: { id: groupId }, select: { teacherId: true } });
    if (!group || group.teacherId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all SUBMITTED quiz submissions for this group with answers
    const submissions = await db.quizSubmission.findMany({
      where: {
        assignment: { groupId },
        status: "SUBMITTED",
      },
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
        assignment: { include: { quiz: { select: { title: true } } } },
        answers: {
          include: {
            quizQuestion: { select: { id: true, customText: true, customOptions: true, customAnswer: true, points: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("GET /api/guru/nilai/kuis-grade error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Hanya guru" }, { status: 403 });
    }

    const body = await req.json();
    const { submissionId, answers } = body;
    // answers: [{ quizAnswerId, isCorrect, pointsEarned, teacherComment }]

    if (!submissionId || !answers?.length) {
      return NextResponse.json({ error: "submissionId dan answers wajib" }, { status: 400 });
    }

    const submission = await db.quizSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: { include: { quiz: true } } },
    });
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    let totalPoints = 0;

    for (const a of answers) {
      await db.quizAnswer.update({
        where: { id: a.quizAnswerId },
        data: {
          isCorrect: a.isCorrect,
          pointsEarned: a.pointsEarned,
          teacherComment: a.teacherComment || null,
          manuallyGraded: true,
        },
      });
      totalPoints += a.pointsEarned;
    }

    const totalPossible = await db.quizAnswer.count({ where: { submissionId } });

    await db.quizSubmission.update({
      where: { id: submissionId },
      data: {
        status: "GRADED",
        score: totalPossible > 0 ? (totalPoints / totalPossible) * 100 : 0,
        pointsEarned: totalPoints,
      },
    });

    return NextResponse.json({ success: true, score: totalPossible > 0 ? Math.round((totalPoints / totalPossible) * 100) : 0 });
  } catch (error) {
    console.error("POST /api/guru/nilai/kuis-grade error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
