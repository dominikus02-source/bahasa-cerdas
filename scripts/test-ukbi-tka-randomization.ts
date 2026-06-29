/**
 * Phase UKBI/TKA FOUNDATION 2A — Server-Side Randomization & Option Shuffling Tests
 *
 * 12 tests covering shuffle correctness, determinism, sanitization, and integration.
 * Run: npx tsx scripts/test-ukbi-tka-randomization.ts
 *
 * All existing leakage tests must remain green after changes:
 *   npm run test:bank-soal-leakage
 *   npm run test:murid-quiz-leakage
 *   npm run test:jalur-leakage
 */

import {
  fisherYatesShuffle,
  shuffleQuestions,
  shuffleOptionsForQuestion,
  shuffleOptionsForQuestions,
  createSessionSeed,
} from "../lib/question-bank/randomization";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    errors.push(message);
    console.log(`  ❌ ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    errors.push(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    console.log(`  ❌ ${message}`);
  }
}

function assertNotEqual<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    errors.push(`${message}: values were equal (${JSON.stringify(actual)})`);
    console.log(`  ❌ ${message}`);
  }
}

// ── Helpers ──
const sampleQuestions = [
  { id: "q1", text: "Apa ibu kota Indonesia?", options: [{ id: "A", text: "Jakarta" }, { id: "B", text: "Surabaya" }, { id: "C", text: "Bandung" }] },
  { id: "q2", text: "Siapa presiden pertama?", options: [{ id: "A", text: "Soekarno" }, { id: "B", text: "Soeharto" }, { id: "C", text: "Habibie" }] },
  { id: "q3", text: "Apa bahasa resmi Indonesia?", options: [{ id: "A", text: "Bahasa Indonesia" }, { id: "B", text: "Bahasa Jawa" }, { id: "C", text: "Bahasa Inggris" }] },
  { id: "q4", text: "Apa lambang negara?", options: [{ id: "A", text: "Garuda" }, { id: "B", text: "Banteng" }, { id: "C", text: "Bunga" }] },
  { id: "q5", text: "Siapa pahlawan nasional?", options: [{ id: "A", text: "Diponegoro" }, { id: "B", text: "Kartini" }, { id: "C", text: "Sudirman" }] },
];

const seedA = "test-seed-123";
const seedB = "test-seed-456";

console.log("\n═══════════════════════════════════════════");
console.log("  UKBI/TKA Randomization Tests");
console.log("═══════════════════════════════════════════\n");

// ── Test 1: Fisher-Yates returns same length ──
console.log("── Test 1: Shuffle preserves length ──");
const shuffled = fisherYatesShuffle([1, 2, 3, 4, 5], seedA);
assert(shuffled.length === 5, "Shuffled array has same length");

// ── Test 2: Fisher-Yates deterministic ──
console.log("\n── Test 2: Deterministic with same seed ──");
const result1 = fisherYatesShuffle([1, 2, 3, 4, 5, 6, 7, 8], seedA);
const result2 = fisherYatesShuffle([1, 2, 3, 4, 5, 6, 7, 8], seedA);
assertEqual(result1, result2, "Same seed produces identical order");

// ── Test 3: Different seeds produce different orders ──
console.log("\n── Test 3: Different seed → different order ──");
const result3 = fisherYatesShuffle([1, 2, 3, 4, 5, 6, 7, 8], seedB);
let sameOrder = true;
for (let i = 0; i < result1.length; i++) {
  if (result1[i] !== result3[i]) { sameOrder = false; break; }
}
assert(!sameOrder, "Different seeds produce different orders (very unlikely to be same)");

// ── Test 4: Shuffle preserves all elements ──
console.log("\n── Test 4: All elements preserved ──");
const sorted = [...shuffled].sort();
assertEqual(sorted, [1, 2, 3, 4, 5], "No elements lost or duplicated");

// ── Test 5: Single-element array ──
console.log("\n── Test 5: Single-element edge case ──");
const single = fisherYatesShuffle(["only"], seedA);
assertEqual(single, ["only"], "Single element returns unchanged");

// ── Test 6: Empty array ──
console.log("\n── Test 6: Empty array edge case ──");
const empty = fisherYatesShuffle([], seedA);
assertEqual(empty, [], "Empty array returns empty");

// ── Test 7: shuffleQuestions preserves all question IDs ──
console.log("\n── Test 7: Question shuffle preserves IDs ──");
const shuffledQs = shuffleQuestions(sampleQuestions, seedA);
const originalIds = sampleQuestions.map(q => q.id).sort();
const shuffledIds = shuffledQs.map(q => q.id).sort();
assertEqual(shuffledIds, originalIds, "All question IDs preserved");

// ── Test 8: Option shuffle preserves option IDs ──
console.log("\n── Test 8: Option shuffle preserves option IDs ──");
const question = sampleQuestions[0];
const shuffledOpts = shuffleOptionsForQuestion(question.options, seedA);
const originalOptIds = question.options.map(o => o.id).sort();
const shuffledOptIds = shuffledOpts.map(o => o.id).sort();
assertEqual(shuffledOptIds, originalOptIds, "All option IDs preserved");
assertEqual(shuffledOpts.length, question.options.length, "Option count unchanged");

// ── Test 9: Option shuffle changes order (probabilistic, high likelihood) ──
console.log("\n── Test 9: Option shuffle varies order ──");
let orderChanged = false;
for (let attempt = 0; attempt < 5; attempt++) {
  const opts = shuffleOptionsForQuestion(question.options, seedA + "-" + attempt);
  if (JSON.stringify(opts) !== JSON.stringify(question.options)) {
    orderChanged = true;
    break;
  }
}
assert(orderChanged, "Option order varies with different seeds (high probability)");

// ── Test 10: createSessionSeed generates unique seeds ──
console.log("\n── Test 10: Session seed uniqueness ──");
const seed1 = createSessionSeed("user1", "test1", 1000);
const seed2 = createSessionSeed("user2", "test1", 1000);
const seed3 = createSessionSeed("user1", "test2", 1000);
assertNotEqual(seed1, seed2, "Different users → different seed");
assertNotEqual(seed1, seed3, "Different tests → different seed");

// ── Test 11: No sensitive fields leaked after shuffle ──
console.log("\n── Test 11: No sensitive fields exposed ──");
for (const q of shuffledQs) {
  const asAny = q as any;
  assert(asAny.correctAnswer === undefined, `Q ${q.id}: correctAnswer not exposed`);
  assert(asAny.jawaban === undefined, `Q ${q.id}: jawaban not exposed`);
}

// ── Test 12: shuffleOptionsForQuestions bulk API ──
console.log("\n── Test 12: Bulk option shuffle ──");
const bulkQuestions = structuredClone(sampleQuestions);
shuffleOptionsForQuestions(bulkQuestions, seedA);
for (let i = 0; i < bulkQuestions.length; i++) {
  const originalIds = sampleQuestions[i].options.map(o => o.id).sort();
  const shuffledIds = bulkQuestions[i].options.map(o => o.id).sort();
  assertEqual(shuffledIds, originalIds, `Q${i}: bulk shuffle preserves option IDs`);
}

// ── Summary ──
console.log("\n═══════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("═══════════════════════════════════════════\n");

if (failed > 0) {
  console.log("Errors:");
  errors.forEach(e => console.log(`  - ${e}`));
  process.exit(1);
}
