import { NextRequest, NextResponse } from "next/server";
import type { LearningSkillType } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getLearnerState, isLearnerStateInfraUnavailable } from "@/lib/learner-state/service";
import { upsertLearningEvidence, LEARNING_EVIDENCE_VERSION } from "@/lib/learning-loop/evidence";
import { validateQuestionMetadata } from "@/lib/question-metadata/validation";
import { ADAPTIVE_ALLOWED_SIZES, ADAPTIVE_MAX_CANDIDATES, ADAPTIVE_SELECTION_VERSION, ADAPTIVE_SUPPORTED_SOURCES } from "@/lib/adaptive-practice/config";
import { selectAdaptivePractice } from "@/lib/adaptive-practice/selector";
import type { AdaptiveCandidate } from "@/lib/adaptive-practice/types";
import type { DifficultyId, QuestionTypeId } from "@/lib/question-metadata/taxonomy";
import { dayKeyWIB } from "@/lib/learning-loop/journey";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSoalType(value: string): QuestionTypeId | null {
  const type = value.toUpperCase();
  if (type === "PILIHAN_GANDA") return "PILIHAN_GANDA";
  if (type === "BENAR_SALAH") return "BENAR_SALAH";
  if (type === "ISIAN" || type === "ISIAN_SINGKAT") return "ISIAN_SINGKAT";
  return null;
}

function isMissingAdaptiveInfra(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: string }).code;
  return code === "P2021" || code === "P2022";
}

function fallbackResponse(reasonCode = "INSUFFICIENT_METADATA") {
  return NextResponse.json({
    mode: "FALLBACK",
    reasonCode,
    reasonText: "Belum cukup data untuk latihan personal.",
    fallback: {
      href: "/arena/jalur-cerdas",
      label: "Mulai latihan umum",
    },
    questions: [],
  });
}

