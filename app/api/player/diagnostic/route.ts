import { NextRequest, NextResponse } from "next/server";
import type { LearningSkillType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getLearnerState, isLearnerStateInfraUnavailable } from "@/lib/learner-state/service";
import { upsertLearningEvidence, LEARNING_EVIDENCE_VERSION } from "@/lib/learning-loop/evidence";
import { validateQuestionMetadata } from "@/lib/question-metadata/validation";
import {
  computeProfileFromEvidence,
  withUntestedSkills,
  profileFromLearnerState,
} from "@/lib/diagnostic/profile";
import { detectAssessmentState, ASSESSMENT_STATE_LABELS } from "@/lib/diagnostic/assessment-state";
import { computeAbilityProfile, normalizeEvidence } from "@/lib/diagnostic/ability";
import { selectDiagnosticQuestions, summarizeComposition } from "@/lib/diagnostic/selector";
import { buildPersonalizedAction } from "@/lib/diagnostic/personalization";
import {
  AI_DIAGNOSTIC_ANSWER_RATE_LIMIT,
  AI_DIAGNOSTIC_DEFAULT_SIZE,
  AI_DIAGNOSTIC_SELECTION_VERSION,
  AI_DIAGNOSTIC_SESSION_MINUTES,
  AI_DIAGNOSTIC_SOURCE,
  aiDiagnosticEnabled,
  AI_DIAGNOSTIC_ALLOWED_SIZES,
  AI_DIAGNOSTIC_COMING_SOON,
} from "@/lib/diagnostic-ai/config";
import { generateAiDiagnosticQuestion } from "@/lib/diagnostic-ai/generator";
import {
  answeredCountFor,
  buildInitialState,
  nextPlanForSlot,
  summarizeSessionEvidence,
} from "@/lib/diagnostic-ai/controller";
import { loadAiSessionState, saveAiSessionState, evidenceMetadata } from "@/lib/diagnostic-ai/persist";
import { pickBankFallbackCandidate, toFallbackAiItem } from "@/lib/diagnostic-ai/bank-fallback";
import { bankGateIssues } from "@/lib/diagnostic-ai/bank-gate";
import { toPublicQuestion } from "@/lib/diagnostic-ai/types";
import {
  DIAGNOSTIC_ALLOWED_SIZES,
  DIAGNOSTIC_DEFAULT_SIZE,
  DIAGNOSTIC_ESTIMATED_MINUTES,
  DIAGNOSTIC_MIN_ITEMS,
  DIAGNOSTIC_REASON_CODE,
  DIAGNOSTIC_SELECTION_VERSION,
  DIAGNOSTIC_SESSION_MINUTES,
  DIAGNOSTIC_SKILL_LABELS,
  DIAGNOSTIC_SKILL_PRIORITY,
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
    select: { kodeSoal: true, text: true, options: true, type: true, correctAnswer: true },
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
    // Gate konten (P0.5): tolak keluarga template rusak + cacat struktur yang
    // terbukti dikirim ke murid lewat jalur fallback bank. Tanpa mengubah data.
    const gateIssues = bankGateIssues({
      id: metadata.questionId,
      text: question.text,
      options: question.options,
      questionType: type,
      correctAnswer: String(question.correctAnswer ?? ""),
    });
    if (gateIssues.length > 0) continue;
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
    select: { isCorrect: true, skill: true, difficulty: true, metadata: true },
  });
}

/**
 * Profil dari DETAIL EVIDENCE sesi (jalur kanonik 4E.1) + "belum terukur"
 * untuk skill yang tidak ikut diuji (Part I/Q — jujur, bukan "lemah").
 * BC Assessment Engine 2.1: abilityProfile (difficulty-aware) dikomputasi
 * dari evidence yang sama — additive, tanpa mengubah shape result lama.
 */
async function buildSessionProfile(userId: string, source: string, sessionId: string) {
  const evidence = await loadSessionEvidence(userId, source, sessionId);
  const details = evidence.flatMap((row) =>
    row.skill
      ? [{
          skill: row.skill,
          difficulty: row.difficulty as DifficultyId | null,
          isCorrect: row.isCorrect === true,
          subskill: (row.metadata as { subskill?: string } | null)?.subskill ?? null,
        }]
      : []
  );
  const profile = computeProfileFromEvidence(details);
  const abilityProfile = computeAbilityProfile(normalizeEvidence(details));
  return { profile: withUntestedSkills(profile, Object.keys(DIAGNOSTIC_SKILL_LABELS)), abilityProfile };
}

