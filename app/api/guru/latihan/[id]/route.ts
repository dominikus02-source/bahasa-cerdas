import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

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
    if (!dbUser || dbUser.role !== "GURU") return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const quiz = await db.quiz.findUnique({ where: { id, creatorId: dbUser.id, type: "LATIHAN" } });
    if (!quiz) return NextResponse.json({ error: "Latihan not found" }, { status: 404 });

    const questions = await db.quizQuestion.findMany({
      where: { quizId: id },
      orderBy: { orderIndex: "asc" },
    });

    const soalIds = questions.filter(q => q.sourceType === "SOAL").map(q => q.sourceId);
    const soals = soalIds.length > 0 ? await db.soal.findMany({ where: { id: { in: soalIds } } }) : [];
    const soalMap = new Map(soals.map(s => [s.id, s]));

    const assignments = await db.quizAssignment.findMany({
      where: { quizId: id },
      orderBy: { assignedAt: "desc" },
    });

    const assignmentIds = assignments.map(a => a.id);
    const submissions = assignmentIds.length > 0 ? await db.quizSubmission.findMany({
      where: { assignmentId: { in: assignmentIds }, status: "SUBMITTED" },
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
        answers: true,
      },
      orderBy: { score: "desc" },
    }) : [];

    const submissionByAssignment = new Map<string, typeof submissions>();
    for (const sub of submissions) {
      const existing = submissionByAssignment.get(sub.assignmentId) || [];
      existing.push(sub);
      submissionByAssignment.set(sub.assignmentId, existing);
    }

    const groups = await db.group.findMany({
      where: { id: { in: assignments.map(a => a.groupId) } },
      select: { id: true, name: true },
    });
    const groupMap = new Map(groups.map(g => [g.id, g]));

    const questionStats = questions.map((q) => {
      const soal = q.sourceType === "SOAL" ? soalMap.get(q.sourceId) : null;
      const allAnswers = submissions.flatMap(s => s.answers.filter(ans => ans.quizQuestionId === q.id));
      const total = allAnswers.length;
      const correct = allAnswers.filter(a => a.isCorrect === true).length;
      const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

      const optionCounts: Record<string, number> = {};
      const optTexts: string[] = (soal as any)?.options || [];
      allAnswers.forEach(a => {
        const key = a.answerIndex != null ? String(a.answerIndex) : a.answerText || "unanswered";
        optionCounts[key] = (optionCounts[key] || 0) + 1;
      });

      return {
        questionId: q.id,
        orderIndex: q.orderIndex,
        text: (soal as any)?.text || q.customText || "",
        options: optTexts,
        correctAnswer: (soal as any)?.correctAnswer ?? null,
        explanation: (soal as any)?.explanation || null,
        total,
        correct,
        correctRate: rate,
        wrongRate: 100 - rate,
        optionCounts,
      };
    });

    const sorted = [...questionStats].sort((a, b) => a.correctRate - b.correctRate);
    const tersulit = sorted.slice(0, 3).filter(q => q.total > 0);
    const termudah = sorted.reverse().slice(0, 3).filter(q => q.total > 0);

    const classStats = assignments.map(a => {
      const group = groupMap.get(a.groupId);
      const subs = submissionByAssignment.get(a.id) || [];
      const totalSiswa = subs.length;
      const avgScore = totalSiswa > 0
        ? Math.round(subs.reduce((s, sub) => s + (sub.score || 0), 0) / totalSiswa)
        : 0;
      const lulus = subs.filter(s => (s.score || 0) >= 70).length;

      const ranking = subs.map(s => ({
        userId: s.user.id,
        nama: s.user.fullName,
        avatar: s.user.avatar,
        score: s.score || 0,
        waktu: s.submittedAt,
      })).sort((a, b) => b.score - a.score);

      return {
        groupId: a.groupId,
        groupName: group?.name || "Unknown",
        totalSiswa,
        avgScore,
        lulus,
        tingkatKelulusan: totalSiswa > 0 ? Math.round((lulus / totalSiswa) * 100) : 0,
        ranking,
      };
    });

    const totalSubmitted = submissions.length;
    const allScores: number[] = submissions.map(s => s.score || 0).filter(Boolean);
    const rataKelas = allScores.length > 0
      ? Math.round(allScores.reduce((sum, s) => sum + s, 0) / allScores.length)
      : 0;
    const persenBenar = questionStats.length > 0
      ? Math.round(questionStats.reduce((s, q) => s + q.correctRate, 0) / questionStats.length)
      : 0;

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        topik: quiz.topik,
        kelas: quiz.kelas,
        difficulty: quiz.difficulty,
        totalSoal: questions.length,
        totalAssignments: assignments.length,
        totalSubmitted,
        rataKelas,
        persenBenar,
      },
      questionStats,
      tersulit,
      termudah,
      classStats,
    });
  } catch (error) {
    console.error("GET /api/guru/latihan/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const quiz = await db.quiz.findUnique({ where: { id, creatorId: dbUser.id } });
    if (!quiz) return NextResponse.json({ error: "Latihan not found" }, { status: 404 });

    const assignments = await db.quizAssignment.findMany({ where: { quizId: id }, select: { id: true } });
    const assignmentIds = assignments.map(a => a.id);

    if (assignmentIds.length > 0) {
      await db.quizAnswer.deleteMany({ where: { submission: { assignmentId: { in: assignmentIds } } } });
      await db.quizSubmission.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
    }
    await db.quizAssignment.deleteMany({ where: { quizId: id } });
    await db.quizQuestion.deleteMany({ where: { quizId: id } });
    await db.quiz.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/guru/latihan/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
