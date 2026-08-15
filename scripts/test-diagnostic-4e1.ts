/**
 * STEP 4E.1 — DIAGNOSTIC 4E.1 QUALITY — unit test logika murni (tanpa DB).
 * Run: npm run test:diagnostic-4e1
 *
 * Melacak invariant 4E.1:
 *   - Seleksi deterministik + komposisi sesuai Part B + fallback jujur (Part Q).
 *   - Profil dari DETAIL EVIDENCE (jalur kanonik) dengan confidence ladder.
 *   - WEAK ≠ INSUFFICIENT_EVIDENCE; placement selalu PROVISIONAL.
 *   - Anti-duplikasi; difficulty plan EASY≈30%/HARD≈30%.
 */

import {
  DIAGNOSTIC_CONFIDENT_MIN_ATTEMPTS,
  DIAGNOSTIC_CONFIDENT_MIN_RECENT_ACCURACY,
  DIAGNOSTIC_DEFAULT_SIZE,
  DIAGNOSTIC_DIFFICULTY_CYCLE,
  DIAGNOSTIC_MIN_ITEMS,
  diagnosticCompositionQueue,
  difficultyPlanForSize,
} from "@/lib/diagnostic/config";
import { selectDiagnosticQuestions, summarizeComposition } from "@/lib/diagnostic/selector";
import {
  buildInsightText,
  computeDiagnosticProfile,
  computeProfileFromEvidence,
  withUntestedSkills,
} from "@/lib/diagnostic/profile";
import type { DiagnosticCandidate, DiagnosticEvidenceDetail } from "@/lib/diagnostic/types";

