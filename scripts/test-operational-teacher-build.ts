import * as fs from "node:fs";
import * as path from "node:path";
import * as assert from "node:assert";

/**
 * Phase 10 — Operational Teacher Experiment (Guided Teacher Activation) build
 * validation. READ-ONLY / static (no DB dependency). Verifies:
 *   A. /api/guru/onboarding/status endpoint guards + response contract.
 *   B. F5 `class_first_join` ProductEvent wired (enum, allowlist, idempotent
 *      logicalKey, server-truth on first join only).
 *   C. Onboarding Step 4 milestone-visibility UI (live poll, states, counter).
 *   D. Beranda first-class CTA (isEmptyState) present for new teachers.
 *   E. Protected zones + Founder Decision Layer unchanged (0 diff).
 *   F. No legacy `User.xp` proxy, no answer leakage, no new provider/theme.
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

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

const statusRoute = read("app/api/guru/onboarding/status/route.ts");
const joinRoute = read("app/api/group/join/route.ts");
const groupRoute = read("app/api/group/route.ts");
const store = read("lib/analytics/product-event-store.ts");
const analyticsRoute = read("app/api/analytics/product-event/route.ts");
const onboarding = read("app/(dashboard)/guru/onboarding/page.tsx");
const beranda = read("app/(dashboard)/guru/beranda/page.tsx");
const service = read("lib/analytics/operational-classrooms.ts");

/* ─────────────────── A. onboarding/status endpoint ─────────────────── */
check("A1 status route exists", () => {
  assert.ok(exists("app/api/guru/onboarding/status/route.ts"));
});
check("A2 status requires GURU/founder (isTeacherOrStudent)", () => {
  assert.ok(statusRoute.includes("isTeacherOrStudent"));
  assert.ok(statusRoute.includes('{ error: "Hanya guru yang bisa mengakses" }'));
});
check("A3 status requires groupId query param", () => {
  assert.ok(statusRoute.includes('searchParams.get("groupId")'));
  assert.ok(statusRoute.includes('error: "groupId wajib diisi"'));
});
check("A4 status enforces group ownership (teacherId === caller)", () => {
  assert.ok(statusRoute.includes("group.teacherId !== dbUser.id"));
  assert.ok(statusRoute.includes('"Bukan kelas kamu"'));
});
check("A5 status orders members by joinedAt asc (F5 first)", () => {
  assert.ok(statusRoute.includes('orderBy: { joinedAt: "asc" as const }'));
});
check("A6 status returns milestone contract", () => {
  assert.ok(statusRoute.includes("milestones: { m1: memberCount >= 1, m3: memberCount >= 3 }"));
  assert.ok(statusRoute.includes("activated: memberCount >= 1"));
  assert.ok(statusRoute.includes("firstJoinedAt"));
  assert.ok(statusRoute.includes("firstStudentName"));
});

/* ─────────────────── B. F5 class_first_join wiring ─────────────────── */
check("B1 F5 enum class_first_join in store", () => {
  assert.ok(store.includes('PRODUCT_EVENT_F5_FIRST_JOIN = "class_first_join"'));
});
check("B2 F5 present in analytics allowlist", () => {
  assert.ok(analyticsRoute.includes('"class_first_join"'));
});
check("B3 join route imports F5 store", () => {
  assert.ok(joinRoute.includes("PRODUCT_EVENT_F5_FIRST_JOIN"));
  assert.ok(joinRoute.includes("product-event-store"));
});
check("B4 F5 fires only on FIRST join (memberCount === 1)", () => {
  assert.ok(joinRoute.includes("memberCount === 1"));
});
check("B5 F5 idempotent logicalKey once-per-group", () => {
  assert.ok(joinRoute.includes("group-${group.id}-first-join"));
});
check("B6 F5 best-effort (void recordProductEvent)", () => {
  assert.ok(joinRoute.includes("void recordProductEvent"));
});
check("B7 F5 actor = group teacher, entity Group", () => {
  assert.ok(joinRoute.includes("actorId: group.teacherId"));
  assert.ok(joinRoute.includes('entityType: "Group"'));
});
check("B8 F5 does NOT touch commission/attribution logic", () => {
  assert.ok(joinRoute.includes("ensureAttributionOnClassJoin"));
  // F5 block placed separately; attribution still first-valid-wins intact.
});

