/**
 * Google Role Selection — Regression Tests (Cases 1–14 + static guards)
 *
 * Pure-logic tests, no DB needed. Covers the Phase 2 product requirement:
 * GOOGLE IS AUTHENTICATION ONLY — new Google users must choose GURU/MURID,
 * existing users keep their role, and no path silently defaults to MURID.
 *
 * Usage:
 *   npx tsx scripts/test-google-role-selection.ts
 */

import { createHmac } from "node:crypto";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  dashboardForRole,
  intentClearCookie,
  intentSetCookie,
  isSafeNext,
  resolveGoogleProvisioning,
  signRoleIntent,
  verifyRoleIntent,
} from "../lib/auth/role-intent";

// Deterministic HMAC secret for this run (implementation reads env lazily).
process.env.BC_ROLE_INTENT_SECRET = "test-secret-google-role-selection";
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

let passed = 0;
let failed = 0;

function assert(cond: boolean, label: string) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

function src(rel: string): string {
  return readFileSync(resolve(__dirname, rel), "utf8");
}

// ─── 1–2. Intent roundtrip: GURU and MURID ───────────────────────
console.log("\n🔐 ROLE INTENT — sign/verify\n");

const guruIntent = signRoleIntent("GURU");
const muridIntent = signRoleIntent("MURID");
assert(typeof guruIntent === "string" && guruIntent.length > 0, "NEW Google + intent GURU seals");
assert(typeof muridIntent === "string" && muridIntent.length > 0, "NEW Google + intent MURID seals");
assert(verifyRoleIntent(guruIntent) === "GURU", "Intent GURU verifies → User.role = GURU");
assert(verifyRoleIntent(muridIntent) === "MURID", "Intent MURID verifies → User.role = MURID");

// ─── 3. No intent → needs selection (never silent MURID) ─────────
console.log("\n🧭 PROVISIONING DECISION\n");

assert(
  JSON.stringify(resolveGoogleProvisioning({ existingRole: null, intentRole: "GURU" })) ===
    JSON.stringify({ action: "create", role: "GURU" }),
  "NEW Google + GURU intent → create GURU"
);
assert(
  JSON.stringify(resolveGoogleProvisioning({ existingRole: null, intentRole: "MURID" })) ===
    JSON.stringify({ action: "create", role: "MURID" }),
  "NEW Google + MURID intent → create MURID"
);
assert(
  resolveGoogleProvisioning({ existingRole: null, intentRole: null }).action === "needs-selection",
  "NEW Google + NO intent → needs-selection (NOT silent MURID)"
);
assert(
  resolveGoogleProvisioning({ existingRole: undefined, intentRole: null }).action === "needs-selection",
  "NEW Google + undefined role → needs-selection"
);

// ─── 4–6. Existing roles preserved, intent ignored ───────────────
assert(
  resolveGoogleProvisioning({ existingRole: "GURU", intentRole: "MURID" }).action === "preserve",
  "Existing GURU + Google (+stale MURID intent) → remains GURU"
);
assert(
  resolveGoogleProvisioning({ existingRole: "MURID", intentRole: "GURU" }).action === "preserve",
  "Existing MURID + Google (+stale GURU intent) → remains MURID"
);
assert(
  resolveGoogleProvisioning({ existingRole: "ADMIN", intentRole: "GURU" }).action === "preserve",
  "Existing ADMIN + Google → remains ADMIN"
);
assert(
  resolveGoogleProvisioning({ existingRole: "GURU", intentRole: null }).action === "preserve",
  "Existing GURU relogin (no intent) → no role-selection loop"
);

// ─── 7–8. Tampered / expired / replay-hostile intents ────────────
console.log("\n🛡️ INTENT SECURITY\n");

assert(verifyRoleIntent(null) === null, "Missing intent → null (→ selection)");
assert(verifyRoleIntent("") === null, "Empty intent → null");
assert(verifyRoleIntent("?role=GURU") === null, "Raw ?role=GURU query value → rejected");
assert(verifyRoleIntent("GURU") === null, "Bare role string → rejected");
assert(verifyRoleIntent(guruIntent + "tampered") === null, "Appended tamper → rejected");
if (guruIntent) {
  const parts = guruIntent.split(".");
  const flipped = [...parts.slice(0, 3), "MURID", parts[4]].join(".");
  assert(verifyRoleIntent(flipped) === null, "Role flipped without re-sign → rejected");
}
// Expired but correctly signed (crafted with test secret) → rejected.
const expiredPayload = `v1.${Math.floor(Date.now() / 1000) - 60}.abcdef1234567890.GURU`;
const expired = `${expiredPayload}.${createHmac("sha256", process.env.BC_ROLE_INTENT_SECRET!).update(expiredPayload, "utf8").digest("hex")}`;
assert(verifyRoleIntent(expired) === null, "Expired intent → rejected (→ selection)");
// Wrong secret → rejected.
process.env.BC_ROLE_INTENT_SECRET = "different-secret";
assert(verifyRoleIntent(guruIntent) === null, "Intent from another secret → rejected");
process.env.BC_ROLE_INTENT_SECRET = "test-secret-google-role-selection";
assert(verifyRoleIntent(guruIntent) === "GURU", "Correct secret still verifies after secret swap");

