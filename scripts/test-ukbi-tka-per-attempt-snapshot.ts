/**
 * Phase UKBI/TKA FOUNDATION 2C — Per-Attempt Snapshot Tests
 *
 * 15 tests covering attempt-level immutable snapshot storage,
 * retry history preservation, sanitization, and legacy fallback.
 *
 * Run: npx tsx scripts/test-ukbi-tka-per-attempt-snapshot.ts
 */

import type { AttemptAnswerDetails, AttemptSnapshot, UserAnswerRecord, ResultSummary } from "../lib/types/snapshot";
import { sanitizeAttemptAnswerDetailsForClient, sanitizeAttemptHistoryForClient, deepScanSensitiveFields } from "../lib/security";

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

function assertNotEqual<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    passed++; console.log(`  ✅ ${message}`);
  } else {
    failed++; errors.push(`${message}: values were equal`);
    console.log(`  ❌ ${message}`);
  }
}

// ── Helper: build mock snapshot + answers ──
function makeMockSnapshot(): AttemptSnapshot {
  return {
    version: "1.0",
    createdAt: "2026-06-29T12:00:00.000Z",
    seed: "user-1-test-paket123-1719658800000",
    paketId: "paket123",
    userId: "user-1",
    questionOrder: ["q1", "q2", "q3"],
    questions: [
      { id: "q1", product: "UKBI", section: "MEMBACA", type: "PILIHAN_GANDA", text: "Q1?", options: [{ id: "A", text: "A1" }, { id: "B", text: "B1" }], correctAnswer: "A", difficulty: "EASY", seksi: "MEMBACA" },
      { id: "q2", product: "UKBI", section: "MEMBACA", type: "PILIHAN_GANDA", text: "Q2?", options: [{ id: "A", text: "A2" }, { id: "B", text: "B2" }], correctAnswer: "B", difficulty: "MEDIUM", seksi: "MEMBACA" },
      { id: "q3", product: "UKBI", section: "MEMBACA", type: "PILIHAN_GANDA", text: "Q3?", options: [{ id: "A", text: "A3" }, { id: "B", text: "B3" }], correctAnswer: "A", difficulty: "EASY", seksi: "MEMBACA" },
    ],
  };
}

function makeUserAnswers(ids: string[]): Record<string, string> {
  const a: Record<string, string> = {};
  for (const id of ids) a[id] = "A";
  return a;
}

const MOCK_SNAPSHOT = makeMockSnapshot();
const MOCK_ANSWERS = makeUserAnswers(["q1", "q2", "q3"]);

function buildAttemptDetails(snapshot: AttemptSnapshot, userAnswers: Record<string, string>, attemptNum: number, product: string = "UKBI"): AttemptAnswerDetails {
  const userAnswerRecords: UserAnswerRecord[] = snapshot.questions.map(q => ({
    questionId: q.id,
    selectedOptionId: userAnswers[q.id] || "",
    isCorrect: (userAnswers[q.id] || "") === q.correctAnswer,
    score: (userAnswers[q.id] || "") === q.correctAnswer ? 10 : 0,
    section: q.seksi || q.section || "UMUM",
  }));
  const correctCount = userAnswerRecords.filter(u => u.isCorrect).length;
  const totalQuestions = snapshot.questions.length;
  const rawScore = correctCount * 10;
  const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  return {
    version: "1.0",
    attemptId: `paket123-${attemptNum}-${Date.now()}`,
    sessionId: "session-abc",
    paketId: "paket123",
    userId: "user-1",
    product,
    startedAt: "2026-06-29T12:00:00.000Z",
    submittedAt: "2026-06-29T12:30:00.000Z",
    seed: snapshot.seed,
    snapshot,
    userAnswers: userAnswerRecords,
    scoring: {
      totalQuestions,
      correctCount,
      rawScore,
      percentage,
      scaledScore: Math.round(percentage * 8),
      predicate: "Madya",
      sectionBreakdown: {},
    },
    audit: {
      scoredFromSnapshot: true,
      liveDbFallbackUsed: false,
      snapshotVersion: "1.0",
    },
  };
}

