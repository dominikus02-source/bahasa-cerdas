/**
 * Test — UKBI/TKA Test Screen UI
 *
 * Validates the new modern test screen components:
 * 1. Header with timer and progress
 * 2. Question navigator
 * 3. Ragu-ragu (flag) functionality
 * 4. Submit review modal
 * 5. Answer status tracking
 * 6. Mobile layout
 * 7. All text in Bahasa Indonesia
 * 8. No answer leakage
 * 9. Server-side submit
 * 10. Result page has Dokumen Hasil Latihan button
 */

import * as fs from "fs";
import * as path from "path";

const COMPONENTS_DIR = path.join(__dirname, "..", "components", "kompetensi");
const PAGE_DIR = path.join(__dirname, "..", "app", "(dashboard)", "kompetisi");

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    errors.push(msg);
    console.log(`  ❌ ${msg}`);
  }
}

function fileExists(p: string): boolean {
  return fs.existsSync(p);
}

function readFile(p: string): string {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch {
    return "";
  }
}

console.log("═".repeat(60));
console.log("  UKBI/TKA Test Screen UI — Validation Tests");
console.log("═".repeat(60));

// 1. Test Shell component exists
console.log("\n── 1. Component Existence ──");
assert(fileExists(path.join(COMPONENTS_DIR, "TestShell.tsx")), "TestShell component exists");
assert(fileExists(path.join(COMPONENTS_DIR, "TestHeader.tsx")), "TestHeader component exists");
assert(fileExists(path.join(COMPONENTS_DIR, "QuestionCard.tsx")), "QuestionCard component exists");
assert(fileExists(path.join(COMPONENTS_DIR, "QuestionNavigator.tsx")), "QuestionNavigator component exists");
assert(fileExists(path.join(COMPONENTS_DIR, "SectionProgress.tsx")), "SectionProgress component exists");
assert(fileExists(path.join(COMPONENTS_DIR, "SubmitConfirmModal.tsx")), "SubmitConfirmModal component exists");
assert(fileExists(path.join(COMPONENTS_DIR, "TestResultPanel.tsx")), "TestResultPanel component exists");

// 2. Page files use new components
console.log("\n── 2. Page Files ──");
const pageContent = readFile(path.join(PAGE_DIR, "[paketId]", "page.tsx"));
const hasilContent = readFile(path.join(PAGE_DIR, "[paketId]", "hasil", "page.tsx"));

assert(pageContent.includes("TestShell"), "Page imports TestShell");
assert(pageContent.includes("TestHeader"), "Page imports TestHeader");
assert(pageContent.includes("QuestionCard"), "Page imports QuestionCard");
assert(pageContent.includes("QuestionNavigator"), "Page imports QuestionNavigator");
assert(pageContent.includes("SectionProgress"), "Page imports SectionProgress");
assert(pageContent.includes("SubmitConfirmModal"), "Page imports SubmitConfirmModal");
assert(hasilContent.includes("TestResultPanel"), "Hasil page imports TestResultPanel");

// 3. Header with timer and progress
console.log("\n── 3. Header Features ──");
const headerContent = readFile(path.join(COMPONENTS_DIR, "TestHeader.tsx"));
assert(headerContent.includes("timeLeft"), "Header shows timer");
assert(headerContent.includes("formatTime"), "Header has time formatter");
assert(headerContent.includes("answeredCount"), "Header shows answered count");
assert(headerContent.includes("totalQuestions"), "Header shows total questions");
assert(headerContent.includes("Keluar"), "Header has Keluar (exit) button");
assert(headerContent.includes("Clock"), "Header uses Clock icon");

// 4. QuestionCard features
console.log("\n── 4. QuestionCard Features ──");
const qCardContent = readFile(path.join(COMPONENTS_DIR, "QuestionCard.tsx"));
assert(qCardContent.includes("onSelectAnswer"), "QuestionCard has answer selection");
assert(qCardContent.includes("onToggleFlag"), "QuestionCard has flag toggle");
assert(qCardContent.includes("isFlagged"), "QuestionCard tracks flagged state");
assert(qCardContent.includes("isSelected"), "QuestionCard shows selected state");
assert(qCardContent.includes("Tandai ragu-ragu"), "QuestionCard uses 'Tandai ragu-ragu' text");
assert(qCardContent.includes("Soal"), "QuestionCard displays 'Soal' labeling");

// 5. Navigator features
console.log("\n── 5. Navigator Features ──");
const navContent = readFile(path.join(COMPONENTS_DIR, "QuestionNavigator.tsx"));
assert(navContent.includes("Navigasi Soal"), "Navigator shows 'Navigasi Soal' title");
assert(navContent.includes("Sudah dijawab"), "Navigator shows 'Sudah dijawab' status");
assert(navContent.includes("Ragu-ragu"), "Navigator shows 'Ragu-ragu' status");
assert(navContent.includes("Belum dijawab"), "Navigator shows 'Belum dijawab' status");
assert(navContent.includes("answered"), "Navigator tracks answered");
assert(navContent.includes("flagged"), "Navigator tracks flagged");

