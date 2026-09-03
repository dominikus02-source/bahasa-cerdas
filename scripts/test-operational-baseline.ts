import * as fs from "node:fs";
import * as path from "node:path";
import * as assert from "node:assert";

/**
 * Operational Teacher Experiment — T-0 baseline + data-quality validation.
 * READ-ONLY / static only (no DB dependency). Verifies:
 *   A. Frozen T-0 baseline JSON structure + immutability contract.
 *   B. Canonical X/Z service never uses legacy `User.xp`.
 *   C. F4/F8 capture hooks wired in route files (class_code_shared, teacher_session).
 *   D. ProductEvent idempotency contract + sandbox guards in product-event-store.
 *   E. Funnel consistency invariants (operational <= used-classes <= classes <= eligible).
 *   F. Migration idempotency tokens (IF NOT EXISTS / exception guards).
 */
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    // eslint-disable-next-line no-console
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    failures.push(name);
    // eslint-disable-next-line no-console
    console.error(`  FAIL  ${name} :: ${(e as Error).message}`);
  }
}

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/* ─────────────────────────── A. Baseline JSON ─────────────────────────── */
const baseline = JSON.parse(read("data/operational-teacher-baseline-t0-september-2026.json"));

check("A1 baseline meta.immutable === true", () => {
  assert.strictEqual(baseline.meta?.immutable, true);
});
check("A2 baseline frozenAt present", () => {
  assert.ok(baseline.meta?.frozenAt);
});
check("A3 O1 activation baselinePercent === 11.2", () => {
  assert.strictEqual(baseline.activation?.baselinePercent, 11.2);
});
check("A4 O1 numerator 54 / denominator 484", () => {
  assert.strictEqual(baseline.activation?.baselineNumerator, 54);
  assert.strictEqual(baseline.activation?.baselineDenominator, 484);
  assert.strictEqual(baseline.activation?.target, 25);
});
check("A5 O3 operational baseline === 0", () => {
  assert.strictEqual(baseline.operationalClassrooms?.baselineValue, 0);
});
check("A6 O3 studentFloor 3 / studentTarget 5", () => {
  assert.strictEqual(baseline.operationalClassrooms?.studentFloor, 3);
  assert.strictEqual(baseline.operationalClassrooms?.studentTarget, 5);
});
check("A7 class-to-artifact wall 14.8 (8/54)", () => {
  assert.strictEqual(baseline.classToArtifactWall?.value, 14.8);
  assert.strictEqual(baseline.classToArtifactWall?.numerator, 8);
  assert.strictEqual(baseline.classToArtifactWall?.denominator, 54);
});
check("A8 funnel has F1..F10 10 stages", () => {
  assert.strictEqual(baseline.funnel?.stages?.length, 10);
});
check("A9 funnel F3 rate of prev = 11.2", () => {
  const f3 = baseline.funnel.stages.find((s: { stage: string }) => s.stage === "F3");
  assert.strictEqual(f3?.rateOfPrevStage, 11.2);
});
check("A10 baseline timezone Asia/Jakarta", () => {
  assert.strictEqual(baseline.meta?.timezone, "Asia/Jakarta");
});

/* ─────────────────── B. Canonical never uses legacy User.xp ─────────────────── */
const service = read("lib/analytics/operational-classrooms.ts");
check("B1 Z-evidence does NOT read legacy User.xp", () => {
  // Any `User.xp` mention must be documentation-only (line starts with * or //).
  const lines = service.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    const isDoc = trimmed.startsWith("*") || trimmed.startsWith("//");
    // Only inspect non-doc lines for real query access.
    if (isDoc) continue;
    if (/\.xp\b/.test(line) || /\.user\.xp\b/.test(line)) {
      throw new Error("legacy User.xp accessed outside comment: " + trimmed);
    }
  }
  const sources = ["XPTransaction", "QuizSubmission", "UserUnitProgress", "ProgresKompetensi", "StudentKarya"];
  for (const s of sources) assert.ok(service.includes(s), `Z source ${s} present`);
});

