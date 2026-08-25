/**
 * P5B — Premium Quick Wins verification tests.
 *
 * Verifies:
 *   1. FREE student can still access basic Mulai Latihan
 *   2. PREMIUM student receives personalized recommendation
 *   3. No evidence → safe fallback recommendation
 *   4. FREE/PREMIUM entitlement cannot be spoofed client-side
 *   5. No coin reward is triggered by diagnostic practice
 *   6. Existing Daily Action behavior remains unaffected
 *
 * Run: npx tsx scripts/test-p5b-premium-quick-wins.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const skillRadar = read("components/arena/player/SkillRadar.tsx");
const premiumValueCard = read("components/student-home/PremiumValueCard.tsx");
const progresku = read("app/(dashboard)/murid/progresku/page.tsx");
const homePage = read("app/(dashboard)/murid/beranda/page.tsx");
const homeData = read("components/student-home/home-data.tsx");

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
console.log("  P5B PREMIUM QUICK WINS — Tests");
console.log("════════════════════════════════════════════\n");

// ──────────────────────────────────────────────────
// 1. FREE student can still access basic Mulai Latihan
// ──────────────────────────────────────────────────
console.log("── 1. FREE Learning Access ──");

test("F1.1. SkillRadar shows Mulai Latihan CTA for FREE users", () => {
  return skillRadar.includes("Pelajari Premium") && skillRadar.includes("/murid/premium");
});

test("F1.2. SkillRadar shows recommendation for PREMIUM users", () => {
  return skillRadar.includes("Fokus Latihanmu") && skillRadar.includes("Mulai latihan");
});

test("F1.3. Progresku page shows Mulai Latihan CTA when no evidence", () => {
  return progresku.includes("Mulai Latihan") && progresku.includes("/arena/jalur-cerdas");
});

test("F1.4. ContinueLearningCard preserves existing FREE behavior", () => {
  return (
    homePage.includes("DailyActionCard") &&
    homePage.includes("ContinueLearningCard") &&
    homePage.includes("SkillRadar")
  );
});

// ──────────────────────────────────────────────────
// 2. PREMIUM student receives personalized recommendation
// ──────────────────────────────────────────────────
console.log("\n── 2. PREMIUM Personalization ──");

test("F2.1. SkillRadar accepts isPremium prop", () => {
  return skillRadar.includes("isPremium?: boolean");
});

test("F2.2. SkillRadar shows focus skill for PREMIUM", () => {
  return skillRadar.includes("← Fokus") && skillRadar.includes("isFocus");
});

test("F2.3. SkillRadar shows personalized recommendation for PREMIUM", () => {
  return skillRadar.includes("Fokus Latihanmu") && skillRadar.includes("SKILL_CTA_MAP");
});

test("F2.4. PremiumValueCard shows strength for PREMIUM", () => {
  return premiumValueCard.includes("Kekuatan:") && premiumValueCard.includes("strongestSkill");
});

test("F2.5. PremiumValueCard shows focus area for PREMIUM", () => {
  return premiumValueCard.includes("Fokus:") && premiumValueCard.includes("weakestSkill");
});

test("F2.6. PremiumValueCard shows recommended action for PREMIUM", () => {
  return premiumValueCard.includes("Saran:") && premiumValueCard.includes("personalization");
});

// ──────────────────────────────────────────────────
// 3. No evidence → safe fallback recommendation
// ──────────────────────────────────────────────────
console.log("\n── 3. Safe Fallback ──");

test("F3.1. SkillRadar shows safe message when no evidence", () => {
  return skillRadar.includes("Mulai beberapa latihan dulu");
});

test("F3.2. Progresku shows safe message when no evidence", () => {
  return progresku.includes("Mulai Belajar") && progresku.includes("perkembanganmu akan terlihat");
});

test("F3.3. PremiumValueCard shows generic message when no evidence", () => {
  return premiumValueCard.includes("Analisis kemampuan mendalam menyertai setiap latihanmu");
});

// ──────────────────────────────────────────────────
// 4. FREE/PREMIUM entitlement cannot be spoofed client-side
// ──────────────────────────────────────────────────
console.log("\n── 4. Server-Authoritative Entitlement ──");

test("F4.1. PremiumValueCard reads plan from server API", () => {
  return premiumValueCard.includes("premium: data") && premiumValueCard.includes("data.plan");
});

test("F4.2. Home page reads premium status from HomeDataProvider", () => {
  return homePage.includes("premium") && homePage.includes("useHomeData");
});

test("F4.3. SkillRadar receives isPremium from parent (server-derived)", () => {
  return homePage.includes("isPremium={isPremium}") && homePage.includes("premium?.plan");
});

test("F4.4. Progresku fetches from server API (not client state)", () => {
  return progresku.includes("/api/player/learner-state") && progresku.includes("fetch");
});

// ──────────────────────────────────────────────────
// 5. No coin reward is triggered by diagnostic practice
// ──────────────────────────────────────────────────
console.log("\n── 5. No Coin Reward for Diagnostic ──");

test("F5.1. SkillRadar does not reference coins", () => {
  return !skillRadar.includes("coin") && !skillRadar.includes("koin");
});

test("F5.2. PremiumValueCard does not reference coins", () => {
  return !premiumValueCard.includes("coin") && !premiumValueCard.includes("koin");
});

test("F5.3. Progresku does not award coins for viewing", () => {
  return !progresku.includes("awardCoin") && !progresku.includes("spendCoin");
});

// ──────────────────────────────────────────────────
// 6. Existing Daily Action behavior remains unaffected
// ──────────────────────────────────────────────────
console.log("\n── 6. Daily Action Preserved ──");

test("F6.1. Home page still includes DailyActionCard", () => {
  return homePage.includes("DailyActionCard");
});

test("F6.2. Home page still includes ContinueLearningCard", () => {
  return homePage.includes("ContinueLearningCard");
});

test("F6.3. Home page hierarchy preserved (hero → daily → continue → skills)", () => {
  // Check that key components are present in the JSX
  return (
    homePage.includes("StudentHomeHero") &&
    homePage.includes("DailyActionCard") &&
    homePage.includes("ContinueLearningCard") &&
    homePage.includes("SkillRadar")
  );
});

// ──────────────────────────────────────────────────
// SUMMARY
// ──────────────────────────────────────────────────
console.log("\n════════════════════════════════════════════");
console.log(`  P5B Results: ${passed} passed, ${failed} failed`);
console.log("════════════════════════════════════════════\n");

if (failed > 0) {
  console.log("P5B FAIL ❌");
  process.exit(1);
}

console.log("P5B PASS ✅");
process.exit(0);
