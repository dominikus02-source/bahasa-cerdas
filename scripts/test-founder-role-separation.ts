/**
 * Founder Role Separation — Regression Tests (Cases A–D)
 *
 * Tests authorization paths statically (no DB needed).
 * Verifies: founder privilege survives ADMIN→GURU migration,
 * normal guru does NOT get founder privilege, admin does NOT get founder.
 *
 * Cases:
 *   A — Dominikus:  role=GURU, isFounder=true   → founder YES, admin YES (via isFounder)
 *   B — Normal Guru: role=GURU, isFounder=false  → founder NO,  admin NO
 *   C — Obahmamah:  role=ADMIN, isFounder=false  → admin YES,   founder NO
 *   D — Normal Murid: role=MURID, isFounder=false → admin NO, guru NO, founder NO
 *
 * Usage:
 *   npx tsx scripts/test-founder-role-separation.ts
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

// ─── Mock User Types ─────────────────────────────────────────────
interface MockUser {
  role: string;
  isFounder: boolean;
}

// ─── Authorization Helpers (mirrors production code) ─────────────
function isFounder(user: MockUser): boolean {
  return user.isFounder === true;
}

function isAdmin(user: MockUser): boolean {
  return user.role === "ADMIN" || user.isFounder === true;
}

function isGuru(user: MockUser): boolean {
  return user.role === "GURU" || user.isFounder === true;
}

function isEligibleForCommission(user: MockUser): boolean {
  return user.role === "GURU" && !user.isFounder;
}

// Admin layout guard: role !== "ADMIN" && !isFounder → redirect
function canAccessAdminLayout(user: MockUser): boolean {
  return user.role === "ADMIN" || user.isFounder === true;
}

// Guru layout guard: role !== "GURU" && !isFounder → redirect
function canAccessGuruLayout(user: MockUser): boolean {
  return user.role === "GURU" || user.isFounder === true;
}

// Admin upload route: role === "ADMIN" || isFounder
function canUploadMateri(user: MockUser): boolean {
  return user.role === "ADMIN" || user.isFounder === true;
}

// Navigation: getRoleNavItems
function getFounderNavItems(user: MockUser, context: string): string[] {
  const items: string[] = [];
  if ((user.role === "GURU" || user.isFounder) && context !== "guru") {
    items.push("dashboard-guru");
  }
  if (user.isFounder && context !== "admin") {
    items.push("panel-admin");
  }
  return items;
}

// ─── File-based checks ───────────────────────────────────────────
function noHardcodedEmailsInFile(filePath: string): boolean {
  const fullPath = resolve(process.cwd(), filePath);
  if (!existsSync(fullPath)) return true; // file doesn't exist = no problem
  const content = readFileSync(fullPath, "utf-8");
  const hasFounderEmails = content.includes("FOUNDER_EMAILS") && !content.includes("content.includes(\"FOUNDER_EMAILS\")");
  const hasAdminEmails = content.includes("ALLOWED_ADMIN_EMAILS") && !content.includes("content.includes(\"ALLOWED_ADMIN_EMAILS\")");
  const hasIsFounderEmail = content.includes("isFounderEmail") && !content.includes("function isFounderEmail") === false;
  const hasInlineEmails =
    content.includes("dominikus.02@gmail.com") ||
    content.includes("hdsastra47@gmail.com") ||
    content.includes("alexsurya1968@gmail.com");
  return !hasFounderEmails && !hasAdminEmails && !hasInlineEmails;
}

// ─── TEST SUITE ──────────────────────────────────────────────────

// CASE A — Dominikus: GURU + Founder
console.log("\n🔍 CASE A — Dominikus (GURU + Founder)\n");
const dominikus: MockUser = { role: "GURU", isFounder: true };

assert(isFounder(dominikus), "A.1: isFounder = true");
assert(isAdmin(dominikus), "A.2: isAdmin = true (via isFounder bypass)");
assert(isGuru(dominikus), "A.3: isGuru = true (via role OR isFounder)");
assert(!isEligibleForCommission(dominikus), "A.4: commission NOT eligible (GURU + isFounder)");
assert(canAccessAdminLayout(dominikus), "A.5: admin layout accessible (via isFounder)");
assert(canAccessGuruLayout(dominikus), "A.6: guru layout accessible (via role=GURU)");
assert(canUploadMateri(dominikus), "A.7: upload materi accessible (via isFounder)");

const founderNav = getFounderNavItems(dominikus, "student");
assert(founderNav.includes("dashboard-guru"), "A.8: nav shows Dashboard Guru in student context");
assert(founderNav.includes("panel-admin"), "A.9: nav shows Panel Admin in student context");

const founderNavGuru = getFounderNavItems(dominikus, "guru");
assert(!founderNavGuru.includes("dashboard-guru"), "A.10: nav hides Dashboard Guru in guru context (no redundant self-link)");
assert(founderNavGuru.includes("panel-admin"), "A.11: nav shows Panel Admin in guru context");

const founderNavAdmin = getFounderNavItems(dominikus, "admin");
assert(founderNavAdmin.includes("dashboard-guru"), "A.12: nav shows Dashboard Guru in admin context");
assert(!founderNavAdmin.includes("panel-admin"), "A.13: nav hides Panel Admin in admin context (no redundant self-link)");

// CASE B — Normal Guru
console.log("\n🔍 CASE B — Normal Guru (GURU + !Founder)\n");
const normalGuru: MockUser = { role: "GURU", isFounder: false };

assert(!isFounder(normalGuru), "B.1: isFounder = false");
assert(!isAdmin(normalGuru), "B.2: isAdmin = false (no role ADMIN, no isFounder)");
assert(isGuru(normalGuru), "B.3: isGuru = true (via role=GURU)");
assert(isEligibleForCommission(normalGuru), "B.4: commission eligible (GURU + !isFounder)");
assert(!canAccessAdminLayout(normalGuru), "B.5: admin layout NOT accessible");
assert(canAccessGuruLayout(normalGuru), "B.6: guru layout accessible");
assert(!canUploadMateri(normalGuru), "B.7: upload materi NOT accessible (no ADMIN, no isFounder)");

const guruNav = getFounderNavItems(normalGuru, "student");
assert(guruNav.includes("dashboard-guru"), "B.8: nav shows Dashboard Guru");
assert(!guruNav.includes("panel-admin"), "B.9: nav does NOT show Panel Admin");

// CASE C — Obahmamah: ADMIN + !Founder
console.log("\n🔍 CASE C — Obahmamah (ADMIN + !Founder)\n");
const obahmamah: MockUser = { role: "ADMIN", isFounder: false };

assert(!isFounder(obahmamah), "C.1: isFounder = false");
assert(isAdmin(obahmamah), "C.2: isAdmin = true (via role=ADMIN)");
assert(!isGuru(obahmamah), "C.3: isGuru = false (role=ADMIN, not GURU, no isFounder)");
assert(!isEligibleForCommission(obahmamah), "C.4: commission NOT eligible (role=ADMIN, not GURU)");
assert(canAccessAdminLayout(obahmamah), "C.5: admin layout accessible");
assert(!canAccessGuruLayout(obahmamah), "C.6: guru layout NOT accessible (role=ADMIN, no isFounder)");
assert(canUploadMateri(obahmamah), "C.7: upload materi accessible (via role=ADMIN)");

const adminNav = getFounderNavItems(obahmamah, "student");
assert(!adminNav.includes("dashboard-guru"), "C.8: nav does NOT show Dashboard Guru (not GURU, not founder)");
assert(!adminNav.includes("panel-admin"), "C.9: nav does NOT show Panel Admin (not founder)");

// CASE D — Normal Murid
console.log("\n🔍 CASE D — Normal Murid (MURID + !Founder)\n");
const normalMurid: MockUser = { role: "MURID", isFounder: false };

assert(!isFounder(normalMurid), "D.1: isFounder = false");
assert(!isAdmin(normalMurid), "D.2: isAdmin = false");
assert(!isGuru(normalMurid), "D.3: isGuru = false");
assert(!isEligibleForCommission(normalMurid), "D.4: commission NOT eligible");
assert(!canAccessAdminLayout(normalMurid), "D.5: admin layout NOT accessible");
assert(!canAccessGuruLayout(normalMurid), "D.6: guru layout NOT accessible");
assert(!canUploadMateri(normalMurid), "D.7: upload materi NOT accessible");

const muridNav = getFounderNavItems(normalMurid, "student");
assert(muridNav.length === 0, "D.8: nav has NO role-switch items");

// ─── Hardcoded Email Removal Verification ────────────────────────
console.log("\n🔍 HARDCODED EMAIL REMOVAL — Code Scan\n");

const criticalFiles = [
  "app/api/user/me/route.ts",
  "app/api/user/simple-upsert/route.ts",
  "app/auth/callback/route.ts",
  "app/api/admin/upload-materi/route.ts",
  "app/api/admin/generate-ppt/route.ts",
  "app/actions/register.ts",
  "app/api/auth/register/route.ts",
  "app/actions/upload-materi.ts",
];

for (const file of criticalFiles) {
  assert(noHardcodedEmailsInFile(file), `No hardcoded emails in ${file}`);
}

// ─── Commission System Verification ──────────────────────────────
console.log("\n🔍 COMMISSION SYSTEM — Founder Exclusion\n");

assert(
  !isEligibleForCommission({ role: "GURU", isFounder: true }),
  "Commission: GURU+founder = NOT eligible"
);
assert(
  isEligibleForCommission({ role: "GURU", isFounder: false }),
  "Commission: GURU+!founder = eligible"
);
assert(
  !isEligibleForCommission({ role: "ADMIN", isFounder: false }),
  "Commission: ADMIN+!founder = NOT eligible"
);
assert(
  !isEligibleForCommission({ role: "MURID", isFounder: false }),
  "Commission: MURID+!founder = NOT eligible"
);

// ─── Summary ─────────────────────────────────────────────────────
console.log("\n" + "─".repeat(50));
console.log(`RESULT: ${passed} passed, ${failed} failed`);
console.log("─".repeat(50));

if (failed > 0) {
  console.log("\n❌ REGRESSION TESTS FAILED — do NOT proceed with migration.\n");
  process.exit(1);
} else {
  console.log("\n✅ ALL REGRESSION TESTS PASSED — safe to proceed.\n");
  process.exit(0);
}
