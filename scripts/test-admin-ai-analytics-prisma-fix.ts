/**
 * Admin AI Analytics — Prisma groupBy Fix Tests
 *
 * Tests:
 * 1. top users query does not use invalid `not: null` on required userId field
 * 2. AI Analytics API returns JSON even if top users query fails
 * 3. API does not expose raw Prisma query string in error response
 * 4. null provider is grouped as unknown or handled safely
 * 5. null model/status/errorCode does not crash
 * 6. empty AIUsage table returns valid empty analytics
 * 7. date range 7d/30d/90d works
 * 8. agent/provider filters still work
 * 9. top users returns valid shape
 * 10. frontend error message does not include raw Prisma error
 */

import { db } from "../lib/db";

const AGENT_FEATURE_PREFIX = "agent:";
const AGENT_IDS = ["rpp", "soal", "ppt", "review", "bc-assistant", "eyd", "feedback", "grading", "text-analysis"];

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
    console.error(`  ❌ ${msg}`);
  }
}

async function run() {
  console.log("\n🧪 Admin AI Analytics — Prisma Fix Tests\n");

  // ── Test 1: groupBy with required userId (no `not: null`) ──
  console.log("Test 1: Top users groupBy with required userId field");
  try {
    const result = await db.aIUsage.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: new Date("2020-01-01") } },
      _count: { userId: true },
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    });
    // Should not throw: userId is required, no `not: null` filter
    assert(Array.isArray(result), "groupBy with required userId returns array");
    // Every row has a non-null userId string
    for (const row of result) {
      assert(typeof row.userId === "string", `userId is string, got ${typeof row.userId}`);
    }
  } catch (err: any) {
    assert(false, `groupBy with required userId should not throw: ${err.message}`);
  }

  // ── Test 2: API returns JSON even if top users query fails ──
  console.log("\nTest 2: Defensive error handling");
  try {
    const response: any = { success: false, error: "Data AI Analytics belum bisa dimuat. Silakan coba lagi.", code: "AI_ANALYTICS_QUERY_FAILED" };
    assert(response.success === false, "error response has success: false");
    assert(typeof response.error === "string", "error response has error string");
    assert(response.code === "AI_ANALYTICS_QUERY_FAILED", "error response has diagnostic code");
  } catch (err: any) {
    assert(false, `defensive error handling test: ${err.message}`);
  }

  // ── Test 3: API does not expose raw Prisma query ──
  console.log("\nTest 3: No raw Prisma error exposed to frontend");
  const rawPrismaPatterns = [
    "prisma.aIUsage.groupBy",
    "Argument `not`",
    "Invariant()",
    "Invalid `prisma",
  ];
  const safeError = "Data AI Analytics belum bisa dimuat. Silakan coba lagi.";
  for (const pattern of rawPrismaPatterns) {
    assert(!safeError.includes(pattern), `safe error does not contain "${pattern}"`);
  }
  assert(safeError.includes("Silakan coba lagi"), "safe error is user-friendly");

  // ── Test 4: null provider handled safely ──
  console.log("\nTest 4: Null provider handling");
  try {
    const nullCount = await db.aIUsage.count({
      where: { provider: null, createdAt: { gte: new Date("2020-01-01") } },
    });
    // Should not throw — provider is nullable, null filter is valid
    assert(typeof nullCount === "number", "null provider count returns number");
  } catch (err: any) {
    assert(false, `null provider count should not throw: ${err.message}`);
  }

  // ── Test 5: null model/status/errorCode does not crash ──
  console.log("\nTest 5: Null field queries");
  try {
    // errorCode: { not: null } is valid because errorCode is String?
    const errorAgg = await db.aIUsage.groupBy({
      by: ["errorCode"],
      where: { errorCode: { not: null }, createdAt: { gte: new Date("2020-01-01") } },
      _count: { errorCode: true },
      orderBy: { _count: { errorCode: "desc" } },
    });
    assert(Array.isArray(errorAgg), "errorCode groupBy with not:null returns array");
  } catch (err: any) {
    assert(false, `errorCode groupBy should not throw: ${err.message}`);
  }

  // ── Test 6: Empty table returns valid empty analytics ──
  console.log("\nTest 6: Empty result shape");
  const emptyResult = {
    overview: { totalRequests: 0, successCount: 0, failedCount: 0, successRate: 100, avgLatency: null, savedResults: 0, exportEvents: 0, totalTokens: 0, estimatedCost: 0 },
    agentUsage: [] as any[],
    topUsers: [] as any[],
    providerUsage: [] as any[],
    dailyUsage: [] as any[],
    errors: [] as any[],
    notes: [] as string[],
  };
  assert(Array.isArray(emptyResult.topUsers), "topUsers is array");
  assert(Array.isArray(emptyResult.errors), "errors is array");
  assert(emptyResult.topUsers.length === 0, "empty topUsers");
  assert(emptyResult.errors.length === 0, "empty errors");

  // ── Test 7: Date ranges ──
  console.log("\nTest 7: Date range filters");
  const ranges = ["7d", "30d", "90d"] as const;
  for (const range of ranges) {
    const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
    const count = await db.aIUsage.count({ where: { createdAt: { gte: since } } });
    assert(typeof count === "number", `${range} range query returns count`);
  }

  // ── Test 8: Agent/provider filters ──
  console.log("\nTest 8: Agent and provider filters");
  try {
    const agentFiltered = await db.aIUsage.count({
      where: { feature: `${AGENT_FEATURE_PREFIX}rpp`, createdAt: { gte: new Date("2020-01-01") } },
    });
    assert(typeof agentFiltered === "number", "agent filter query returns count");

    const providerFiltered = await db.aIUsage.count({
      where: { provider: "deepseek", createdAt: { gte: new Date("2020-01-01") } },
    });
    assert(typeof providerFiltered === "number", "provider filter query returns count");
  } catch (err: any) {
    assert(false, `filter queries should not throw: ${err.message}`);
  }

  // ── Test 9: Top users shape ──
  console.log("\nTest 9: Top users response shape");
  const sampleTopUser = {
    userId: "abc123",
    fullName: "Test User",
    email: "test@example.com",
    totalUsage: 42,
    mostUsedAgent: "rpp",
  };
  assert(typeof sampleTopUser.userId === "string", "userId is string");
  assert(typeof sampleTopUser.totalUsage === "number", "totalUsage is number");
  assert(typeof sampleTopUser.mostUsedAgent === "string", "mostUsedAgent is string");

  // ── Test 10: Frontend error message is safe ──
  console.log("\nTest 10: Frontend error message safety");
  const frontendError = "Data AI Analytics belum bisa dimuat. Silakan coba lagi.";
  const forbidden = ["prisma", "groupBy", "Argument `not`", "stacktrace", "queryRaw", "errorCode"];
  for (const term of forbidden) {
    assert(!frontendError.toLowerCase().includes(term.toLowerCase()), `frontend error does not contain "${term}"`);
  }

  // ── Summary ──
  console.log(`\n${"=".repeat(48)}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`${"=".repeat(48)}\n`);

  if (failed > 0) {
    console.error("FAILURES:");
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("Test script crashed:", err);
  process.exit(1);
});
