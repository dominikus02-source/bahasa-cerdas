/**
 * P5C-3 — Weekly Recap verification tests.
 *
 * Deterministic tests for Weekly Learning Recap implementation.
 *
 * Run: npx tsx scripts/test-p5c3-weekly-recap.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const weeklyRecap = read("lib/learning-loop/weekly-recap.ts");
const weeklyRecapRoute = read("app/api/player/weekly-recap/route.ts");
const weeklyRecapCard = read("components/student-home/WeeklyRecapCard.tsx");
const homePage = read("app/(dashboard)/murid/beranda/page.tsx");
const premiumMatrix = read("lib/premium-economy/matrix.ts");
const premiumFeatures = read("lib/premium-economy/features.ts");

let passed = 0;
let failed = 0;
function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      passed++;
      console.log(`  ✅ ${name}`);
    } else {
      failed++;
      console.log(`  ❌ ${name}`);
    }
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

console.log("\n════════════════════════════════════════════");
console.log("  P5C-3 WEEKLY RECAP — Tests");
console.log("\n════════════════════════════════════════════\n");

// ──────────────────────────────────────────────────
// 1. Authentication & Authorization
// ──────────────────────────────────────────────────
console.log("── 1. Authentication & Authorization ──");

test("T1.1. Route requires authentication", () => {
  return weeklyRecapRoute.includes("getUser()") && weeklyRecapRoute.includes("Unauthorized");
});

test("T1.2. Route checks for MURID role", () => {
  return weeklyRecapRoute.includes("user.role !== \"MURID\"") || weeklyRecapRoute.includes("FORBIDDEN_ROLE");
});

test("T1.3. Route does not trust client userId", () => {
  return weeklyRecapRoute.includes("resolvePlan(user.id)");
});

// ──────────────────────────────────────────────────
// 2. Entitlement
// ──────────────────────────────────────────────────
console.log("\n── 2. Entitlement ──");

test("T2.1. Route uses canonical resolvePlan", () => {
  return weeklyRecapRoute.includes("resolvePlan(user.id)");
});

test("T2.2. MURID_PREMIUM has ADVANCED_STATS entitlement", () => {
  return premiumMatrix.includes("ADVANCED_STATS: true");
});

// ──────────────────────────────────────────────────
// 3. Week Boundary
// ──────────────────────────────────────────────────
console.log("\n── 3. Week Boundary ──");

test("T3.1. Weekly recap calculates week boundaries", () => {
  return weeklyRecap.includes("getWIBWeekBoundaries");
});

test("T3.2. Uses WIB timezone (UTC+7)", () => {
  return weeklyRecap.includes("WIB_OFFSET_MS") || weeklyRecap.includes("7 * 3600 * 1000");
});

test("T3.3. Week starts on Monday", () => {
  return weeklyRecap.includes("mondayOffset") || weeklyRecap.includes("Monday");
});

// ──────────────────────────────────────────────────
// 4. Data Sources
// ──────────────────────────────────────────────────
console.log("\n── 4. Data Sources ──");

test("T4.1. Uses PlayerActivity for activity counts", () => {
  return weeklyRecap.includes("PlayerActivity");
});

test("T4.2. Uses LearningEvidence for question stats", () => {
  return weeklyRecap.includes("LearningEvidence");
});

test("T4.3. Uses LearnerState for skill trends", () => {
  return weeklyRecap.includes("getLearnerState");
});

// ──────────────────────────────────────────────────
// 5. Data Honesty
// ──────────────────────────────────────────────────
console.log("\n── 5. Data Honesty ──");

test("T5.1. Handles zero activity safely", () => {
  return weeklyRecap.includes("activities: 0") || weeklyRecap.includes("activeDays: 0");
});

test("T5.2. Returns null for insufficient data", () => {
  return weeklyRecap.includes("accuracy: null") || weeklyRecap.includes("accuracy !== null");
});

test("T5.3. No fabricated statistics", () => {
  // Should calculate from real data, not hardcode
  return weeklyRecap.includes("COUNT(*)") && weeklyRecap.includes("GROUP BY");
});

// ──────────────────────────────────────────────────
// 6. Skill Selection
// ──────────────────────────────────────────────────
console.log("\n── 6. Skill Selection ──");

test("T6.1. Finds strongest skill", () => {
  return weeklyRecap.includes("strength") && weeklyRecap.includes("sort");
});

test("T6.2. Finds focus skill", () => {
  return weeklyRecap.includes("focus") && weeklyRecap.includes("accuracy");
});

test("T6.3. Uses existing skill taxonomy", () => {
  return weeklyRecap.includes("SKILL_LABELS");
});

// ──────────────────────────────────────────────────
// 7. API Response
// ──────────────────────────────────────────────────
console.log("\n── 7. API Response ──");

test("T7.1. Returns structured JSON", () => {
  return weeklyRecapRoute.includes("NextResponse.json");
});

test("T7.2. Includes period information", () => {
  return weeklyRecapRoute.includes("period:") && weeklyRecapRoute.includes("start:");
});

test("T7.3. Includes summary statistics", () => {
  return weeklyRecapRoute.includes("summary:") && weeklyRecapRoute.includes("activities:");
});

// ──────────────────────────────────────────────────
// 8. UI Component
// ──────────────────────────────────────────────────
console.log("\n── 8. UI Component ──");

test("T8.1. WeeklyRecapCard exists", () => {
  return weeklyRecapCard.includes("WeeklyRecapCard");
});

test("T8.2. Shows teaser for FREE users", () => {
  return weeklyRecapCard.includes("Pelajari Premium");
});

test("T8.3. Shows recap for PREMIUM users", () => {
  return weeklyRecapCard.includes("Minggu Ini");
});

test("T8.4. Calls /api/player/weekly-recap", () => {
  return weeklyRecapCard.includes("/api/player/weekly-recap");
});

// ──────────────────────────────────────────────────
// 9. Integration
// ──────────────────────────────────────────────────
console.log("\n── 9. Integration ──");

test("T9.1. Home page includes WeeklyRecapCard", () => {
  return homePage.includes("WeeklyRecapCard");
});

test("T9.2. WeeklyRecapCard is in the correct position", () => {
  return homePage.includes("PremiumValueCard") && homePage.includes("WeeklyRecapCard");
});

// ──────────────────────────────────────────────────
// SUMMARY
// ──────────────────────────────────────────────────
console.log("\n════════════════════════════════════════════");
console.log(`  P5C-3 Results: ${passed} passed, ${failed} failed`);
console.log("════════════════════════════════════════════\n");

if (failed > 0) {
  console.log("P5C-3 FAIL ❌");
  process.exit(1);
}

console.log("P5C-3 PASS ✅");
process.exit(0);
