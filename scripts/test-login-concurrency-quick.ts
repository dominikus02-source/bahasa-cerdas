/**
 * AUTH CONCURRENCY — Quick Production Test
 *
 * Uses the 2 existing demo accounts to test concurrent login behavior.
 * The goal is NOT to test 100 unique accounts — it's to determine whether
 * Supabase Auth rate-limits from Vercel's egress IP.
 *
 * Key metric: if 10 concurrent logins with the SAME email cause 429,
 * then Vercel's single egress IP IS the bottleneck.
 *
 * If they succeed, we know the Vercel IP has headroom.
 *
 * Usage: npx tsx scripts/test-login-concurrency-quick.ts
 */

const LOGIN_URL = "https://www.bahasacerdas.com/api/auth/login";

const ACCOUNTS = [
  { email: "murid@demo.com", password: "murid123" },
  { email: "guru@demo.com", password: "guru123" },
];

interface Result {
  accountIdx: number;
  status: number;
  classification: string;
  latencyMs: number;
  bodySnippet: string;
}

function classify(status: number, body: string): string {
  if (status === 200) return "SUCCESS";
  if (status === 429) return "RATE_LIMITED";
  if (body.includes("salah") || body.includes("Invalid") || status === 400) return "INVALID_CREDENTIAL";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN";
}

async function login(email: string, password: string, accountIdx: number): Promise<Result> {
  const start = Date.now();
  try {
    const res = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const latencyMs = Date.now() - start;
    const text = await res.text();
    return {
      accountIdx,
      status: res.status,
      classification: classify(res.status, text),
      latencyMs,
      bodySnippet: text.slice(0, 120),
    };
  } catch (err: any) {
    return {
      accountIdx,
      status: 0,
      classification: "NETWORK_ERROR",
      latencyMs: Date.now() - start,
      bodySnippet: err?.message || "unknown",
    };
  }
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.ceil((p / 100) * sorted.length) - 1] || 0;
}

async function runBurst(concurrency: number, label: string): Promise<void> {
  console.log(`\n── ${label} (${concurrency} concurrent) ──`);

  // Rotate accounts to respect per-email limit (10/10min)
  // Each email gets at most ceil(concurrency/2) requests
  const tasks = Array.from({ length: concurrency }, (_, i) => {
    const acct = ACCOUNTS[i % ACCOUNTS.length];
    // Tiny jitter (0-50ms) to avoid TCP synchronization
    const jitter = Math.random() * 50;
    return new Promise<Result>((resolve) =>
      setTimeout(() => login(acct.email, acct.password, i % ACCOUNTS.length).then(resolve), jitter)
    );
  });

  const results = await Promise.all(tasks);
  const successes = results.filter((r) => r.classification === "SUCCESS");
  const rateLimited = results.filter((r) => r.classification === "RATE_LIMITED");
  const invalidCreds = results.filter((r) => r.classification === "INVALID_CREDENTIAL");
  const serverErrors = results.filter((r) => r.classification === "SERVER_ERROR");
  const other = results.filter((r) => r.classification === "UNKNOWN" || r.classification === "NETWORK_ERROR");

  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);

  console.log(`  SUCCESS:           ${successes.length}/${concurrency}`);
  console.log(`  RATE_LIMITED(429): ${rateLimited.length}/${concurrency}`);
  console.log(`  INVALID_CREDS:     ${invalidCreds.length}/${concurrency}`);
  console.log(`  SERVER_ERROR:      ${serverErrors.length}/${concurrency}`);
  console.log(`  OTHER:             ${other.length}/${concurrency}`);
  console.log(`  p50=${percentile(latencies, 50)}ms  p95=${percentile(latencies, 95)}ms  p99=${percentile(latencies, 99)}ms  max=${latencies[latencies.length - 1]}ms`);

  // Show first few failures
  const failures = results.filter((r) => r.classification !== "SUCCESS");
  if (failures.length > 0) {
    console.log(`  Failures (first 5):`);
    failures.slice(0, 5).forEach((f, i) => {
      console.log(`    ${i + 1}. [acct${f.accountIdx}] HTTP ${f.status} ${f.classification} ${f.latencyMs}ms — ${f.bodySnippet}`);
    });
  }
}

async function main() {
  console.log("══════════════════════════════════════════════════════════");
  console.log("  AUTH CONCURRENCY — QUICK PRODUCTION TEST");
  console.log(`  Target: ${LOGIN_URL}`);
  console.log("  Accounts: murid@demo.com, guru@demo.com");
  console.log("══════════════════════════════════════════════════════════");

  // Verify connectivity
  console.log("\n── Connectivity check ──");
  const check = await login(ACCOUNTS[0].email, ACCOUNTS[0].password, 0);
  console.log(`  First login: HTTP ${check.status} ${check.classification} ${check.latencyMs}ms`);
  if (check.status !== 200) {
    console.error("  ❌ Demo account login failed. Check credentials.");
    process.exit(1);
  }

  // Wait for rate limit bucket to refill
  console.log("  ⏳ Waiting 30s for rate limit bucket to settle...");
  await new Promise((r) => setTimeout(r, 30000));

  // Run bursts at different concurrency levels
  const levels = [5, 10, 15, 20, 30, 50];
  for (const level of levels) {
    await runBurst(level, `Burst ${level}`);
    // Cooldown between bursts
    if (levels.indexOf(level) < levels.length - 1) {
      console.log("  ⏳ Cooling down 15s...");
      await new Promise((r) => setTimeout(r, 15000));
    }
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  DONE — Analysis in report below");
  console.log("══════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
