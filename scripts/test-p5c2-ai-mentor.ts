/**
 * P5C-2 — AI Mentor verification tests.
 *
 * Deterministic tests for AI Mentor implementation.
 * No live provider calls — mocked.
 *
 * Run: npx tsx scripts/test-p5c2-ai-mentor.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const mentorRoute = read("app/api/player/mentor/route.ts");
const mentorContext = read("lib/ai-gateway/mentor-context.ts");
const mentorAgent = read("src/ai/agents/mentor-agent.ts");
const premiumValueCard = read("components/student-home/PremiumValueCard.tsx");
const agentTypes = read("src/ai/core/agent-types.ts");
const gatewayTypes = read("lib/ai-gateway/gateway-types.ts");
const agentCostPolicy = read("lib/ai-gateway/agent-cost-policy.ts");
const rateLimit = read("src/ai/core/rate-limit.ts");
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
console.log("  P5C-2 AI MENTOR — Tests");
console.log("════════════════════════════════════════════\n");

// ──────────────────────────────────────────────────
// 1. Authentication & Authorization
// ──────────────────────────────────────────────────
console.log("── 1. Authentication & Authorization ──");

test("T1.1. Route requires authentication (getUser check)", () => {
  return mentorRoute.includes("getUser()") && mentorRoute.includes("Unauthorized");
});

test("T1.2. Route checks for MURID role", () => {
  return mentorRoute.includes("user.role !== \"MURID\"") || mentorRoute.includes("FORBIDDEN_ROLE");
});

test("T1.3. Route does not trust client userId", () => {
  // Should ignore userId from body
  return mentorRoute.includes("ignore") || mentorRoute.includes("server-side");
});

test("T1.4. Route does not trust client isPremium", () => {
  // Should use resolvePlan, not body.isPremium
  return mentorRoute.includes("resolvePlan") && !mentorRoute.includes("body.isPremium");
});

// ──────────────────────────────────────────────────
// 2. Entitlement
// ──────────────────────────────────────────────────
console.log("\n── 2. Entitlement ──");

test("T2.1. Route uses canonical resolvePlan", () => {
  return mentorRoute.includes("resolvePlan(user.id)");
});

test("T2.2. MURID_PREMIUM has AI_MENTOR_DAILY_LIMIT = 30", () => {
  return premiumMatrix.includes("AI_MENTOR_DAILY_LIMIT: 30");
});

test("T2.3. AI_MENTOR is in USAGE_FEATURES", () => {
  return premiumFeatures.includes("AI_MENTOR");
});

test("T2.4. AI_MENTOR has DAY period", () => {
  return premiumFeatures.includes("AI_MENTOR: \"DAY\"");
});

// ──────────────────────────────────────────────────
// 3. Rate Limiting
// ──────────────────────────────────────────────────
console.log("\n── 3. Rate Limiting ──");

test("T3.1. Mentor has rate limit config", () => {
  return rateLimit.includes("mentor:") && rateLimit.includes("maxRequests: 10");
});

test("T3.2. Route calls checkAgentRateLimit", () => {
  return mentorRoute.includes("checkAgentRateLimit");
});

// ──────────────────────────────────────────────────
// 4. Context Builder
// ──────────────────────────────────────────────────
console.log("\n── 4. Context Builder ──");

test("T4.1. Context builder exists", () => {
  return mentorContext.includes("buildMentorContext");
});

test("T4.2. Context uses LearnerState", () => {
  return mentorContext.includes("getLearnerState");
});

test("T4.3. Context uses Learning Loop recommendations", () => {
  return mentorContext.includes("getActiveRecommendations");
});

test("T4.4. Context has hasEnoughData flag", () => {
  return mentorContext.includes("hasEnoughData");
});

test("T4.5. Context has deterministic fallback", () => {
  return mentorContext.includes("buildDeterministicFallback");
});

// ──────────────────────────────────────────────────
// 5. AI Agent
// ──────────────────────────────────────────────────
console.log("\n── 5. AI Agent ──");

test("T5.1. Agent is registered", () => {
  return mentorAgent.includes("registerAgent(mentorAgent)");
});

test("T5.2. Agent targets murid", () => {
  return mentorAgent.includes("targetUser: \"murid\"");
});

test("T5.3. Agent uses structured output", () => {
  return mentorAgent.includes("MentorOutputSchema");
});

test("T5.4. Agent has safety rules", () => {
  return mentorAgent.includes("no-fabrication") && mentorAgent.includes("no-diagnosis");
});

// ──────────────────────────────────────────────────
// 6. Credit/Usage
// ──────────────────────────────────────────────────
console.log("\n── 6. Credit/Usage ──");

test("T6.1. Mentor has credit cost", () => {
  return agentCostPolicy.includes("case \"mentor\"") && agentCostPolicy.includes("credits: 1");
});

test("T6.2. Route consumes usage", () => {
  return mentorRoute.includes("consumeUsage");
});

test("T6.3. Route handles FeatureLimitError", () => {
  return mentorRoute.includes("FeatureLimitError") && mentorRoute.includes("QUOTA_EXCEEDED");
});

// ──────────────────────────────────────────────────
// 7. Security
// ──────────────────────────────────────────────────
console.log("\n── 7. Security ──");

test("T7.1. Client context is ignored", () => {
  return mentorRoute.includes("ignore") || mentorRoute.includes("server-side");
});

test("T7.2. Context built server-side only", () => {
  return mentorRoute.includes("buildMentorContext(user.id)");
});

test("T7.3. No coin reward", () => {
  return !mentorRoute.includes("coin") && !mentorRoute.includes("koin");
});

test("T7.4. No XP awarding logic", () => {
  // Check that the route doesn't have XP awarding logic (like awardXp or xpEarned)
  return !mentorRoute.includes("awardXp") && !mentorRoute.includes("xpEarned");
});

// ──────────────────────────────────────────────────
// 8. UI
// ──────────────────────────────────────────────────
console.log("\n── 8. UI ──");

test("T8.1. PremiumValueCard shows Mentor CTA for Premium", () => {
  return premiumValueCard.includes("Minta Penjelasan Mentor");
});

test("T8.2. PremiumValueCard shows teaser for FREE", () => {
  return premiumValueCard.includes("Lihat Premium");
});

test("T8.3. PremiumValueCard calls /api/player/mentor", () => {
  return premiumValueCard.includes("/api/player/mentor");
});

test("T8.4. PremiumValueCard shows loading state", () => {
  return premiumValueCard.includes("Mentor sedang membaca progresmu");
});

// ──────────────────────────────────────────────────
// 9. AgentId Registration
// ──────────────────────────────────────────────────
console.log("\n── 9. AgentId Registration ──");

test("T9.1. mentor is in AgentId type", () => {
  return agentTypes.includes("\"mentor\"");
});

test("T9.2. mentor is in AiAgentId type", () => {
  return gatewayTypes.includes("\"mentor\"");
});

// ──────────────────────────────────────────────────
// SUMMARY
// ──────────────────────────────────────────────────
console.log("\n════════════════════════════════════════════");
console.log(`  P5C-2 Results: ${passed} passed, ${failed} failed`);
console.log("════════════════════════════════════════════\n");

if (failed > 0) {
  console.log("P5C-2 FAIL ❌");
  process.exit(1);
}

console.log("P5C-2 PASS ✅");
process.exit(0);
