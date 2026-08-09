import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const quiz = await db.quiz.findUnique({ where: { id } });
    if (!quiz || quiz.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const assignments = await db.quizAssignment.findMany({
      where: { quizId: id },
      select: { id: true },
    });
    const assignmentIds = assignments.map(a => a.id);

    const submissions = await db.quizSubmission.findMany({
      where: { assignmentId: { in: assignmentIds } },
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
        assignment: { select: { id: true, groupId: true } },
        answers: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    // Calculate question stats
    const questions = await db.quizQuestion.findMany({
      where: { quizId: id },
      orderBy: { orderIndex: "asc" },
    });

    const soalIds = questions.filter(q => q.sourceType === "SOAL").map(q => q.sourceId);
    const soals = soalIds.length > 0 ? await db.soal.findMany({ where: { id: { in: soalIds } } }) : [];
    const soalMap = new Map(soals.map(s => [s.id, s]));

    const questionStats = questions.map((q, i) => {
      const answers = submissions.flatMap(s => s.answers).filter(a => a.quizQuestionId === q.id);
      const correctAnswers = answers.filter(a => a.isCorrect === true).length;
      const totalAnswers = answers.length;
      const correctRate = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      let text = "";
      if (q.sourceType === "SOAL") {
        const soal = soalMap.get(q.sourceId);
        text = soal?.text || "";
      } else {
        text = q.customText || "";
      }

      return { questionId: q.id, orderIndex: i, text, correctRate, totalAnswers, correctAnswers };
    });

    return NextResponse.json({ submissions, questionStats });
  } catch (error) {
    console.error("GET /api/guru/quiz/[id]/results error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