function isAiSession(session: { source: string }): boolean {
  return session.source === AI_DIAGNOSTIC_SOURCE;
}

/** Stem butir yang sudah dipakai sesi ini (anti konten sama dua kali). */
function usedStemsOf(state: { items: Record<string, { text: string }> }): string[] {
  return Object.values(state.items).map((item) => item.text);
}

async function bankFallbackFor(
  plan: { skill: string; difficulty: string },
  avoidIds: string[],
  avoidStems: string[] = []
): Promise<ReturnType<typeof toFallbackAiItem> | null> {
  const pool = await buildDiagnosticCandidates();
  if (pool.length === 0) return null;
  const candidate = pickBankFallbackCandidate(pool, plan, avoidIds, avoidStems);
  if (!candidate) return null;
  const question = await db.soal.findUnique({
    where: { kodeSoal: candidate.id },
    select: { correctAnswer: true },
  });
  return toFallbackAiItem(candidate, String(question?.correctAnswer ?? "0"));
}

async function startAiDiagnostic(userId: string, size: number): Promise<NextResponse | null> {
  const plan = nextPlanForSlot(
    { v: 1, mode: "AI-ADAPTIVE", targetSize: size, order: [], items: {}, usedTopics: [], usedSubskills: [], genFailed: false },
    0
  );
  const generated = await generateAiDiagnosticQuestion(
    plan,
    { avoidStems: [], avoidSubskills: [], usedTopics: [], recentSummary: "" },
    []
  );
  let first = generated.item;
  if (!first) {
    first = await bankFallbackFor(plan, []);
  }
  if (!first) return null;

  const state = buildInitialState(size, first);
  const reasonText =
    "Tes awal adaptif: soal berikutnya dipilih berdasarkan jawabanmu sebelumnya. Jawab sebisamu — hasilnya dipakai untuk menyesuaikan latihan.";
  const session = await db.adaptivePracticeSession.create({
    data: {
      userId,
      source: AI_DIAGNOSTIC_SOURCE,
      selectionVersion: AI_DIAGNOSTIC_SELECTION_VERSION,
      targetSkill: null,
      targetSubskill: null,
      targetDifficulty: null,
      reasonCode: DIAGNOSTIC_REASON_CODE,
      reasonText,
      questionIds: state as unknown as Prisma.InputJsonValue,
      status: "IN_PROGRESS",
      expiresAt: new Date(Date.now() + AI_DIAGNOSTIC_SESSION_MINUTES * 60 * 1000),
    },
  });

  return NextResponse.json({
    mode: "DIAGNOSTIC",
    actionType: "DIAGNOSTIC",
    adaptive: true,
    sessionId: session.id,
    selectionVersion: AI_DIAGNOSTIC_SELECTION_VERSION,
    sessionSize: state.targetSize,
    answeredCount: 0,
    remaining: state.order.length,
    reasonText,
    questions: [toPublicQuestion(first)],
  });
}

