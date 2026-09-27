import { NextRequest, NextResponse } from "next/server";
import type { Difficulty, LearningSkillType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { dayKeyWIB } from "@/lib/learning-loop/journey";
import { getLearnerState } from "@/lib/learner-state/service";
import { upsertLearningEvidence } from "@/lib/learning-loop/evidence";
import { selectAdaptivePractice } from "@/lib/adaptive-practice/selector";
import type { AdaptiveCandidate } from "@/lib/adaptive-practice/types";
import { hasSkill, type DifficultyId, type QuestionTypeId } from "@/lib/question-metadata/taxonomy";
import {
  DAILY_DIAGNOSTIC_SOURCE,
  DAILY_DIAGNOSTIC_WRITING_SOURCE,
  DAILY_DIAGNOSTIC_SIZE,
  DAILY_DIAGNOSTIC_VERSION,
  dailyWritingTask,
  writingSkill,
  writingWordCount,
} from "@/lib/diagnostic/daily";
import { rateLimitRoute } from "@/lib/rate-limit";

type StateQuestion = {
  id: string;
  text: string;
  options: string[];
  questionType: QuestionTypeId;
  skill: LearningSkillType;
  difficulty: DifficultyId | null;
  correctAnswer: string;
};

type DailyState = {
  version: string;
  dayKey: string;
  questions: StateQuestion[];
  answered: string[];
  writing: ReturnType<typeof dailyWritingTask>;
  phase: "QUIZ" | "WRITING" | "DONE";
};

function parseOptions(value: Prisma.JsonValue): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value && typeof value === "object") return Object.values(value).map(String);
  return [];
}

function publicQuestion(q: StateQuestion) {
  return {
    id: q.id,
    text: q.text,
    options: q.options,
    questionType: q.questionType,
    skill: q.skill,
    difficulty: q.difficulty,
  };
}

function isQuestionType(value: string): value is QuestionTypeId {
  return ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"].includes(value);
}

