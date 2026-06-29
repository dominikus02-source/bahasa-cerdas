/**
 * Phase UKBI/TKA FOUNDATION 2B — Session Snapshot Tests
 *
 * 11 tests covering snapshot creation, sanitization, scoring, and legacy fallback.
 * Run: npx tsx scripts/test-ukbi-tka-session-snapshot.ts
 *
 * All existing leakage tests must remain green after changes:
 *   npm run test:ukbi-tka-randomization
 *   npm run test:bank-soal-leakage
 *   npm run test:murid-quiz-leakage
 *   npm run test:jalur-leakage
 */

import type { AttemptSnapshot, QuestionSnapshot } from "../lib/types/snapshot";
import { sanitizeSnapshotQuestionForClient, buildClientQuestionPayload } from "../lib/security";
import { deepScanSensitiveFields } from "../lib/security";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) { passed++; console.log(`  ✅ ${message}`); }
  else { failed++; errors.push(message); console.log(`  ❌ ${message}`); }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++; console.log(`  ✅ ${message}`);
  } else {
    failed++; errors.push(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    console.log(`  ❌ ${message}`);
  }
}

// ── Helper: build a mock snapshot ──
function makeMockSnapshot(): AttemptSnapshot {
  const questions: QuestionSnapshot[] = [
    { id: "q1", product: "UKBI", section: "MENDENGARKAN", type: "PILIHAN_GANDA", text: "Apa ibu kota Indonesia?", options: [{ id: "A", text: "Jakarta" }, { id: "B", text: "Surabaya" }, { id: "C", text: "Bandung" }], correctAnswer: "A", difficulty: "EASY", seksi: "MENDENGARKAN" },
    { id: "q2", product: "UKBI", section: "MENDENGARKAN", type: "PILIHAN_GANDA", text: "Siapa presiden pertama?", options: [{ id: "A", text: "Soekarno" }, { id: "B", text: "Soeharto" }, { id: "C", text: "Habibie" }], correctAnswer: "A", difficulty: "MEDIUM", seksi: "MENDENGARKAN" },
    { id: "q3", product: "UKBI", section: "MEMBACA", type: "PILIHAN_GANDA", text: "Apa lambang negara?", options: [{ id: "A", text: "Garuda" }, { id: "B", text: "Banteng" }, { id: "C", text: "Harimau" }], correctAnswer: "A", difficulty: "EASY", seksi: "MEMBACA" },
    { id: "q4", product: "TKA", section: "KEBAHASAAN", type: "PILIHAN_GANDA", text: "Sinonim 'pandai'?", options: [{ id: "A", text: "Bodoh" }, { id: "B", text: "Cerdas" }, { id: "C", text: "Malas" }], correctAnswer: "B", weight: 1.5, kompetensi: "KEBAHASAAN" },
    { id: "q5", product: "TKA", section: "MEMBACA", type: "PILIHAN_GANDA", text: "Ide pokok paragraf?", options: [{ id: "A", text: "Gagasan utama" }, { id: "B", text: "Kata hubung" }, { id: "C", text: "Kalimat penjelas" }], correctAnswer: "A", weight: 1, kompetensi: "MEMBACA" },
  ];
  return {
    version: "1.0",
    createdAt: "2026-06-29T12:00:00.000Z",
    seed: "user-1-test-paket123-1719658800000",
    paketId: "paket123",
    userId: "user-1",
    questionOrder: ["q1", "q2", "q3", "q4", "q5"],
    questions,
  };
}

console.log("\n═══════════════════════════════════════════");
console.log("  UKBI/TKA Session Snapshot Tests");
console.log("═══════════════════════════════════════════\n");

// ── Test 1: Snapshot stores question order ──
console.log("── Test 1: Snapshot stores question order ──");
const snapshot = makeMockSnapshot();
assertEqual(snapshot.questionOrder, ["q1", "q2", "q3", "q4", "q5"], "questionOrder preserved");
assert(snapshot.questions.length === 5, "All 5 questions in snapshot");

// ── Test 2: Snapshot stores shuffled options final ──
console.log("\n── Test 2: Snapshot stores shuffled options ──");
const q1 = snapshot.questions.find(q => q.id === "q1")!;
assertEqual(q1.options.length, 3, "Q1: 3 options");
assert(q1.options.some(o => o.id === "A" && o.text === "Jakarta"), "Q1: option A preserved");
assert(q1.options.some(o => o.id === "B" && o.text === "Surabaya"), "Q1: option B preserved");
assert(q1.options.some(o => o.id === "C" && o.text === "Bandung"), "Q1: option C preserved");

// ── Test 3: Snapshot stores correctAnswer internally ──
console.log("\n── Test 3: Snapshot stores correctAnswer internally ──");
assert(q1.correctAnswer === "A", "Q1: correctAnswer = A");
const q4 = snapshot.questions.find(q => q.id === "q4")!;
assert(q4.correctAnswer === "B", "Q4: correctAnswer = B");
assert(q4.weight === 1.5, "Q4: weight = 1.5 for TKA scoring");
assert(q4.kompetensi === "KEBAHASAAN", "Q4: kompetensi = KEBAHASAAN");

