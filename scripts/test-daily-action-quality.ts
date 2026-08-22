/**
 * Daily Action Question Quality Gate 1.0 — Test Suite
 *
 * Pure unit tests. No database, no network.
 * Run: npm run test:daily-action-quality
 */
import { validateCandidate, filterByQuality, qualityStats, REJECTION } from "../lib/daily-action/quality";
import type { DailyCandidate } from "../lib/daily-action/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function assertIncludes(arr: string[], value: string, label: string) {
  assert(arr.includes(value), label);
}

function makeCandidate(overrides: Partial<DailyCandidate> = {}): DailyCandidate {
  return {
    id: "test-id-1",
    source: "TKA",
    skill: "READING",
    difficulty: "MEDIUM",
    questionText: "Apa yang dimaksud dengan kalimat efektif dalam bahasa Indonesia?",
    options: JSON.stringify(["Kalimat yang baik dan benar", "Kalimat yang panjang", "Kalimat yang singkat", "Kalimat yang rumit"]),
    ...overrides,
  };
}

// ── SECTION 1: Valid Candidate Pass ────────────────────────
console.log("\n=== Section 1: Valid Candidate ===");

{
  const c = makeCandidate();
  const r = validateCandidate(c);
  assert(r.eligible === true, "Valid TKA candidate passes");
  assert(r.reasons.length === 0, "No rejection reasons for valid candidate");
}

{
  const c = makeCandidate({ source: "UKBI" });
  const r = validateCandidate(c);
  assert(r.eligible === true, "Valid UKBI candidate passes");
}

{
  const c = makeCandidate({ source: "SOAL" });
  const r = validateCandidate(c);
  assert(r.eligible === true, "Valid SOAL candidate passes");
}

// ── SECTION 2: Missing / Empty Text ────────────────────────
console.log("\n=== Section 2: Text Quality ===");

{
  const c = makeCandidate({ questionText: "" });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Empty text rejected");
  assertIncludes(r.reasons, REJECTION.MISSING_TEXT, "Reason: MISSING_TEXT");
}

{
  const c = makeCandidate({ questionText: "   " });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Whitespace-only text rejected");
  assertIncludes(r.reasons, REJECTION.MISSING_TEXT, "Whitespace → MISSING_TEXT");
}

{
  const c = makeCandidate({ questionText: "Apa?" });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Text too short rejected (<5 chars)");
  assertIncludes(r.reasons, REJECTION.TEXT_TOO_SHORT, "Reason: TEXT_TOO_SHORT");
}

{
  const c = makeCandidate({ questionText: "Apa" });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Text 3 chars rejected");
  assertIncludes(r.reasons, REJECTION.TEXT_TOO_SHORT, "3 chars → TEXT_TOO_SHORT");
}

{
  const c = makeCandidate({ questionText: "test" });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Placeholder 'test' rejected");
  assertIncludes(r.reasons, REJECTION.PLACEHOLDER_CONTENT, "Reason: PLACEHOLDER_CONTENT");
}

{
  const c = makeCandidate({ questionText: "TODO" });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Placeholder 'TODO' rejected");
  assertIncludes(r.reasons, REJECTION.PLACEHOLDER_CONTENT, "TODO → PLACEHOLDER_CONTENT");
}

{
  const c = makeCandidate({ questionText: "???" });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Placeholder '???' rejected");
  assertIncludes(r.reasons, REJECTION.PLACEHOLDER_CONTENT, "??? → PLACEHOLDER_CONTENT");
}

{
  const c = makeCandidate({ questionText: "test question" });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Placeholder 'test question' rejected");
  assertIncludes(r.reasons, REJECTION.PLACEHOLDER_CONTENT, "test question → PLACEHOLDER_CONTENT");
}

{
  const c = makeCandidate({ questionText: "Lorem ipsum dolor sit amet" });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Placeholder 'Lorem ipsum' rejected");
  assertIncludes(r.reasons, REJECTION.PLACEHOLDER_CONTENT, "Lorem ipsum → PLACEHOLDER_CONTENT");
}

{
  const c = makeCandidate({ questionText: "---" });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Dashes placeholder rejected");
  assertIncludes(r.reasons, REJECTION.PLACEHOLDER_CONTENT, "--- → PLACEHOLDER_CONTENT");
}

{
  const longText = "A".repeat(5001);
  const c = makeCandidate({ questionText: longText });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Text >5000 chars rejected");
  assertIncludes(r.reasons, REJECTION.QUESTION_TOO_LONG, "Reason: QUESTION_TOO_LONG");
}

