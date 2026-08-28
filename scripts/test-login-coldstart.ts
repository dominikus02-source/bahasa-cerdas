/**
 * AUTH COLD-START DIAGNOSTIC
 *
 * Measures login endpoint behavior during cold start vs warm state.
 * Does NOT modify production code.
 *
 * Usage:
 *   npx tsx scripts/test-login-coldstart.ts
 *   npx tsx scripts/test-login-coldstart.ts --rounds=5
 */

const LOGIN_URL = "https://www.bahasacerdas.com/api/auth/login";
const ACCOUNT = { email: "murid@demo.com", password: "murid123" };
const ROUNDS = Number(process.argv.find((a) => a.startsWith("--rounds="))?.split("=")[1]) || 5;

interface TimingResult {
  round: number;
  coldOrWarm: "COLD" | "WARM";
  httpStatus: number;
  latencyMs: number;
  bodySnippet: string;
  classification: string;
}

function classify(status: number, body: string): string {
  if (status === 200) return "SUCCESS";
  if (status === 429) return "RATE_LIMITED";
  if (status === 401 || status === 400) return "INVALID_CREDENTIAL";
  if (status >= 500) return "SERVER_ERROR";
  return "NETWORK_ERROR";
}

async function measureLogin(round: number, coldOrWarm: "COLD" | "WARM"): Promise<TimingResult> {
  const start = performance.now();
  try {
    const res = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ACCOUNT),
      signal: AbortSignal.timeout(30000),
    });
    const latencyMs = Math.round(performance.now() - start);
    const text = await res.text();
    return {
      round,
      coldOrWarm,
      httpStatus: res.status,
      latencyMs,
      bodySnippet: text.slice(0, 80),
      classification: classify(res.status, text),
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      round,
      coldOrWarm,
      httpStatus: 0,
      latencyMs,
      bodySnippet: err?.message?.slice(0, 80) || "unknown",
      classification: "NETWORK_ERROR",
    };
  }
}

async function main() {
  console.log("══════════════════════════════════════════════════════════");
  console.log("  AUTH COLD-START DIAGNOSTIC");
  console.log(`  Target: ${LOGIN_URL}`);
  console.log(`  Rounds: ${ROUNDS}`);
  console.log("══════════════════════════════════════════════════════════");

  // Phase 1: Cold request (first request after long idle)
  console.log("\n── Phase 1: COLD START (first request after idle) ──");
  const coldResult = await measureLogin(1, "COLD");
  console.log(`  HTTP ${coldResult.httpStatus} ${coldResult.classification} ${coldResult.latencyMs}ms`);
  console.log(`  Body: ${coldResult.bodySnippet}`);

  // Phase 2: Warm requests (consecutive, no idle)
  console.log("\n── Phase 2: WARM REQUESTS (consecutive) ──");
  const warmResults: TimingResult[] = [];
  for (let i = 1; i <= ROUNDS; i++) {
    const r = await measureLogin(i, "WARM");
    warmResults.push(r);
    console.log(`  Round ${i}: HTTP ${r.httpStatus} ${r.classification} ${r.latencyMs}ms`);
  }

  // Phase 3: Concurrent burst (simulate school)
  console.log("\n── Phase 3: CONCURRENT BURST (10 simultaneous) ──");
  const burstStart = performance.now();
  const burstTasks = Array.from({ length: 10 }, (_, i) => measureLogin(i + 1, "WARM"));
  const burstResults = await Promise.all(burstTasks);
  const burstTotal = Math.round(performance.now() - burstStart);
  const successes = burstResults.filter((r) => r.classification === "SUCCESS").length;
  const rateLimited = burstResults.filter((r) => r.classification === "RATE_LIMITED").length;
  const networkErrors = burstResults.filter((r) => r.classification === "NETWORK_ERROR").length;
  console.log(`  Total wall time: ${burstTotal}ms`);
  console.log(`  SUCCESS: ${successes}/10  RATE_LIMITED: ${rateLimited}/10  NETWORK_ERROR: ${networkErrors}/10`);
  burstResults.forEach((r) => console.log(`    HTTP ${r.httpStatus} ${r.classification} ${r.latencyMs}ms`));

  // Summary
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("══════════════════════════════════════════════════════════");
  console.log(`  Cold start:    ${coldResult.latencyMs}ms (${coldResult.classification})`);
  const warmLatencies = warmResults.map((r) => r.latencyMs);
  const avgWarm = Math.round(warmLatencies.reduce((a, b) => a + b, 0) / warmLatencies.length);
  const maxWarm = Math.max(...warmLatencies);
  const minWarm = Math.min(...warmLatencies);
  console.log(`  Warm avg:      ${avgWarm}ms`);
  console.log(`  Warm min/max:  ${minWarm}ms / ${maxWarm}ms`);
  console.log(`  Burst wall:    ${burstTotal}ms`);
  console.log(`  Cold/Warm ratio: ${(coldResult.latencyMs / avgWarm).toFixed(1)}x`);
  console.log("══════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
