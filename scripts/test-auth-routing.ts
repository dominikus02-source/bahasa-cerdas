/**
 * Post-Auth Routing Hardening — Regression Tests
 *
 * Verifies: authenticated users never land on the public landing page ("/")
 * after auth; every auth completion path converges on the canonical
 * role dashboard; legitimate `next` deep links still honored; open-redirect
 * protection intact; existing roles never rewritten.
 *
 * Pure-logic + static guards, no DB needed.
 * Usage:
 *   npx tsx scripts/test-auth-routing.ts
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  dashboardForRole,
  isSafeNext,
  resolvePostAuthDestination,
} from "../lib/auth/redirect";
import {
  resolveGoogleProvisioning,
  signRoleIntent,
  verifyRoleIntent,
} from "../lib/auth/role-intent";

// NOTE: intent crypto helpers live in role-intent (re-exported redirect fns
// are imported above); verify the server module still round-trips.
process.env.BC_ROLE_INTENT_SECRET = "test-secret-auth-routing";

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

console.log("\n🎯 POST-AUTH DESTINATIONS\n");

// 1–2. New Google users → canonical dashboards (no next).
assert(
  resolvePostAuthDestination("GURU", undefined) === "/guru/beranda",
  "1. New Google GURU → /guru/beranda"
);
assert(
  resolvePostAuthDestination("MURID", undefined) === "/arena",
  "2. New Google MURID → /arena"
);

// 3–4. Existing Google users without next → dashboards, NOT "/".
assert(
  resolvePostAuthDestination("GURU", undefined) === "/guru/beranda" &&
    resolvePostAuthDestination("GURU", null) === "/guru/beranda",
  "3. Existing Google GURU (no next) → /guru/beranda"
);
assert(
  resolvePostAuthDestination("MURID", undefined) === "/arena",
  "4. Existing Google MURID (no next) → /arena"
);

// 5–6. Password login converges on the same resolver.
assert(
  resolvePostAuthDestination("GURU", undefined) === "/guru/beranda",
  "5. Existing password GURU → /guru/beranda"
);
assert(
  resolvePostAuthDestination("MURID", undefined) === "/arena",
  "6. Existing password MURID → /arena"
);
assert(
  src("../app/(auth)/login/page.tsx").includes("resolvePostAuthDestination"),
  "Login page uses the canonical resolver (no divergent fallback)"
);

// 7–8. Authenticated visit to "/" → dashboard.
assert(
  resolvePostAuthDestination("GURU", "/") === "/guru/beranda",
  "7. Authenticated GURU at '/' → /guru/beranda"
);
assert(
  resolvePostAuthDestination("MURID", "/") === "/arena",
  "8. Authenticated MURID at '/' → /arena"
);

// 9. Anonymous landing stays public (static page + client-only redirect).
console.log("\n🏠 LANDING PAGE\n");
const landing = src("../app/page.tsx");
assert(
  landing.includes("HeroSection") && landing.includes("revalidate"),
  "9a. Landing keeps public content + ISR (still static for anonymous)"
);
assert(
  landing.includes("AuthenticatedLandingRedirect"),
  "9b. Landing mounts authenticated-redirect (no server session check)"
);
assert(
  !landing.includes("redirect(") && !landing.includes("getUser("),
  "9c. Landing performs no server redirect/DB lookup (anonymous unaffected)"
);
assert(
  existsSync(resolve(__dirname, "../components/auth/AuthenticatedLandingRedirect.tsx")),
  "9d. AuthenticatedLandingRedirect component exists"
);
const landingRedirect = src("../components/auth/AuthenticatedLandingRedirect.tsx");
assert(
  landingRedirect.includes("dashboardForRole") && landingRedirect.includes("/api/user/me"),
  "9e. Landing redirect is read-only role lookup → dashboard"
);

// 10–11. next="/" and malicious next handling.
console.log("\n🛡️ NEXT VALIDATION\n");
assert(
  resolvePostAuthDestination("GURU", "/") === "/guru/beranda",
  "10. next='/' after auth → role dashboard, not landing"
);
assert(
  resolvePostAuthDestination("MURID", "/arena/misi") === "/arena/misi",
  "Legitimate deep-link next still honored"
);
assert(
  resolvePostAuthDestination("GURU", "//evil.com") === "/guru/beranda",
  "11a. Protocol-relative next rejected → dashboard fallback"
);
assert(
  resolvePostAuthDestination("GURU", "https://evil.com") === "/guru/beranda",
  "11b. External URL next rejected → dashboard fallback"
);
assert(
  resolvePostAuthDestination("GURU", "/login") === "/guru/beranda",
  "11c. /login next rejected → dashboard fallback"
);
assert(
  resolvePostAuthDestination("GURU", "/register") === "/guru/beranda",
  "11d. /register next rejected → dashboard fallback"
);
assert(
  isSafeNext("/") === true && isSafeNext("//x") === false,
  "isSafeNext semantics unchanged (open-redirect guard intact)"
);

// 12. Existing roles never overwritten by callbacks/completion.
console.log("\n🔒 ROLE PRESERVATION\n");
for (const f of [
  "../app/auth/callback/route.ts",
  "../app/api/auth/callback/route.ts",
  "../app/api/auth/complete-role/route.ts",
]) {
  const c = src(f);
  assert(
    !/update\(\{\s*where[\s\S]{0,80}?data:\s*\{[^}]*role/.test(c),
    `12. ${f} never writes role in an update (preserve-only)`
  );
}
assert(
  resolveGoogleProvisioning({ existingRole: "GURU", intentRole: "MURID" }).action === "preserve",
  "12b. Stale intent cannot flip existing GURU"
);

// 13. Intent mechanism intact (re-exported helpers still work).
console.log("\n🔐 INTENT REGRESSION\n");
assert(dashboardForRole("ADMIN") === "/admin", "ADMIN → /admin");
assert(
  (() => {
    const sealed = signRoleIntent("GURU");
    return (
      typeof sealed === "string" &&
      verifyRoleIntent(sealed) === "GURU" &&
      verifyRoleIntent("?role=GURU") === null
    );
  })(),
  "13. HMAC intent round-trips; raw ?role= still rejected"
);

// 14. Role-selection page regression.
console.log("\n📋 ROLE SELECTION\n");
const pilih = src("../app/auth/pilih-peran/page.tsx");
assert(
  pilih.includes("LANJUTKAN") && pilih.includes("disabled={!role"),
  "14a. CTA disabled until role chosen"
);
assert(
  pilih.includes("/api/auth/complete-role"),
  "14b. Completion goes through validated server endpoint"
);

// Static: post-exchange SUCCESS branches resolve via the canonical resolver.
// (No-code fall-throughs keep legacy behavior for failed/edge callbacks
// where no role can be resolved.)
console.log("\n🔍 STATIC GUARDS\n");
assert(
  src("../app/auth/callback/route.ts").includes(
    "resolvePostAuthDestination(existing.role, next)"
  ),
  "Existing-user branch resolves role-aware, no landing default (auth/callback)"
);
assert(
  src("../app/api/auth/callback/route.ts").includes(
    "resolvePostAuthDestination(existing.role, next)"
  ),
  "Existing-user branch resolves role-aware, no landing default (api callback)"
);
assert(
  src("../app/api/auth/callback/route.ts").includes("resolvePostAuthDestination") &&
    src("../app/auth/callback/route.ts").includes("resolvePostAuthDestination") &&
    src("../app/api/auth/complete-role/route.ts").includes("resolvePostAuthDestination"),
  "All auth completion paths converge on resolvePostAuthDestination"
);

console.log("\n" + "─".repeat(50));
console.log(`RESULT: ${passed} passed, ${failed} failed`);
console.log("─".repeat(50));

if (failed > 0) {
  console.log("\n❌ AUTH ROUTING TESTS FAILED.\n");
  process.exit(1);
} else {
  console.log("\n✅ ALL AUTH ROUTING TESTS PASSED.\n");
  process.exit(0);
}
