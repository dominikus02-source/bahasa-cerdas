/**
 * AUTH CONCURRENCY VERIFICATION — Production Login Burst Test
 *
 * Tests concurrent login requests against the live production endpoint.
 * Uses existing loadtest accounts or creates fresh ones via Supabase admin.
 *
 * SAFETY:
 * - Only uses dedicated test accounts (loadtest_* pattern)
 * - Per-email rate limit respected (each email used at most once per test)
 * - No real user accounts touched
 * - No passwords/tokens logged
 *
 * Usage:
 *   npx tsx scripts/test-login-concurrency.ts
 *   npx tsx scripts/test-login-concurrency.ts --levels=10,20,30
 */

const BASE_URL = process.env.TEST_URL || "https://www.bahasacerdas.com";
const LOGIN_ENDPOINT = `${BASE_URL}/api/auth/login`;

// Parse custom levels from CLI
const levelsArg = process.argv.find((a) => a.startsWith("--levels="));
const LEVELS = levelsArg
  ? levelsArg.split("=")[1].split(",").map(Number)
  : [10, 20, 30, 50, 75, 100];

// Test account pattern — these use the Supabase admin-created accounts
// from seed-load-test-data.ts. Password: LoadTest123!
const EMAIL_DOMAIN = "loadtest.bahasacerdas.com";
const PASSWORD = "LoadTest123!";

interface TestResult {
  level: number;
  results: {
    status: number;
    classification: string;
    latencyMs: number;
    body?: string;
  }[];
}

function classify(status: number, body: string): string {
  if (status === 200) return "SUCCESS";
  if (status === 429) return "RATE_LIMITED";
  if (status === 401 || status === 403) return "INVALID_CREDENTIAL";
  if (status >= 500) return "SERVER_ERROR";
  if (body.includes("fetch") || body.includes("ECONNREFUSED")) return "NETWORK_ERROR";
  return "UNKNOWN";
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function singleLogin(email: string, index: number): Promise<TestResult["results"][0]> {
  const start = Date.now();
  try {
    const res = await fetch(LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    const latencyMs = Date.now() - start;
    const text = await res.text();
    return { status: res.status, classification: classify(res.status, text), latencyMs, body: text.slice(0, 200) };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return { status: 0, classification: "NETWORK_ERROR", latencyMs, body: err?.message || "unknown" };
  }
}

async function runConcurrencyTest(level: number): Promise<TestResult> {
  // Generate unique emails for this level (each email used once = no per-email RL hit)
  const emails = Array.from({ length: level }, (_, i) =>
    `loadtest_murid_${String(i + 1).padStart(4, "0")}@${EMAIL_DOMAIN}`
  );

  // Small random jitter (0-200ms) to avoid artificial synchronization
  const tasks = emails.map((email, i) =>
    new Promise<TestResult["results"][0]>((resolve) => {
      const jitter = Math.random() * 200;
      setTimeout(() => singleLogin(email, i).then(resolve), jitter);
    })
  );

  const results = await Promise.all(tasks);
  return { level, results };
}

function printReport(test: TestResult) {
  const { level, results } = test;
  const successes = results.filter((r) => r.classification === "SUCCESS");
  const rateLimited = results.filter((r) => r.classification === "RATE_LIMITED");
  const invalidCreds = results.filter((r) => r.classification === "INVALID_CREDENTIAL");
  const serverErrors = results.filter((r) => r.classification === "SERVER_ERROR");
  const networkErrors = results.filter((r) => r.classification === "NETWORK_ERROR");
  const unknown = results.filter((r) => r.classification === "UNKNOWN");

  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const maxLat = latencies[latencies.length - 1];

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  CONCURRENCY: ${level}`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  SUCCESS:           ${successes.length}/${level} (${((successes.length / level) * 100).toFixed(1)}%)`);
  console.log(`  RATE_LIMITED(429): ${rateLimited.length}/${level}`);
  console.log(`  INVALID_CREDS:     ${invalidCreds.length}/${level}`);
  console.log(`  SERVER_ERROR(5xx): ${serverErrors.length}/${level}`);
  console.log(`  NETWORK_ERROR:     ${networkErrors.length}/${level}`);
  console.log(`  UNKNOWN:           ${unknown.length}/${level}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Latency p50:       ${p50}ms`);
  console.log(`  Latency p95:       ${p95}ms`);
  console.log(`  Latency p99:       ${p99}ms`);
  console.log(`  Latency max:       ${maxLat}ms`);

  // Show sample failures
  const failures = results.filter((r) => r.classification !== "SUCCESS" && r.classification !== "INVALID_CREDENTIAL");
  if (failures.length > 0) {
    console.log(`  ─────────────────────────────────────`);
    console.log(`  Sample failures (first 3):`);
    failures.slice(0, 3).forEach((f, i) => {
      console.log(`    ${i + 1}. status=${f.status} class=${f.classification} latency=${f.latencyMs}ms body="${f.body?.slice(0, 100)}"`);
    });
  }
}

async function main() {
  console.log("═".repeat(60));
  console.log("  AUTH CONCURRENCY VERIFICATION");
  console.log(`  Target: ${LOGIN_ENDPOINT}`);
  console.log(`  Levels: ${LEVELS.join(", ")}`);
  console.log(`${"═".repeat(60)}`);

  // Quick connectivity check
  console.log("\n── Connectivity check ──");
  try {
    const res = await fetch(LOGIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent@test.com", password: "test" }),
    });
    console.log(`  Endpoint reachable: HTTP ${res.status}`);
    if (res.status === 404) {
      console.error("  ❌ Endpoint not found. Check URL.");
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`  ❌ Cannot reach endpoint: ${err.message}`);
    process.exit(1);
  }

  const allResults: TestResult[] = [];

  for (const level of LEVELS) {
    console.log(`\n── Running ${level} concurrent logins ──`);
    const test = await runConcurrencyTest(level);
    printReport(test);
    allResults.push(test);

    // Cooldown between levels (wait 5s to let rate limits reset)
    if (LEVELS.indexOf(level) < LEVELS.length - 1) {
      console.log(`\n  ⏳ Cooling down 5s before next level...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  // Summary table
  console.log(`\n${"═".repeat(80)}`);
  console.log("  SUMMARY TABLE");
  console.log(`${"═".repeat(80)}`);
  console.log(`  ${"Level".padEnd(8)} ${"Success".padEnd(10)} ${"429".padEnd(8)} ${"5xx".padEnd(8)} ${"Other".padEnd(8)} ${"p50".padEnd(10)} ${"p95".padEnd(10)} ${"p99".padEnd(10)}`);
  console.log(`  ${"─".repeat(72)}`);

  for (const test of allResults) {
    const s = test.results.filter((r) => r.classification === "SUCCESS").length;
    const rl = test.results.filter((r) => r.classification === "RATE_LIMITED").length;
    const se = test.results.filter((r) => r.classification === "SERVER_ERROR").length;
    const other = test.results.length - s - rl - se;
    const latencies = test.results.map((r) => r.latencyMs).sort((a, b) => a - b);
    const p50 = percentile(latencies, 50);
    const p95 = percentile(latencies, 95);
    const p99 = percentile(latencies, 99);

    console.log(
      `  ${String(test.level).padEnd(8)} ${String(s).padEnd(10)} ${String(rl).padEnd(8)} ${String(se).padEnd(8)} ${String(other).padEnd(8)} ${(p50 + "ms").padEnd(10)} ${(p95 + "ms").padEnd(10)} ${(p99 + "ms").padEnd(10)}`
    );
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log("  DONE");
  console.log(`${"═".repeat(80)}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
