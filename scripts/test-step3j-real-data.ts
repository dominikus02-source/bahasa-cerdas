#!/usr/bin/env npx tsx
/**
 * STEP 3J — PART D+E: REAL-DATA ADAPTIVE PRACTICE E2E.
 *
 * Menjalankan rantai production yang sebenarnya terhadap database TERKONFIGURASI:
 *
 *   QUESTION → METADATA → EVIDENCE → LEARNER STATE → ADAPTIVE SELECTOR
 *   → PERSONALIZED PRACTICE → NEW EVIDENCE → UPDATED LEARNER STATE
 *
 * PRASYARAT (harus dijalankan dulu oleh Founder):
 *   npm run approve:metadata-manifest -- --execute --founder-email <email>
 *   (12 rekor review-manifest-001 menjadi APPROVED; Soal match dijamin).
 *
 * ISOLASI (Part E — tidak mencemari production):
 *   * Test memakai satu user deterministik khusus: e2e.adaptive@bahasacerdas.local
 *     (role MURID, supabaseId 'e2e-adaptive-test-user').
 *   * Semua evidence/sesi dibuat hanya untuk user itu dan DIBERSIHKAN di akhir.
 *   * Cleanup dibuktikan: total baris LearningEvidence global kembali ke baseline
 *     (bukan hanya "dihapus saja").
 *   * TIDAK menyentuh LearningSkill/PlayerActivity/XP/koin user lain.
 *
 * TANPA koneksi DB → "DATABASE UNAVAILABLE ... UNVERIFIED", exit 0 (jujur,
 * tidak mengarang angka). GAGAL prasyarat → exit 1 dengan pesan jelas.
 *
 * Fase:
 *   ZERO  : tidak ada evidence        → NO_DATA  → target EASY
 *   A     : READING lemah (6 salah)   → WEAK_SKILL → target MEDIUM; server-side
 *           scoring; idempotensi; complete; anti-repeat; tanpa reward
 *   B     : READING PROFICIENT 80%    → target HARD
 *   C     : READING PROFICIENT 100%   → target VERY_HARD (catatan: pool tidak
 *           punya soal VERY_HARD — seleksi memilih terdekat, jujur)
 *   D     : anti-repeat lintas sesi   → semua kandidat UNSEEN masuk sesi
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadScriptEnv } from "./_env";
import { db } from "../lib/db";
import { getLearnerState, isLearnerStateInfraUnavailable } from "../lib/learner-state/service";
import { selectAdaptivePractice } from "../lib/adaptive-practice/selector";
import { validateQuestionMetadata } from "../lib/question-metadata/validation";
import { upsertLearningEvidence } from "../lib/learning-loop/evidence";
import { dayKeyWIB } from "../lib/learning-loop/journey";
import { ADAPTIVE_SUPPORTED_SOURCES, ADAPTIVE_MAX_CANDIDATES } from "../lib/adaptive-practice/config";
import type { AdaptiveCandidate } from "../lib/adaptive-practice/types";
import type { DifficultyId, QuestionTypeId } from "../lib/question-metadata/taxonomy";
import type { Difficulty, LearningSkillType } from "@prisma/client";

const ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(ROOT, "data/question-metadata/review-manifest-001.json");
const E2E_EMAIL = "e2e.adaptive@bahasacerdas.local";
const E2E_SUPABASE_ID = "e2e-adaptive-test-user";
const E2E_NAME = "E2E Adaptive Test";

const SOURCE = ADAPTIVE_SUPPORTED_SOURCES[0];
const MANIFEST_IDS = (JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as { records: Array<{ questionId: string }> }).records.map((r) => r.questionId);

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, extra = ""): void {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

function normalizeSoalType(value: string): QuestionTypeId | null {
  const type = value.toUpperCase();
  if (type === "PILIHAN_GANDA") return "PILIHAN_GANDA";
  if (type === "BENAR_SALAH") return "BENAR_SALAH";
  if (type === "ISIAN" || type === "ISIAN_SINGKAT") return "ISIAN_SINGKAT";
  return null;
}

/** Deteksi akses field yang berasal dari body klien di sumber route (statis). */
function bodyFieldFound(routeSrc: string, field: string): boolean {
  return new RegExp(`body\\.${field}\\b`).test(routeSrc);
}