async function findTodaySession(userId: string) {
  const since = new Date(Date.now() - 36 * 60 * 60 * 1000);
  const rows = await db.adaptivePracticeSession.findMany({
    where: { userId, source: DAILY_DIAGNOSTIC_SOURCE, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const today = dayKeyWIB();
  return rows.find((row) => {
    const raw = row.questionIds;
    return raw && typeof raw === "object" && !Array.isArray(raw) && (raw as { dayKey?: string }).dayKey === today;
  }) ?? null;
}

async function buildQuestions(userId: string): Promise<StateQuestion[]> {
  const [states, metadataRows] = await Promise.all([
    getLearnerState(userId).catch(() => []),
    db.questionMetadata.findMany({
      where: {
        source: "BANK_SOAL",
        status: "APPROVED",
        skill: { not: null },
        questionType: { in: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
      },
      orderBy: { questionId: "asc" },
      take: 400,
      select: {
        questionId: true,
        skill: true,
        subskill: true,
        difficulty: true,
        topic: true,
        questionType: true,
      },
    }),
  ]);

  const ids = metadataRows.map((row) => row.questionId);
  const questions = await db.soal.findMany({
    where: { kodeSoal: { in: ids } },
    select: { kodeSoal: true, text: true, options: true, type: true, correctAnswer: true },
  });
  const questionById = new Map(questions.map((q) => [q.kodeSoal, q]));

  const recent = await db.learningEvidence.findMany({
    where: {
      userId,
      source: { in: ["BANK_SOAL", DAILY_DIAGNOSTIC_SOURCE] },
      answeredAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      questionId: { in: ids },
    },
    select: { questionId: true },
  });
  const seen = new Set(recent.map((row) => row.questionId));

  const candidates: AdaptiveCandidate[] = [];
  for (const meta of metadataRows) {
    const q = questionById.get(meta.questionId);
    if (!q || !meta.skill || !hasSkill(meta.skill)) continue;
    const type = String(meta.questionType).toUpperCase();
    if (!isQuestionType(type)) continue;
    if (!q.text?.trim()) continue;
    const options = parseOptions(q.options);
    if (type !== "ISIAN_SINGKAT" && options.length < 2) continue;
    const difficulty = meta.difficulty ? String(meta.difficulty) as DifficultyId : null;
    candidates.push({
      id: meta.questionId,
      text: q.text,
      options,
      questionType: type,
      skill: meta.skill as LearningSkillType,
      subskill: meta.subskill ?? null,
      difficulty,
      topic: meta.topic ?? null,
      seenAt: seen.has(meta.questionId) ? new Date() : null,
    });
  }

  const selection = selectAdaptivePractice({
    states,
    candidates,
    size: Math.min(DAILY_DIAGNOSTIC_SIZE, candidates.length),
    rotationKey: dayKeyWIB(),
  });
  if (!selection || selection.questions.length < DAILY_DIAGNOSTIC_SIZE) return [];

  return selection.questions.map((q) => {
    const source = questionById.get(q.id);
    return {
      id: q.id,
      text: q.text,
      options: q.options,
      questionType: q.questionType,
      skill: q.skill as LearningSkillType,
      difficulty: q.difficulty,
      correctAnswer: String(source?.correctAnswer ?? ""),
    };
  });
}

function stateFromSession(row: { questionIds: Prisma.JsonValue }): DailyState | null {
  const raw = row.questionIds;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const state = raw as unknown as DailyState;
  if (state.version !== DAILY_DIAGNOSTIC_VERSION || !Array.isArray(state.questions) || !state.writing) return null;
  return state;
}

function responseFor(sessionId: string, state: DailyState) {
  const current = state.phase === "QUIZ"
    ? state.questions.find((q) => !state.answered.includes(q.id))
    : null;
  return {
    sessionId,
    status: state.phase,
    dayKey: state.dayKey,
    answeredCount: state.answered.length,
    totalQuestions: state.questions.length,
    remainingQuestions: Math.max(0, state.questions.length - state.answered.length),
    question: current ? publicQuestion(current) : null,
    writing: state.phase === "WRITING" ? {
      id: state.writing.id,
      title: state.writing.title,
      prompt: state.writing.prompt,
      minWords: state.writing.minWords,
      maxWords: state.writing.maxWords,
    } : null,
  };
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await findTodaySession(user.id);
  if (!session) {
    return NextResponse.json({
      status: "AVAILABLE",
      dayKey: dayKeyWIB(),
      title: "Quest Kemampuan Hari Ini",
      subtitle: "Beberapa tantangan singkat untuk membantu BahasaCerdas mengenali perkembanganmu.",
      estimatedMinutes: 7,
    });
  }

  const state = stateFromSession(session);
  if (!state) return NextResponse.json({ error: "Sesi diagnostik tidak valid" }, { status: 409 });
  return NextResponse.json(responseFor(session.id, state));
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimitRoute(req, {
    maxRequests: 30,
    windowSeconds: 15 * 60,
    identifier: "bca-daily-diagnostic",
  });
  if (rl) return rl;

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "start";

  if (action === "start") {
    const existing = await findTodaySession(user.id);
    if (existing) {
      const state = stateFromSession(existing);
      if (!state) return NextResponse.json({ error: "Sesi diagnostik tidak valid" }, { status: 409 });
      return NextResponse.json(responseFor(existing.id, state));
    }

    const questions = await buildQuestions(user.id);
    if (questions.length < DAILY_DIAGNOSTIC_SIZE) {
      return NextResponse.json({
        status: "UNAVAILABLE",
        message: "Tantangan hari ini belum tersedia karena bank soal aman belum mencukupi.",
      }, { status: 503 });
    }

    const dayKey = dayKeyWIB();
    const state: DailyState = {
      version: DAILY_DIAGNOSTIC_VERSION,
      dayKey,
      questions,
      answered: [],
      writing: dailyWritingTask(dayKey),
      phase: "QUIZ",
    };

    const session = await db.adaptivePracticeSession.create({
      data: {
        userId: user.id,
        source: DAILY_DIAGNOSTIC_SOURCE,
        selectionVersion: DAILY_DIAGNOSTIC_VERSION,
        targetSkill: null,
        targetSubskill: null,
        targetDifficulty: null,
        reasonCode: "DIAGNOSTIC_DAILY",
        reasonText: "Quest kemampuan harian: evidence baru untuk memperbarui profil kemampuan dan Mentor.",
        questionIds: state as unknown as Prisma.InputJsonValue,
        status: "IN_PROGRESS",
        expiresAt: new Date(Date.now() + 20 * 60 * 1000),
      },
    });

    return NextResponse.json(responseFor(session.id, state));
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) return NextResponse.json({ error: "sessionId wajib diisi" }, { status: 400 });

  const session = await db.adaptivePracticeSession.findFirst({
    where: { id: sessionId, userId: user.id, source: DAILY_DIAGNOSTIC_SOURCE },
  });
  if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
  if (session.expiresAt < new Date()) return NextResponse.json({ error: "Sesi sudah berakhir" }, { status: 409 });

  const state = stateFromSession(session);
  if (!state) return NextResponse.json({ error: "State sesi tidak valid" }, { status: 409 });

  if (action === "answer") {
    if (state.phase !== "QUIZ") return NextResponse.json({ error: "Tahap soal sudah selesai" }, { status: 409 });
    const questionId = typeof body.questionId === "string" ? body.questionId : "";
    const answer = body.answer === undefined || body.answer === null ? "" : String(body.answer);
    const question = state.questions.find((q) => q.id === questionId);
    if (!question || state.answered.includes(questionId)) return NextResponse.json({ error: "Soal tidak valid" }, { status: 400 });

    const correct = answer === question.correctAnswer;
    await upsertLearningEvidence({
      userId: user.id,
      source: DAILY_DIAGNOSTIC_SOURCE,
      activityId: session.id,
      questionId,
      selectedAnswer: answer,
      isCorrect: correct,
      score: correct ? 1 : 0,
      skill: question.skill,
      difficulty: question.difficulty as Difficulty | null,
      metadata: { version: DAILY_DIAGNOSTIC_VERSION, type: "objective" },
    });

    state.answered.push(questionId);
    if (state.answered.length >= state.questions.length) state.phase = "WRITING";

    await db.adaptivePracticeSession.update({
      where: { id: session.id },
      data: { questionIds: state as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      ...responseFor(session.id, state),
      correct,
      next: state.phase === "WRITING" ? "WRITING" : "QUESTION",
    });
  }

  if (action === "writing") {
    if (state.phase !== "WRITING") return NextResponse.json({ error: "Belum masuk tantangan menulis" }, { status: 409 });
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const words = writingWordCount(text);
    if (words < state.writing.minWords) {
      return NextResponse.json({ error: `Tulisanmu baru ${words} kata. Coba minimal ${state.writing.minWords} kata.` }, { status: 400 });
    }
    if (words > state.writing.maxWords * 2) {
      return NextResponse.json({ error: `Tulisanmu terlalu panjang untuk tantangan singkat ini. Maksimal sekitar ${state.writing.maxWords} kata.` }, { status: 400 });
    }

    await upsertLearningEvidence({
      userId: user.id,
      source: DAILY_DIAGNOSTIC_WRITING_SOURCE,
      activityId: session.id,
      questionId: state.writing.id,
      selectedAnswer: text,
      isCorrect: null,
      score: null,
      skill: writingSkill(),
      metadata: {
        version: DAILY_DIAGNOSTIC_VERSION,
        type: "writing",
        wordCount: words,
        rubric: state.writing.rubric,
        gradingStatus: "PENDING_AI_REVIEW",
      },
    });

    state.phase = "DONE";
    await db.adaptivePracticeSession.update({
      where: { id: session.id },
      data: { status: "COMPLETED", completedAt: new Date(), questionIds: state as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      ...responseFor(session.id, state),
      completed: true,
      message: "Quest hari ini selesai. Bukti kemampuanmu sudah masuk ke Perkembanganmu dan akan menjadi konteks Mentor.",
    });
  }

  return NextResponse.json({ error: "Action tidak dikenali" }, { status: 400 });
}