async function startSession(userId: string, size: number) {
  const states = await getLearnerState(userId);
  const metadataRows = await db.questionMetadata.findMany({
    where: {
      source: ADAPTIVE_SUPPORTED_SOURCES[0],
      status: "APPROVED",
      skill: { not: null },
    },
    orderBy: { questionId: "asc" },
    take: ADAPTIVE_MAX_CANDIDATES,
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
  if (metadataRows.length === 0) return fallbackResponse();

  const questionIds = metadataRows.map((row) => row.questionId);
  const questions = await db.soal.findMany({
    where: { kodeSoal: { in: questionIds } },
    select: { kodeSoal: true, text: true, options: true, type: true },
  });
  const questionById = new Map(questions.map((question) => [question.kodeSoal, question]));

  const evidenceRows = await db.learningEvidence.findMany({
    where: {
      userId,
      source: ADAPTIVE_SUPPORTED_SOURCES[0],
      questionId: { in: questionIds },
    },
    orderBy: { answeredAt: "desc" },
    select: { questionId: true, answeredAt: true },
  });
  const latestSeen = new Map<string, Date>();
  for (const row of evidenceRows) {
    if (!latestSeen.has(row.questionId)) latestSeen.set(row.questionId, row.answeredAt);
  }

  const candidates: AdaptiveCandidate[] = [];
  for (const metadata of metadataRows) {
    const question = questionById.get(metadata.questionId);
    if (!question || !metadata.skill || !metadata.questionType) continue;
    const validated = validateQuestionMetadata({
      source: "BANK_SOAL",
      questionId: metadata.questionId,
      skill: metadata.skill,
      subskill: metadata.subskill,
      difficulty: metadata.difficulty,
      topic: metadata.topic,
      questionType: metadata.questionType,
      provenance: metadata.provenance,
      confidence: metadata.confidence,
      status: metadata.status,
      taxonomyVersion: metadata.taxonomyVersion,
      metadataVersion: metadata.metadataVersion,
    });
    if (!validated.valid || validated.value?.status !== "APPROVED" || !validated.value.skill) continue;
    if (normalizeSoalType(question.type) !== validated.value.questionType) continue;
    if (!question.text.trim() || !Array.isArray(question.options)) continue;
    candidates.push({
      id: metadata.questionId,
      text: question.text,
      options: question.options,
      questionType: validated.value.questionType,
      skill: validated.value.skill,
      subskill: validated.value.subskill,
      difficulty: validated.value.difficulty,
      topic: validated.value.topic ?? null,
      seenAt: latestSeen.get(metadata.questionId) ?? null,
    });
  }

  const selection = selectAdaptivePractice({
    states,
    candidates,
    size,
    rotationKey: `${userId}:${dayKeyWIB()}`,
  });
  if (!selection) return fallbackResponse();

  const session = await db.adaptivePracticeSession.create({
    data: {
      userId,
      source: ADAPTIVE_SUPPORTED_SOURCES[0],
      selectionVersion: selection.selectionVersion,
      targetSkill: selection.targetSkill,
      targetSubskill: selection.targetSubskill,
      targetDifficulty: selection.targetDifficulty,
      reasonCode: selection.reasonCode,
      reasonText: selection.reasonText,
      questionIds: selection.questions.map((question) => question.id),
      status: "IN_PROGRESS",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  return NextResponse.json({
    mode: "ADAPTIVE",
    sessionId: session.id,
    selectionVersion: selection.selectionVersion,
    targetSkill: selection.targetSkill,
    targetSubskill: selection.targetSubskill,
    targetDifficulty: selection.targetDifficulty,
    reasonCode: selection.reasonCode,
    reasonText: selection.reasonText,
    questions: selection.questions.map(({ id, text, options, questionType, topic, skill, subskill, difficulty }) => ({
      id,
      text,
      options,
      questionType,
      topic,
      skill,
      subskill,
      difficulty,
    })),
  });
}

async function answerSession(userId: string, body: JsonRecord) {
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  const answer = typeof body.answer === "string" || typeof body.answer === "number" ? body.answer : null;
  if (!sessionId || !questionId || answer === null) {
    return NextResponse.json({ error: "sessionId, questionId, dan answer wajib diisi" }, { status: 400 });
  }

  const session = await db.adaptivePracticeSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
  if (session.status !== "IN_PROGRESS" || session.expiresAt <= new Date()) {
    return NextResponse.json({ error: "Sesi sudah berakhir" }, { status: 409 });
  }
  const questionIds = Array.isArray(session.questionIds) ? session.questionIds.filter((id): id is string => typeof id === "string") : [];
  if (!questionIds.includes(questionId)) return NextResponse.json({ error: "Soal bukan bagian dari sesi" }, { status: 403 });

  const [metadata, question] = await Promise.all([
    db.questionMetadata.findUnique({ where: { source_questionId: { source: session.source, questionId } } }),
    db.soal.findUnique({ where: { kodeSoal: questionId }, select: { correctAnswer: true } }),
  ]);
  if (!metadata || metadata.status !== "APPROVED" || !metadata.skill || !question) {
    return NextResponse.json({ error: "Metadata atau soal tidak lagi eligible" }, { status: 409 });
  }

  const correct = String(answer) === String(question.correctAnswer);
  await upsertLearningEvidence({
    userId,
    source: session.source,
    activityId: session.id,
    questionId,
    selectedAnswer: String(answer),
    isCorrect: correct,
    score: correct ? 1 : 0,
    skill: metadata.skill as LearningSkillType,
    difficulty: metadata.difficulty as DifficultyId | null,
    metadata: { version: LEARNING_EVIDENCE_VERSION, selectionVersion: session.selectionVersion },
  });

  return NextResponse.json({ ok: true, sessionId, questionId, correct, recorded: true });
}

async function completeSession(userId: string, body: JsonRecord) {
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) return NextResponse.json({ error: "sessionId wajib diisi" }, { status: 400 });
  const updated = await db.adaptivePracticeSession.updateMany({
    where: { id: sessionId, userId, status: "IN_PROGRESS", expiresAt: { gt: new Date() } },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  if (updated.count === 0) return NextResponse.json({ error: "Sesi tidak ditemukan atau sudah selesai" }, { status: 409 });
  return NextResponse.json({ ok: true, sessionId, status: "COMPLETED" });
}

/** One canonical endpoint: start, answer, and complete adaptive sessions. */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.action !== "string") {
    return NextResponse.json({ error: "action wajib diisi" }, { status: 400 });
  }

  try {
    if (body.action === "start") {
      const size = body.size === undefined ? 5 : Number(body.size);
      if (!Number.isInteger(size) || !ADAPTIVE_ALLOWED_SIZES.includes(size as (typeof ADAPTIVE_ALLOWED_SIZES)[number])) {
        return NextResponse.json({ error: "Ukuran sesi harus 5, 10, atau 15" }, { status: 400 });
      }
      return await startSession(user.id, size);
    }
    if (body.action === "answer") return await answerSession(user.id, body);
    if (body.action === "complete") return await completeSession(user.id, body);
    return NextResponse.json({ error: "action tidak valid" }, { status: 400 });
  } catch (error) {
    if (isLearnerStateInfraUnavailable(error) || isMissingAdaptiveInfra(error)) {
      return NextResponse.json(
        { code: "ADAPTIVE_PRACTICE_UNAVAILABLE", error: "Data metadata/evidence belum tersedia" },
        { status: 503 }
      );
    }
    console.error("Adaptive practice error:", error);
    return NextResponse.json({ error: "Gagal memproses latihan personal" }, { status: 500 });
  }
}
