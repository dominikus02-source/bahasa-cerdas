import { NextRequest, NextResponse } from "next/server";
import type { LearningSkillType } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getLearnerState, isLearnerStateInfraUnavailable } from "@/lib/learner-state/service";
import { upsertLearningEvidence, LEARNING_EVIDENCE_VERSION } from "@/lib/learning-loop/evidence";
import { validateQuestionMetadata } from "@/lib/question-metadata/validation";
import { computeProfileFromEvidence, withUntestedSkills } from "@/lib/diagnostic/profile";
import { selectDiagnosticQuestions, summarizeComposition } from "@/lib/diagnostic/selector";
import {
  DIAGNOSTIC_ALLOWED_SIZES,
  DIAGNOSTIC_DEFAULT_SIZE,
  DIAGNOSTIC_MIN_ITEMS,
  DIAGNOSTIC_REASON_CODE,
  DIAGNOSTIC_SELECTION_VERSION,
  DIAGNOSTIC_SESSION_MINUTES,
  DIAGNOSTIC_SKILL_LABELS,
  DIAGNOSTIC_SUPPORTED_SOURCES,
} from "@/lib/diagnostic/config";
import type { DiagnosticCandidate, DiagnosticQuestionType } from "@/lib/diagnostic/types";
import type { DifficultyId, QuestionTypeId } from "@/lib/question-metadata/taxonomy";
import { rateLimitRoute } from "@/lib/rate-limit";

const DIAGNOSTIC_RATE_LIMIT = {
  maxRequests: 5,
  windowSeconds: 30 * 60,
  identifier: "bca-diagnostic-start",
} as const;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Hanya tipe yang bisa dinilai otomatis (tanpa AI/constructed scoring). */
function normalizeDiagnosticType(value: string): DiagnosticQuestionType | null {
  const type = value.toUpperCase();
  if (type === "PILIHAN_GANDA") return "PILIHAN_GANDA";
  if (type === "BENAR_SALAH") return "BENAR_SALAH";
  if (type === "ISIAN" || type === "ISIAN_SINGKAT") return "ISIAN_SINGKAT";
  return null;
}

function isMissingDiagnosticInfra(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: string }).code;
  return code === "P2021" || code === "P2022";
}

function diagnosticUnavailable(reasonCode = "INSUFFICIENT_PRODUCTION_DATA", learnerState: unknown[] = []) {
  return NextResponse.json(
    {
      mode: "DIAGNOSTIC_UNAVAILABLE",
      actionType: "DIAGNOSTIC",
      reasonCode,
      reasonText:
        "Tes awal belum tersedia: belum cukup soal ber-standar produksi untuk seluruh kemampuan yang diuji. Latihan personal tetap bisa dimulai.",
      learnerState,
    },
    { status: 503 }
  );
}

