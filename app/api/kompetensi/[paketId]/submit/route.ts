import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import type { AttemptSnapshot, AttemptAnswerDetails, UserAnswerRecord } from "@/lib/types/snapshot";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paketId: string }> }
) {
  try {
    const { paketId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const latestResult = await db.progresKompetensi.findFirst({
      where: { userId: dbUser.id, paketId },
      orderBy: { attemptNumber: "desc" },
      include: {
        paket: { select: { title: true, type: true } },
      },
    });

    if (!latestResult) {
      return NextResponse.json({ result: null });
    }

    return NextResponse.json({
      result: {
        id: latestResult.id,
        paketId: latestResult.paketId,
        paketTitle: latestResult.paket?.title,
        paket: latestResult.paket,
        attemptNumber: latestResult.attemptNumber,
        totalScore: latestResult.totalScore,
        rawScore: latestResult.rawScore,
        maxScore: latestResult.maxScore,
        percentage: latestResult.percentage,
        predikat: latestResult.predikat,
        status: latestResult.status,
        sectionScores: latestResult.sectionScores,
        startedAt: latestResult.startedAt?.toISOString(),
        finishedAt: latestResult.finishedAt?.toISOString(),
        timeSpent: latestResult.timeSpent,
        certificate: undefined,
      },
    });
  } catch (error) {
    console.error("GET /api/kompetensi/[paketId]/submit error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

const UKBI_PREDIKAT_MAP: Record<string, { predikat: string; predikatLama: string; min: number }> = {
  ISTIMEWA:    { predikat: "Istimewa", predikatLama: "I", min: 725 },
  SANGAT_UNGGUL: { predikat: "Sangat Unggul", predikatLama: "II", min: 641 },
  UNGGUL:      { predikat: "Unggul", predikatLama: "III", min: 578 },
  MADYA:       { predikat: "Madya", predikatLama: "IV", min: 482 },
  SEMENJANA:   { predikat: "Semenjana", predikatLama: "V", min: 405 },
  MARGINAL:    { predikat: "Marginal", predikatLama: "VI", min: 326 },
  TERBATAS:    { predikat: "Terbatas", predikatLama: "VII", min: 0 },
};

const TKA_PREDIKAT_MAP: Record<string, { predikat: string; min: number }> = {
  A: { predikat: "Sangat Baik", min: 85 },
  B: { predikat: "Baik", min: 70 },
  C: { predikat: "Cukup", min: 55 },
  D: { predikat: "Kurang", min: 0 },
};

function getUKBIPredikat(score: number): { predikat: string; predikatLama: string } {
  if (score >= 725) return { predikat: "Istimewa", predikatLama: "I" };
  if (score >= 641) return { predikat: "Sangat Unggul", predikatLama: "II" };
  if (score >= 578) return { predikat: "Unggul", predikatLama: "III" };
  if (score >= 482) return { predikat: "Madya", predikatLama: "IV" };
  if (score >= 405) return { predikat: "Semenjana", predikatLama: "V" };
  if (score >= 326) return { predikat: "Marginal", predikatLama: "VI" };
  return { predikat: "Terbatas", predikatLama: "VII" };
}

function getTKAPredikat(percentage: number): string {
  if (percentage >= 85) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 55) return "C";
  return "D";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ paketId: string }> }
) {
  try {
    const { paketId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { answers, timeSpent } = await req.json();

    const paket = await db.paketKompetensi.findUnique({ where: { id: paketId } });
    if (!paket) {
      return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });
    }

    let session = await db.testSession.findUnique({
      where: { userId_paketId: { userId: dbUser.id, paketId } },
    });

    if (!session) {
      session = await db.testSession.create({
        data: {
          userId: dbUser.id,
          paketId,
          status: "COMPLETED",
          startedAt: new Date(),
          finishedAt: new Date(),
          answers: answers || {},
        },
      });
    } else {
      session = await db.testSession.update({
        where: { id: session.id },
        data: { status: "COMPLETED", finishedAt: new Date() },
      });
    }

    const rawSnapshot = session.questionSnapshot as AttemptSnapshot | null;
    const snapshotQuestions = rawSnapshot?.questions || null;

    const allAnswerIds = Object.keys(answers || {});
    const sectionScores: Record<string, { correct: number; total: number; score: number }> = {};
    let totalCorrect = 0;
    let totalQuestions = 0;
    let rawScore = 0;

    if (paket.type.includes("UKBI")) {
      let questions: any[];
      const userAnswerRecords: UserAnswerRecord[] = [];
      if (snapshotQuestions && snapshotQuestions.length > 0) {
        questions = snapshotQuestions.filter(q => allAnswerIds.includes(q.id));
      } else {
        console.warn(`[snapshot] No snapshot for session ${session.id}, falling back to live DB`);
        questions = await db.uKBIQuestion.findMany({
          where: { id: { in: allAnswerIds }, isActive: true },
        });
      }

      for (const q of questions) {
        const userAnswer = answers[q.id];
        const isCorrect = userAnswer === q.correctAnswer;
        const diff = String(q.difficulty || "MEDIUM");
        const weight = diff === "EASY" ? 1 : diff === "MEDIUM" ? 1.5 : diff === "HARD" ? 2 : 2.5;
        const score = isCorrect ? weight * 10 : 0;
        rawScore += score;
        totalQuestions++;

        if (isCorrect) {
          totalCorrect++;
          const seksiKey = q.seksi || q.section || "UMUM";
          if (!sectionScores[seksiKey]) sectionScores[seksiKey] = { correct: 0, total: 0, score: 0 };
          sectionScores[seksiKey].correct++;
          sectionScores[seksiKey].score += score;
        }
        const seksiKey = q.seksi || q.section || "UMUM";
        if (!sectionScores[seksiKey]) sectionScores[seksiKey] = { correct: 0, total: 0, score: 0 };
        sectionScores[seksiKey].total++;

        userAnswerRecords.push({
          questionId: q.id,
          selectedOptionId: userAnswer,
          isCorrect,
          score,
          section: seksiKey,
        });

        await db.testAnswer.create({
          data: {
            userId: dbUser.id,
            sessionId: session.id,
            paketId,
            questionId: q.id,
            questionType: q.type,
            answer: userAnswer,
            isCorrect,
            score,
            seksi: seksiKey,
          },
        });
      }

      const maxPossible = totalQuestions * 2.5 * 10;
      const percentage = maxPossible > 0 ? (rawScore / maxPossible) * 100 : 0;
      const totalScore = Math.round(percentage * 8);
      const { predikat, predikatLama } = getUKBIPredikat(totalScore);

      const seksiScores: Record<string, any> = {};
      for (const [seksi, data] of Object.entries(sectionScores)) {
        const sd = data as { correct: number; total: number; score: number };
        seksiScores[seksi] = {
          benar: sd.correct,
          salah: sd.total - sd.correct,
          total: sd.total,
          skor: sd.score,
          score: sd.score,
          percentage: sd.total > 0 ? Math.round((sd.correct / sd.total) * 100) : 0,
        };
      }

      const existingResult = await db.progresKompetensi.findFirst({
        where: { userId: dbUser.id, paketId },
        orderBy: { attemptNumber: "desc" },
      });

      const nextAttempt = (existingResult?.attemptNumber || 0) + 1;

      const attemptAnswerDetails: AttemptAnswerDetails = {
        version: "1.0",
        attemptId: `${paketId}-${nextAttempt}-${Date.now()}`,
        sessionId: session.id,
        paketId,
        userId: dbUser.id,
        product: "UKBI",
        startedAt: session.startedAt?.toISOString() || new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        seed: rawSnapshot?.seed || "",
        snapshot: rawSnapshot ? rawSnapshot : undefined,
        userAnswers: userAnswerRecords,
        scoring: {
          totalQuestions,
          correctCount: totalCorrect,
          rawScore,
          percentage,
          scaledScore: totalScore,
          predicate: predikat,
          sectionBreakdown: seksiScores as Record<string, unknown>,
        },
        audit: {
          scoredFromSnapshot: true,
          liveDbFallbackUsed: !rawSnapshot,
          snapshotVersion: "1.0",
        },
      };

      const progres = await db.progresKompetensi.create({
        data: {
          userId: dbUser.id,
          paketId,
          attemptNumber: nextAttempt,
          status: "COMPLETED",
          totalScore,
          rawScore,
          maxScore: maxPossible,
          percentage,
          predikat,
          predikatLama,
          sectionScores: seksiScores,
          answerDetails: JSON.parse(JSON.stringify(attemptAnswerDetails)),
          finishedAt: new Date(),
          timeSpent: timeSpent || 0,
        },
      });

      let certificate = null;
      if (totalScore >= 482) {
        const certNo = `BC-UKBI-${new Date().getFullYear()}-${String(progres.id).slice(-8).toUpperCase()}`;
        certificate = await db.kompetensiCertificate.create({
          data: {
            userId: dbUser.id,
            paketId,
            progresId: progres.id,
            score: totalScore,
            predikat,
            percentage,
            certificateNo: certNo,
          },
        });
      }

      await db.user.update({
        where: { id: dbUser.id },
        data: { xp: { increment: Math.round(rawScore / 10) } },
      });

      return NextResponse.json({
        success: true,
        result: {
          totalScore,
          percentage: Math.round(percentage * 100) / 100,
          predikat,
          predikatLama,
          benar: totalCorrect,
          salah: totalQuestions - totalCorrect,
          total: totalQuestions,
          rawScore,
          seksiScores,
          passed: totalScore >= 482,
        },
        certificate,
        attemptNumber: nextAttempt,
      });
    }

    if (paket.type.includes("TKA")) {
      let questions: any[];
      const userAnswerRecords: UserAnswerRecord[] = [];
      if (snapshotQuestions && snapshotQuestions.length > 0) {
        questions = snapshotQuestions.filter(q => allAnswerIds.includes(q.id));
      } else {
        console.warn(`[snapshot] No snapshot for session ${session.id}, falling back to live DB`);
        questions = await db.tKAQuestion.findMany({
          where: { id: { in: allAnswerIds }, isActive: true },
        });
      }

      for (const q of questions) {
        const userAnswer = answers[q.id];
        const isCorrect = userAnswer === q.correctAnswer;
        const score = isCorrect ? (q.weight || 1) * 10 : 0;
        rawScore += score;
        totalQuestions++;

        if (isCorrect) totalCorrect++;
        const kompetensis = q.kompetensi || q.section || "UMUM";
        if (!sectionScores[kompetensis]) sectionScores[kompetensis] = { correct: 0, total: 0, score: 0 };
        sectionScores[kompetensis].total++;
        if (isCorrect) {
          sectionScores[kompetensis].correct++;
          sectionScores[kompetensis].score += score;
        }

        userAnswerRecords.push({
          questionId: q.id,
          selectedOptionId: userAnswer,
          isCorrect,
          score,
          kompetensi: kompetensis,
        });

        await db.testAnswer.create({
          data: {
            userId: dbUser.id,
            sessionId: session.id,
            paketId,
            questionId: q.id,
            questionType: q.type,
            answer: userAnswer,
            isCorrect,
            score,
            seksi: kompetensis,
          },
        });
      }

      const maxPossible = totalQuestions * 2;
      const percentage = maxPossible > 0 ? (rawScore / maxPossible) * 100 : 0;
      const predikat = getTKAPredikat(percentage);

      const existingResult = await db.progresKompetensi.findFirst({
        where: { userId: dbUser.id, paketId },
        orderBy: { attemptNumber: "desc" },
      });

      const nextAttempt = (existingResult?.attemptNumber || 0) + 1;

      const attemptAnswerDetails: AttemptAnswerDetails = {
        version: "1.0",
        attemptId: `${paketId}-${nextAttempt}-${Date.now()}`,
        sessionId: session.id,
        paketId,
        userId: dbUser.id,
        product: "TKA",
        startedAt: session.startedAt?.toISOString() || new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        seed: rawSnapshot?.seed || "",
        snapshot: rawSnapshot ? rawSnapshot : undefined,
        userAnswers: userAnswerRecords,
        scoring: {
          totalQuestions,
          correctCount: totalCorrect,
          rawScore,
          percentage,
          predicate: predikat,
          competencyBreakdown: sectionScores as Record<string, unknown>,
        },
        audit: {
          scoredFromSnapshot: true,
          liveDbFallbackUsed: !rawSnapshot,
          snapshotVersion: "1.0",
        },
      };

      const progres = await db.progresKompetensi.create({
        data: {
          userId: dbUser.id,
          paketId,
          attemptNumber: nextAttempt,
          status: "COMPLETED",
          totalScore: Math.round(percentage),
          rawScore,
          maxScore: maxPossible,
          percentage,
          predikat,
          seksiScores: Object.fromEntries(
          Object.entries(sectionScores).map(([key, val]) => [
            key,
            { ...val, percentage: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0 },
          ])
        ),
          answerDetails: JSON.parse(JSON.stringify(attemptAnswerDetails)),
          finishedAt: new Date(),
          timeSpent: timeSpent || 0,
        },
      });

      let certificate = null;
      if (percentage >= paket.passingScore) {
        const certNo = `BC-TKA-${new Date().getFullYear()}-${String(progres.id).slice(-8).toUpperCase()}`;
        certificate = await db.kompetensiCertificate.create({
          data: {
            userId: dbUser.id,
            paketId,
            progresId: progres.id,
            score: Math.round(percentage),
            predikat,
            percentage,
            certificateNo: certNo,
          },
        });
      }

      await db.user.update({
        where: { id: dbUser.id },
        data: { xp: { increment: Math.round(rawScore) } },
      });

      return NextResponse.json({
        success: true,
        result: {
          totalScore: Math.round(percentage),
          percentage: Math.round(percentage * 100) / 100,
          predikat,
          benar: totalCorrect,
          salah: totalQuestions - totalCorrect,
          total: totalQuestions,
          rawScore,
          seksiScores: Object.fromEntries(
            Object.entries(sectionScores).map(([key, val]) => [
              key,
              { ...val, percentage: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0 },
            ])
          ),
          passed: percentage >= paket.passingScore,
          passingScore: paket.passingScore,
        },
        certificate,
        attemptNumber: nextAttempt,
      });
    }

    return NextResponse.json({ error: "Tipe paket tidak dikenali" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/kompetensi/[paketId]/submit error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}