// 6. SubmitConfirmModal features
console.log("\n── 6. SubmitConfirmModal Features ──");
const modalContent = readFile(path.join(COMPONENTS_DIR, "SubmitConfirmModal.tsx"));
assert(modalContent.includes("Kirim Jawaban"), "Modal uses 'Kirim Jawaban' title");
assert(modalContent.includes("Lanjut Kerjakan"), "Modal has 'Lanjut Kerjakan' button");
assert(modalContent.includes("Sudah dijawab"), "Modal shows answered count");
assert(modalContent.includes("Belum dijawab"), "Modal shows unanswered count");
assert(modalContent.includes("flaggedCount"), "Modal tracks flagged count");
assert(modalContent.includes("Per Bagian"), "Modal shows per-section breakdown");
assert(modalContent.includes("Setelah dikirim"), "Modal warns about finality");

// 7. Result panel features
console.log("\n── 7. Result Panel Features ──");
const resultContent = readFile(path.join(COMPONENTS_DIR, "TestResultPanel.tsx"));
assert(resultContent.includes("Ulangi Latihan"), "Result has 'Ulangi Latihan' button");
assert(resultContent.includes("Paket Lainnya"), "Result has 'Paket Lainnya' button");
assert(resultContent.includes("Dokumen Hasil Latihan"), "Result has 'Dokumen Hasil Latihan' link");
assert(resultContent.includes("Rekomendasi Belajar"), "Result has learning recommendation");
assert(resultContent.includes("predikat"), "Result shows predikat");
assert(resultContent.includes("Skor per Bagian"), "Result shows per-section scores");
assert(resultContent.includes("Kembali ke Latihan"), "Result has back link");

// 8. All UI text in Bahasa Indonesia
console.log("\n── 8. Bahasa Indonesia Check ──");
const allComponents = [
  readFile(path.join(COMPONENTS_DIR, "TestShell.tsx")),
  readFile(path.join(COMPONENTS_DIR, "TestHeader.tsx")),
  readFile(path.join(COMPONENTS_DIR, "QuestionCard.tsx")),
  readFile(path.join(COMPONENTS_DIR, "QuestionNavigator.tsx")),
  readFile(path.join(COMPONENTS_DIR, "SectionProgress.tsx")),
  readFile(path.join(COMPONENTS_DIR, "SubmitConfirmModal.tsx")),
  readFile(path.join(COMPONENTS_DIR, "TestResultPanel.tsx")),
].join("\n");

const englishPatterns = [
  "Start Test", "Question", "Options", "Submit", "Next", "Previous",
  "Flag", "Timer", "Score", "Passed", "Failed", "Certificate",
];
for (const pat of englishPatterns) {
  assert(!allComponents.includes(pat), `No English text "${pat}" in components`);
}

// 9. No answer leakage in components
console.log("\n── 9. No Answer Leakage ──");
const leakagePatterns = [
  "correctAnswer", "answerKey", "jawaban_benar", "kunci_jawaban",
  "scoringRule", "rubricInternal", "seed",
];
for (const pat of leakagePatterns) {
  assert(!allComponents.includes(pat) || pat === "seed" && !allComponents.includes("seed:"), `No "${pat}" leaked in components`);
}

// 10. Submit is server-side
console.log("\n── 10. Submit Mechanism ──");
assert(pageContent.includes("/api/kompetensi/"), "Page calls API for submit");
assert(pageContent.includes("POST"), "Page uses POST method");

// 11. Mobile layout
console.log("\n── 11. Mobile Layout ──");
const shellContent = readFile(path.join(COMPONENTS_DIR, "TestShell.tsx"));
assert(shellContent.includes("max-w-5xl"), "TestShell has max width constraint");
assert(pageContent.includes("lg:hidden"), "Section progress hidden on desktop in page");
assert(pageContent.includes("sm:hidden"), "Mobile-specific elements");
assert(pageContent.includes("sm:flex"), "Desktop-specific elements");

// 12. TestResultPanel container check
console.log("\n── 12. Result Panel Structure ──");
assert(resultContent.includes("Link"), "Result panel uses Next.js Link");
assert(resultContent.includes("ArrowLeft"), "Result has back arrow icon");
assert(resultContent.includes("Award"), "Result shows award icon");
assert(resultContent.includes("BarChart3"), "Result shows bar chart icon");

// Summary
console.log(`\n${"═".repeat(60)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("═".repeat(60));

if (failed > 0) {
  console.log("\n  Failed checks:");
  errors.forEach((e) => console.log(`    - ${e}`));
  process.exit(1);
}
process.exit(0);