async function answerAiDiagnostic(
  userId: string,
  session: { id: string; source: string; reasonCode: string },
  body: JsonRecord
): Promise<NextResponse> {
  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  const answer = typeof body.answer === "string" || typeof body.answer === "number" ? body.answer : null;
  if (!questionId || answer === null) {
    return NextResponse.json({ error: "sessionId, questionId, dan answer wajib diisi" }, { status: 400 });
  }

  const state = await loadAiSessionState(session.id, userId);
  if (!state) {
    return NextResponse.json({ error: "Sesi tidak ditemukan atau data soal hilang" }, { status: 409 });
  }
  if (!state.order.includes(questionId)) {
    return NextResponse.json({ error: "Soal bukan bagian dari sesi" }, { status: 403 });
  }
  const item = state.items[questionId];
  if (!item) {
    return NextResponse.json({ error: "Data soal tidak ditemukan" }, { status: 409 });
  }

  const correct = String(answer) === String(item.correctAnswer);
  await upsertLearningEvidence({
    userId,
    source: session.source,
    activityId: session.id,
    questionId,
    selectedAnswer: String(answer),
    isCorrect: correct,
    score: correct ? 1 : 0,
    skill: item.skill as LearningSkillType,
    difficulty: item.difficulty as DifficultyId | null,
    metadata: evidenceMetadata(),
  });

  state.order = state.order.filter((id) => id !== questionId);
  // answered = butir di `items` yang sudah tidak ada di `order` (sudah dijawab).
  // Butir yang sudah dijawab TIDAK dihapus dari `items`, jadi `|items| − |order|`
  // benar untuk sesi yang membangkitkan satu butir per langkah. Memakai
  // `targetSize − order.length` membuat sesi "selesai" setelah satu jawaban.
  const answeredCount = answeredCountFor(state);

  if (state.order.length > 0) {
    const next = state.items[state.order[0]];
    await saveAiSessionState(session.id, userId, state);
    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      questionId,
      correct,
      recorded: true,
      adaptive: true,
      nextQuestion: next ? toPublicQuestion(next) : null,
      remaining: state.order.length,
      done: false,
      reasonCode: "ANSWERED",
    });
  }

  if (answeredCount >= state.targetSize) {
    await saveAiSessionState(session.id, userId, state);
    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      questionId,
      correct,
      recorded: true,
      adaptive: true,
      nextQuestion: null,
      remaining: 0,
      done: true,
      reasonCode: "TARGET_REACHED",
    });
  }

  const plan = nextPlanForSlot(state, answeredCount);
  let next: ReturnType<typeof toPublicQuestion> | null = null;
  let reasonCode: "ANSWERED" | "GENERATION_UNAVAILABLE" = "ANSWERED";

  if (state.genFailed) {
    const fallback = await bankFallbackFor(plan, Object.keys(state.items), usedStemsOf(state));
    if (fallback) {
      state.items[fallback.id] = fallback;
      state.order = [fallback.id];
      if (fallback.topic) state.usedTopics.push(fallback.topic);
      if (fallback.subskill) state.usedSubskills.push(fallback.subskill);
      next = toPublicQuestion(fallback);
    } else {
      reasonCode = "GENERATION_UNAVAILABLE";
    }
  } else {
    const evidence = await loadSessionEvidence(userId, session.source, session.id);
    const generated = await generateAiDiagnosticQuestion(
      plan,
      {
        avoidStems: Object.values(state.items).map((value) => value.text),
        avoidSubskills: state.usedSubskills,
        usedTopics: state.usedTopics,
        recentSummary: summarizeSessionEvidence(evidence),
      },
      Object.keys(state.items)
    );
    if (generated.item) {
      state.items[generated.item.id] = generated.item;
      state.order = [generated.item.id];
      if (generated.item.topic) state.usedTopics.push(generated.item.topic);
      if (generated.item.subskill) state.usedSubskills.push(generated.item.subskill);
      next = toPublicQuestion(generated.item);
    } else {
      state.genFailed = true;
      const fallback = await bankFallbackFor(plan, Object.keys(state.items), usedStemsOf(state));
      if (fallback) {
        state.items[fallback.id] = fallback;
        state.order = [fallback.id];
        if (fallback.topic) state.usedTopics.push(fallback.topic);
        if (fallback.subskill) state.usedSubskills.push(fallback.subskill);
        next = toPublicQuestion(fallback);
      } else {
        reasonCode = "GENERATION_UNAVAILABLE";
      }
    }
  }

  await saveAiSessionState(session.id, userId, state);
  if (!next && reasonCode === "GENERATION_UNAVAILABLE") {
    // Tak ada butir berikutnya (generator AI + fallback bank gagal). Sesi
    // diakhiri secara deterministik — murid TIDAK boleh macet selamanya.
    // Alur complete menangani profil dengan bukti yang ada secara jujur.
    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      questionId,
      correct,
      recorded: true,
      adaptive: true,
      nextQuestion: null,
      remaining: 0,
      done: true,
      reasonCode,
    });
  }
  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    questionId,
    correct,
    recorded: true,
    adaptive: true,
    nextQuestion: next,
    remaining: state.order.length,
    done: false,
    reasonCode,
  });
}