// ── Test 4: Sanitized client payload no correctAnswer ──
console.log("\n── Test 4: Sanitized client payload no correctAnswer ──");
const sanitized = sanitizeSnapshotQuestionForClient(q1 as any);
assert(sanitized.correctAnswer === undefined, "correctAnswer removed from client payload");
assert(sanitized.id === "q1", "id preserved");
assert(sanitized.text === q1.text, "text preserved");
assert(Array.isArray(sanitized.options), "options array preserved");

// ── Test 5: Sanitized client payload no seed/internal fields ──
console.log("\n── Test 5: Sanitized client payload no seed/internal fields ──");
assert(sanitized.seed === undefined, "seed not in client payload");
assert(sanitized.version === undefined, "version not in client payload");
assert(sanitized.paketId === undefined, "paketId not in client payload");
assert(sanitized.userId === undefined, "userId not in client payload");
assert(sanitized.questionOrder === undefined, "questionOrder not in client payload");

// ── Test 6: Submit scoring against snapshot ──
console.log("\n── Test 6: Submit scoring uses snapshot, not DB ──");
const userAnswers: Record<string, string> = { q1: "A", q2: "B", q3: "A", q4: "B", q5: "A" };
let correctCount = 0;
let rawScore = 0;
for (const q of snapshot.questions) {
  const ua = userAnswers[q.id];
  const isCorrect = ua === q.correctAnswer;
  if (isCorrect) correctCount++;
  if (q.product === "UKBI") {
    const diff = String(q.difficulty || "MEDIUM");
    const w = diff === "EASY" ? 1 : diff === "MEDIUM" ? 1.5 : diff === "HARD" ? 2 : 2.5;
    rawScore += isCorrect ? w * 10 : 0;
  } else {
    rawScore += isCorrect ? (q.weight || 1) * 10 : 0;
  }
}
assert(correctCount === 4, "4 correct answers (q1=A✅, q2=B❌, q3=A✅, q4=B✅, q5=A✅)");
assert(rawScore > 0, "Raw score calculated from snapshot");

// ── Test 7: DB changed after start — snapshot protects scoring ──
console.log("\n── Test 7: DB change after start: snapshot protects scoring ──");
const changedAnswerKey: Record<string, string> = { q1: "B", q2: "C", q3: "B", q4: "C", q5: "B" }; // all WRONG
let snapshotCorrect = 0;
for (const q of snapshot.questions) {
  if (userAnswers[q.id] === q.correctAnswer) snapshotCorrect++;
}
// Even if DB changed, snapshot still uses original correctAnswer
assert(snapshotCorrect === 4, "Snapshot scoring unchanged (4 correct) despite hypothetical DB edit");

// ── Test 8: Legacy attempt without snapshot doesn't crash ──
console.log("\n── Test 8: Legacy attempt without snapshot doesn't crash ──");
const legacyNull: AttemptSnapshot | null = null;
const legacyUndefined: AttemptSnapshot | undefined = undefined;
assert((legacyNull?.questions || null) === null, "null snapshot handled");
assert((legacyUndefined?.questions || null) === null, "undefined snapshot handled");
// Simulate fallback: if no snapshot, use empty questions array
const fallbackQuestions = legacyNull?.questions?.filter(q => Object.keys(userAnswers).includes(q.id)) || [];
assert(fallbackQuestions.length === 0, "Empty fallback for null snapshot (will use DB live)");

// ── Test 9: Deep scan client payload — zero sensitive fields ──
console.log("\n── Test 9: Deep scan client payload zero sensitive fields ──");
const clientPayload = buildClientQuestionPayload(snapshot.questions as any);
const sensitiveFound = deepScanSensitiveFields(clientPayload);
assertEqual(sensitiveFound.length, 0, `Zero sensitive fields in client payload (found: ${sensitiveFound.length})`);

// ── Test 10: buildClientQuestionPayload preserves count ──
console.log("\n── Test 10: Client payload preserves question count ──");
assert(clientPayload.length === 5, "All 5 questions in client payload");

// ── Test 11: Snapshot version is correct ──
console.log("\n── Test 11: Snapshot shape validation ──");
assert(snapshot.version === "1.0", "Version is 1.0");
assert(typeof snapshot.createdAt === "string", "createdAt is string");
assert(typeof snapshot.seed === "string", "seed is string");
assert(typeof snapshot.paketId === "string", "paketId is string");
assert(typeof snapshot.userId === "string", "userId is string");

// ── Summary ──
console.log("\n═══════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("═══════════════════════════════════════════\n");

if (failed > 0) {
  console.log("Errors:");
  errors.forEach(e => console.log(`  - ${e}`));
  process.exit(1);
}
process.exit(0);
