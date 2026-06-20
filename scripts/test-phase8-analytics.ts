/**
 * Phase 8B — Analytics QA & Data Integrity Tests
 *
 * Tests the AI Analytics admin API for:
 * - Response shape and required fields
 * - No sensitive data exposure
 * - Feature/agent mapping accuracy
 * - Null provider handling
 * - Null token/cost handling
 * - Empty data handling
 * - Date range validation
 * - Export event recognition
 * - Saved result metadata safety
 *
 * Usage:
 *   npx tsx scripts/test-phase8-analytics.ts [--base-url URL]
 *
 * Default base URL: http://localhost:3000
 * Requires a running dev server and a valid admin auth session.
 */

const BASE_URL = process.argv.find(a => a.startsWith("--base-url="))?.split("=")[1] || "http://localhost:3000";
const RANGE = "7d";

interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: TestResult[] = [];
let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void>): Promise<void> {
  return fn()
    .then(() => {
      results.push({ name, passed: true });
      passed++;
      console.log(`  ✅ ${name}`);
    })
    .catch((err: Error) => {
      results.push({ name, passed: false, detail: err.message });
      failed++;
      console.log(`  ❌ ${name}: ${err.message}`);
    });
}

async function fetchAPI(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  return { status: res.status, json };
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function main() {
  console.log(`\n🔍 Phase 8B Analytics QA Tests\n`);
  console.log(`Base URL: ${BASE_URL}\n`);

  // ── 1. API response shape ──────────────────────────────────
  await test("API returns success with data shape", async () => {
    const { status, json } = await fetchAPI(`/api/admin/ai-analytics?range=${RANGE}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(json.success === true, "Expected success: true");
    assert(json.data, "Expected data object");
    assert(typeof json.data.overview === "object", "Expected overview object");
    assert(Array.isArray(json.data.agentUsage), "Expected agentUsage array");
    assert(Array.isArray(json.data.providerUsage), "Expected providerUsage array");
    assert(Array.isArray(json.data.dailyUsage), "Expected dailyUsage array");
    assert(Array.isArray(json.data.topUsers), "Expected topUsers array");
    assert(Array.isArray(json.data.errors), "Expected errors array");
    assert(Array.isArray(json.data.notes), "Expected notes array");
    assert(Array.isArray(json.data.savedResultsByAgent), "Expected savedResultsByAgent array");
    assert(Array.isArray(json.data.recentSavedResults), "Expected recentSavedResults array");
  });

  // ── 2. No sensitive fields in response ─────────────────────
  await test("No sensitive fields in response", async () => {
    const { json } = await fetchAPI(`/api/admin/ai-analytics?range=${RANGE}`);

    // Check overview
    const overviewKeys = Object.keys(json.data.overview);
    const forbidden = ["prompt", "output", "editableText", "inputJson", "outputJson", "systemPrompt", "apiKey", "secret"];
    for (const key of forbidden) {
      assert(!overviewKeys.some(k => k.toLowerCase().includes(key)), `Overview should not contain '${key}'`);
    }

    // Check recent saved results — only safe fields
    for (const r of json.data.recentSavedResults) {
      assert(!("inputJson" in r), "recentSavedResult should not include inputJson");
      assert(!("outputJson" in r), "recentSavedResult should not include outputJson");
      assert(!("editableText" in r), "recentSavedResult should not include editableText");
      assert("id" in r, "recentSavedResult should include id");
      assert("title" in r, "recentSavedResult should include title");
      assert("agentId" in r, "recentSavedResult should include agentId");
    }
  });

  // ── 3. Feature/agent mapping ────────────────────────────────
  await test("Agent usage entries have correct labels", async () => {
    const { json } = await fetchAPI(`/api/admin/ai-analytics?range=${RANGE}`);
    const labels = ["RPP", "Soal", "PPT", "Review", "BC Asst", "EYD", "Feedback", "Nilai", "Analisis"];

    for (const entry of json.data.agentUsage) {
      // Each entry should have one of the known labels
      assert(labels.includes(entry.label), `Unknown agent label: ${entry.label}`);
      assert(typeof entry.totalRequests === "number", `totalRequests should be a number for ${entry.label}`);
      assert(typeof entry.success === "number", `success should be a number for ${entry.label}`);
      assert(typeof entry.failed === "number", `failed should be a number for ${entry.label}`);
      if (entry.avgLatency !== null) {
        assert(typeof entry.avgLatency === "number", `avgLatency should be number or null for ${entry.label}`);
      }
    }
  });

  // ── 4. Null provider handling ──────────────────────────────
  await test("Null provider does not crash response", async () => {
    const { json } = await fetchAPI(`/api/admin/ai-analytics?range=${RANGE}`);
    // Should have providerUsage array (possibly empty)
    assert(Array.isArray(json.data.providerUsage), "providerUsage should be an array");
    for (const p of json.data.providerUsage) {
      assert(typeof p.provider === "string", "provider name should be a string");
      assert(typeof p.totalRequests === "number", "totalRequests should be a number for provider");
    }
  });

  // ── 5. Null token usage handling ───────────────────────────
  await test("Null token/cost handled safely", async () => {
    const { json } = await fetchAPI(`/api/admin/ai-analytics?range=${RANGE}`);
    const overview = json.data.overview;
    assert(typeof overview.totalTokens === "number", "totalTokens should be a number");
    assert(typeof overview.estimatedCost === "number", "estimatedCost should be a number");
    assert(overview.totalTokens >= 0, "totalTokens should be >= 0");
  });

  // ── 6. Empty data handling ─────────────────────────────────
  await test("Empty range does not crash", async () => {
    const { json } = await fetchAPI("/api/admin/ai-analytics?range=1d");
    // Should still return valid structure even if no data
    assert(json.success === true, "Expected success even for empty range");
    assert(Array.isArray(json.data.agentUsage), "agentUsage should be array even if empty");
    assert(Array.isArray(json.data.dailyUsage), "dailyUsage should be array even if empty");
    assert(Array.isArray(json.data.topUsers), "topUsers should be array even if empty");
  });

  // ── 7. Date range parameter validation ─────────────────────
  await test("Invalid range defaults gracefully", async () => {
    const { json } = await fetchAPI("/api/admin/ai-analytics?range=invalid");
    assert(json.success === true, "Invalid range should not throw 500");
    assert(json.data.overview, "Should still return overview even with invalid range");
  });

  await test("30d range works", async () => {
    const { json } = await fetchAPI("/api/admin/ai-analytics?range=30d");
    assert(json.success === true, "30d range should work");
  });

  await test("90d range works", async () => {
    const { json } = await fetchAPI("/api/admin/ai-analytics?range=90d");
    assert(json.success === true, "90d range should work");
  });

  // ── 8. Export event features recognized ────────────────────
  await test("Export events counted in overview", async () => {
    const { json } = await fetchAPI(`/api/admin/ai-analytics?range=${RANGE}`);
    assert(typeof json.data.overview.exportEvents === "number", "exportEvents should be a number");
    assert(json.data.overview.exportEvents >= 0, "exportEvents should be >= 0");
  });

  // ── 9. Auth guard ──────────────────────────────────────────
  await test("Unauthenticated request returns 403", async () => {
    const { status } = await fetchAPI(`/api/admin/ai-analytics?range=${RANGE}`, {
      headers: { Authorization: "Bearer invalid" },
    });
    // Without a valid session, supabase auth returns null → 403
    assert(status === 403, `Expected 403 for unauthenticated, got ${status}`);
  });

  // ── 10. Agent filter works ─────────────────────────────────
  await test("Agent filter parameter works", async () => {
    const { json } = await fetchAPI(`/api/admin/ai-analytics?range=${RANGE}&agentId=rpp`);
    assert(json.success === true, "Agent filter should work");
  });

  // ── 11. Provider filter works ──────────────────────────────
  await test("Provider filter parameter works", async () => {
    const { json } = await fetchAPI(`/api/admin/ai-analytics?range=${RANGE}&provider=deepseek`);
    assert(json.success === true, "Provider filter should work");
  });

  // ── 12. Overview fields are consistent ─────────────────────
  await test("Overview fields are internally consistent", async () => {
    const { json } = await fetchAPI(`/api/admin/ai-analytics?range=${RANGE}`);
    const o = json.data.overview;
    assert(o.totalRequests >= 0, "totalRequests should be >= 0");
    assert(o.successCount >= 0, "successCount should be >= 0");
    assert(o.failedCount >= 0, "failedCount should be >= 0");
    assert(o.successRate >= 0 && o.successRate <= 100, "successRate should be 0-100");
    assert(o.savedResults >= 0, "savedResults should be >= 0");
  });

  // ── Summary ────────────────────────────────────────────────
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${results.length} tests\n`);

  if (failed > 0) {
    console.log("Failed tests:");
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  ❌ ${r.name}: ${r.detail}`);
    }
    console.log("\n⚠️  Some tests failed. Review before proceeding.\n");
    process.exit(1);
  } else {
    console.log("✅ All tests passed!\n");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
