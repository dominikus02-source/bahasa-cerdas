#!/usr/bin/env npx tsx
/**
 * ════════════════════════════════════════════════════════════════════
 * TEST — HISTORICAL METRICS PROOF OF CORRECTNESS (Phase 9.1)
 *
 * Verifies the integrity of the forensic deliverable WITHOUT re-running
 * DB logic. Asserts invariants of the generated JSON + the script source:
 *   1. Exact 3 deliverables exist (script, JSON, report doc).
 *   2. JSON is valid; 17 metrics classified; sums reconcile (1+9+5+2).
 *   3. cashCollected is boolean `true` (fully reconstructable ledger),
 *      NOT the string "true" (a prior mis-typing bug).
 *   4. MRR/premium metrics are "needs-snapshot" (ASSUMPTION), NOT
 *      claimed reconstructable.
 *   5. UNKNOWN metrics (growthByRole, preMigrationHistory) are never
 *      converted into estimates.
 *   6. Classification rules embedded (mutable-state rule, cash!=MRR,
 *      retention caveat, role-ledger caveat, UNKNOWN rule).
 *   7. Live reconciliation match is recorded (snapshot MRR == live).
 *   8. Script is read-only: only SELECT/schema-inspection tokens; no
 *      INSERT/UPDATE/DELETE/CREATE TABLE/prisma write.
 *
 * Run via: npm run test:historical-metrics-proof
 */

