/**
 * Audit — UKBI/TKA Test Screen
 *
 * Audits the new test screen components and pages for:
 * 1. Route availability
 * 2. Component existence
 * 3. Timer/navigator/progress features
 * 4. Review modal availability
 * 5. Result panel availability
 * 6. No-answer-leakage status
 * 7. Mobile readiness
 * 8. Bahasa Indonesia compliance
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..");
const COMPONENTS_DIR = path.join(ROOT, "components", "kompetensi");
const PAGE_DIR = path.join(ROOT, "app", "(dashboard)", "kompetisi");
const SRC_DIR = path.join(ROOT, "app");

let passed = 0;
let failed = 0;
const issues: string[] = [];

function check(condition: boolean, label: string, category: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ [${category}] ${label}`);
  } else {
    failed++;
    issues.push(`[${category}] ${label}`);
    console.log(`  ❌ [${category}] ${label}`);
  }
}

function readFile(p: string): string {
  try {
    return fs.readFileSync(p, "utf-8");
  } catch {
    return "";
  }
}

console.log("═".repeat(70));
console.log("  AUDIT UKBI/TKA TEST SCREEN");
console.log("  bahasa-cerdas — Phase UKBI TKA PRACTICE SCREEN 1");
console.log("═".repeat(70));

// ── 1. Route Availability ──
console.log("\n── 1. Route Availability ──");
check(fs.existsSync(path.join(PAGE_DIR, "[paketId]", "page.tsx")), "Competition page route exists", "ROUTE");
check(fs.existsSync(path.join(PAGE_DIR, "[paketId]", "hasil", "page.tsx")), "Result page route exists", "ROUTE");
check(fs.existsSync(path.join(PAGE_DIR, "latihan", "page.tsx")), "Latihan listing route exists", "ROUTE");
check(fs.existsSync(path.join(ROOT, "app", "api", "kompetensi", "[paketId]", "route.ts")), "API GET route exists", "ROUTE");
check(fs.existsSync(path.join(ROOT, "app", "api", "kompetensi", "[paketId]", "submit", "route.ts")), "API POST route exists", "ROUTE");
check(fs.existsSync(path.join(ROOT, "app", "api", "kompetensi", "[paketId]", "hasil", "route.ts")), "API result route exists", "ROUTE");

// ── 2. Component Existence ──
console.log("\n── 2. Component Existence ──");
const expectedComponents = [
  "TestShell.tsx", "TestHeader.tsx", "QuestionCard.tsx",
  "QuestionNavigator.tsx", "SectionProgress.tsx",
  "SubmitConfirmModal.tsx", "TestResultPanel.tsx",
];
for (const comp of expectedComponents) {
  check(fs.existsSync(path.join(COMPONENTS_DIR, comp)), `Component ${comp} exists`, "COMPONENT");
}

// ── 3. Timer Availability ──
console.log("\n── 3. Timer Features ──");
const headerContent = readFile(path.join(COMPONENTS_DIR, "TestHeader.tsx"));
check(headerContent.includes("timeLeft"), "Timer rendering", "TIMER");
check(headerContent.includes("formatTime"), "Timer formatting (mm:ss)", "TIMER");
check(headerContent.includes("Clock"), "Clock icon used", "TIMER");
check(headerContent.includes("bg-red-100") || headerContent.includes("text-red-600"), "Timer warning state when low", "TIMER");
check(headerContent.includes("bg-amber"), "Timer warning state at 60s", "TIMER");

// ── 4. Navigator Availability ──
console.log("\n── 4. Navigator Features ──");
const navContent = readFile(path.join(COMPONENTS_DIR, "QuestionNavigator.tsx"));
check(navContent.includes("onGoToQuestion"), "Navigator has question navigation handler", "NAVIGATOR");
check(navContent.includes("answers"), "Navigator reads answers state", "NAVIGATOR");
check(navContent.includes("flagged"), "Navigator reads flagged state", "NAVIGATOR");
check(navContent.includes("Sudah dijawab"), "Navigator shows 'Sudah dijawab' legend", "NAVIGATOR");
check(navContent.includes("Ragu-ragu"), "Navigator shows 'Ragu-ragu' legend", "NAVIGATOR");
check(navContent.includes("Belum dijawab"), "Navigator shows 'Belum dijawab' legend", "NAVIGATOR");
check(navContent.includes("bg-emerald-100") || navContent.includes("answered"), "Navigator answered state coloring", "NAVIGATOR");
check(navContent.includes("bg-amber") || navContent.includes("flagged"), "Navigator flagged state coloring", "NAVIGATOR");

// ── 5. Section Progress ──
console.log("\n── 5. Section Progress ──");
const sectionContent = readFile(path.join(COMPONENTS_DIR, "SectionProgress.tsx"));
check(sectionContent.includes("currentSection"), "Section progress tracks current section", "SECTION");
check(sectionContent.includes("CheckCircle2"), "Section complete icon", "SECTION");
check(sectionContent.includes("HelpCircle"), "Section partial icon", "SECTION");
check(sectionContent.includes("Circle"), "Section empty icon", "SECTION");
check(sectionContent.includes("Bagian"), "Section header 'Bagian'", "SECTION");

// ── 6. Submit Review Modal ──
console.log("\n── 6. Submit Review Modal ──");
const modalContent = readFile(path.join(COMPONENTS_DIR, "SubmitConfirmModal.tsx"));
check(modalContent.includes("Kirim Jawaban"), "Modal title 'Kirim Jawaban'", "MODAL");
check(modalContent.includes("Lanjut Kerjakan"), "Modal has 'Lanjut Kerjakan' button", "MODAL");
check(modalContent.includes("answeredCount"), "Modal shows answered count", "MODAL");
check(modalContent.includes("totalQuestions"), "Modal shows total questions", "MODAL");
check(modalContent.includes("flaggedCount"), "Modal shows flagged count", "MODAL");
check(modalContent.includes("Per Bagian"), "Modal shows per-section breakdown", "MODAL");
check(modalContent.includes("Setelah dikirim"), "Modal shows finality warning", "MODAL");
check(modalContent.includes("onConfirm"), "Modal has confirm handler", "MODAL");
check(modalContent.includes("submitting"), "Modal handles submitting state", "MODAL");

// ── 7. Result Panel ──
console.log("\n── 7. Result Panel ──");
const resultContent = readFile(path.join(COMPONENTS_DIR, "TestResultPanel.tsx"));
check(resultContent.includes("Ulangi Latihan"), "Result has 'Ulangi Latihan' button", "RESULT");
check(resultContent.includes("Paket Lainnya"), "Result has 'Paket Lainnya' button", "RESULT");
check(resultContent.includes("Dokumen Hasil Latihan"), "Result has 'Dokumen Hasil Latihan' link", "RESULT");
check(resultContent.includes("Rekomendasi Belajar"), "Result has recommendation section", "RESULT");
check(resultContent.includes("Skor per Bagian"), "Result shows section scores", "RESULT");
check(resultContent.includes("predikat"), "Result shows predikat", "RESULT");
check(resultContent.includes("percentage"), "Result shows percentage", "RESULT");
check(resultContent.includes("Kembali ke Latihan"), "Result has back navigation", "RESULT");

// ── 8. No Answer Leakage ──
console.log("\n── 8. No Answer Leakage ──");
const allComponents = [
  readFile(path.join(COMPONENTS_DIR, "TestShell.tsx")),
  readFile(path.join(COMPONENTS_DIR, "TestHeader.tsx")),
  readFile(path.join(COMPONENTS_DIR, "QuestionCard.tsx")),
  readFile(path.join(COMPONENTS_DIR, "QuestionNavigator.tsx")),
  readFile(path.join(COMPONENTS_DIR, "SectionProgress.tsx")),
  readFile(path.join(COMPONENTS_DIR, "SubmitConfirmModal.tsx")),
  readFile(path.join(COMPONENTS_DIR, "TestResultPanel.tsx")),
].join("\n");

const leakagePatterns = [
  "correctAnswer", "kunci_jawaban", "jawaban_benar",
  "scoringRule", "rubricInternal", "reviewerNotes",
];
for (const pat of leakagePatterns) {
  check(!allComponents.includes(pat), `No \`${pat}\` leaked in client components`, "SECURITY");
}

// ── 9. Mobile Readiness ──
console.log("\n── 9. Mobile Readiness ──");
const pageContent = readFile(path.join(PAGE_DIR, "[paketId]", "page.tsx"));
check(pageContent.includes("sm:hidden"), "Mobile-specific elements (sm:hidden)", "MOBILE");
check(pageContent.includes("sm:flex"), "Desktop-specific elements (sm:flex)", "MOBILE");
check(pageContent.includes("lg:hidden"), "Mobile-only section progress (lg:hidden)", "MOBILE");
check(pageContent.includes("max-w-5xl"), "Max width constraint", "MOBILE");
check(pageContent.includes("min-w-0"), "Overflow prevention", "MOBILE");

// ── 10. Bahasa Indonesia ──
console.log("\n── 10. Bahasa Indonesia Compliance ──");
const englishPatterns = [
  "Start Test", "Question", "Timer", "Score:", "Passed", "Failed",
  "Correct", "Wrong", "Answer", "Flagged", "Submit", "Next", "Previous",
  "Certificate", "Review", "Options",
];
// Only check components, not imports
const componentTextOnly = allComponents.replace(/import.*from/g, "").replace(/interface\s+\w+/g, "");
for (const pat of englishPatterns) {
  check(!componentTextOnly.includes(pat), `No English text "${pat}" in components`, "BAHASA");
}

// Summary
console.log(`\n${"═".repeat(70)}`);
console.log(`  AUDIT COMPLETE`);
console.log(`  Passed: ${passed}`);
console.log(`  Issues: ${failed}`);
console.log("═".repeat(70));

if (issues.length > 0) {
  console.log("\n  Issues found:");
  issues.forEach((i) => console.log(`    ❌ ${i}`));
}

process.exit(failed > 0 ? 1 : 0);