// Cookie attributes: httpOnly single-use intent, cleared on consume.
assert(intentSetCookie("x").includes("HttpOnly"), "Intent cookie is httpOnly");
assert(intentSetCookie("x").includes("SameSite=Lax"), "Intent cookie is SameSite=Lax");
assert(intentClearCookie().includes("Max-Age=0"), "Consume clears the intent cookie");

// ─── 12–13. Role-based routing ───────────────────────────────────
console.log("\n➡️ REDIRECTS\n");

assert(dashboardForRole("GURU") === "/guru/beranda", "Guru authorization → /guru/beranda");
assert(dashboardForRole("MURID") === "/arena", "Murid authorization → /arena");
assert(dashboardForRole("ADMIN") === "/admin", "Admin → /admin");
assert(isSafeNext("/arena") === true, "Safe next honored");
assert(isSafeNext("//evil.com") === false, "Protocol-relative next rejected");
assert(isSafeNext("/login") === false, "Login next rejected");
assert(isSafeNext(null) === false, "Missing next rejected");

// ─── Static guards: no silent MURID default in Google paths ─────
console.log("\n🔍 STATIC GUARDS — no silent MURID fallback\n");

const authCallback = src("../app/auth/callback/route.ts");
const apiCallback = src("../app/api/auth/callback/route.ts");
const meRoute = src("../app/api/user/me/route.ts");
const upsertRoute = src("../app/api/user/simple-upsert/route.ts");
const completeRole = src("../app/api/auth/complete-role/route.ts");
const pilihPeranExists = existsSync(resolve(__dirname, "../app/auth/pilih-peran/page.tsx"));

assert(
  !authCallback.includes('? "GURU" : "MURID"') && !authCallback.includes("|| \"MURID\""),
  "app/auth/callback has no silent MURID default"
);
assert(
  authCallback.includes("/auth/pilih-peran"),
  "app/auth/callback routes intent-less new users to role selection"
);
assert(
  !apiCallback.includes("|| \"MURID\""),
  "app/api/auth/callback has no silent MURID default"
);
assert(
  apiCallback.includes("/auth/pilih-peran"),
  "app/api/auth/callback routes intent-less new users to role selection"
);
assert(
  !meRoute.includes('|| "MURID"'),
  "GET /api/user/me no longer auto-creates MURID"
);
assert(
  upsertRoute.includes("ROLE_REQUIRED"),
  "simple-upsert rejects missing/invalid role instead of defaulting MURID"
);
assert(pilihPeranExists, "Role-selection page app/auth/pilih-peran exists");
assert(
  completeRole.includes("existing") && completeRole.includes("isAllowedGoogleRole"),
  "complete-role preserves existing users + validates role allowlist"
);

// ─── 10–11. Email/password flows untouched ───────────────────────
console.log("\n🔑 EMAIL/PASSWORD REGRESSION (static)\n");

const loginRoute = src("../app/api/auth/login/route.ts");
const registerAction = src("../app/actions/register.ts");
assert(
  loginRoute.includes("signInWithPassword") && loginRoute.includes("user_metadata?.role"),
  "Password login path unchanged (metadata role still flows)"
);
assert(
  registerAction.includes("db.user.create") && registerAction.includes("parsed.data"),
  "Password register action unchanged (explicit validated role)"
);

// ─── Summary ─────────────────────────────────────────────────────
console.log("\n" + "─".repeat(50));
console.log(`RESULT: ${passed} passed, ${failed} failed`);
console.log("─".repeat(50));

if (failed > 0) {
  console.log("\n❌ GOOGLE ROLE SELECTION TESTS FAILED.\n");
  process.exit(1);
} else {
  console.log("\n✅ ALL GOOGLE ROLE SELECTION TESTS PASSED.\n");
  process.exit(0);
}