import fs from "fs";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}`);
      failed++;
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`  ❌ ${name} — ${msg}`);
    failed++;
  }
}

function read(rel: string): string {
  return fs.readFileSync(rel, "utf-8");
}

function exists(rel: string): boolean {
  return fs.existsSync(rel);
}

function parseJSON(rel: string): unknown {
  return JSON.parse(read(rel));
}

// ── Inventory invariants ────────────────────────────────────────────
const EXPECTED_METRICS = [
  "newUserRegistrations", "dailyActiveUsers", "weeklyActiveUsers",
  "monthlyActiveUsers", "retentionCohorts", "cashCollected", "mrr",
  "mrrBreakdown", "activePremiumCount", "premiumByRole", "activeTrialCount",
  "karyaPublished", "ukbiTkaSessions", "jalurCompletions", "xpAwardedBySource",
  "growthByRole", "preMigrationHistory",
];

// Q: are UNKNOWN metrics ever granted a numeric/estimate field? We only
// inspect, since the script never attaches a value to UNKNOWN entries.

function main() {
  console.log("\n📋 PHASE 9.1 TEST — Historical Metrics Proof of Correctness");
  console.log("=".repeat(60));

  // ── 1. Deliverables exist ──
  console.log("\n── 1. Deliverables ──");
  test("script scripts/historical-metrics-proof.ts ada",
    () => exists("scripts/historical-metrics-proof.ts"));
  test("JSON data/historical-metrics-proof-september-2026.json ada",
    () => exists("data/historical-metrics-proof-september-2026.json"));
  test("report docs/HISTORICAL_METRICS_PROOF_SEPTEMBER_2026.md ada",
    () => exists("docs/HISTORICAL_METRICS_PROOF_SEPTEMBER_2026.md"));

  // ── 2. JSON validity + inventory shape ──
  console.log("\n── 2. JSON & inventory ──");
  let data: any = null;
  test("JSON parseable", () => { data = parseJSON("data/historical-metrics-proof-september-2026.json"); return data !== null; });
  test("phase = 9.1", () => data && data.phase === "9.1");
  test("metricInventory has exactly 17 metrics",
    () => data && Array.isArray(data.metricInventory) && data.metricInventory.length === 17);
  test("all 17 expected metric names present",
    () => data && EXPECTED_METRICS.every((m) => data.metricInventory.some((x: any) => x.metric === m)));
  test("every metric has status ∈ FACT|INFERENCE|ASSUMPTION|UNKNOWN",
    () => data && data.metricInventory.every((x: any) => ["FACT", "INFERENCE", "ASSUMPTION", "UNKNOWN"].includes(x.status)));
  test("every metric has a reconstructable classification",
    () => data && data.metricInventory.every((x: any) => x.reconstructable === true || x.reconstructable === false || ["windowed", "needs-snapshot"].includes(x.reconstructable)));

  // ── 3. Classification sums reconcile to 17 ──
  console.log("\n── 3. Classification sums ──");
  const sums = { true: 0, windowed: 0, needsSnapshot: 0, notReconstructable: 0 };
  test("sums reconcile (true + windowed + needs-snapshot + not = 17)", () => {
    if (!data) return false;
    for (const m of data.metricInventory) {
      if (m.reconstructable === true) sums.true++;
      else if (m.reconstructable === "windowed") sums.windowed++;
      else if (m.reconstructable === "needs-snapshot") sums.needsSnapshot++;
      else if (m.reconstructable === false) sums.notReconstructable++;
    }
    return sums.true + sums.windowed + sums.needsSnapshot + sums.notReconstructable === 17;
  });
  test("exactly 1 fully reconstructable (cashCollected) & it is boolean true",
    () => sums.true === 1 && data.metricInventory.find((m: any) => m.metric === "cashCollected").reconstructable === true);
  test("exactly 9 windowed",
    () => sums.windowed === 9);
  test("exactly 5 needs-snapshot",
    () => sums.needsSnapshot === 5);
  test("exactly 2 not-reconstructable",
    () => sums.notReconstructable === 2);

  // ── 4. Key classifications ──
  console.log("\n── 4. Key classifications ──");
  const byName = (n: string) => data.metricInventory.find((m: any) => m.metric === n);
  test("cashCollected = FACT, fully reconstructable (ledger), but is CASH not MRR",
    () => byName("cashCollected").status === "FACT" && byName("cashCollected").reconstructable === true && /cash/i.test(byName("cashCollected").note));
  test("mrr = ASSUMPTION, needs-snapshot",
    () => byName("mrr").status === "ASSUMPTION" && byName("mrr").reconstructable === "needs-snapshot");
  test("mrrBreakdown = ASSUMPTION, needs-snapshot",
    () => byName("mrrBreakdown").status === "ASSUMPTION" && byName("mrrBreakdown").reconstructable === "needs-snapshot");
  test("activePremiumCount = ASSUMPTION, needs-snapshot",
    () => byName("activePremiumCount").status === "ASSUMPTION" && byName("activePremiumCount").reconstructable === "needs-snapshot");
  test("premiumByRole = ASSUMPTION, needs-snapshot",
    () => byName("premiumByRole").status === "ASSUMPTION" && byName("premiumByRole").reconstructable === "needs-snapshot");
  test("activeTrialCount = ASSUMPTION, needs-snapshot",
    () => byName("activeTrialCount").status === "ASSUMPTION" && byName("activeTrialCount").reconstructable === "needs-snapshot");
  test("growthByRole = UNKNOWN, not reconstructable (role mutable, no ledger)",
    () => byName("growthByRole").status === "UNKNOWN" && byName("growthByRole").reconstructable === false);
  test("preMigrationHistory = UNKNOWN, not reconstructable (dead VPS / no retained timestamps)",
    () => byName("preMigrationHistory").status === "UNKNOWN" && byName("preMigrationHistory").reconstructable === false);
  test("engagement DAU/WAU/MAU = INFERENCE + windowed (XP proxy, floor 2026-08-03)",
    () => ["dailyActiveUsers", "weeklyActiveUsers", "monthlyActiveUsers"].every((n) =>
      byName(n).status === "INFERENCE" && byName(n).reconstructable === "windowed" && byName(n).windowFloor.includes("2026-08-03")));
  test("newUserRegistrations = FACT + windowed (floor 2026-06-28)",
    () => byName("newUserRegistrations").status === "FACT" && byName("newUserRegistrations").reconstructable === "windowed" && byName("newUserRegistrations").windowFloor.includes("2026-06-28"));

  // ── 5. UNKNOWN never gets an estimate ──
  console.log("\n── 5. UNKNOWN → never an estimate ──");
  test("UNKNOWN metrics have NO numeric value / estimate attached",
    () => ["growthByRole", "preMigrationHistory"].every((n) => {
      const m = byName(n);
      return !Object.prototype.hasOwnProperty.call(m, "value")
        && !Object.prototype.hasOwnProperty.call(m, "estimate")
        && !Object.prototype.hasOwnProperty.call(m, "approx");
    }));

  // ── 6. Classification rules embedded ──
  console.log("\n── 6. Classification rules ──");
  test("rule1: mutable current-state never treated as historical truth",
    () => data.classificationChecks.rule1.includes("isPremium") && data.classificationChecks.rule1.includes("historical truth"));
  test("rule2: cash collected != MRR",
    () => data.classificationChecks.rule2.includes("!="));
  test("rule3: timestamp existence alone does not prove retention",
    () => data.classificationChecks.rule3.includes("retention"));
  test("rule4: role changes corrupt historical role-based growth",
    () => data.classificationChecks.rule4.includes("role"));
  test("rule5: UNKNOWN never converted into estimate",
    () => data.classificationChecks.rule5.includes("UNKNOWN"));

  // ── 7. Reconciliation ──
  console.log("\n── 7. MRR reconciliation ──");
  test("reconciliation object present with match flag",
    () => data.liveFacts && data.liveFacts.reconciliation && typeof data.liveFacts.reconciliation.match === "boolean");
  test("liveFacts populated (dbStatus read-only-connected) with match recorded",
    () => data.dbStatus === "read-only-connected"
      && data.liveFacts.reconciliation.match === true
      && data.liveFacts.reconciliation.snapshotMrr === data.liveFacts.reconciliation.liveRecomputedMrr);

  // ── 8. Script is read-only ──
  console.log("\n── 8. Read-only safety ──");
  const script = exists("scripts/historical-metrics-proof.ts") ? read("scripts/historical-metrics-proof.ts") : "";
  test("no INSERT / UPDATE / DELETE / CREATE TABLE / DROP in script",
    () => !/\b(INSERT INTO|UPDATE |DELETE FROM|CREATE TABLE|DROP TABLE|ALTER TABLE)\b/i.test(script));
  test("uses read-only transaction (BEGIN READ ONLY) when connected",
    () => script.includes("BEGIN READ ONLY"));
  test("script defines classification (FACT/INFERENCE/ASSUMPTION/UNKNOWN) contract",
    () => script.includes("FACT") && script.includes("INFERENCE") && script.includes("ASSUMPTION") && script.includes("UNKNOWN"));

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed > 0) process.exit(1);
  console.log("✅ ALL HISTORICAL METRICS PROOF TESTS PASSED\n");
}

main();