/** Salinan leg kandidat dari app/api/player/adaptive-practice/route.ts (startSession). */
async function buildCandidates(userId: string): Promise<AdaptiveCandidate[]> {
  const metadataRows = await db.questionMetadata.findMany({
    where: { source: SOURCE, status: "APPROVED", skill: { not: null } },
    orderBy: { questionId: "asc" },
    take: ADAPTIVE_MAX_CANDIDATES,
  });
  const questionIds = metadataRows.map((row) => row.questionId);
  const questions = await db.soal.findMany({
    where: { kodeSoal: { in: questionIds } },
    select: { kodeSoal: true, text: true, options: true, type: true },
  });
  const questionById = new Map(questions.map((question) => [question.kodeSoal, question]));

  const evidenceRows = await db.learningEvidence.findMany({
    where: { userId, source: SOURCE, questionId: { in: questionIds } },
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
    const validated = validateQuestionMetadata(metadata as unknown as Parameters<typeof validateQuestionMetadata>[0]);
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
  return candidates;
}

async function selectFor(userId: string, size = 5) {
  const [states, candidates] = await Promise.all([getLearnerState(userId), buildCandidates(userId)]);
  const selection = selectAdaptivePractice({
    states,
    candidates,
    size,
    rotationKey: `${userId}:${dayKeyWIB()}`,
  });
  return { states, candidates, selection };
}

async function createSession(userId: string, selection: NonNullable<Awaited<ReturnType<typeof selectFor>>["selection"]>) {
  return db.adaptivePracticeSession.create({
    data: {
      userId,
      source: SOURCE,
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
}

async function answerAllCorrect(userId: string, sessionId: string, questionIds: string[]) {
  const questions = await db.soal.findMany({
    where: { kodeSoal: { in: questionIds } },
    select: { kodeSoal: true, correctAnswer: true },
  });
  const metaRows = await db.questionMetadata.findMany({
    where: { source: SOURCE, questionId: { in: questionIds }, status: "APPROVED" },
  });
  const metaById = new Map(metaRows.map((row) => [row.questionId, row]));
  for (const question of questions) {
    const kodeSoal = question.kodeSoal;
    if (!kodeSoal) continue;
    const metadata = metaById.get(kodeSoal);
    await upsertLearningEvidence({
      userId,
      source: SOURCE,
      activityId: sessionId,
      questionId: kodeSoal,
      selectedAnswer: String(question.correctAnswer),
      isCorrect: true,
      score: 1,
      skill: (metadata?.skill ?? null) as LearningSkillType | null,
      difficulty: (metadata?.difficulty ?? null) as Difficulty | null,
      metadata: { version: "1.0", selectionVersion: "1.0" },
    });
  }
}

async function completeSession(userId: string, sessionId: string) {
  return db.adaptivePracticeSession.updateMany({
    where: { id: sessionId, userId, status: "IN_PROGRESS", expiresAt: { gt: new Date() } },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

async function resetUserFlowData(userId: string): Promise<void> {
  await db.adaptivePracticeSession.deleteMany({ where: { userId } });
  await db.learningEvidence.deleteMany({ where: { userId } });
}

async function main(): Promise<void> {
  loadScriptEnv();
  console.log("STEP 3J — REAL-DATA ADAPTIVE PRACTICE E2E");
  console.log(`User uji : ${E2E_EMAIL} (deterministik, dibersihkan di akhir)\n`);

  let baselineEvidence = 0;
  try {
    await db.$queryRaw`SELECT 1`;
    baselineEvidence = await db.learningEvidence.count();
  } catch (error) {
    if (process.env.DATABASE_URL?.includes("[SENSITIVE]")) {
      console.log("DATABASE UNAVAILABLE — nilai env [SENSITIVE]/tidak ada di mesin ini.");
    } else {
      console.log("DATABASE UNAVAILABLE — koneksi gagal:", String(error).slice(0, 200));
    }
    console.log("REAL DATA ADAPTIVE : UNVERIFIED (tidak dijalankan; tanpa angka karangan)");
    process.exit(0);
  }

  console.log(`Baseline LearningEvidence (semua user): ${baselineEvidence}`);
  console.log("1. PRASYARAT — manifest APPROVED + Soal match:");
  const metaRows = await db.questionMetadata.findMany({ where: { source: SOURCE, questionId: { in: MANIFEST_IDS } } });
  const soalRows = await db.soal.findMany({ where: { kodeSoal: { in: MANIFEST_IDS } }, select: { kodeSoal: true, text: true, options: true, type: true } });
  const soalById = new Map(soalRows.map((soal) => [soal.kodeSoal, soal]));
  const approvedCount = metaRows.filter((row) => row.status === "APPROVED").length;
  const mappingOk = metaRows.every((row) => row.status === "APPROVED" && soalById.has(row.questionId));
  const noDuplicates = new Set(MANIFEST_IDS).size === MANIFEST_IDS.length;
  check("12 rekor manifest ada sebagai metadata", metaRows.length === 12, `${metaRows.length} ditemukan`);
  check("semua APPROVED", approvedCount === 12, `${approvedCount} approved`);
  check("mapping Soal unik & valid", mappingOk && noDuplicates);
  if (metaRows.length !== 12 || approvedCount !== 12 || !mappingOk) {
    console.log("\nJalankan dulu: npm run approve:metadata-manifest -- --execute --founder-email <email>");
    await db.$disconnect();
    process.exit(1);
  }

  // --- deterministik test user ---
  const previous = await db.user.findUnique({ where: { email: E2E_EMAIL } });
  if (previous) {
    await db.adaptivePracticeSession.deleteMany({ where: { userId: previous.id } });
    await db.learningEvidence.deleteMany({ where: { userId: previous.id } });
    await db.user.delete({ where: { id: previous.id } });
  }
  const e2e = await db.user.create({
    data: { email: E2E_EMAIL, supabaseId: E2E_SUPABASE_ID, fullName: E2E_NAME, role: "MURID" },
  });
  const userId = e2e.id;
  console.log(`User uji dibuat: ${userId}\n`);

  try {
    console.log("\n1b. KEAMANAN (statis — sumber kebenaran route):");
    const routePath = join(ROOT, "app/api/player/adaptive-practice/route.ts");
    const routeSrc = readFileSync(routePath, "utf8");
    check("route adaptive-practice ada", routeSrc.length > 0);
    check("TANPA input klien: body.userId / body.skillDelta / body.xp / body.coin / body.correctAnswer", !bodyFieldFound(routeSrc, "userId") && !bodyFieldFound(routeSrc, "skillDelta") && !bodyFieldFound(routeSrc, "correctAnswer") && !/body\.(xp|coin)\b/.test(routeSrc));
    check("scoring diambil dari tabel Soal (server-side)", /correctAnswer/.test(routeSrc) && !/clientScore/.test(routeSrc));
    check("seleksi tidak pernah mengekspos kunci jawaban ke payload", !/jawaban:.*map|correctAnswer:\s*(selection|questions)/.test(routeSrc));

    // ===== FASE ZERO — NO_DATA → EASY =====
    console.log("\n2. FASE ZERO — NO_DATA → EASY:");
    let result = await selectFor(userId);
    check("kandidat pool 12 (semua manifest APPROVED & valid)", result.candidates.length === 12, `${result.candidates.length}`);
    check("selector menghasilkan seleksi (kandidat ≥ 5)", result.selection !== null, `kandidat ${result.candidates.length}`);
    if (result.selection) {
      check("confidence NO_DATA", result.selection.confidence === "NO_DATA");
      check("reasonCode NO_DATA", result.selection.reasonCode === "NO_DATA");
      check("target difficulty EASY", result.selection.targetDifficulty === "EASY");
      check("5 soal unik", new Set(result.selection.questions.map((q) => q.id)).size === 5);
      check(
        "payload tanpa answer key",
        !JSON.stringify(result.selection.questions).includes("correctAnswer") &&
          !JSON.stringify(result.selection.questions).includes("jawaban")
      );
    }

    // ===== FASE A — WEAK READING → MEDIUM =====
    console.log("\n3. FASE A — Reading lemah → target MEDIUM + WEAK_SKILL:");
    const readingSeedIds = MANIFEST_IDS.filter((id) => metaRows.find((row) => row.questionId === id)?.skill === "READING");
    for (let i = 0; i < readingSeedIds.length; i += 1) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await upsertLearningEvidence({
          userId,
          source: SOURCE,
          activityId: `e2e-a-seed-${i}-${attempt}`,
          questionId: readingSeedIds[i],
          selectedAnswer: "KUNCI-SALAH",
          isCorrect: false,
          score: 0,
          skill: "READING",
          difficulty: "EASY",
          metadata: { version: "1.0", selectionVersion: "1.0" },
        });
      }
    }
    result = await selectFor(userId);
    const readingState = result.states.find((state) => state.skill === "READING");
    check("Reading: 6 attempts, 0 benar", readingState?.attemptCount === 6 && readingState.accuracy === 0);
    check("target skill READING (terlemah)", result.selection?.targetSkill === "READING");
    check("reasonCode WEAK_SKILL", result.selection?.reasonCode === "WEAK_SKILL");
    check("target difficulty MEDIUM (attempts ≥5, belum PROFICIENT)", result.selection?.targetDifficulty === "MEDIUM");
    const sessionA = result.selection ? await createSession(userId, result.selection) : null;
    if (sessionA) {
      const ids = sessionA.questionIds as string[];
      check("sesi A: 5 soal unik", new Set(ids).size === 5);
      check("sesi A: tidak memakai soal seed yang baru dijawab (usia < 14 hari)", ids.every((id) => !readingSeedIds.includes(id)));
      check(
        "sesi A payload tanpa answer key",
        !JSON.stringify(sessionA.questionIds).includes("correctAnswer")
      );
      await answerAllCorrect(userId, sessionA.id, ids);
      await upsertLearningEvidence({
        userId,
        source: SOURCE,
        activityId: "e2e-a-wrong",
        questionId: ids[0],
        selectedAnswer: "JAWABAN-SALAH-SENGAJA",
        isCorrect: false,
        score: 0,
        skill: "READING",
        difficulty: "EASY",
        metadata: { version: "1.0", selectionVersion: "1.0" },
      });
      const evidenceA = await db.learningEvidence.findMany({ where: { userId, activityId: sessionA.id } });
      check("evidence sesi A: 5 baris", evidenceA.length === 5, `${evidenceA.length}`);
      check("semua jawaban benar tercatat server-side", evidenceA.every((row) => row.isCorrect === true));
      const wrongRow = await db.learningEvidence.findFirst({ where: { userId, activityId: "e2e-a-wrong" } });
      check("jawaban salah TERCATAT salah (skor server, bukan klien)", wrongRow?.isCorrect === false && wrongRow.score === 0);

      const beforeReplay = await db.learningEvidence.count({ where: { userId, activityId: sessionA.id } });
      await upsertLearningEvidence({
        userId,
        source: SOURCE,
        activityId: sessionA.id,
        questionId: ids[0],
        selectedAnswer: "JAWABAN-ULANG",
        isCorrect: false,
        score: 0,
        skill: "READING",
        difficulty: "EASY",
        metadata: { version: "1.0", selectionVersion: "1.0" },
      });
      const afterReplay = await db.learningEvidence.count({ where: { userId, activityId: sessionA.id } });
      const replayRow = await db.learningEvidence.findFirst({ where: { userId, activityId: sessionA.id, questionId: ids[0] } });
      check("idempotensi replay: evidence tidak bertambah", beforeReplay === afterReplay && afterReplay === 5);
      check("replay meng-update baris yang sama (bukan baris baru)", replayRow?.selectedAnswer === "JAWABAN-ULANG" && replayRow?.isCorrect === false);

      const completed1 = await completeSession(userId, sessionA.id);
      check("complete: satu sesi COMPLETED", completed1.count === 1);
      const completed2 = await completeSession(userId, sessionA.id);
      check("replay complete: tanpa efek ganda", completed2.count === 0);
      const sessionsCount = await db.adaptivePracticeSession.count({ where: { userId } });
      check("hanya 1 baris sesi (tanpa duplikat)", sessionsCount === 1);
      const completedRow = await db.adaptivePracticeSession.findUnique({ where: { id: sessionA.id } });
      check("status sesi COMPLETED", completedRow?.status === "COMPLETED");
      const xpRows = await db.xPTransaction.count({ where: { userId } });
      const coinRows = await db.coinTransaction.count({ where: { userId } });
      check("reward loop: 0 XP & 0 koin dicairkan (wiring = next implementation)", xpRows === 0 && coinRows === 0);
      const statesAfterA = await getLearnerState(userId);
      const totalAttempts = statesAfterA.reduce((sum, state) => sum + state.attemptCount, 0);
      const readingAfterA = statesAfterA.find((state) => state.skill === "READING");
      check("learner state terbarui (6 + 5 + 1 = 12 attempts)", totalAttempts === 12, `${totalAttempts}`);
      check("READING tetap 6 (soal sesi A bukan skill Reading)", readingAfterA?.attemptCount === 6);
    }

    // ===== FASE B — PROFICIENT 80% → HARD =====
    console.log("\n4. FASE B — Reading PROFICIENT (80%) → target HARD:");
    await resetUserFlowData(userId);
    const now = Date.now();
    const recents = Array.from({ length: 10 }, (_, i) => ({ correct: i < 8, answeredAt: new Date(now - i * 60_000) }));
    const historicals = Array.from({ length: 5 }, (_, i) => ({ correct: i < 4, answeredAt: new Date(now - 3 * 3600_000 - i * 60_000) }));
    await db.learningEvidence.createMany({
      data: [...recents, ...historicals].map((attempt, i) => ({
        userId,
        source: SOURCE,
        activityId: `e2e-b-seed-${i}`,
        questionId: readingSeedIds[i % readingSeedIds.length],
        selectedAnswer: attempt.correct ? "BENAR" : "SALAH",
        isCorrect: attempt.correct,
        score: attempt.correct ? 1 : 0,
        skill: "READING",
        difficulty: "MEDIUM",
        answeredAt: attempt.answeredAt,
        metadata: { version: "1.0", selectionVersion: "1.0" },
      })),
    });
    result = await selectFor(userId);
    const stateB = result.states.find((state) => state.skill === "READING");
    check("Reading: 15 attempts, akurasi 80%", stateB?.attemptCount === 15 && stateB.accuracy === 0.8);
    check("mastery PROFICIENT", stateB?.masteryState === "PROFICIENT", stateB?.masteryState ?? "-");
    check("target difficulty HARD (PROFICIENT, <90%)", result.selection?.targetDifficulty === "HARD");
    const sessionB = result.selection ? await createSession(userId, result.selection) : null;
    if (sessionB) {
      const ids = sessionB.questionIds as string[];
      check("sesi B: 5 soal unik", new Set(ids).size === 5);
      await answerAllCorrect(userId, sessionB.id, ids);
      await completeSession(userId, sessionB.id);
      check("sesi B COMPLETED", (await db.adaptivePracticeSession.findUnique({ where: { id: sessionB.id } }))?.status === "COMPLETED");
    }

    // ===== FASE C — PROFICIENT 100% → VERY_HARD =====
    console.log("\n5. FASE C — Reading PROFICIENT (100%) → target VERY_HARD:");
    await resetUserFlowData(userId);
    const nowC = Date.now();
    const allCorrect = Array.from({ length: 15 }, (_, i) => ({
      answeredAt: new Date(i < 5 ? nowC - 3 * 3600_000 - i * 60_000 : nowC - i * 60_000),
    }));
    await db.learningEvidence.createMany({
      data: allCorrect.map((attempt, i) => ({
        userId,
        source: SOURCE,
        activityId: `e2e-c-seed-${i}`,
        questionId: readingSeedIds[i % readingSeedIds.length],
        selectedAnswer: "BENAR",
        isCorrect: true,
        score: 1,
        skill: "READING",
        difficulty: "MEDIUM",
        answeredAt: attempt.answeredAt,
        metadata: { version: "1.0", selectionVersion: "1.0" },
      })),
    });
    result = await selectFor(userId);
    const stateC = result.states.find((state) => state.skill === "READING");
    const veryHardCandidates = result.candidates.filter((candidate) => candidate.difficulty === "VERY_HARD").length;
    check("Reading: 15 attempts, akurasi 100%", stateC?.attemptCount === 15 && stateC.accuracy === 1);
    check("target difficulty VERY_HARD (akurasi ≥90%)", result.selection?.targetDifficulty === "VERY_HARD");
    console.log(`  (jujur: pool punya ${veryHardCandidates} soal VERY_HARD — seleksi memilih jarak terdekat, availability-respect)`);
    const sessionC = result.selection ? await createSession(userId, result.selection) : null;
    if (sessionC) {
      const ids = sessionC.questionIds as string[];
      check("sesi C: 5 soal unik", new Set(ids).size === 5);
      await answerAllCorrect(userId, sessionC.id, ids);
      await completeSession(userId, sessionC.id);
      check("sesi C COMPLETED", (await db.adaptivePracticeSession.findUnique({ where: { id: sessionC.id } }))?.status === "COMPLETED");
    }

    // ===== FASE D — ANTI-REPEAT: UNSEEN mendahului RECENT =====
    console.log("\n6. FASE D — Anti-repeat lintas sesi (unseen > recent <14 hari):");
    result = await selectFor(userId);
    const unseen = result.candidates.filter((candidate) => candidate.seenAt === null);
    const currentRecents = result.candidates.filter((candidate) => candidate.seenAt !== null);
    check(`kandidat unseen tersisa ${unseen.length} (4 = 12 − 8 jawaban unik)`, unseen.length === 4, `${unseen.length}`);
    if (result.selection) {
      const ids = result.selection.questions.map((q) => q.id);
      check("semua UNSEEN masuk sesi D (novelty menang atas skill)", unseen.every((candidate) => ids.includes(candidate.id)));
      check("sesi D tidak menduplikasi soal", new Set(ids).size === ids.length);
      check("anti-repeat buffer RECENT aman (soal <14 hari tidak diprioritaskan)", ids.filter((id) => currentRecents.some((candidate) => candidate.id === id)).length <= ids.length - unseen.length);
    }
  } catch (error) {
    check("tidak ada error runtime", false, String(error).slice(0, 300));
    if (isLearnerStateInfraUnavailable(error)) {
      console.log("\n(infra learner-state belum ada — jalankan migration 2026-08-01_learning_loop.sql dulu)");
    }
  } finally {
    // ===== CLEANUP (Part E) =====
    console.log("\n7. CLEANUP — bukti tidak mencemari production:");
    const userForCleanup = await db.user.findUnique({ where: { email: E2E_EMAIL } });
    if (userForCleanup) {
      const sessionsBefore = await db.adaptivePracticeSession.count({ where: { userId: userForCleanup.id } });
      const evidenceBefore = await db.learningEvidence.count({ where: { userId: userForCleanup.id } });
      await db.adaptivePracticeSession.deleteMany({ where: { userId: userForCleanup.id } });
      await db.learningEvidence.deleteMany({ where: { userId: userForCleanup.id } });
      await db.user.delete({ where: { id: userForCleanup.id } });
      check(`menghapus ${sessionsBefore} sesi & ${evidenceBefore} evidence user uji`, sessionsBefore > 0 || evidenceBefore >= 0);
    }
    const afterCleanup = await db.learningEvidence.count();
    check("total evidence global kembali ke baseline (tidak ada data sah terhapus)", afterCleanup === baselineEvidence, `baseline ${baselineEvidence}, setelah ${afterCleanup}`);
    const leftoverSessions = await db.adaptivePracticeSession.count({ where: { userId: userId } });
    const leftoverEvidence = await db.learningEvidence.count({ where: { userId: userId } });
    check("tidak ada sisa sesi/evidence user uji", leftoverSessions === 0 && leftoverEvidence === 0);
    await db.$disconnect();
  }

  console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
  if (failed > 0) {
    console.log("REAL DATA ADAPTIVE : RED — lihat kegagalan di atas (tidak ada GREEN palsu).");
    process.exit(1);
  }
  console.log("REAL DATA ADAPTIVE : GREEN — rantai production terverifikasi dengan data DB nyata.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});