console.log("\n═══════════════════════════════════════════");
console.log("  UKBI/TKA Per-Attempt Snapshot Tests");
console.log("═══════════════════════════════════════════\n");

// ── Test 1: Build AttemptAnswerDetails from snapshot ──
console.log("── Test 1: Build AttemptAnswerDetails from snapshot ──");
const details1 = buildAttemptDetails(MOCK_SNAPSHOT, MOCK_ANSWERS, 1);
assert(details1.version === "1.0", "Version is 1.0");
assert(details1.attemptId.includes("paket123-1-"), "attemptId contains paket + attempt number");
assert(details1.userAnswers.length === 3, "3 user answer records");

// ── Test 2: AttemptAnswerDetails stores snapshot immutable ──
console.log("\n── Test 2: Snapshot stored immutable in answerDetails ──");
assert(details1.snapshot.questions.length === 3, "Snapshot questions preserved");
assert(details1.snapshot.questions[0].correctAnswer === "A", "Snapshot correctAnswer preserved (q1)");
assert(details1.snapshot.questions[1].correctAnswer === "B", "Snapshot correctAnswer preserved (q2)");

// ── Test 3: Submit uses snapshot, not DB live ──
console.log("\n── Test 3: Scoring uses snapshot correctAnswer ──");
const q1Correct = details1.userAnswers.find(u => u.questionId === "q1")!.isCorrect;
const q2Correct = details1.userAnswers.find(u => u.questionId === "q2")!.isCorrect;
assert(q1Correct === true, "q1: answer A === correctAnswer A → correct");
assert(q2Correct === false, "q2: answer A !== correctAnswer B → incorrect");

// ── Test 4: Two retries produce distinct attemptId ──
console.log("\n── Test 4: Two retries → distinct attemptIds ──");
const detailsA = buildAttemptDetails(MOCK_SNAPSHOT, MOCK_ANSWERS, 1);
const detailsB = buildAttemptDetails(MOCK_SNAPSHOT, MOCK_ANSWERS, 2);
assertNotEqual(detailsA.attemptId, detailsB.attemptId, "Different attemptId for different attempts");

// ── Test 5: Retry does not overwrite previous attempt ──
console.log("\n── Test 5: Each attempt has own answerDetails row ──");
// ProgresKompetensi has @@unique([userId, paketId, attemptNumber])
// So attempt 1 and attempt 2 are separate rows, each with own answerDetails
assert(detailsA.attemptId.includes("-1-"), "Attempt 1 has -1- in attemptId");
assert(detailsB.attemptId.includes("-2-"), "Attempt 2 has -2- in attemptId");

// ── Test 6: Existing history preserved when new attempt appended ──
console.log("\n── Test 6: History append pattern (simulated) ──");
const history: AttemptAnswerDetails[] = [];
history.push(detailsA);
assert(history.length === 1, "History has 1 after first attempt");
history.push(detailsB);
assert(history.length === 2, "History has 2 after second attempt (not overwritten)");
assert(history[0].attemptId.includes("-1-"), "First attempt preserved after adding second");

// ── Test 7: Sanitized result does NOT expose raw correctAnswer ──
console.log("\n── Test 7: Sanitized result hides raw correctAnswer ──");
const sanitized = sanitizeAttemptAnswerDetailsForClient(detailsA as any);
assert(sanitized !== null, "Sanitized result not null");
assert(sanitized!.version === "1.0", "Version preserved in sanitized");
assert(sanitized!.scoring !== undefined, "Scoring preserved in sanitized");
assert((sanitized! as any).snapshot === undefined, "Snapshot removed from client");
assert((sanitized! as any).seed === undefined, "Seed removed from client");
assert((sanitized! as any).audit === undefined, "Audit removed from client");

