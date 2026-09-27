import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { upsertLearningEvidence } from "@/lib/learning-loop/evidence";
import { computeAbilityProfile, normalizeEvidence } from "@/lib/diagnostic/ability";
import {
  BASELINE_QUESTION_BANK,
  BASELINE_MINUTES,
  BASELINE_SIZE,
  BASELINE_SOURCE,
  BASELINE_VERSION,
  BASELINE_WRITING_TASK as WRITING_TASK,
  baselineWordCount,
  scoreBaselineWriting,
} from "@/lib/assessment/diagnostic-baseline";
import type { DifficultyId, QuestionTypeId } from "@/lib/question-metadata/taxonomy";
import { rateLimitRoute } from "@/lib/rate-limit";

type BaselineQuestion = {
  id: string;
  text: string;
  options: string[];
  questionType: QuestionTypeId;
  skill: "READING" | "GRAMMAR" | "VOCABULARY" | "LITERATURE";
  difficulty: DifficultyId;
  correctAnswer: string;
};

type BaselineState = {
  version: string;
  questionIds: string[];
  answered: string[];
  writingSubmitted: boolean;
  startedAt: string;
};

function publicQuestion(q: BaselineQuestion) {
  return { id: q.id, text: q.text, options: q.options, questionType: q.questionType, skill: q.skill, difficulty: q.difficulty };
}

function findQuestions(ids: string[]): BaselineQuestion[] {
  return ids.flatMap((id) => {
    const q = BASELINE_QUESTION_BANK.find((item) => item.id === id);
    return q ? [{ ...q }] : [];
  });
}

