import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

export async function POST(
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

    const quiz = await db.quiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });
    if (!quiz || quiz.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const newQuiz = await db.quiz.create({
      data: {
        title: `${quiz.title} (Copy)`,
        description: quiz.description,
        type: quiz.type,
        status: "DRAFT",
        timeLimit: quiz.timeLimit,
        shuffleQuestions: quiz.shuffleQuestions,
        shuffleOptions: quiz.shuffleOptions,
        showResults: quiz.showResults,
        showCorrectAnswer: quiz.showCorrectAnswer,
        passingScore: quiz.passingScore,
        maxAttempts: quiz.maxAttempts,
        randomizeFromPool: quiz.randomizeFromPool,
        poolSize: quiz.poolSize,
        kelas: quiz.kelas,
        subject: quiz.subject,
        topik: quiz.topik,
        KD: quiz.KD,
        difficulty: quiz.difficulty,
        thumbnailUrl: quiz.thumbnailUrl,
        creatorId: dbUser.id,
      },
    });

    if (quiz.questions.length > 0) {
      await db.quizQuestion.createMany({
        data: quiz.questions.map((q, i) => ({
          quizId: newQuiz.id,
          sourceType: q.sourceType,
          sourceId: q.sourceId,
          customText: q.customText,
          customType: q.customType,
          customOptions: q.customOptions as any,
          customAnswer: q.customAnswer,
          customExplanation: q.customExplanation,
          points: q.points,
          orderIndex: i,
        })) as any,
      });
    }

    return NextResponse.json({ quiz: newQuiz }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guru/quiz/[id]/duplicate error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
