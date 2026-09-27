import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { upsertLearningEvidence } from "@/lib/learning-loop/evidence";
import { computeAbilityProfile, normalizeEvidence } from "@/lib/diagnostic/ability";
import { validateQuestionMetadata } from "@/lib/question-metadata/validation";
import { bankGateIssues } from "@/lib/diagnostic-ai/bank-gate";
import {
  BASELINE_BLUEPRINT,
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
  skill: string;
  difficulty: DifficultyId | null;
  correctAnswer: string;
};

type BaselineState = {
  version: string;
  questionIds: string[];
  answered: string[];
  writingSubmitted: boolean;
  startedAt: string;
};

function parseOptions(value: Prisma.JsonValue): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value && typeof value === "object") return Object.values(value).map(String);
  return [];
}

function publicQuestion(q: BaselineQuestion) {
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

async function findBaselineSession(userId: string) {
  return db.adaptivePracticeSession.findFirst({
    where: { userId, source: BASELINE_SOURCE },
    orderBy: { createdAt: "desc" },
  });
}

function stateFromSession(row: { questionIds: Prisma.JsonValue }): BaselineState | null {
  const raw = row.questionIds;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const state = raw as unknown as BaselineState;
  if (
    state.version !== BASELINE_VERSION ||
    !Array.isArray(state.questionIds) ||
    !Array.isArray(state.answered) ||
    typeof state.writingSubmitted !== "boolean"
  ) return null;
  return state;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

async function selectBaselineQuestions(seed: string): Promise<BaselineQuestion[]> {
  const metadataRows = await db.questionMetadata.findMany({
    where: {
      source: "BANK_SOAL",
      status: "APPROVED",
      skill: { in: BASELINE_BLUEPRINT.map((entry) => entry.skill) },
      questionType: { in: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
    },
    orderBy: [{ skill: "asc" }, { difficulty: "asc" }, { questionId: "asc" }],
    take: 500,
    select: {
      questionId: true,
      skill: true,
      subskill: true,
      difficulty: true,
      topic: true,
      questionType: true,
      provenance: true,
      confidence: true,
      taxonomyVersion: true,
      metadataVersion: true,
      status: true,
    },
  });

  const ids = metadataRows.map((row) => row.questionId);
  const rows = await db.soal.findMany({
    where: { kodeSoal: { in: ids } },
    select: { kodeSoal: true, text: true, options: true, type: true, correctAnswer: true },
  });
  const byId = new Map(rows.map((row) => [row.kodeSoal, row]));
  const candidates: BaselineQuestion[] = [];

  for (const meta of metadataRows) {
    const q = byId.get(meta.questionId);
    if (!q || !meta.skill || !meta.questionType) continue;
    const type = String(meta.questionType).toUpperCase();
    if (!isQuestionType(type) || String(q.type).toUpperCase() !== type) continue;
    if (!q.text?.trim()) continue;
    const options = parseOptions(q.options);
    if (type !== "ISIAN_SINGKAT" && options.length < 2) continue;

    const gate = bankGateIssues({
      id: meta.questionId,
      text: q.text,
      options,
      questionType: type,
      correctAnswer: String(q.correctAnswer ?? ""),
    });
    if (gate.length > 0) continue;

    const validated = validateQuestionMetadata({
      source: "BANK_SOAL",
      questionId: meta.questionId,
      skill: meta.skill,
      subskill: meta.subskill,
      difficulty: meta.difficulty,
      topic: meta.topic,
      questionType: type,
      provenance: meta.provenance,
      confidence: meta.confidence,
      status: meta.status,
      taxonomyVersion: meta.taxonomyVersion,
      metadataVersion: meta.metadataVersion,
    });
    if (!validated.valid || !validated.value?.skill) continue;

    candidates.push({
      id: meta.questionId,
      text: q.text,
      options,
      questionType: type,
      skill: validated.value.skill,
      difficulty: validated.value.difficulty as DifficultyId | null,
      correctAnswer: String(q.correctAnswer ?? ""),
    });
  }

  const selected: BaselineQuestion[] = [];
  const used = new Set<string>();

  for (const entry of BASELINE_BLUEPRINT) {
    const pool = candidates
      .filter((q) => q.skill === entry.skill && !used.has(q.id))\n      .sort((a, b) => stableHash(`${seed}:${a.id}`) - stableHash(`${seed}:${b.id}`));
    const byDifficulty = new Map<string, BaselineQuestion[]>();
    for (const q of pool) {
      const key = q.difficulty ?? "UNKNOWN";
      const list = byDifficulty.get(key) ?? [];
      list.push(q);
      byDifficulty.set(key, list);
    }

    for (const difficulty of ["EASY", "MEDIUM", "HARD"] as const) {
      const candidate = byDifficulty.get(difficulty)?.[0];
      if (candidate) {
        selected.push(candidate);
        used.add(candidate.id);
      }
    }

    if (selected.filter((q) => q.skill === entry.skill).length < entry.count) {
      for (const q of pool) {
        if (selected.filter((x) => x.skill === entry.skill).length >= entry.count) break;
        if (!used.has(q.id)) {
          selected.push(q);
          used.add(q.id);
        }
      }
    }
  }

  return selected;
}

function responseFor(sessionId: string, state: BaselineState, questions: BaselineQuestion[], writingResult?: ReturnType<typeof scoreBaselineWriting> | null) {
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
    writing:
      phase === "WRITING"
        ? {
            id: WRITING_TASK.id,
            title: WRITING_TASK.title,
            prompt: WRITING_TASK.prompt,
            minWords: WRITING_TASK.minWords,
            maxWords: WRITING_TASK.maxWords,
            rubric: WRITING_TASK.rubric,
          }
        : null,
    writingResult: phase === "DONE" ? writingResult ?? null : null,
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
  const overallObjective = details.length > 0 ? details.filter((item) => item.skill !== "WRITING") : [];
  const objectiveAccuracy = overallObjective.length
    ? overallObjective.filter((item) => item.isCorrect).length / overallObjective.length
    : null;

  return {
    objectiveAccuracy,
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

  const questions = await db.soal.findMany({
    where: { kodeSoal: { in: state.questionIds } },
    select: { kodeSoal: true, text: true, options: true, type: true, correctAnswer: true },
  });
  const metadata = await db.questionMetadata.findMany({
    where: { source: "BANK_SOAL", questionId: { in: state.questionIds } },
    select: { questionId: true, skill: true, difficulty: true, questionType: true },
  });
  const metaById = new Map(metadata.map((row) => [row.questionId, row]));
  const questionById = new Map(questions.map((row) => [row.kodeSoal, row]));
  const publicQuestions = state.questionIds.flatMap((id) => {
    const q = questionById.get(id);
    const meta = metaById.get(id);
    if (!q || !meta?.skill) return [];
    return [{
      id,
      text: q.text,
      options: parseOptions(q.options),
      questionType: String(meta.questionType) as QuestionTypeId,
      skill: meta.skill,
      difficulty: meta.difficulty as DifficultyId | null,
      correctAnswer: String(q.correctAnswer ?? ""),
    }];
  });

  let writingResult = null;
  if (state.writingSubmitted) {
    const evidence = await db.learningEvidence.findFirst({
      where: { userId: user.id, source: BASELINE_SOURCE, activityId: session.id, questionId: WRITING_TASK.id },
      select: { metadata: true },
    });
    if (evidence?.metadata && typeof evidence.metadata === "object") {
      writingResult = (evidence.metadata as { writingSignal?: ReturnType<typeof scoreBaselineWriting> }).writingSignal ?? null;
    }
  }

  return NextResponse.json(responseFor(session.id, state, publicQuestions, writingResult));
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimitRoute(req, {
    maxRequests: 60,
    windowSeconds: 30 * 60,
    identifier: "bca-diagnostic-baseline-v2",
  });
  if (rl) return rl;

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "start";

  if (action === "start") {
    const existing = await findBaselineSession(user.id);
    if (existing) {
      const state = stateFromSession(existing);
      if (!state) return NextResponse.json({ error: "Sesi baseline tidak valid" }, { status: 409 });
      const questions = await db.soal.findMany({
        where: { kodeSoal: { in: state.questionIds } },
        select: { kodeSoal: true, text: true, options: true, type: true, correctAnswer: true },
      });
      const metadata = await db.questionMetadata.findMany({
        where: { source: "BANK_SOAL", questionId: { in: state.questionIds } },
        select: { questionId: true, skill: true, difficulty: true, questionType: true },
      });
      const metaById = new Map(metadata.map((row) => [row.questionId, row]));
      const qs: BaselineQuestion[] = state.questionIds.flatMap((id) => {
        const q = questions.find((row) => row.kodeSoal === id);
        const meta = metaById.get(id);
        if (!q || !meta?.skill) return [];
        return [{
          id,
          text: q.text,
          options: parseOptions(q.options),
          questionType: String(meta.questionType) as QuestionTypeId,
          skill: meta.skill,
          difficulty: meta.difficulty as DifficultyId | null,
          correctAnswer: String(q.correctAnswer ?? ""),
        }];
      });
      return NextResponse.json(responseFor(existing.id, state, qs));
    }

    const questions = await selectBaselineQuestions(user.id);
    if (questions.length < BASELINE_SIZE) {
      return NextResponse.json({
        status: "UNAVAILABLE",
        message: "Tes awal belum tersedia karena bank diagnostik belum memiliki cakupan aman untuk semua kompetensi.",
      }, { status: 503 });
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
    where: { id: sessionId, userId: user.id, source: BASELINE_SOURCE },
  });
  if (!session) return NextResponse.json({ error: "Sesi baseline tidak ditemukan" }, { status: 404 });
  if (session.status === "COMPLETED") return NextResponse.json({ error: "Sesi baseline sudah selesai" }, { status: 409 });
  if (session.expiresAt < new Date()) return NextResponse.json({ error: "Sesi baseline sudah kedaluwarsa" }, { status: 409 });

  const state = stateFromSession(session);
  if (!state) return NextResponse.json({ error: "Sesi baseline tidak valid" }, { status: 409 });

  if (action === "answer") {
    const questionId = typeof body.questionId === "string" ? body.questionId : "";
    const answer = typeof body.answer === "string" || typeof body.answer === "number" ? String(body.answer) : "";
    if (!state.questionIds.includes(questionId) || state.answered.includes(questionId)) {
      return NextResponse.json({ error: "Soal tidak valid atau sudah dijawab" }, { status: 409 });
    }

    const [question, meta] = await Promise.all([
      db.soal.findUnique({ where: { kodeSoal: questionId }, select: { correctAnswer: true } }),
      db.questionMetadata.findFirst({ where: { source: "BANK_SOAL", questionId }, select: { skill: true, subskill: true, difficulty: true } }),
    ]);
    if (!question || !meta?.skill) return NextResponse.json({ error: "Soal baseline tidak ditemukan" }, { status: 409 });

    const correct = answer === String(question.correctAnswer ?? "");
    await upsertLearningEvidence({
      userId: user.id,
      source: BASELINE_SOURCE,
      activityId: session.id,
      questionId,
      selectedAnswer: answer,
      isCorrect: correct,
      score: correct ? 1 : 0,
      skill: meta.skill as "READING" | "GRAMMAR" | "VOCABULARY" | "LITERATURE" | "WRITING",
      difficulty: meta.difficulty as DifficultyId | null,
      metadata: { subskill: meta.subskill ?? null, assessmentVersion: BASELINE_VERSION },
    });

    state.answered.push(questionId);
    await db.adaptivePracticeSession.update({
      where: { id: session.id },
      data: { questionIds: state as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json(responseFor(session.id, state, await selectQuestionsByIds(state.questionIds)));
  }

  if (action === "writing") {
    if (state.answered.length < state.questionIds.length) {
      return NextResponse.json({ error: "Selesaikan seluruh bagian objektif terlebih dahulu." }, { status: 409 });
    }
    if (state.writingSubmitted) return NextResponse.json({ error: "Tulisan sudah dikirim." }, { status: 409 });

    const text = typeof body.text === "string" ? body.text.trim() : "";
    const wordCount = baselineWordCount(text);
    if (wordCount < WRITING_TASK.minWords || wordCount > WRITING_TASK.maxWords) {
      return NextResponse.json({
        error: `Tulisan harus ${WRITING_TASK.minWords}–${WRITING_TASK.maxWords} kata. Saat ini ${wordCount} kata.`,
      }, { status: 400 });
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
      metadata: { assessmentVersion: BASELINE_VERSION, writingSignal: signal, subskill: "WRITING_ORGANIZATION" },
    });

    state.writingSubmitted = true;
    await db.adaptivePracticeSession.update({
      where: { id: session.id },
      data: { questionIds: state as unknown as Prisma.InputJsonValue, status: "COMPLETED", completedAt: new Date() },
    });

    return NextResponse.json({
      ...responseFor(session.id, state, await selectQuestionsByIds(state.questionIds), signal),
      result: await buildResult(user.id, session.id),
    });
  }

  return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
}

async function selectQuestionsByIds(ids: string[]): Promise<BaselineQuestion[]> {
  const [rows, metadata] = await Promise.all([
    db.soal.findMany({
      where: { kodeSoal: { in: ids } },
      select: { kodeSoal: true, text: true, options: true, type: true, correctAnswer: true },
    }),
    db.questionMetadata.findMany({
      where: { source: "BANK_SOAL", questionId: { in: ids } },
      select: { questionId: true, skill: true, difficulty: true, questionType: true },
    }),
  ]);
  const byId = new Map(rows.map((row) => [row.kodeSoal, row]));
  const metaById = new Map(metadata.map((row) => [row.questionId, row]));
  return ids.flatMap((id) => {
    const q = byId.get(id);
    const meta = metaById.get(id);
    if (!q || !meta?.skill) return [];
    return [{
      id,
      text: q.text,
      options: parseOptions(q.options),
      questionType: String(meta.questionType) as QuestionTypeId,
      skill: meta.skill,
      difficulty: meta.difficulty as DifficultyId | null,
      correctAnswer: String(q.correctAnswer ?? ""),
    }];
  });
}
