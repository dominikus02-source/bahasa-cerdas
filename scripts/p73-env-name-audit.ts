/**
 * BC Agent P7.3 Phase 5 — environment variable NAME audit.
 * Reads .env.local and prints variable NAMES only, bucketed by requirement.
 * Never prints or writes any value. Exit 0 always (audit-only).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const file = join(root, ".env.local");
const names = new Set<string>();

if (existsSync(file)) {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (m) names.add(m[1]);
  }
}

const buckets: Array<{ label: string; vars: string[] }> = [
  { label: "DB connectivity (worker + web)", vars: ["DATABASE_URL", "DIRECT_URL"] },
  { label: "AI planning keys (P3; missing => WAITING_INTELLIGENCE)", vars: ["DEEPSEEK_API_KEY", "GROQ_API_KEY", "GEMINI_API_KEY"] },
  { label: "Worker tuning (optional)", vars: ["BC_AGENT_POLL_MS", "BC_AGENT_CONCURRENCY", "BC_AGENT_VERSION", "BC_AGENT_REPO_ROOT"] },
  { label: "Auth tokens (optional; dormant when unset)", vars: ["BC_AGENT_SWEEPER_SECRET", "BC_AGENT_HEALTH_TOKEN"] },
];

for (const b of buckets) {
  console.log(`\n[${b.label}]`);
  for (const v of b.vars) {
    console.log(`  ${names.has(v) ? "SET    " : "MISSING"} ${v}`);
  }
}

const extra = [...names].filter((n) => n.startsWith("BC_AGENT") && !buckets.some((b) => b.vars.includes(n)));
if (extra.length) {
  console.log(`\n[Other BC_AGENT* names present] ${extra.join(", ")}`);
}
console.log("\n(name-only audit complete; no values printed)");
