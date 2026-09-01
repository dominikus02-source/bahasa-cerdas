import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { sanitizeSoalForStudent } from "@/lib/security";
import { LEARNING_EVIDENCE_VERSION, replaceLearningEvidenceBatch } from "@/lib/learning-loop/evidence";
import { trackAchievement } from "@/lib/gamification/achievement-engine";

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

// Auto-start: kembalikan submission IN_PROGRESS milik user untuk assignment
// ini; buat yang baru bila belum ada (attempt berikutnya). Dipakai oleh aksi
// "answer" dan "submit" agar murid tidak pernah terjebak tanpa submission.
async function getActiveSubmission(assignmentId: string, userId: string) {
  const existing = await db.quizSubmission.findFirst({
    where: { assignmentId, userId, status: "IN_PROGRESS" },
  });
  if (existing) return existing;

  const maxAttempt = await db.quizSubmission.aggregate({
    where: { assignmentId, userId },
    _max: { attemptNumber: true },
  });

  return db.quizSubmission.create({
    data: {
      assignmentId,
      userId,
      status: "IN_PROGRESS",
      attemptNumber: (maxAttempt._max.attemptNumber || 0) + 1,
      startedAt: new Date(),
    },
  });
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

      // Auto-start bila belum ada submission aktif (mis. klien lupa memanggil
      // action "start" atau panggilan start gagal). Tanpa ini jawaban murid
      // tidak pernah tersimpan dan submit selalu gagal.
      const submission = await getActiveSubmission(id, dbUser.id);
      if (!submission) {
        return NextResponse.json({ error: "No active submission" }, { status: 400 });
      }

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
      const active = await getActiveSubmission(id, dbUser.id);
      if (!active) return NextResponse.json({ error: "No active submission" }, { status: 400 });

      const submission = await db.quizSubmission.findUnique({
        where: { id: active.id },
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
      const soals = soalIds.length > 0 ? await db.soal.findMany({ where: { id: { in: soalIds } }, select: { id: true, kodeSoal: true, correctAnswer: true } }) : [];
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

      // Evidence ditulis dari hasil QuizAnswer yang sudah dihitung server, bukan
      // dari isCorrect/score yang dikirim browser. Ditulis sebelum submission
      // menjadi SUBMITTED; bila ledger gagal, kuis tidak dinyatakan selesai.
      const finalAnswers = await db.quizAnswer.findMany({
        where: { submissionId: submission.id },
        select: { quizQuestionId: true, answerIndex: true, answerText: true, isCorrect: true, pointsEarned: true },
      });
      const finalAnswerByQuestion = new Map(finalAnswers.map((answer) => [answer.quizQuestionId, answer]));

      // STEP 6.3 — classroom quiz → LearningEvidence yang TERBACA LearnerState.
      // Kontrak: source harus cocok dengan QuestionMetadata (BANK_SOAL) dan
      // questionId = kodeSoal (metadata questionId) supaya JOIN aggregation
      // menemukan skill. Skill TIDAK diinvent: soal tanpa metadata APPROVED
      // (mis. custom/AI tanpa kodeSoal) dilewati — lebih baik tanpa evidence
      // daripada evidence palsu. Idempoten via replaceLearningEvidenceBatch
      // (deleteMany per aktivitas + createMany skipDuplicates).
      const kodeSoals = [...new Set(soals.map((s) => s.kodeSoal).filter((k): k is string => Boolean(k)))];
      const metaRows = kodeSoals.length > 0
        ? await db.questionMetadata.findMany({
            where: { source: "BANK_SOAL", status: "APPROVED", skill: { not: null }, questionId: { in: kodeSoals } },
            select: { questionId: true, skill: true, difficulty: true },
          })
        : [];
      const metaByKode = new Map(metaRows.map((m) => [m.questionId, m]));
      const soalByQuizQuestion = new Map<string, { kodeSoal: string | null }>();
      for (const q of submission.assignment.quiz.questions) {
        if (q.sourceType !== "SOAL") continue;
        const soal = soalMap.get(q.sourceId);
        if (soal) soalByQuizQuestion.set(q.id, { kodeSoal: soal.kodeSoal });
      }

      const classroomEvidence = submission.assignment.quiz.questions.flatMap((question) => {
        const answer = finalAnswerByQuestion.get(question.id);
        const soal = soalByQuizQuestion.get(question.id);
        if (!soal?.kodeSoal) return []; // tanpa kodeSoal → tanpa metadata → tanpa evidence
        const meta = metaByKode.get(soal.kodeSoal);
        if (!meta?.skill) return []; // skill tidak tersedia — DO NOT INVENT SKILL
        const selectedAnswer = answer
          ? answer.answerIndex !== null
            ? String(answer.answerIndex)
            : answer.answerText || null
          : null;
        return [{
          userId: dbUser.id,
          source: "BANK_SOAL",
          activityId: submission.id,
          questionId: soal.kodeSoal,
          selectedAnswer,
          isCorrect: answer?.isCorrect ?? null,
          score: answer?.pointsEarned ?? 0,
          skill: meta.skill as import("@prisma/client").LearningSkillType,
          difficulty: meta.difficulty ?? null,
          metadata: {
            version: LEARNING_EVIDENCE_VERSION,
            sourceType: question.sourceType,
            sourceId: question.sourceId,
            aktivitas: "CLASSROOM_QUIZ",
          },
        }];
      });

      // Bersihkan baris legacy source "LATIHAN" (evidence buta dari versi lama)
      // untuk aktivitas ini — sekali jalan, idempoten, aman.
      await db.learningEvidence.deleteMany({
        where: { userId: dbUser.id, source: "LATIHAN", activityId: submission.id },
      });
      await replaceLearningEvidenceBatch(classroomEvidence);

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

      // Achievement: track kuis milestones (fire-and-forget, best-effort).
      trackAchievement(dbUser.id, "ach-kuis-10").catch(() => {});
      trackAchievement(dbUser.id, "ach-kuis-100").catch(() => {});

      return NextResponse.json({ submission: updated, score, correctCount, wrongCount, skippedCount, pointsEarned, pointsTotal });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/murid/quiz/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