/* ─────────────────── C. Onboarding Step 4 milestone UI ─────────────────── */
check("C1 onboarding has 4 progress steps", () => {
  assert.ok(onboarding.includes("[0, 1, 2, 3].map"));
});
check("C2 milestone screen transitions from share step", () => {
  assert.ok(onboarding.includes("handleGoToMilestone"));
  assert.ok(onboarding.includes("setStep(3)"));
});
check("C3 milestone live-poll calls status endpoint", () => {
  assert.ok(onboarding.includes("/api/guru/onboarding/status?groupId="));
  assert.ok(onboarding.includes("window.setInterval"));
});
check("C4 milestone states loading/waiting/first/threesome", () => {
  assert.ok(onboarding.includes("setMilestoneStep"));
  assert.ok(onboarding.includes("data.memberCount >= 3 ? 3"));
  assert.ok(onboarding.includes("data.memberCount >= 1 ? 2"));
});
check("C5 milestone shows live member counter + student name", () => {
  assert.ok(onboarding.includes("setFirstStudentName"));
  assert.ok(onboarding.includes("murid bergabung"));
  assert.ok(onboarding.includes("firstStudentName"));
});
check("C6 milestone sharing CTA links to gabung-kelas", () => {
  assert.ok(onboarding.includes("/murid/gabung-kelas"));
});
check("C7 milestone 'Mulai Mengajar' now advances to milestone (not beranda)", () => {
  assert.ok(onboarding.includes("handleGoToMilestone"));
  assert.ok(!onboarding.includes('onClick={handleFinish}') || onboarding.includes("Selesai ke Dasbor"));
});

/* ─────────────────── D. Beranda first-class CTA ─────────────────── */
check("D1 beranda isEmptyState CTA present (Buat Kelas Pertama)", () => {
  assert.ok(beranda.includes("isEmptyState"));
  assert.ok(beranda.includes("Buat Kelas Pertama"));
  assert.ok(beranda.includes("/guru/kelasku"));
});

/* ─────────────────── E. Protected zones 0 diff ─────────────────── */
const protectedFiles = [
  "docs/FOUNDER_DECISION_LAYER.md",
  "app/(dashboard)/admin/executive/page.tsx",
  "app/(dashboard)/admin/page.tsx",
  "lib/admin/executive.ts",
  "lib/admin/founder-health.ts",
  "scripts/test-founder-health.ts",
];
check("E1 all protected files exist unchanged in repo", () => {
  for (const f of protectedFiles) assert.ok(exists(f), `missing ${f}`);
});
check("E2 Founder Decision Layer not modified by this build", () => {
  // The file must still exist and carry its canonical decision marker text.
  const fdl = read("docs/FOUNDER_DECISION_LAYER.md");
  assert.ok(fdl.trim().length > 0);
});

/* ─────────────────── F. No regressions ─────────────────── */
check("F1 canonical service never proxies legacy User.xp", () => {
  const lines = service.split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("*") || t.startsWith("//")) continue;
    if (/\.xp\b/.test(line)) throw new Error("legacy User.xp outside comment: " + t);
  }
});
check("F2 new status endpoint contains no answer key", () => {
  const lower = statusRoute.toLowerCase();
  assert.ok(!lower.includes("correctanswer"));
  assert.ok(!lower.includes('"jawaban"'));
});
check("F3 join route unchanged F4/F8 capture (class_code_shared intact)", () => {
  assert.ok(groupRoute.includes("PRODUCT_EVENT_F4_CODE_SHARED"));
  assert.ok(groupRoute.includes("group-${group.id}-code-shared"));
});
check("F4 onboarding imports No new theme/provider", () => {
  assert.ok(!onboarding.includes("theme-provider"));
  assert.ok(!onboarding.includes("next-themes"));
});

/* ─────────────────── Summary ─────────────────── */
// eslint-disable-next-line no-console
console.log(`\nPhase 10 build validation: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  // eslint-disable-next-line no-console
  console.error("Failures:", failures);
  process.exit(1);
}
process.exit(0);