async function getAiDiagnosticPayload(
  userId: string,
  session: {
    id: string;
    source: string;
    status: string;
    reasonText?: string | null;
  }
): Promise<NextResponse> {
  const state = await loadAiSessionState(session.id, userId);
  if (!state) {
    return NextResponse.json({ error: "Sesi tidak ditemukan atau data soal hilang" }, { status: 409 });
  }

  if (session.status === "COMPLETED") {
    const { profile, abilityProfile } = await buildSessionProfile(userId, session.source, session.id);
    return NextResponse.json({
      mode: "DIAGNOSTIC",
      actionType: "DIAGNOSTIC",
      adaptive: true,
      sessionId: session.id,
      status: "COMPLETED",
      actionTitle: "Kenali Kemampuanmu",
      sessionSize: state.targetSize,
      questions: [],
      result: profile,
      abilityProfile,
    });
  }

  const current = state.order.length > 0 ? state.items[state.order[0]] : null;
  return NextResponse.json({
    mode: "DIAGNOSTIC",
    actionType: "DIAGNOSTIC",
    adaptive: true,
    sessionId: session.id,
    status: "IN_PROGRESS",
    actionTitle: "Kenali Kemampuanmu",
    reasonText: session.reasonText ?? null,
    sessionSize: state.targetSize,
    answeredCount: answeredCountFor(state),
    remaining: state.order.length,
    questions: current ? [toPublicQuestion(current)] : [],
  });
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

/**
 * BC Assessment Engine 2.0 — Preview My Day with canonical assessment states.
 *
 * States:
 *   NO_BASELINE          → always DIAGNOSTIC (even if some practice evidence exists)
 *   BASELINE_IN_PROGRESS → DIAGNOSTIC (resume prompt)
 *   BASELINE_COMPLETE_LOW→ DIAGNOSTIC (honest: need more evidence)
 *   PROFILE_READY        → ADAPTIVE_PRACTICE (personalized)
 *   PROFILE_CONFIDENT    → ADAPTIVE_PRACTICE (personalized)
 *
 * The key product fix: students who have some practice evidence but NO
 * completed diagnostic MUST see "Kenali Kemampuanmu" — not "BC Masih
 * Mengenali" or adaptive practice.
 */
async function previewDiagnostic(userId: string) {
  try {
    const assessment = await detectAssessmentState(userId);
    const states = await getLearnerState(userId);
    const labels = ASSESSMENT_STATE_LABELS[assessment.state];

    // NO_BASELINE & BASELINE_IN_PROGRESS → always DIAGNOSTIC mode.
    if (assessment.state === "NO_BASELINE" || assessment.state === "BASELINE_IN_PROGRESS") {
      // Check if corpus is available for diagnostic.
      const candidates = await buildDiagnosticCandidates();
      if (candidates.length < DIAGNOSTIC_MIN_ITEMS) {
        // Corpus insufficient → honest fallback to general learning.
        return NextResponse.json({
          mode: "PREVIEW",
          actionType: "GENERAL_LEARNING",
          actionTitle: "Mulai Belajar Hari Ini",
          ctaLabel: "Mulai Latihan",
          targetSkill: null,
          targetSubskill: null,
          targetDifficulty: null,
          sessionSize: null,
          reasonCode: "DIAGNOSTIC_UNAVAILABLE",
          reasonText: "Tes awal belum tersedia. Mulai latihan umum terlebih dahulu.",
          estimatedMinutes: null,
          confidence: "NO_DATA",
          premiumDepth: "STANDARD",
          selectionVersion: DIAGNOSTIC_SELECTION_VERSION,
          personalization: null,
          diagnosticCompleted: false,
          assessmentState: assessment.state,
          learnerState: states,
          mentor: null,
          fallback: { href: "/arena/jalur-cerdas", label: "Mulai latihan umum" },
        });
      }

      // For BASELINE_IN_PROGRESS: find the in-progress session for resume.
      let inProgressSessionId: string | null = null;
      if (assessment.state === "BASELINE_IN_PROGRESS") {
        const session = await db.adaptivePracticeSession.findFirst({
          where: { userId, reasonCode: DIAGNOSTIC_REASON_CODE, status: "IN_PROGRESS" },
          select: { id: true },
        });
        inProgressSessionId = session?.id ?? null;
      }

      // Gerbang "Segera Hadir": soal Tes Awal AI generatif masih dalam QA
      // (8.4.1 dipause). Murid tanpa baseline tidak boleh memulai tes dengan
      // soal yang belum matang — tanda datang dari server, bukan tebakan UI.
      const aiComingSoon =
        assessment.state === "NO_BASELINE" && aiDiagnosticEnabled() && AI_DIAGNOSTIC_COMING_SOON;

      return NextResponse.json({
        mode: "PREVIEW",
        actionType: "DIAGNOSTIC",
        actionTitle: labels.title,
        ctaLabel: labels.ctaLabel,
        targetSkill: null,
        targetSubskill: null,
        targetDifficulty: null,
        sessionSize: DIAGNOSTIC_DEFAULT_SIZE,
        durationLabel: "±5–8 menit",
        skillsLabel: DIAGNOSTIC_SKILL_PRIORITY.map((skill) => DIAGNOSTIC_SKILL_LABELS[skill]).join(" · "),
        reasonCode: assessment.state === "BASELINE_IN_PROGRESS" ? "BASELINE_IN_PROGRESS" : "NO_EVIDENCE",
        reasonText: aiComingSoon
          ? "Tes Awal sedang disempurnakan dan akan segera hadir. Sambil menunggu, kamu bisa mulai belajar dulu — hasil belajarmu tetap tercatat."
          : labels.description,
        estimatedMinutes: DIAGNOSTIC_ESTIMATED_MINUTES,
        confidence: "NO_DATA",
        premiumDepth: "STANDARD",
        selectionVersion: DIAGNOSTIC_SELECTION_VERSION,
        personalization: null,
        diagnosticCompleted: false,
        assessmentState: assessment.state,
        inProgressSessionId,
        learnerState: states,
        mentor: null,
        comingSoon: aiComingSoon || undefined,
      });
    }

    // BASELINE_COMPLETE_LOW → DIAGNOSTIC mode with honest "need more evidence".
    if (assessment.state === "BASELINE_COMPLETE_LOW") {
      return NextResponse.json({
        mode: "PREVIEW",
        actionType: "DIAGNOSTIC",
        actionTitle: labels.title,
        ctaLabel: labels.ctaLabel,
        targetSkill: null,
        targetSubskill: null,
        targetDifficulty: null,
        sessionSize: null,
        reasonCode: "BASELINE_COMPLETE_LOW",
        reasonText: labels.description,
        estimatedMinutes: null,
        confidence: "LOW",
        premiumDepth: "STANDARD",
        selectionVersion: DIAGNOSTIC_SELECTION_VERSION,
        personalization: null,
        diagnosticCompleted: true,
        assessmentState: assessment.state,
        learnerState: states,
        mentor: null,
      });
    }

try {
    if (aiDiagnosticEnabled()) {
      const states = await getLearnerState(userId);
      // Gerbang "Segera Hadir" juga berlaku untuk entri Tes Awal AI lainnya.
      const aiComingSoon = AI_DIAGNOSTIC_COMING_SOON;
      return NextResponse.json({
        mode: "PREVIEW",
        actionType: "DIAGNOSTIC",
        adaptive: true,
        actionTitle: "Kenali Kemampuanmu",
        ctaLabel: "Mulai Tes Awal",
        targetSkill: null,
        targetSubskill: null,
        targetDifficulty: null,
        sessionSize: AI_DIAGNOSTIC_DEFAULT_SIZE,
        durationLabel: "±5–8 menit",
        skillsLabel: DIAGNOSTIC_SKILL_PRIORITY.map((skill) => DIAGNOSTIC_SKILL_LABELS[skill]).join(" · "),
        reasonCode: "NO_EVIDENCE",
        reasonText: aiComingSoon
          ? "Tes Awal sedang disempurnakan dan akan segera hadir. Sambil menunggu, kamu bisa mulai belajar dulu — hasil belajarmu tetap tercatat."
          : "Kamu belum punya riwayat latihan. Tes singkat ini memetakan kemampuanmu dulu — jawabanmu dipakai untuk menyesuaikan latihan berikutnya, tanpa nilai benar-salah yang merugikan.",
        estimatedMinutes: DIAGNOSTIC_ESTIMATED_MINUTES,
        confidence: "NO_DATA",
        premiumDepth: "STANDARD",
        selectionVersion: AI_DIAGNOSTIC_SELECTION_VERSION,
        personalization: null,
        diagnosticCompleted: false,
        learnerState: states,
        mentor: null,
        comingSoon: aiComingSoon || undefined,
      });
    }
  } catch {
    // lanjut ke jalur bank soal bila learner-state tidak tersedia
  }

  const candidates = await buildDiagnosticCandidates();
  if (candidates.length < DIAGNOSTIC_MIN_ITEMS) {
    return NextResponse.json({ code: "DIAGNOSTIC_UNAVAILABLE" }, { status: 503 });
  }
  // PROFILE_READY / PROFILE_CONFIDENT → adaptive practice with personalization.
    const completedSession = await db.adaptivePracticeSession.findFirst({
      where: { userId, reasonCode: DIAGNOSTIC_REASON_CODE, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { id: true, source: true },
    });
    let profile: ReturnType<typeof profileFromLearnerState>;
    let abilityProfile: ReturnType<typeof computeAbilityProfile> | null = null;
    if (completedSession) {
      const built = await buildSessionProfile(userId, completedSession.source, completedSession.id);
      profile = built.profile;
      abilityProfile = built.abilityProfile;
    } else {
      profile = profileFromLearnerState(states, Object.keys(DIAGNOSTIC_SKILL_LABELS));
    }
    const personalization = buildPersonalizedAction(profile, completedSession ? "DIAGNOSTIC_PROFILE" : "LEARNER_STATE");

    return NextResponse.json({
      mode: "PREVIEW",
      actionType: "ADAPTIVE_PRACTICE",
      actionTitle: labels.title,
      ctaLabel: labels.ctaLabel,
      targetSkill: personalization.targetSkill,
      targetSubskill: null,
      targetDifficulty: personalization.recommendation,
      sessionSize: null,
      reasonCode: "PROFILE_READY",
      abilityProfile,
      reasonText: labels.description,
      estimatedMinutes: null,
      confidence: assessment.state === "PROFILE_CONFIDENT" ? "HIGH" : "MEDIUM",
      premiumDepth: "STANDARD",
      selectionVersion: DIAGNOSTIC_SELECTION_VERSION,
      personalization,
      diagnosticCompleted: true,
      assessmentState: assessment.state,
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
  if (isAiSession(session)) {
    return await getAiDiagnosticPayload(userId, session);
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
    const { profile, abilityProfile } = await buildSessionProfile(userId, session.source, session.id);
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
      abilityProfile,
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

async function answerDiagnostic(req: NextRequest, userId: string, body: JsonRecord) {
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId wajib diisi" }, { status: 400 });
  }

  const session = await db.adaptivePracticeSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
  if (session.reasonCode !== DIAGNOSTIC_REASON_CODE) {
    return NextResponse.json({ error: "Bukan sesi tes awal" }, { status: 403 });
  }
  if (session.status !== "IN_PROGRESS" || session.expiresAt <= new Date()) {
    return NextResponse.json({ error: "Sesi sudah berakhir" }, { status: 409 });
  }

  if (isAiSession(session)) {
    const limited = await rateLimitRoute(req, AI_DIAGNOSTIC_ANSWER_RATE_LIMIT);
    if (limited) return limited;
    return await answerAiDiagnostic(userId, session, body);
  }

  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  const answer = typeof body.answer === "string" || typeof body.answer === "number" ? body.answer : null;
  if (!questionId || answer === null) {
    return NextResponse.json({ error: "sessionId, questionId, dan answer wajib diisi" }, { status: 400 });
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
    metadata: {
      version: LEARNING_EVIDENCE_VERSION,
      selectionVersion: session.selectionVersion,
      diagnostic: true,
      // BC Assessment Engine 2.1 — subskill untuk coverage subskill per skill.
      subskill: metadata.subskill ?? null,
    },
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
    const { profile, abilityProfile } = await buildSessionProfile(userId, existing.source, sessionId);
    return NextResponse.json({
      ok: true,
      sessionId,
      status: "COMPLETED",
      replay: true,
      result: profile,
      abilityProfile,
    });
  }

  const completed = await db.adaptivePracticeSession.findFirst({
    where: { id: sessionId, userId, reasonCode: DIAGNOSTIC_REASON_CODE, status: "COMPLETED" },
    select: { source: true },
  });
  if (!completed) {
    return NextResponse.json({ error: "Sesi tidak ditemukan atau sudah berakhir" }, { status: 409 });
  }
  const { profile, abilityProfile } = await buildSessionProfile(userId, completed.source, sessionId);
  return NextResponse.json({
    ok: true,
    sessionId,
    status: "COMPLETED",
    result: profile,
    abilityProfile,
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

      const aiMode = aiDiagnosticEnabled();
      const allowedSizes: readonly number[] = aiMode ? AI_DIAGNOSTIC_ALLOWED_SIZES : DIAGNOSTIC_ALLOWED_SIZES;
      const defaultSize = aiMode ? AI_DIAGNOSTIC_DEFAULT_SIZE : DIAGNOSTIC_DEFAULT_SIZE;
      const size = body.size === undefined ? defaultSize : Number(body.size);
      if (!Number.isInteger(size) || !allowedSizes.includes(size)) {
        const list = Array.from(allowedSizes).join(", ");
        return NextResponse.json({ error: `Ukuran sesi harus ${list}` }, { status: 400 });
      }
      if (aiMode) {
        const aiResponse = await startAiDiagnostic(user.id, size);
        if (aiResponse) return aiResponse;
      }
      return await startDiagnostic(user.id, size);
    }
    if (body.action === "answer") return await answerDiagnostic(req, user.id, body);
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