// ── SECTION 3: Options Quality ─────────────────────────────
console.log("\n=== Section 3: Options Quality ===");

{
  const c = makeCandidate({ options: "" });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Empty options rejected");
  assertIncludes(r.reasons, REJECTION.EMPTY_OPTIONS, "Reason: EMPTY_OPTIONS");
}

{
  const c = makeCandidate({ options: "not json" });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Non-JSON options rejected");
  assertIncludes(r.reasons, REJECTION.EMPTY_OPTIONS, "Non-JSON → EMPTY_OPTIONS");
}

{
  const c = makeCandidate({ options: '{"key": "value"}' });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Non-array JSON options rejected");
  assertIncludes(r.reasons, REJECTION.EMPTY_OPTIONS, "Object → EMPTY_OPTIONS");
}

{
  const c = makeCandidate({ options: JSON.stringify(["Option A"]) });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Single option rejected");
  assertIncludes(r.reasons, REJECTION.TOO_FEW_OPTIONS, "Reason: TOO_FEW_OPTIONS");
}

{
  const c = makeCandidate({ options: JSON.stringify(["A", "B"]) });
  const r = validateCandidate(c);
  assert(r.eligible === true, "Two options passes");
}

{
  const c = makeCandidate({ options: JSON.stringify(["A", "B", "C", "D"]) });
  const r = validateCandidate(c);
  assert(r.eligible === true, "Four options passes");
}

{
  const c = makeCandidate({ options: JSON.stringify(["A", "", "C"]) });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Empty option string rejected");
  assertIncludes(r.reasons, REJECTION.EMPTY_OPTION, "Reason: EMPTY_OPTION");
}

{
  const c = makeCandidate({ options: JSON.stringify(["A", "B", "A"]) });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Duplicate options rejected");
  assertIncludes(r.reasons, REJECTION.DUPLICATE_OPTIONS, "Reason: DUPLICATE_OPTIONS");
}

{
  // Case-insensitive duplicate detection
  const c = makeCandidate({ options: JSON.stringify(["Benar", "benar", "Salah"]) });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Case-insensitive duplicate options rejected");
  assertIncludes(r.reasons, REJECTION.DUPLICATE_OPTIONS, "Case dup → DUPLICATE_OPTIONS");
}

{
  // Different case but different content should pass
  const c = makeCandidate({ options: JSON.stringify(["Benar", "SALAH"]) });
  const r = validateCandidate(c);
  assert(r.eligible === true, "Different content (different case) passes");
}

// ── SECTION 4: Source Validation ───────────────────────────
console.log("\n=== Section 4: Source Validation ===");

{
  const c = makeCandidate({ source: "INVALID_SOURCE" as any });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Invalid source rejected");
  assertIncludes(r.reasons, REJECTION.INVALID_SOURCE, "Reason: INVALID_SOURCE");
}

{
  const c = makeCandidate({ source: "" as any });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Empty source rejected");
  assertIncludes(r.reasons, REJECTION.INVALID_SOURCE, "Empty source → INVALID_SOURCE");
}

{
  for (const src of ["TKA", "UKBI", "SOAL"]) {
    const c = makeCandidate({ source: src as any });
    const r = validateCandidate(c);
    assert(r.eligible === true, `Source ${src} passes`);
  }
}

// ── SECTION 5: Filter by Quality (Batch) ───────────────────
console.log("\n=== Section 5: Batch Filtering ===");

{
  const candidates = [
    makeCandidate({ id: "1", questionText: "Soal bagus yang valid dan layak untuk diuji?" }),
    makeCandidate({ id: "2", questionText: "" }),
    makeCandidate({ id: "3", questionText: "test" }),
    makeCandidate({ id: "4", source: "INVALID" as any }),
    makeCandidate({ id: "5", options: "[]" }),
  ];
  const filtered = filterByQuality(candidates);
  assert(filtered.length === 1, "Only 1 valid candidate remains");
  assert(filtered[0]?.id === "1", "The valid candidate is id=1");
}

{
  const candidates = [
    makeCandidate({ id: "a", questionText: "Apa pengertian kalimat aktif dalam bahasa Indonesia?" }),
    makeCandidate({ id: "b", questionText: "Sebutkan ciri-ciri teks eksposisi!" }),
    makeCandidate({ id: "c", questionText: "Jelaskan perbedaan antara sinonim dan antonim!" }),
  ];
  const filtered = filterByQuality(candidates);
  assert(filtered.length === 3, "All 3 valid candidates pass batch filter");
}

