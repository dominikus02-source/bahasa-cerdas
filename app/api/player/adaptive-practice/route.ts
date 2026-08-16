import { NextRequest, NextResponse } from "next/server";
import type { LearningSkillType } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getLearnerState, isLearnerStateInfraUnavailable } from "@/lib/learner-state/service";
import { upsertLearningEvidence, LEARNING_EVIDENCE_VERSION } from "@/lib/learning-loop/evidence";
import { validateQuestionMetadata } from "@/lib/question-metadata/validation";
import { ADAPTIVE_ALLOWED_SIZES, ADAPTIVE_MAX_CANDIDATES, ADAPTIVE_SELECTION_VERSION, ADAPTIVE_SUPPORTED_SOURCES, ADAPTIVE_SESSION_BASE_XP, ADAPTIVE_START_RATE_LIMIT } from "@/lib/adaptive-practice/config";
import { selectAdaptivePractice } from "@/lib/adaptive-practice/selector";
import type { AdaptiveCandidate } from "@/lib/adaptive-practice/types";
import type { DifficultyId, QuestionTypeId } from "@/lib/question-metadata/taxonomy";
import { computeDiagnosticProfile } from "@/lib/diagnostic/profile";
import { buildPersonalizedAction } from "@/lib/diagnostic/personalization";
import { hasCompletedDiagnostic } from "@/lib/diagnostic/completion";
import { dayKeyWIB } from "@/lib/learning-loop/journey";
import { getSessionSummary } from "@/lib/learning-loop/session";
import { awardXp } from "@/lib/award-xp";
import { rateLimitRoute } from "@/lib/rate-limit";

const ADAPTIVE_XP_SOURCE = "ADAPTIVE_PRACTICE";

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

function fallbackResponse(reasonCode = "INSUFFICIENT_METADATA", learnerState: unknown[] = []) {
  const profile = computeDiagnosticProfile(learnerState as Parameters<typeof computeDiagnosticProfile>[0]);
  const personalization = buildPersonalizedAction(profile, "LEARNER_STATE");
  return NextResponse.json({
    mode: "FALLBACK",
    actionType: "GENERAL_LEARNING",
    actionTitle: "Mulai Latihan Hari Ini",
    ctaLabel: "Mulai Latihan",
    targetSkill: null,
    targetSubskill: null,
    targetDifficulty: null,
    sessionSize: null,
    estimatedMinutes: null,
    confidence: "NO_DATA",
    premiumDepth: "STANDARD",
    selectionVersion: ADAPTIVE_SELECTION_VERSION,
    reasonCode,
    reasonText: "Belum cukup data untuk latihan personal.",
    personalization,
    diagnosticCompleted: false,
    learnerState,
    mentor: null,
    fallback: {
      href: "/arena/jalur-cerdas",
      label: "Mulai latihan umum",
    },
    questions: [],
  });
}

