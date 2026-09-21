/**
 * KOTA SUMMARY REGRESSION (8B.1) — source-level guard.
 *
 * Final Kota state must derive lit milestones from actual progress
 * thresholds (25/50/75/100). Passing a hardcoded empty list hides
 * achieved milestones after refresh/summary.
 * Run: npx tsx scripts/test-main-bersama-kota-summary.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${detail}`); }
}

const pj = readFileSync(
  join(ROOT, "components/main-bersama/projector/projector-client.tsx"), "utf8",
);
check(
  "summary never hardcodes empty unlocked list",
  !pj.includes("unlockedMilestones={[]}"),
);
check(
  "summary derives lit state from thresholds",
  pj.includes("[25, 50, 75, 100]"),
);
check(
  "KotaScene receives derived unlocked list",
  /<KotaScene unlocked=\{finalUnlocked\}/.test(pj),
);

console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