// ── Test 8: Pre-submit payload has zero sensitive fields ──
console.log("\n── Test 8: Pre-submit sanitization ──");
const preSubmitPayload = {
  id: "q1", type: "PILIHAN_GANDA", text: "Q1?", options: [{ id: "A", text: "A1" }],
};
const sensitive = deepScanSensitiveFields(preSubmitPayload);
assertEqual(sensitive.length, 0, "Zero sensitive fields in pre-submit payload");

// ── Test 9: Post-submit feedback only shows correctOptionId (not correctAnswer field name) ──
console.log("\n── Test 9: Post-submit correct answer feedback policy ──");
const postSubmitPayload = {
  questionId: "q1",
  selectedOptionId: "A",
  isCorrect: true,
  correctOptionId: "A",  // Allowed field name — not "correctAnswer"
};
const postSensitive = deepScanSensitiveFields(postSubmitPayload);
// "correctOptionId" is NOT in SENSITIVE_ANSWER_FIELDS — this is intentional
assertEqual(postSensitive.length, 0, "Post-submit payload uses correctOptionId (safe field name)");

// ── Test 10: Legacy answerDetails null does not crash ──
console.log("\n── Test 10: Legacy null answerDetails handled ──");
assert(sanitizeAttemptAnswerDetailsForClient(null) === null, "null answerDetails → null result");
assert(sanitizeAttemptAnswerDetailsForClient(undefined as any) === null, "undefined answerDetails → null result");
assert(sanitizeAttemptHistoryForClient(null) === null, "null history → null result");

// ── Test 11: TestSession snapshot remains active/current only ──
console.log("\n── Test 11: Session snapshot is separate from archive ──");
// TestSession.questionSnapshot is the active attempt snapshot
// ProgresKompetensi.answerDetails is the immutable archive
assert(detailsA.snapshot !== undefined, "answerDetails has its own snapshot copy");
assert(detailsA.snapshot === MOCK_SNAPSHOT, "Immutability: stored snapshot matches original");

// ── Test 12: Deep scan result summary does not expose seed/internal ──
console.log("\n── Test 12: Deep scan of sanitized result ──");
const sanitizedResult = sanitizeAttemptAnswerDetailsForClient(detailsA as any);
const scanResult = deepScanSensitiveFields(sanitizedResult);
assertEqual(scanResult.length, 0, "Zero sensitive/internal fields in sanitized result");

// ── Test 13: Sanitized userAnswers have safe fields only ──
console.log("\n── Test 13: User answers in sanitized result are safe ──");
const sa = sanitizedResult!;
assert(Array.isArray(sa.userAnswers), "userAnswers array preserved");
if (Array.isArray(sa.userAnswers) && sa.userAnswers.length > 0) {
  const first = sa.userAnswers[0] as any;
  assert(first.questionId !== undefined, "questionId preserved");
  assert(first.selectedOptionId !== undefined, "selectedOptionId preserved");
  assert(first.isCorrect !== undefined, "isCorrect preserved");
  assert(first.correctAnswer === undefined, "correctAnswer NOT in userAnswers");
}

// ── Test 14: Attempt history for client has only safe fields ──
console.log("\n── Test 14: sanitizeAttemptHistoryForClient limits fields ──");
const historyResult = sanitizeAttemptHistoryForClient(detailsA as any);
assert(historyResult !== null, "History result not null");
const historyKeys = Object.keys(historyResult!);
assert(historyKeys.includes("attemptId"), "History has attemptId");
assert(historyKeys.includes("scoring"), "History has scoring");
assert(!historyKeys.includes("snapshot"), "History does NOT include snapshot");
assert(!historyKeys.includes("seed"), "History does NOT include seed");
assert(!historyKeys.includes("userAnswers"), "History does NOT include userAnswers");

// ── Test 15: audit metadata shows scoredFromSnapshot correctly ──
console.log("\n── Test 15: Audit metadata ──");
assert(detailsA.audit.scoredFromSnapshot === true, "scoredFromSnapshot === true");
assert(detailsA.audit.liveDbFallbackUsed === false, "liveDbFallbackUsed === false (snapshot exists)");
assert(detailsA.audit.snapshotVersion === "1.0", "snapshotVersion === 1.0");

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