async function startSession(userId: string, size: number, mode: "start" | "preview" = "start", userName = "Murid") {
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
  if (metadataRows.length === 0) return fallbackResponse("INSUFFICIENT_METADATA", states);

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
  if (!selection) return fallbackResponse("INSUFFICIENT_METADATA", states);

  if (mode === "preview") {
    let mentor: { name: string; insights: string[]; today: { activities: number; xp: number; coin: number } } | null = null;
    try {
      const summary = await getSessionSummary(userId, userName);
      mentor = { name: summary.name, insights: summary.insights.slice(0, 2), today: summary.today };
    } catch {
      mentor = null;
    }
    // STEP 4E.2 — personalisasi lapisan penjelasan ("Kenapa latihan ini?"):
    // dibangun SERVER-side dari profil learner state; klien tidak mengirim apa pun.
    const profile = computeDiagnosticProfile(states);
    const personalization = buildPersonalizedAction(profile, "LEARNER_STATE");
    const diagnosticCompleted = await hasCompletedDiagnostic(userId);
    return NextResponse.json({
      mode: "PREVIEW",
      actionType: "ADAPTIVE_PRACTICE",
      actionTitle: selection.actionTitle,
      ctaLabel: "Mulai Latihan",
      targetSkill: selection.targetSkill,
      targetSubskill: selection.targetSubskill,
      targetDifficulty: selection.targetDifficulty,
      sessionSize: size,
      estimatedMinutes: null,
      confidence: selection.confidence,
      premiumDepth: "STANDARD",
      selectionVersion: selection.selectionVersion,
      reasonCode: selection.reasonCode,
      reasonText: selection.reasonText,
      personalization,
      diagnosticCompleted,
      learnerState: states,
      mentor,
    });
  }

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
    actionType: "ADAPTIVE_PRACTICE",
    actionTitle: selection.actionTitle,
    ctaLabel: "Mulai Latihan",
    sessionId: session.id,
    selectionVersion: selection.selectionVersion,
    targetSkill: selection.targetSkill,
    targetSubskill: selection.targetSubskill,
    targetDifficulty: selection.targetDifficulty,
    reasonCode: selection.reasonCode,
    reasonText: selection.reasonText,
    sessionSize: selection.questions.length,
    estimatedMinutes: null,
    confidence: selection.confidence,
    premiumDepth: "STANDARD",
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

async function getSessionPayload(userId: string, sessionId: string) {
  const session = await db.adaptivePracticeSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
  if (session.status !== "IN_PROGRESS" || session.expiresAt <= new Date()) {
    return NextResponse.json({ error: "Sesi sudah berakhir" }, { status: 409 });
  }
  const questionIds = Array.isArray(session.questionIds) ? session.questionIds.filter((id): id is string => typeof id === "string") : [];
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
  return NextResponse.json({
    mode: "ADAPTIVE",
    actionType: "ADAPTIVE_PRACTICE",
    sessionId: session.id,
    selectionVersion: session.selectionVersion,
    targetSkill: session.targetSkill,
    targetSubskill: session.targetSubskill,
    targetDifficulty: session.targetDifficulty,
    reasonCode: session.reasonCode,
    reasonText: session.reasonText,
    sessionSize: questionIds.length,
    questions: questionIds.flatMap((id) => {
      const question = questionMap.get(id);
      const metadata = metadataMap.get(id);
      return question && metadata
        ? [{ id, text: question.text, options: question.options, questionType: metadata.questionType, topic: metadata.topic, skill: metadata.skill, subskill: metadata.subskill, difficulty: metadata.difficulty }]
        : [];
    }),
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

/**
 * Selesaikan sesi Adaptive Practice dengan gate keamanan penuh.
 *
 * Invariant (Step 4D Part A/B/G/H):
 *   sesi sah + evidence lengkap → COMPLETED tepat sekali → XP tepat sekali.
 *   Sesi tidak lengkap / kosong / expired / milik user lain → DITOLAK, 0 XP.
 *
 * Alur (race-safe):
 *   1. Coverage gate: semua soal sesi wajib punya LearningEvidence milik user
 *      (activityId = session.id). Client TIDAK bisa menyuplai evidence/skor.
 *   2. Atomic claim: updateMany `status=COMPLETED` hanya untuk sesi milik user,
 *      still IN_PROGRESS, belum expired. Dua permintaan yang bersamaan:
 *      SATU pemenang (count=1); yang kalah → jalur recovery (4), tanpa 2× XP.
 *   3. Klaim XP: `awardXp(..., reference = session.id)` — idempoten via
 *      @@unique([userId, source, reference]). Hanya pemenang claim yang sampai
 *      ke awardXp, jadi tidak ada kompetisi award langsung.
 *   4. Recovery (count=0): saat sesi sudah COMPLETED tapi belum pernah dicairkan
 *      XP (mis. award gagal diusulkan sebelumnya) → beri XP sekali lewat awardXp
 *      (reference unik tetap melindungi). Selesai/expired/asing → 409, 0 XP.
 *   5. Skor kebenaran murni dari evidence server-side — nilai klien
 *      (score/XP/coin/correctAnswer/evidenceCount) TIDAK pernah dipakai.
 */
async function completeSession(userId: string, body: JsonRecord) {
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) return NextResponse.json({ error: "sessionId wajib diisi" }, { status: 400 });

  const claim = await db.adaptivePracticeSession.updateMany({
    where: { id: sessionId, userId, status: "IN_PROGRESS", expiresAt: { gt: new Date() } },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  if (claim.count === 0) {
    // Bukan pemenang: cek apakah ini replay/retry sesi yang sudah COMPLETED.
    const existing = await db.adaptivePracticeSession.findFirst({
      where: { id: sessionId, userId },
      select: { status: true, questionIds: true },
    });
    if (!existing || existing.status !== "COMPLETED") {
      return NextResponse.json({ error: "Sesi tidak ditemukan atau sudah berakhir" }, { status: 409 });
    }
    // Sesi sudah COMPLETED — beri XP HANYA jika belum pernah dicairkan (recovery).
    const rewarded = await db.xPTransaction.findUnique({
      where: { userId_source_reference: { userId, source: ADAPTIVE_XP_SOURCE, reference: sessionId } },
      select: { amount: true },
    });
    if (rewarded) {
      return NextResponse.json({
        ok: true,
        sessionId,
        status: "COMPLETED",
        xpEarned: 0,
        replay: true,
        alreadyRewarded: true,
      });
    }
    const assigned = Array.isArray(existing.questionIds)
      ? existing.questionIds.filter((id): id is string => typeof id === "string")
      : [];
    const evidenceRows = await db.learningEvidence.findMany({
      where: { userId, activityId: sessionId, questionId: { in: assigned } },
      select: { isCorrect: true, questionId: true },
    });
    const answeredSet = new Set(evidenceRows.map((row) => row.questionId));
    if (assigned.length === 0 || answeredSet.size < assigned.length) {
      return NextResponse.json({ error: "Sesi tidak lengkap" }, { status: 409 });
    }
    const correctCount = evidenceRows.filter((row) => row.isCorrect).length;
    const xpAmount = Math.round((ADAPTIVE_SESSION_BASE_XP * correctCount) / assigned.length);
    const hasil = await awardXp(userId, ADAPTIVE_XP_SOURCE, xpAmount, sessionId);
    return NextResponse.json({
      ok: true,
      sessionId,
      status: "COMPLETED",
      xpEarned: hasil.xpDiberikan,
      boosted: hasil.boosted,
      kuotaHabis: hasil.kuotaHabis,
      totalXp: hasil.totalXp,
      level: hasil.levelBaru,
      naikLevel: hasil.naikLevel,
      recovered: true,
    });
  }

  // Pemenang claim — (1) gate evidence terhadap soal SESI (bukan dari klien).
  const sessionPayload = await db.adaptivePracticeSession.findUnique({
    where: { id: sessionId },
    select: { questionIds: true, status: true },
  });
  if (!sessionPayload || sessionPayload.status !== "COMPLETED") {
    return NextResponse.json({ error: "Sesi sudah selesai. Tidak ada XP tambahan." }, { status: 409 });
  }
  const assigned = Array.isArray(sessionPayload.questionIds)
    ? sessionPayload.questionIds.filter((id): id is string => typeof id === "string")
    : [];
  if (assigned.length === 0) {
    await db.adaptivePracticeSession.updateMany({
      where: { id: sessionId, userId, status: "COMPLETED" },
      data: { status: "IN_PROGRESS", completedAt: null },
    });
    return NextResponse.json({ error: "Sesi tidak memiliki soal" }, { status: 409 });
  }

  const evidenceRows = await db.learningEvidence.findMany({
    where: { userId, activityId: sessionId, questionId: { in: assigned } },
    select: { isCorrect: true, questionId: true },
  });
  const answeredSet = new Set(evidenceRows.map((row) => row.questionId));
  const answeredCount = answeredSet.size;
  if (answeredCount < assigned.length) {
    // (1b) Coverage tidak penuh → ubah kembali ke IN_PROGRESS + 0 XP.
    await db.adaptivePracticeSession.updateMany({
      where: { id: sessionId, userId, status: "COMPLETED" },
      data: { status: "IN_PROGRESS", completedAt: null },
    });
    return NextResponse.json(
      { error: `Sesi belum dikerjakan sepenuhnya (${answeredCount} dari ${assigned.length} soal dijawab)` },
      { status: 409 }
    );
  }

  // (3) Skor kebenaran murni dari evidence server-side (bukan klien).
  const correctCount = evidenceRows.filter((row) => row.isCorrect).length;
  const xpAmount = Math.round((ADAPTIVE_SESSION_BASE_XP * correctCount) / assigned.length);

  // (4) Klaim XP — reference = session.id; @@unique([userId, source, reference])
  //     menjamin retry/replay tidak pernah menambah XP dua kali.
  const hasil = await awardXp(userId, ADAPTIVE_XP_SOURCE, xpAmount, sessionId);

  return NextResponse.json({
    ok: true,
    sessionId,
    status: "COMPLETED",
    xpEarned: hasil.xpDiberikan,
    boosted: hasil.boosted,
    kuotaHabis: hasil.kuotaHabis,
    totalXp: hasil.totalXp,
    level: hasil.levelBaru,
    naikLevel: hasil.naikLevel,
    answered: answeredCount,
    correct: correctCount,
  });
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
      // Rate limit start (per user/session — getClientKey, bukan IP):
      // 10 sesi per 30 menit. Pembelajaran sah (5-15 soal/sesi) sangat jauh
      // di bawah itu; batas XP harian 5.000 tetap jaring pengaman terakhir.
      const limited = await rateLimitRoute(req, ADAPTIVE_START_RATE_LIMIT);
      if (limited) return limited;

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

/** Read-only My Day preview or an owned answer-free session snapshot. */
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const mode = params.get("mode");
  const sessionId = params.get("sessionId");

  try {
    if (mode === "preview") return await startSession(user.id, 5, "preview", user.fullName);
    if (sessionId) return await getSessionPayload(user.id, sessionId);
    return NextResponse.json({ error: "mode=preview atau sessionId wajib diisi" }, { status: 400 });
  } catch (error) {
    if (isLearnerStateInfraUnavailable(error) || isMissingAdaptiveInfra(error)) {
      return NextResponse.json(
        { code: "ADAPTIVE_PRACTICE_UNAVAILABLE", error: "Data metadata/evidence belum tersedia" },
        { status: 503 }
      );
    }
    console.error("Adaptive practice GET error:", error);
    return NextResponse.json({ error: "Gagal memuat latihan personal" }, { status: 500 });
  }
}