// ── SECTION 6: Quality Stats ───────────────────────────────
console.log("\n=== Section 6: Quality Stats ===");

{
  const candidates = [
    makeCandidate({ id: "1", questionText: "Soal bagus yang valid dan layak untuk diuji?" }),
    makeCandidate({ id: "2", questionText: "" }),
    makeCandidate({ id: "3", questionText: "test" }),
    makeCandidate({ id: "4", source: "INVALID" as any }),
  ];
  const stats = qualityStats(candidates);
  assert(stats.total === 4, "Stats total = 4");
  assert(stats.passed === 1, "Stats passed = 1");
  assert(stats.rejected === 3, "Stats rejected = 3");
  assert(stats.rejectionReasons[REJECTION.MISSING_TEXT] === 1, "1 MISSING_TEXT");
  assert(stats.rejectionReasons[REJECTION.PLACEHOLDER_CONTENT] === 1, "1 PLACEHOLDER_CONTENT");
  assert(stats.rejectionReasons[REJECTION.INVALID_SOURCE] === 1, "1 INVALID_SOURCE");
}

// ── SECTION 7: Edge Cases ──────────────────────────────────
console.log("\n=== Section 7: Edge Cases ===");

{
  // Unicode / emoji in text should pass if long enough
  const c = makeCandidate({ questionText: "Apa makna simbol 🔥 dalam puisi modern Indonesia hari ini?" });
  const r = validateCandidate(c);
  assert(r.eligible === true, "Unicode text passes");
}

{
  // Indonesian diacritics
  const c = makeCandidate({ questionText: "Jelaskan penggunaan tanda baca koma dalam kalimat Majelis Permusyawaratan Rakyat!" });
  const r = validateCandidate(c);
  assert(r.eligible === true, "Indonesian text with capitals passes");
}

{
  // Options with numbers (correctAnswer as index)
  const c = makeCandidate({
    options: JSON.stringify(["0", "1", "2", "3"]),
    questionText: "Pilihan jawaban mana yang merupakan angka prima terkecil kedua?",
  });
  const r = validateCandidate(c);
  assert(r.eligible === true, "Numeric option values pass");
}

{
  // Exactly 5-char text passes
  const c = makeCandidate({ questionText: "Apaan?" });
  const r = validateCandidate(c);
  assert(r.eligible === true, "5-char text passes (min boundary)");
}

{
  // Exactly 5000-char text passes
  const text = "A".repeat(5000);
  const c = makeCandidate({ questionText: text });
  const r = validateCandidate(c);
  assert(r.eligible === true, "5000-char text passes (max boundary)");
}

{
  // null skill is allowed (soft validation)
  const c = makeCandidate({ skill: null });
  const r = validateCandidate(c);
  assert(r.eligible === true, "Null skill passes (soft)");
}

{
  // Unknown skill is allowed (soft validation — fallback to READING)
  const c = makeCandidate({ skill: "CUSTOM_SKILL" });
  const r = validateCandidate(c);
  assert(r.eligible === true, "Unknown skill passes (soft, has fallback)");
}

{
  // Multiple rejection reasons
  const c = makeCandidate({
    questionText: "",
    options: "[]",
    source: "INVALID" as any,
  });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Multiple issues → rejected");
  assert(r.reasons.length >= 3, "At least 3 reasons reported");
}

// ── SECTION 8: Duplicate Detection Specifics ───────────────
console.log("\n=== Section 8: Duplicate Detection ===");

{
  // Same text, different case → still duplicate
  const c = makeCandidate({ options: JSON.stringify(["Benar", "BENAR", "Salah"]) });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Case-insensitive duplicate detected");
}

{
  // All unique → passes
  const c = makeCandidate({ options: JSON.stringify(["A", "B", "C", "D"]) });
  const r = validateCandidate(c);
  assert(r.eligible === true, "All unique options pass");
}

{
  // Whitespace-only option counts as empty
  const c = makeCandidate({ options: JSON.stringify(["A", "  ", "C"]) });
  const r = validateCandidate(c);
  assert(r.eligible === false, "Whitespace-only option detected as empty");
  assertIncludes(r.reasons, REJECTION.EMPTY_OPTION, "Reason: EMPTY_OPTION for whitespace");
}

// ── Summary ────────────────────────────────────────────────
console.log("\n" + "=".repeat(50));
console.log(`DAILY ACTION QUALITY GATE — RESULTS`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);
console.log("=".repeat(50));

if (failed > 0) {
  process.exit(1);
}
