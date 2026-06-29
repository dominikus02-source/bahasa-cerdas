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
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const assignment = await db.quizAssignment.findUnique({
      where: { id },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
        group: { select: { id: true, name: true } },
      },
    });

    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    const memberships = await db.groupMember.findMany({
      where: { userId: dbUser.id, groupId: assignment.groupId },
    });
    if (memberships.length === 0) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    if (!assignment.isPublished) {
      return NextResponse.json({ error: "Quiz not published yet" }, { status: 403 });
    }

    const now = new Date();
    if (assignment.dueDate && new Date(assignment.dueDate) < now) {
      return NextResponse.json({ error: "Quiz deadline has passed" }, { status: 403 });
    }

    const existingSub = await db.quizSubmission.findFirst({
      where: {
        assignmentId: id,
        userId: dbUser.id,
        status: { in: ["IN_PROGRESS", "SUBMITTED", "GRADED"] },
      },
    });

    if (existingSub?.status === "SUBMITTED" || existingSub?.status === "GRADED") {
      if (existingSub.attemptNumber >= assignment.quiz.maxAttempts && assignment.quiz.maxAttempts > 0) {
        return NextResponse.json({ error: "Max attempts reached", submission: existingSub }, { status: 403 });
      }
    }

    const soalIds = assignment.quiz.questions.filter(q => q.sourceType === "SOAL").map(q => q.sourceId);
    const soals = soalIds.length > 0 ? await db.soal.findMany({ where: { id: { in: soalIds } } }) : [];
    const soalMap = new Map(soals.map(s => [s.id, s]));

    const questions = assignment.quiz.questions.map(q => ({
      id: q.id,
      orderIndex: q.orderIndex,
      points: q.points,
      sourceType: q.sourceType,
      sourceId: q.sourceId,
      soal: q.sourceType === "SOAL" ? sanitizeSoalForStudent(soalMap.get(q.sourceId)) : null,
      customText: q.customText,
      customType: q.customType,
      customOptions: q.customOptions,
    }));

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        dueDate: assignment.dueDate,
        notes: assignment.notes,
        group: assignment.group,
      },
      quiz: {
        id: assignment.quiz.id,
        title: assignment.quiz.title,
        description: assignment.quiz.description,
        type: assignment.quiz.type,
        timeLimit: assignment.quiz.timeLimit,
        shuffleQuestions: assignment.quiz.shuffleQuestions,
        shuffleOptions: assignment.quiz.shuffleOptions,
        showResults: assignment.quiz.showResults,
        maxAttempts: assignment.quiz.maxAttempts,
      },
      questions,
      existingSubmission: existingSub || null,
    });
  } catch (error) {
    console.error("GET /api/murid/quiz/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

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
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { action } = body;

    const assignment = await db.quizAssignment.findUnique({
      where: { id },
      include: { quiz: true },
    });
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    if (action === "start") {
      const existing = await db.quizSubmission.findFirst({
        where: { assignmentId: id, userId: dbUser.id, status: "IN_PROGRESS" },
      });
      if (existing) {
        return NextResponse.json({ submission: existing, resumed: true });
      }

      const maxAttempt = await db.quizSubmission.aggregate({
        where: { assignmentId: id, userId: dbUser.id },
        _max: { attemptNumber: true },
      });

      const submission = await db.quizSubmission.create({
        data: {
          assignmentId: id,
          userId: dbUser.id,
          status: "IN_PROGRESS",
          attemptNumber: (maxAttempt._max.attemptNumber || 0) + 1,
          startedAt: new Date(),
        },
      });

      return NextResponse.json({ submission }, { status: 201 });
    }

    if (action === "answer") {
      const { quizQuestionId, answerIndex, answerText } = body;
      if (!quizQuestionId) return NextResponse.json({ error: "quizQuestionId required" }, { status: 400 });

      const submission = await db.quizSubmission.findFirst({
        where: { assignmentId: id, userId: dbUser.id, status: "IN_PROGRESS" },
      });
      if (!submission) return NextResponse.json({ error: "No active submission" }, { status: 400 });

      const existingAnswer = await db.quizAnswer.findFirst({
        where: { submissionId: submission.id, quizQuestionId },
      });

      let answer;
      if (existingAnswer) {
        answer = await db.quizAnswer.update({
          where: { id: existingAnswer.id },
          data: {
            answerIndex: answerIndex !== undefined ? answerIndex : null,
            answerText: answerText || null,
          },
        });
      } else {
        answer = await db.quizAnswer.create({
          data: {
            submissionId: submission.id,
            quizQuestionId,
            answerIndex: answerIndex !== undefined ? answerIndex : null,
            answerText: answerText || null,
          },
        });
      }

      return NextResponse.json({ answer });
    }

    if (action === "submit") {
      const submission = await db.quizSubmission.findFirst({
        where: { assignmentId: id, userId: dbUser.id, status: "IN_PROGRESS" },
        include: {
          answers: true,
          assignment: {
            include: {
              quiz: {
                include: { questions: { orderBy: { orderIndex: "asc" } } },
              },
            },
          },
        },
      });
      if (!submission) return NextResponse.json({ error: "No active submission" }, { status: 400 });

      const soalIds = submission.assignment.quiz.questions
        .filter(q => q.sourceType === "SOAL")
        .map(q => q.sourceId);
      const soals = soalIds.length > 0 ? await db.soal.findMany({ where: { id: { in: soalIds } } }) : [];
      const soalMap = new Map(soals.map(s => [s.id, s]));

      let correctCount = 0;
      let wrongCount = 0;
      let skippedCount = 0;
      let pointsEarned = 0;
      let pointsTotal = 0;

      for (const qq of submission.assignment.quiz.questions) {
        pointsTotal += qq.points;
        const answer = submission.answers.find(a => a.quizQuestionId === qq.id);

        if (!answer || (answer.answerIndex === null && !answer.answerText)) {
          skippedCount++;
          continue;
        }

        if (qq.sourceType === "SOAL") {
          const soal = soalMap.get(qq.sourceId);
          if (soal) {
            const isCorrect = String(answer.answerIndex) === String(soal.correctAnswer);
            if (isCorrect) {
              correctCount++;
              pointsEarned += qq.points;
              await db.quizAnswer.update({
                where: { id: answer.id },
                data: { isCorrect: true, pointsEarned: qq.points },
              });
            } else {
              wrongCount++;
              await db.quizAnswer.update({
                where: { id: answer.id },
                data: { isCorrect: false, pointsEarned: 0 },
              });
            }
          }
        } else if (qq.customAnswer) {
          const isCorrect = String(answer.answerIndex) === String(qq.customAnswer);
          if (isCorrect) {
            correctCount++;
            pointsEarned += qq.points;
            await db.quizAnswer.update({
              where: { id: answer.id },
              data: { isCorrect: true, pointsEarned: qq.points },
            });
          } else {
            wrongCount++;
            await db.quizAnswer.update({
              where: { id: answer.id },
              data: { isCorrect: false, pointsEarned: 0 },
            });
          }
        }
      }

      const score = pointsTotal > 0 ? (pointsEarned / pointsTotal) * 100 : 0;
      const timeSpent = submission.startedAt ? Math.floor((Date.now() - submission.startedAt.getTime()) / 1000) : 0;

      const updated = await db.quizSubmission.update({
        where: { id: submission.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          score,
          pointsEarned,
          pointsTotal,
          correctCount,
          wrongCount,
          skippedCount,
          timeSpent,
        },
      });

      return NextResponse.json({ submission: updated, score, correctCount, wrongCount, skippedCount, pointsEarned, pointsTotal });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/murid/quiz/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