async function buildDiagnosticCandidates() {
  const metadataRows = await db.questionMetadata.findMany({
    where: {
      source: DIAGNOSTIC_SUPPORTED_SOURCES[0],
      status: "APPROVED",
      skill: { not: null },
    },
    orderBy: { questionId: "asc" },
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
  if (metadataRows.length === 0) return [];

  const questionIds = metadataRows.map((row) => row.questionId);
  const questions = await db.soal.findMany({
    where: { kodeSoal: { in: questionIds } },
    select: { kodeSoal: true, text: true, options: true, type: true },
  });
  const questionById = new Map(questions.map((question) => [question.kodeSoal, question]));

  const candidates: DiagnosticCandidate[] = [];
  for (const metadata of metadataRows) {
    const question = questionById.get(metadata.questionId);
    if (!question || !metadata.skill || !metadata.questionType) continue;
    const type = normalizeDiagnosticType(question.type);
    if (!type) continue;
    if (type !== metadata.questionType) continue;
    if (!question.text.trim() || !Array.isArray(question.options)) continue;
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
    candidates.push({
      id: metadata.questionId,
      text: question.text,
      options: question.options,
      questionType: type,
      skill: validated.value.skill,
      subskill: validated.value.subskill,
      difficulty: validated.value.difficulty,
      topic: validated.value.topic ?? null,
      seenAt: null,
    });
  }
  return candidates;
}

async function alreadySeen(userId: string, questionIds: string[]): Promise<Map<string, Date>> {
  const evidenceRows = await db.learningEvidence.findMany({
    where: { userId, source: DIAGNOSTIC_SUPPORTED_SOURCES[0], questionId: { in: questionIds } },
    orderBy: { answeredAt: "desc" },
    select: { questionId: true, answeredAt: true },
  });
  const latestSeen = new Map<string, Date>();
  for (const row of evidenceRows) {
    if (!latestSeen.has(row.questionId)) latestSeen.set(row.questionId, row.answeredAt);
  }
  return latestSeen;
}

/** Evidence per-butir milik sesi diagnostik (read-only, tanpa answer key). */
async function loadSessionEvidence(userId: string, source: string, sessionId: string) {
  return db.learningEvidence.findMany({
    where: { userId, source, activityId: sessionId },
    orderBy: { answeredAt: "asc" },
    select: { isCorrect: true, skill: true, difficulty: true },
  });
}

/** Profil dari DETAIL EVIDENCE sesi (jalur kanonik 4E.1) + "belum terukur"
 *  untuk skill yang tidak ikut diuji (Part I/Q — jujur, bukan "lemah"). */
async function buildSessionProfile(userId: string, source: string, sessionId: string) {
  const evidence = await loadSessionEvidence(userId, source, sessionId);
  const details = evidence.flatMap((row) =>
    row.skill
      ? [{ skill: row.skill, difficulty: row.difficulty as DifficultyId | null, isCorrect: row.isCorrect === true }]
      : []
  );
  const profile = computeProfileFromEvidence(details);
  return withUntestedSkills(profile, Object.keys(DIAGNOSTIC_SKILL_LABELS));
}

async function startDiagnostic(userId: string, size: number) {
  const states = await getLearnerState(userId);
  const candidates = await buildDiagnosticCandidates();
  if (candidates.length === 0) return diagnosticUnavailable("INSUFFICIENT_PRODUCTION_DATA", states);

  const seen = await alreadySeen(userId, candidates.map((candidate) => candidate.id));
  const pool = candidates.map((candidate) => ({ ...candidate, seenAt: seen.get(candidate.id) ?? null }));

  const selection = selectDiagnosticQuestions(pool, size);
  if (!selection || selection.questions.length < DIAGNOSTIC_MIN_ITEMS) {
    return diagnosticUnavailable("INSUFFICIENT_PRODUCTION_DATA", states);
  }

  const session = await db.adaptivePracticeSession.create({
    data: {
      userId,
      source: DIAGNOSTIC_SUPPORTED_SOURCES[0],
      selectionVersion: DIAGNOSTIC_SELECTION_VERSION,
      targetSkill: null,
      targetSubskill: null,
      targetDifficulty: null,
      reasonCode: DIAGNOSTIC_REASON_CODE,
      reasonText:
        "Tes awal untuk mengenali kemampuanmu. Jawab sebisamu — tidak ada jawaban salah yang merugikan; hasilnya dipakai untuk menyesuaikan latihan.",
      questionIds: selection.questions.map((question) => question.id),
      status: "IN_PROGRESS",
      expiresAt: new Date(Date.now() + DIAGNOSTIC_SESSION_MINUTES * 60 * 1000),
    },
  });

  return NextResponse.json({
    mode: "DIAGNOSTIC",
    actionType: "DIAGNOSTIC",
    actionTitle: "Kenali Kemampuanmu",
    ctaLabel: "Mulai Tes Awal",
    sessionId: session.id,
    selectionVersion: DIAGNOSTIC_SELECTION_VERSION,
    sessionSize: selection.questions.length,
    composition: selection.composition,
    fallback: selection.fallback,
    fallbackReason: selection.fallbackReason,
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

/** Preview My Day: TANPA bukti belajar → sarankan tes awal (DIAGNOSTIC);
 *  dengan bukti → GENERAL_LEARNING jujur (bukan diagnostic). */
async function previewDiagnostic(userId: string) {
  try {
    const states = await getLearnerState(userId);
    const hasEvidence = states.some((state) => state.attemptCount > 0);
    if (hasEvidence) {
      return NextResponse.json({
        mode: "PREVIEW",
        actionType: "GENERAL_LEARNING",
        actionTitle: "Lanjut Belajar Hari Ini",
        ctaLabel: "Buka Jalur Cerdas",
        targetSkill: null,
        targetSubskill: null,
        targetDifficulty: null,
        sessionSize: null,
        reasonCode: "EVIDENCE_EXISTS",
        reasonText: "Kamu sudah punya riwayat belajar. Lanjutkan latihan personal sesuai kemampuanmu.",
        estimatedMinutes: null,
        confidence: "NO_DATA",
        premiumDepth: "STANDARD",
        selectionVersion: DIAGNOSTIC_SELECTION_VERSION,
        learnerState: states,
        mentor: null,
      });
    }
  } catch {
    return NextResponse.json({ code: "DIAGNOSTIC_UNAVAILABLE" }, { status: 503 });
  }

  try {
    const candidates = await buildDiagnosticCandidates();
    if (candidates.length < DIAGNOSTIC_MIN_ITEMS) {
      return NextResponse.json({ code: "DIAGNOSTIC_UNAVAILABLE" }, { status: 503 });
    }
    const states = await getLearnerState(userId);
    return NextResponse.json({
      mode: "PREVIEW",
      actionType: "DIAGNOSTIC",
      actionTitle: "Kenali Kemampuanmu",
      ctaLabel: "Mulai Tes Awal",
      targetSkill: null,
      targetSubskill: null,
      targetDifficulty: null,
      sessionSize: DIAGNOSTIC_DEFAULT_SIZE,
      reasonCode: "NO_EVIDENCE",
      reasonText:
        "Kamu belum punya riwayat latihan. Tes singkat ini memetakan kemampuanmu dulu — jawabanmu dipakai untuk menyesuaikan latihan berikutnya, tanpa nilai benar-salah yang merugikan.",
      estimatedMinutes: 10,
      confidence: "NO_DATA",
      premiumDepth: "STANDARD",
      selectionVersion: DIAGNOSTIC_SELECTION_VERSION,
      learnerState: states,
      mentor: null,
    });
  } catch {
    return NextResponse.json({ code: "DIAGNOSTIC_UNAVAILABLE" }, { status: 503 });
  }
}

async function getDiagnosticPayload(userId: string, sessionId: string) {
  const session = await db.adaptivePracticeSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
  if (session.reasonCode !== DIAGNOSTIC_REASON_CODE) {
    return NextResponse.json({ error: "Bukan sesi tes awal" }, { status: 403 });
  }
  if (session.status !== "IN_PROGRESS" && session.status !== "COMPLETED") {
    return NextResponse.json({ error: "Sesi sudah berakhir" }, { status: 409 });
  }
  const questionIds = Array.isArray(session.questionIds)
    ? session.questionIds.filter((id): id is string => typeof id === "string")
    : [];
  const metadataRows = await db.questionMetadata.findMany({
    where: { source: session.source, status: "APPROVED", questionId: { in: questionIds } },
    select: { questionId: true, skill: true, subskill: true, difficulty: true, topic: true, questionType: true },
  });
  const questions = await db.soal.findMany({
    where: { kodeSoal: { in: questionIds } },
    select: { kodeSoal: true, text: true, options: true, type: true },
  });
  const questionMap = new Map(questions.map((question) => [question.kodeSoal, question]));
  const metadataMap = new Map(metadataRows.map((metadata) => [metadata.questionId, metadata]));
  const payloadQuestions = questionIds.flatMap((id) => {
    const question = questionMap.get(id);
    const metadata = metadataMap.get(id);
    return question && metadata && normalizeDiagnosticType(question.type) === metadata.questionType
      ? [
          {
            id,
            text: question.text,
            options: question.options,
            questionType: metadata.questionType,
            topic: metadata.topic,
            skill: metadata.skill,
            subskill: metadata.subskill,
            difficulty: metadata.difficulty,
          },
        ]
      : [];
  });

  if (session.status === "COMPLETED") {
    const profile = await buildSessionProfile(userId, session.source, session.id);
    return NextResponse.json({
      mode: "DIAGNOSTIC",
      actionType: "DIAGNOSTIC",
      sessionId: session.id,
      status: "COMPLETED",
      actionTitle: "Kenali Kemampuanmu",
      sessionSize: questionIds.length,
      composition: summarizeComposition(
        questionIds.length,
        payloadQuestions.map((question) => ({ skill: question.skill ?? "", questionType: question.questionType as DiagnosticQuestionType }))
      ),
      questions: payloadQuestions,
      result: profile,
    });
  }

  return NextResponse.json({
    mode: "DIAGNOSTIC",
    actionType: "DIAGNOSTIC",
    sessionId: session.id,
    status: "IN_PROGRESS",
    actionTitle: "Kenali Kemampuanmu",
    reasonText: session.reasonText,
    sessionSize: questionIds.length,
    composition: summarizeComposition(
      questionIds.length,
      payloadQuestions.map((question) => ({ skill: question.skill ?? "", questionType: question.questionType as DiagnosticQuestionType }))
    ),
    questions: payloadQuestions,
  });
}

async function answerDiagnostic(userId: string, body: JsonRecord) {
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  const answer = typeof body.answer === "string" || typeof body.answer === "number" ? body.answer : null;
  if (!sessionId || !questionId || answer === null) {
    return NextResponse.json({ error: "sessionId, questionId, dan answer wajib diisi" }, { status: 400 });
  }

  const session = await db.adaptivePracticeSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
  if (session.reasonCode !== DIAGNOSTIC_REASON_CODE) {
    return NextResponse.json({ error: "Bukan sesi tes awal" }, { status: 403 });
  }
  if (session.status !== "IN_PROGRESS" || session.expiresAt <= new Date()) {
    return NextResponse.json({ error: "Sesi sudah berakhir" }, { status: 409 });
  }
  const questionIds = Array.isArray(session.questionIds)
    ? session.questionIds.filter((id): id is string => typeof id === "string")
    : [];
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
    metadata: { version: LEARNING_EVIDENCE_VERSION, selectionVersion: session.selectionVersion, diagnostic: true },
  });

  return NextResponse.json({ ok: true, sessionId, questionId, correct, recorded: true });
}

async function completeDiagnostic(userId: string, body: JsonRecord) {
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) return NextResponse.json({ error: "sessionId wajib diisi" }, { status: 400 });

  const claim = await db.adaptivePracticeSession.updateMany({
    where: { id: sessionId, userId, reasonCode: DIAGNOSTIC_REASON_CODE, status: "IN_PROGRESS", expiresAt: { gt: new Date() } },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  if (claim.count === 0) {
    const existing = await db.adaptivePracticeSession.findFirst({
      where: { id: sessionId, userId, reasonCode: DIAGNOSTIC_REASON_CODE },
      select: { status: true, source: true },
    });
    if (!existing || existing.status !== "COMPLETED") {
      return NextResponse.json({ error: "Sesi tidak ditemukan atau sudah berakhir" }, { status: 409 });
    }
    const profile = await buildSessionProfile(userId, existing.source, sessionId);
    return NextResponse.json({
      ok: true,
      sessionId,
      status: "COMPLETED",
      replay: true,
      result: profile,
    });
  }

  const completed = await db.adaptivePracticeSession.findFirst({
    where: { id: sessionId, userId, reasonCode: DIAGNOSTIC_REASON_CODE, status: "COMPLETED" },
    select: { source: true },
  });
  if (!completed) {
    return NextResponse.json({ error: "Sesi tidak ditemukan atau sudah berakhir" }, { status: 409 });
  }
  const profile = await buildSessionProfile(userId, completed.source, sessionId);
  return NextResponse.json({
    ok: true,
    sessionId,
    status: "COMPLETED",
    result: profile,
  });
}

/** One canonical endpoint: start, answer, and complete diagnostic sessions. */
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
      const limited = await rateLimitRoute(req, DIAGNOSTIC_RATE_LIMIT);
      if (limited) return limited;

      const size = body.size === undefined ? DIAGNOSTIC_DEFAULT_SIZE : Number(body.size);
      if (!Number.isInteger(size) || !DIAGNOSTIC_ALLOWED_SIZES.includes(size as (typeof DIAGNOSTIC_ALLOWED_SIZES)[number])) {
        return NextResponse.json({ error: "Ukuran sesi harus 8, 10, atau 12" }, { status: 400 });
      }
      return await startDiagnostic(user.id, size);
    }
    if (body.action === "answer") return await answerDiagnostic(user.id, body);
    if (body.action === "complete") return await completeDiagnostic(user.id, body);
    return NextResponse.json({ error: "action tidak valid" }, { status: 400 });
  } catch (error) {
    if (isLearnerStateInfraUnavailable(error) || isMissingDiagnosticInfra(error)) {
      return NextResponse.json(
        { code: "DIAGNOSTIC_UNAVAILABLE", error: "Data metadata/evidence belum tersedia" },
        { status: 503 }
      );
    }
    console.error("Diagnostic error:", error);
    return NextResponse.json({ error: "Gagal memproses tes awal" }, { status: 500 });
  }
}

/** Payload sesi diagnostik milik user (read-only, tanpa answer key). */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(req.url).searchParams;

  if (params.get("mode") === "preview") {
    try {
      return await previewDiagnostic(user.id);
    } catch (error) {
      if (isLearnerStateInfraUnavailable(error) || isMissingDiagnosticInfra(error)) {
        return NextResponse.json({ code: "DIAGNOSTIC_UNAVAILABLE" }, { status: 503 });
      }
      return NextResponse.json({ code: "DIAGNOSTIC_UNAVAILABLE", error: "Tes awal belum siap" }, { status: 503 });
    }
  }

  const sessionId = params.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId wajib diisi" }, { status: 400 });

  try {
    return await getDiagnosticPayload(user.id, sessionId);
  } catch (error) {
    if (isLearnerStateInfraUnavailable(error) || isMissingDiagnosticInfra(error)) {
      return NextResponse.json(
        { code: "DIAGNOSTIC_UNAVAILABLE", error: "Data metadata/evidence belum tersedia" },
        { status: 503 }
      );
    }
    console.error("Diagnostic GET error:", error);
    return NextResponse.json({ error: "Gagal memuat tes awal" }, { status: 500 });
  }
}