function selectBaselineQuestions(seed: string): BaselineQuestion[] {
  return [...BASELINE_QUESTION_BANK]
    .sort((a, b) => {
      const hash = (value: string) => {
        let h = 2166136261;
        for (let i = 0; i < value.length; i += 1) {
          h ^= value.charCodeAt(i);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      };
      return hash(seed + ":" + a.id) - hash(seed + ":" + b.id);
    })
    .map((q) => ({ ...q }));
}

async function findBaselineSession(userId: string) {
  return db.adaptivePracticeSession.findFirst({
    where: { userId, source: BASELINE_SOURCE, selectionVersion: BASELINE_VERSION },
    orderBy: { createdAt: "desc" },
  });
}

function stateFromSession(row: { questionIds: Prisma.JsonValue }): BaselineState | null {
  const raw = row.questionIds;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const state = raw as unknown as BaselineState;
  if (state.version !== BASELINE_VERSION || !Array.isArray(state.questionIds) || !Array.isArray(state.answered) || typeof state.writingSubmitted !== "boolean") return null;
  return state;
}

function responseFor(
  sessionId: string,
  state: BaselineState,
  questions: BaselineQuestion[],
  writingResult?: ReturnType<typeof scoreBaselineWriting> | null,
  result?: Awaited<ReturnType<typeof buildResult>>,
) {
  const currentId = state.questionIds.find((id) => !state.answered.includes(id));
  const current = currentId ? questions.find((q) => q.id === currentId) : null;
  const objectiveDone = state.answered.length >= state.questionIds.length;
  const phase = !objectiveDone ? "QUIZ" : !state.writingSubmitted ? "WRITING" : "DONE";
  return {
    status: phase,
    sessionId,
    version: BASELINE_VERSION,
    title: "Kenali Kemampuanmu",
    subtitle: "Tes awal untuk memetakan kemampuan bahasa sebelum BC menentukan pengalaman belajar berikutnya.",
    estimatedMinutes: BASELINE_MINUTES,
    answeredCount: state.answered.length,
    totalQuestions: state.questionIds.length,
    remainingQuestions: Math.max(0, state.questionIds.length - state.answered.length),
    question: phase === "QUIZ" && current ? publicQuestion(current) : null,
    writing: phase === "WRITING" ? {
      id: WRITING_TASK.id,
      title: WRITING_TASK.title,
      prompt: WRITING_TASK.prompt,
      minWords: WRITING_TASK.minWords,
      maxWords: WRITING_TASK.maxWords,
      rubric: WRITING_TASK.rubric,
    } : null,
    writingResult: phase === "DONE" ? writingResult ?? null : null,
    result: phase === "DONE" ? result ?? null : undefined,
  };
}

async function buildResult(userId: string, sessionId: string) {
  const evidence = await db.learningEvidence.findMany({
    where: { userId, source: BASELINE_SOURCE, activityId: sessionId },
    orderBy: { answeredAt: "asc" },
    select: { skill: true, difficulty: true, isCorrect: true, metadata: true, score: true },
  });
  const details = evidence.flatMap((row) =>
    row.skill && row.isCorrect !== null
      ? [{ skill: row.skill, difficulty: row.difficulty as DifficultyId | null, isCorrect: row.isCorrect, subskill: (row.metadata as { subskill?: string } | null)?.subskill ?? null }]
      : []
  );
  const profile = computeAbilityProfile(normalizeEvidence(details));
  const writing = evidence.find((row) => row.skill === "WRITING" && row.metadata && typeof row.metadata === "object");
  const writingResult = writing?.metadata && typeof writing.metadata === "object"
    ? ((writing.metadata as { writingSignal?: ReturnType<typeof scoreBaselineWriting> }).writingSignal ?? null)
    : null;
  const objective = details.filter((item) => item.skill !== "WRITING");
  return {
    objectiveAccuracy: objective.length ? objective.filter((item) => item.isCorrect).length / objective.length : null,
    profile,
    writing: writingResult,
    next: {
      message: "Profil ini adalah baseline. BC akan memperbaruinya dari bukti belajar berikutnya.",
      destinations: ["JALUR_CERDAS", "ARENA", "MENTOR_AI", "AKU_SASTRAWAN_PREMIUM"],
    },
  };
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await findBaselineSession(user.id);
  if (!session) {
    return NextResponse.json({
      status: "AVAILABLE",
      title: "Kenali Kemampuanmu",
      subtitle: "BC akan memetakan kemampuanmu terlebih dahulu. Hasilnya tidak mengunci kamu ke satu jalur belajar.",
      estimatedMinutes: BASELINE_MINUTES,
      totalQuestions: BASELINE_SIZE,
    });
  }

  const state = stateFromSession(session);
  if (!state) return NextResponse.json({ error: "Sesi baseline tidak valid" }, { status: 409 });
  const questions = findQuestions(state.questionIds);
  if (questions.length !== state.questionIds.length) return NextResponse.json({ error: "Sesi baseline tidak kompatibel dengan assessment saat ini. Silakan mulai ulang." }, { status: 409 });

  let writingResult: ReturnType<typeof scoreBaselineWriting> | null = null;
  if (state.writingSubmitted) {
    const evidence = await db.learningEvidence.findFirst({
      where: { userId: user.id, source: BASELINE_SOURCE, activityId: session.id, questionId: WRITING_TASK.id },
      select: { metadata: true },
    });
    if (evidence?.metadata && typeof evidence.metadata === "object") {
      writingResult = (evidence.metadata as { writingSignal?: ReturnType<typeof scoreBaselineWriting> }).writingSignal ?? null;
    }
  }
  const result = state.writingSubmitted ? await buildResult(user.id, session.id) : undefined;
  return NextResponse.json(responseFor(session.id, state, questions, writingResult, result));
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimitRoute(req, { maxRequests: 60, windowSeconds: 30 * 60, identifier: "bca-diagnostic-baseline-v2" });
  if (rl) return rl;

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "start";

  if (action === "start") {
    const existing = await findBaselineSession(user.id);
    if (existing) {
      const state = stateFromSession(existing);
      if (!state) return NextResponse.json({ error: "Sesi baseline tidak valid" }, { status: 409 });
      const questions = findQuestions(state.questionIds);
      if (questions.length !== state.questionIds.length) return NextResponse.json({ error: "Sesi baseline tidak kompatibel dengan assessment saat ini. Silakan mulai ulang." }, { status: 409 });
      return NextResponse.json(responseFor(existing.id, state, questions));
    }

    const questions = selectBaselineQuestions(user.id);
    if (questions.length !== BASELINE_SIZE) {
      return NextResponse.json({ status: "UNAVAILABLE", message: "Konfigurasi Tes Awal belum lengkap. Silakan coba lagi." }, { status: 503 });
    }

    const state: BaselineState = {
      version: BASELINE_VERSION,
      questionIds: questions.map((q) => q.id),
      answered: [],
      writingSubmitted: false,
      startedAt: new Date().toISOString(),
    };

    const session = await db.adaptivePracticeSession.create({
      data: {
        userId: user.id,
        source: BASELINE_SOURCE,
        selectionVersion: BASELINE_VERSION,
        targetSkill: null,
        targetSubskill: null,
        targetDifficulty: null,
        reasonCode: "BASELINE_ASSESSMENT",
        reasonText: "Baseline assessment independen untuk memetakan kemampuan bahasa sebelum menentukan pengalaman belajar.",
        questionIds: state as unknown as Prisma.InputJsonValue,
        status: "IN_PROGRESS",
        expiresAt: new Date(Date.now() + 45 * 60 * 1000),
      },
    });
    return NextResponse.json(responseFor(session.id, state, questions));
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) return NextResponse.json({ error: "sessionId wajib diisi" }, { status: 400 });

  const session = await db.adaptivePracticeSession.findFirst({
    where: { id: sessionId, userId: user.id, source: BASELINE_SOURCE, selectionVersion: BASELINE_VERSION },
  });
  if (!session) return NextResponse.json({ error: "Sesi baseline tidak ditemukan" }, { status: 404 });
  if (session.status === "COMPLETED") return NextResponse.json({ error: "Sesi baseline sudah selesai" }, { status: 409 });
  if (session.expiresAt < new Date()) return NextResponse.json({ error: "Sesi baseline sudah kedaluwarsa" }, { status: 409 });

  const state = stateFromSession(session);
  if (!state) return NextResponse.json({ error: "Sesi baseline tidak valid" }, { status: 409 });

  if (action === "answer") {
    const questionId = typeof body.questionId === "string" ? body.questionId : "";
    const answer = typeof body.answer === "string" || typeof body.answer === "number" ? String(body.answer) : "";
    if (!state.questionIds.includes(questionId) || state.answered.includes(questionId)) return NextResponse.json({ error: "Soal tidak valid atau sudah dijawab" }, { status: 409 });

    const question = BASELINE_QUESTION_BANK.find((item) => item.id === questionId);
    if (!question) return NextResponse.json({ error: "Soal baseline tidak ditemukan" }, { status: 409 });

    const correct = answer === question.correctAnswer;
    await upsertLearningEvidence({
      userId: user.id,
      source: BASELINE_SOURCE,
      activityId: session.id,
      questionId,
      selectedAnswer: answer,
      isCorrect: correct,
      score: correct ? 1 : 0,
      skill: question.skill,
      difficulty: question.difficulty,
      metadata: { subskill: null, assessmentVersion: BASELINE_VERSION },
    });

    state.answered = [...state.answered, questionId];
    await db.adaptivePracticeSession.update({
      where: { id: session.id },
      data: { questionIds: state as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json(responseFor(session.id, state, findQuestions(state.questionIds)));
  }

  if (action === "writing") {
    if (state.answered.length < state.questionIds.length) return NextResponse.json({ error: "Selesaikan seluruh bagian objektif terlebih dahulu." }, { status: 409 });
    if (state.writingSubmitted) return NextResponse.json({ error: "Tulisan sudah dikirim." }, { status: 409 });

    const text = typeof body.text === "string" ? body.text.trim() : "";
    const wordCount = baselineWordCount(text);
    if (wordCount < WRITING_TASK.minWords || wordCount > WRITING_TASK.maxWords) {
      return NextResponse.json({ error: `Tulisan harus ${WRITING_TASK.minWords}–${WRITING_TASK.maxWords} kata. Saat ini ${wordCount} kata.` }, { status: 400 });
    }

    const signal = scoreBaselineWriting(text);
    await upsertLearningEvidence({
      userId: user.id,
      source: BASELINE_SOURCE,
      activityId: session.id,
      questionId: WRITING_TASK.id,
      selectedAnswer: text,
      isCorrect: signal.score >= 0.6,
      score: signal.score,
      skill: "WRITING",
      difficulty: "MEDIUM",
      metadata: {
        assessmentVersion: BASELINE_VERSION,
        writingSignal: { score: signal.score, level: signal.level, wordCount: signal.wordCount, dimensions: { ...signal.dimensions } },
        subskill: "WRITING_ORGANIZATION",
      },
    });

    state.writingSubmitted = true;
    await db.adaptivePracticeSession.update({
      where: { id: session.id },
      data: { questionIds: state as unknown as Prisma.InputJsonValue, status: "COMPLETED", completedAt: new Date() },
    });
    return NextResponse.json({
      ...responseFor(session.id, state, findQuestions(state.questionIds), signal),
      result: await buildResult(user.id, session.id),
    });
  }

  return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
}