let pass = 0;
let fail = 0;
function ok(name: string, condition: boolean) {
  if (condition) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}`);
  }
}

// --- Fixture: kandidat per skill (tanpa LISTENING/SPEAKING = korpus SD 4E.1) ---
const fixturePool: DiagnosticCandidate[] = [];
let fixtureId = 0;
function addCandidate(skill: string, difficulty: DiagnosticCandidate["difficulty"], topic: string, type: DiagnosticCandidate["questionType"] = "PILIHAN_GANDA") {
  fixtureId += 1;
  fixturePool.push({
    id: `fixture-${String(fixtureId).padStart(3, "0")}`,
    text: `Soal fixture ${fixtureId}`,
    options: ["A", "B", "C", "D"],
    questionType: type,
    skill,
    subskill: null,
    difficulty,
    topic,
    seenAt: null,
  });
}

// 12 x 5 skills = 60 kandidat, spread EASY/MEDIUM/HARD (2 x tiap sel)
const skills = ["READING", "GRAMMAR", "VOCABULARY", "LITERATURE", "WRITING"];
const difficulties = ["EASY", "MEDIUM", "HARD"] as const;
for (const skill of skills) {
  for (const difficulty of difficulties) {
    addCandidate(skill, difficulty, `topic-${skill}-${difficulty}`, "PILIHAN_GANDA");
    addCandidate(skill, difficulty, `topic-${skill}-${difficulty}-b`, "PILIHAN_GANDA");
  }
}

console.log("\nTEST DIAGNOSTIC 4E.1 (murni, tanpa DB)\n");

// --- 1. Config & plan kesulitan ---
ok("1. Rencana 10 butir = EEE MMMM HHH (Part G)", JSON.stringify(difficultyPlanForSize(10)) === JSON.stringify([...DIAGNOSTIC_DIFFICULTY_CYCLE]));
{
  const plan8 = difficultyPlanForSize(8);
  const plan12 = difficultyPlanForSize(12);
  ok("1. Plan 8 butir = 2 easy / 4 medium / 2 hard (~30/40/30)", plan8.filter((d) => d === "EASY").length === 2 && plan8.filter((d) => d === "HARD").length === 2 && plan8.filter((d) => d === "MEDIUM").length === 4);
  ok("1. Plan 12 butir = 4 easy / medium 4 / hard 4", plan12.filter((d) => d === "EASY").length === 4 && plan12.filter((d) => d === "HARD").length === 4);
}
{
  const q = diagnosticCompositionQueue(10);
  const counts = q.reduce<Record<string, number>>((acc, skill) => ((acc[skill] = (acc[skill] ?? 0) + 1), acc), {});
  ok("1. Antrean komposisi 10 = R2 G2 V2 L1 W2 (+LISTENING 1)", counts.READING === 2 && counts.GRAMMAR === 2 && counts.VOCABULARY === 2 && counts.LITERATURE === 1 && counts.WRITING === 2 && counts.LISTENING === 1 && counts.SPEAKING === undefined);
}
{
  const q12 = diagnosticCompositionQueue(12);
  ok("1. Antrean 12 memuat LISTENING 2, tanpa SPEAKING", q12.filter((s) => s === "LISTENING").length === 2 && !q12.includes("SPEAKING"));
}

// --- 2. Seleksi: deterministik, komposisi, anti-duplikasi ---
const now = new Date("2026-08-16T00:00:00+07:00");
const run1 = selectDiagnosticQuestions(fixturePool, DIAGNOSTIC_DEFAULT_SIZE, now);
const run2 = selectDiagnosticQuestions(fixturePool, DIAGNOSTIC_DEFAULT_SIZE, now);
ok("2. Seleksi menghasilkan 10 butir", run1 !== null && run1.size === 10);
ok("2. Seleksi deterministik (2 run → id sama)", run1 !== null && run2 !== null && JSON.stringify(run1.questions.map((q) => q.id)) === JSON.stringify(run2.questions.map((q) => q.id)));
ok("2. Tanpa duplikasi id", run1 !== null && new Set(run1.questions.map((q) => q.id)).size === run1.questions.length);
{
  const delivered = run1?.composition.delivered.reduce<Record<string, number>>((acc, s) => ((acc[s.skill] = (acc[s.skill] ?? 0) + s.count), acc), {}) ?? {};
  ok("2. Semua skill target terdeliver (R≥2 G≥2 V≥2 L≥1 W≥2, total 10)", delivered.READING >= 2 && delivered.GRAMMAR >= 2 && delivered.VOCABULARY >= 2 && delivered.LITERATURE >= 1 && delivered.WRITING >= 2 && run1?.composition.totalDelivered === 10);
  ok("2. Slots LISTENING dialokasikan ulang ke skill lain (tanpa fabrikasi)", delivered.LISTENING === undefined);
  ok("2. Fallback jujur mencatat LISTENING MISSING_CORPUS", run1?.composition.fallback.some((f) => f.skill === "LISTENING" && f.reason === "MISSING_CORPUS") === true);
  ok("2. Tanpa fabrikasi: tidak ada soal LISTENING dikirim", run1?.questions.every((q) => q.skill !== "LISTENING") === true);
}
{
  const diffCounts = (run1?.difficultiesUsed ?? []).reduce<Record<string, number>>((acc, d) => ((acc[d] = (acc[d] ?? 0) + 1), acc), {});
  ok("2. Level kesulitan terpakai ≤ 3 (EASY/MEDIUM/HARD)", Object.keys(diffCounts).length <= 3);
}
ok("2. Selector menolak ukuran < 8", selectDiagnosticQuestions(fixturePool, 6, now) === null);
ok("2. Selector menolak pool < 8", selectDiagnosticQuestions(fixturePool.slice(0, 4), 10, now) === null);

// --- 3. summarizeComposition konsisten ---
{
  const composed = summarizeComposition(10, run1!.questions.map((q) => ({ skill: q.skill, questionType: q.questionType })));
  ok("3. summarizeComposition totalRequested=10, difficultyPlan 10", composed.totalRequested === 10 && composed.difficultyPlan.length === 10);
  ok("3. delivered questionTypes terisi (PILIHAN_GANDA)", composed.delivered.every((d) => d.questionTypes.includes("PILIHAN_GANDA")));
}

// --- 4. Profil dari evidence (jalur kanonik) ---
{
  const details: DiagnosticEvidenceDetail[] = [
    { skill: "READING", difficulty: "EASY", isCorrect: true },
    { skill: "READING", difficulty: "MEDIUM", isCorrect: true },
    { skill: "READING", difficulty: "HARD", isCorrect: false },
    { skill: "GRAMMAR", difficulty: "EASY", isCorrect: true },
    { skill: "GRAMMAR", difficulty: "EASY", isCorrect: false },
    { skill: "VOCABULARY", difficulty: "MEDIUM", isCorrect: false },
  ];
  const profile = computeProfileFromEvidence(details);
  const overallExpected = (2 / 3 + 1 / 2 + 0) / 3;
  ok("4. Overall accuracy = rata-rata akurasi per skill (≠ raw items)", Math.abs((profile.overallAccuracy ?? 0) - overallExpected) < 1e-9);
  ok("4. READING akurasi 2/3, kategori DEVELOPING", profile.perSkill.find((s) => s.skill === "READING")?.accuracy === 2 / 3 && profile.perSkill.find((s) => s.skill === "READING")?.category === "DEVELOPING");
  ok("4. GRAMMAR akurasi 1/2 = WEAK (di bawah 0.6)", profile.perSkill.find((s) => s.skill === "GRAMMAR")?.category === "WEAK");
  ok("4. VOCABULARY 0/1 = WEAK", profile.perSkill.find((s) => s.skill === "VOCABULARY")?.category === "WEAK");
  ok("4. WEAK ≠ INSUFFICIENT_EVIDENCE (VOCABULARY punya bukti)", profile.perSkill.find((s) => s.skill === "VOCABULARY")?.confidence === "PROVISIONAL");
  ok("4. Placement DASAR (L1–L4) PROVISIONAL", profile.placement?.band === "DASAR" && profile.placement.provisional === true);
  ok("4. strongestEvidence READING = MEDIUM", profile.perSkill.find((s) => s.skill === "READING")?.strongestEvidence === "MEDIUM");
  ok("4. Rekomendasi: WEAK→EASY, DEVELOPING→MEDIUM", profile.perSkill.find((s) => s.skill === "VOCABULARY")?.recommendation === "EASY" && profile.perSkill.find((s) => s.skill === "READING")?.recommendation === "MEDIUM");
  ok("4. insightText berisi kalimat Bahasa (terkuat + fokus)", typeof profile.insightText === "string" && profile.insightText.includes("terkuat") && profile.insightText.includes("Membaca"));
  ok("4. Confidence keseluruhan PROVISIONAL (belum lintas-sesi)", profile.confidence === "PROVISIONAL");
}

// --- 5. withUntestedSkills: kejujuran 'belum terukur' ---
{
  const details: DiagnosticEvidenceDetail[] = [{ skill: "READING", difficulty: "EASY", isCorrect: true }];
  const base = computeProfileFromEvidence(details);
  const full = withUntestedSkills(base, ["READING", "WRITING", "LISTENING", "SPEAKING", "GRAMMAR", "VOCABULARY", "LITERATURE"]);
  ok("5. Skill tak diuji → INSUFFICIENT_EVIDENCE (bukan WEAK)", full.perSkill.filter((s) => s.category === "INSUFFICIENT_EVIDENCE").length === 6);
  ok("5. LISTENING/SPEAKING tercatat 'belum terukur' dengan jujur", full.perSkill.some((s) => s.skill === "LISTENING" && s.confidence === "INSUFFICIENT_EVIDENCE") && full.perSkill.some((s) => s.skill === "SPEAKING" && s.confidence === "INSUFFICIENT_EVIDENCE"));
  ok("5. Insight menyebut 'Belum terukur'", full.insightText?.includes("Belum terukur") === true);
}

// --- 6. Confidence ladder ---
{
  const state60 = {
    skill: "GRAMMAR", label: "Tata Bahasa", attemptCount: 60, correctCount: 48, accuracy: 0.8,
    recentAttemptCount: 8, recentCorrectCount: 7, recentAccuracy: 0.875,
    lastPracticedAt: null, firstPracticedAt: null, trend: "up" as const, confidence: "HIGH" as const, masteryState: "MASTERED" as const,
  };
  const profile = computeDiagnosticProfile([state60]);
  ok("6. State learner ≥5 percobaan + akurasi ≥0.7 → PROFILE_CONFIDENT", profile.perSkill[0].confidence === "PROFILE_CONFIDENT");
  ok("6. Konstant konfiden dicek dari config", DIAGNOSTIC_CONFIDENT_MIN_ATTEMPTS === 5 && DIAGNOSTIC_CONFIDENT_MIN_RECENT_ACCURACY === 0.7);
  {
    const oneSession = computeProfileFromEvidence([{ skill: "READING", difficulty: "MEDIUM", isCorrect: true }]);
    ok("6. Satu sesi tanpa history → PROVISIONAL (bukan confident)", oneSession.perSkill[0].confidence === "PROVISIONAL");
  }
}

// --- 7. buildInsightText edge: tanpa bukti ---
{
  const empty = computeProfileFromEvidence([]);
  ok("7. Tanpa bukti → overall null + insight jujur", empty.overallAccuracy === null && empty.confidence === "INSUFFICIENT_EVIDENCE" && typeof empty.insightText === "string");
  ok("7. Tanpa bukti → placement null (tak ada level dikarang)", empty.placement === null && empty.strongest === null && empty.weakest === null);
  const text = buildInsightText(empty);
  ok("7. Insight menyebut belum cukup bukti, bukan 'lemah'", text !== null && text.includes("Belum ada cukup bukti"));
}

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
process.exit(0);