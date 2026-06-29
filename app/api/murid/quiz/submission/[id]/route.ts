import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { sanitizeSoalForStudent } from "@/lib/security";

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
    if (!dbUser || dbUser.role !== "MURID") return NextResponse.json({ error: "Murid only" }, { status: 403 });

    const submission = await db.quizSubmission.findUnique({
      where: { id },
      include: {
        assignment: {
          include: {
            quiz: {
              include: {
                questions: {
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
          },
        },
        answers: {
          orderBy: { quizQuestionId: "asc" },
        },
      },
    });

    if (!submission || submission.userId !== dbUser.id) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Enrich answers with soal data
    const soalIds = submission.assignment.quiz.questions
      .filter(q => q.sourceType === "SOAL")
      .map(q => q.sourceId);

    const soals = soalIds.length > 0 ? await db.soal.findMany({ where: { id: { in: soalIds } } }) : [];
    const soalMap = new Map(soals.map(s => [s.id, s]));

    const isPostSubmit = submission.status === "SUBMITTED" || submission.status === "GRADED";

    const enrichedAnswers = submission.answers.map(a => {
      const quizQ = submission.assignment.quiz.questions.find(q => q.id === a.quizQuestionId);
      const soal = quizQ?.sourceType === "SOAL" ? soalMap.get(quizQ.sourceId) : null;
      const safeSoal = soal ? sanitizeSoalForStudent(soal) : null;
      return {
        ...a,
        question: {
          sourceType: quizQ?.sourceType || "",
          sourceId: quizQ?.sourceId || "",
          customText: quizQ?.customText,
          customOptions: quizQ?.customOptions,
          customCorrectAnswer: quizQ?.customAnswer,
          orderIndex: quizQ?.orderIndex || 0,
          soal: safeSoal,
          ...(isPostSubmit && soal ? { correctOptionIndex: soal.options.indexOf(soal.correctAnswer) } : {}),
        },
      };
    });

    return NextResponse.json({
      submission: {
        ...submission,
        answers: enrichedAnswers,
      },
    });
  } catch (error) {
    console.error("GET /api/murid/quiz/submission/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