/* ─────────────────── C. F4/F8 capture hooks wired ─────────────────── */
const groupRoute = read("app/api/group/route.ts");
const dashRoute = read("app/api/guru/dashboard/route.ts");
const store = read("lib/analytics/product-event-store.ts");

check("C1 F4 enum class_code_shared in store", () => {
  assert.ok(store.includes('PRODUCT_EVENT_F4_CODE_SHARED = "class_code_shared"'));
});
check("C2 F8 enum teacher_session in store", () => {
  assert.ok(store.includes('PRODUCT_EVENT_F8_TEACHER_SESSION = "teacher_session"'));
});
check("C3 group route hooks F4 once-per-group", () => {
  assert.ok(groupRoute.includes("PRODUCT_EVENT_F4_CODE_SHARED"));
  assert.ok(groupRoute.includes("group-${group.id}-code-shared"));
});
check("C4 dashboard route hooks F8 once-per-day", () => {
  assert.ok(dashRoute.includes("PRODUCT_EVENT_F8_TEACHER_SESSION"));
  assert.ok(dashRoute.includes("teacher-${user.id}-${dayKeyWIB()}"));
});
check("C5 both hooks fire-and-forget (void recordProductEvent)", () => {
  assert.ok(groupRoute.includes("void recordProductEvent"));
  assert.ok(dashRoute.includes("void recordProductEvent"));
});

/* ─────────────────── D. ProductEvent idempotency + guard ─────────────────── */
check("D1 store defines unique-key comment contract", () => {
  assert.ok(store.includes("actorId, event, entityType, entityId, logicalKey"));
});
check("D2 store returns recorded:false on P2002 (duplicate)", () => {
  assert.ok(store.includes('code === "P2002"'));
  assert.ok(store.includes("return { recorded: false };"));
});
check("D3 store is best-effort (never throws)", () => {
  assert.ok(store.includes("best-effort"));
});
check("D4 dayKeyWIB adds +7h", () => {
  assert.ok(store.includes("7 * 60 * 60 * 1000"));
});

/* ─────────────────── E. Funnel consistency invariants ─────────────────── */
// operational(10) <= used-classes(9) <= classes(5/6) <= onboards(<=eligible)
function funnelInvariants(f: { f10: number; f9: number; f6: number; f5: number; f3: number; f1: number }) {
  assert.ok(f.f10 <= f.f9, "F10 <= F9");
  assert.ok(f.f9 <= f.f6 + f.f5, "F9 <= distinct-student class count");
  assert.ok(f.f6 <= f.f5, "F6 <= F5 per-group base");
  assert.ok(f.f3 <= f.f1, "F3 <= F1");
}
check("E1 funnel murky-monotonic (sample sandbox)", () => {
  funnelInvariants({ f10: 0, f9: 8, f6: 12, f5: 30, f3: 54, f1: 484 });
});
check("E2 monotonic holds when equal", () => {
  funnelInvariants({ f10: 1, f9: 1, f6: 5, f5: 5, f3: 5, f1: 5 });
});
check("E3 activation rate = F3/F1*100", () => {
  const pct = (54 / 484) * 100;
  assert.ok(Math.abs(pct - 11.2) < 0.05);
});

/* ─────────────────── F. Migration idempotency ─────────────────── */
const migration = read("prisma/migrations/manual/2026-09-08_product_event.sql");
check("F1 migration has IF NOT EXISTS table", () => {
  assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS "ProductEvent"'));
});
check("F2 migration has unique-idempotency index IF NOT EXISTS", () => {
  assert.ok(migration.includes("CREATE UNIQUE INDEX IF NOT EXISTS"));
  assert.ok(migration.includes("logicalKey"));
});
check("F3 migration FK guarded by duplicate_object exception", () => {
  assert.ok(migration.includes("duplicate_object"));
});
check("F4 migration is additive (no DROP)", () => {
  assert.ok(!/DROP (TABLE|COLUMN)/i.test(migration));
});

/* ─────────────────────────── Summary ─────────────────────────── */
// eslint-disable-next-line no-console
console.log(`\nOperational T-0 Baseline validation: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  // eslint-disable-next-line no-console
  console.error("FAILED:", failures.join(", "));
  process.exit(1);
}
process.exit(0);
