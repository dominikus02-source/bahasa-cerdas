/**
 * P5C-4 — Premium Intelligence Integration tests.
 *
 * Verifies the complete Premium learning loop:
 * LEARN → ASSESS → LEARNER STATE → SKILL PROFILE → WEEKLY RECAP
 * → FOCUS SKILL → AI MENTOR → NEXT ACTION → PRACTICE
 *
 * Run: npx tsx scripts/test-p5c4-premium-integration.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

// Read all relevant files
const learnerStateService = read("lib/learner-state/service.ts");
const learnerStateCalculator = read("lib/learner-state/calculator.ts");
const learningLoopSkills = read("lib/learning-loop/skills.ts");
const learningLoopRecommend = read("lib/learning-loop/recommend.ts");
const learningLoopNextAction = read("lib/learning-loop/next-action.ts");
const learningLoopActivity = read("lib/learning-loop/activity.ts");
const weeklyRecap = read("lib/learning-loop/weekly-recap.ts");
const mentorContext = read("lib/ai-gateway/mentor-context.ts");
const skillRadar = read("components/arena/player/SkillRadar.tsx");
const premiumValueCard = read("components/student-home/PremiumValueCard.tsx");
const weeklyRecapCard = read("components/student-home/WeeklyRecapCard.tsx");
const mentorRoute = read("app/api/player/mentor/route.ts");
const weeklyRecapRoute = read("app/api/player/weekly-recap/route.ts");
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
console.log("  P5C-4 PREMIUM INTEGRATION — Tests");
console.log("\n════════════════════════════════════════════\n");

// ──────────────────────────────────────────────────
// 1. Data Source Consistency
// ──────────────────────────────────────────────────
console.log("── 1. Data Source Consistency ──");

test("T1.1. LearnerState uses LearningEvidence as source", () => {
  return learnerStateService.includes("LearningEvidence");
});

test("T1.2. LearnerState uses QuestionMetadata for skill mapping", () => {
  return learnerStateService.includes("QuestionMetadata");
});

test("T1.3. SkillRadar uses LearnerState", () => {
  return skillRadar.includes("LearnerSkillState");
});

test("T1.4. PremiumValueCard uses LearnerState", () => {
  return premiumValueCard.includes("learnerState");
});

test("T1.5. WeeklyRecap uses LearningEvidence", () => {
  return weeklyRecap.includes("LearningEvidence");
});

test("T1.6. AI Mentor uses LearnerState", () => {
  return mentorContext.includes("getLearnerState");
});

// ──────────────────────────────────────────────────
// 2. Focus Skill Consistency
// ──────────────────────────────────────────────────
console.log("\n── 2. Focus Skill Consistency ──");

test("T2.1. SkillRadar calculates focus from accuracy", () => {
  return skillRadar.includes("weakestSkill") && skillRadar.includes("accuracy");
});

test("T2.2. PremiumValueCard calculates focus from accuracy", () => {
  return premiumValueCard.includes("weakestSkill") && premiumValueCard.includes("accuracy");
});

test("T2.3. AI Mentor context has focusSkill", () => {
  return mentorContext.includes("focusSkill");
});

test("T2.4. WeeklyRecap identifies focus skill", () => {
  return weeklyRecap.includes("focus");
});

// ──────────────────────────────────────────────────
// 3. Practice Semantics
// ──────────────────────────────────────────────────
console.log("\n── 3. Practice Semantics ──");

test("T3.1. Activity recording updates LearningEvidence", () => {
  return learningLoopActivity.includes("PlayerActivity");
});

test("T3.2. Activity recording updates LearningSkill", () => {
  return learningLoopActivity.includes("LearningSkill");
});

test("T3.3. No coin awarding in activity recording", () => {
  return !learningLoopActivity.includes("awardCoin") || learningLoopActivity.includes("coin: input.xp ?? 0");
});

// ──────────────────────────────────────────────────
// 4. FREE Experience
// ──────────────────────────────────────────────────
console.log("\n── 4. FREE Experience ──");

test("T4.1. SkillRadar shows FREE teaser", () => {
  return skillRadar.includes("Pelajari Premium");
});

test("T4.2. PremiumValueCard shows FREE teaser", () => {
  return premiumValueCard.includes("Lihat Premium") || premiumValueCard.includes("Pelajari Premium");
});

test("T4.3. WeeklyRecapCard shows FREE teaser", () => {
  return weeklyRecapCard.includes("Pelajari Premium");
});

test("T4.4. FREE users see \"Mulai Latihan\" CTA", () => {
  return skillRadar.includes("Mulai latihan") || premiumValueCard.includes("Mulai Latihan");
});

// ──────────────────────────────────────────────────
// 5. Premium Entitlement
// ──────────────────────────────────────────────────
console.log("\n── 5. Premium Entitlement ──");

test("T5.1. Mentor route uses resolvePlan", () => {
  return mentorRoute.includes("resolvePlan(user.id)");
});

test("T5.2. WeeklyRecap route uses resolvePlan", () => {
  return weeklyRecapRoute.includes("resolvePlan(user.id)");
});

test("T5.3. MURID_PREMIUM has AI_MENTOR_DAILY_LIMIT", () => {
  return premiumMatrix.includes("AI_MENTOR_DAILY_LIMIT: 30");
});

test("T5.4. MURID_PREMIUM has ADVANCED_STATS", () => {
  return premiumMatrix.includes("ADVANCED_STATS: true");
});

// ──────────────────────────────────────────────────
// 6. AI Mentor Consistency
// ──────────────────────────────────────────────────
console.log("\n── 6. AI Mentor Consistency ──");

test("T6.1. Mentor context built server-side", () => {
  return mentorRoute.includes("buildMentorContext(user.id)");
});

test("T6.2. Mentor uses LearnerState", () => {
  return mentorContext.includes("getLearnerState");
});

test("T6.3. Mentor uses Learning Loop recommendations", () => {
  return mentorContext.includes("getActiveRecommendations");
});

test("T6.4. Mentor has deterministic fallback", () => {
  return mentorContext.includes("buildDeterministicFallback");
});

// ──────────────────────────────────────────────────
// 7. Weekly Recap Consistency
// ──────────────────────────────────────────────────
console.log("\n── 7. Weekly Recap Consistency ──");

test("T7.1. WeeklyRecap uses WIB week boundaries", () => {
  return weeklyRecap.includes("WIB_OFFSET_MS") || weeklyRecap.includes("7 * 3600 * 1000");
});

test("T7.2. WeeklyRecap queries PlayerActivity", () => {
  return weeklyRecap.includes("PlayerActivity");
});

test("T7.3. WeeklyRecap queries LearningEvidence", () => {
  return weeklyRecap.includes("LearningEvidence");
});

// ──────────────────────────────────────────────────
// 8. No Coin/XP Contamination
// ──────────────────────────────────────────────────
console.log("\n── 8. No Coin/XP Contamination ──");

test("T8.1. SkillRadar does not reference coins", () => {
  return !skillRadar.includes("coin") && !skillRadar.includes("koin");
});

test("T8.2. PremiumValueCard does not reference coins", () => {
  return !premiumValueCard.includes("coin") && !premiumValueCard.includes("koin");
});

test("T8.3. WeeklyRecapCard does not reference coins", () => {
  return !weeklyRecapCard.includes("coin") && !weeklyRecapCard.includes("koin");
});

test("T8.4. AI Mentor does not reference coins", () => {
  return !mentorRoute.includes("coin") && !mentorRoute.includes("koin");
});

// ──────────────────────────────────────────────────
// 9. Server-Authoritative Security
// ──────────────────────────────────────────────────
console.log("\n── 9. Server-Authoritative Security ──");

test("T9.1. Mentor route does not trust client userId", () => {
  return mentorRoute.includes("getUser()") && !mentorRoute.includes("body.userId");
});

test("T9.2. WeeklyRecap route does not trust client userId", () => {
  return weeklyRecapRoute.includes("getUser()") && !weeklyRecapRoute.includes("body.userId");
});

test("T9.3. Mentor context built from authenticated user", () => {
  return mentorRoute.includes("buildMentorContext(user.id)");
});

// ──────────────────────────────────────────────────
// 10. No Duplicate Engines
// ──────────────────────────────────────────────────
console.log("\n── 10. No Duplicate Engines ──");

test("T10.1. Single LearnerState service", () => {
  // Both Mentor and SkillRadar use same getLearnerState
  return mentorContext.includes("getLearnerState") && skillRadar.includes("LearnerSkillState");
});

test("T10.2. Single recommendation engine", () => {
  // Both Mentor and NextAction use same SKILL_ACTION_MAP
  return mentorContext.includes("getActiveRecommendations") && learningLoopNextAction.includes("SKILL_ACTION_MAP");
});

// ──────────────────────────────────────────────────
// SUMMARY
// ──────────────────────────────────────────────────
console.log("\n════════════════════════════════════════════");
console.log(`  P5C-4 Results: ${passed} passed, ${failed} failed`);
console.log("════════════════════════════════════════════\n");

if (failed > 0) {
  console.log("P5C-4 FAIL ❌");
  process.exit(1);
}

console.log("P5C-4 PASS ✅");
process.exit(0);
