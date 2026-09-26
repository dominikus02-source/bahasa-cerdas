/**
 * Founder post-auth landing regression.
 * Founder bekerja dari Dasbor Guru; Panel Admin adalah pilihan eksplisit.
 */
import { readFileSync } from "node:fs";

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean) {
  if (ok) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

const redirect = readFileSync("lib/auth/redirect.ts", "utf8");
const login = readFileSync("app/(auth)/login/page.tsx", "utf8");
const callback = readFileSync("app/api/auth/callback/route.ts", "utf8");
const legacyLogin = readFileSync("app/actions/login.ts", "utf8");
const navigation = readFileSync("components/shell/navigation-context.ts", "utf8");
const guruNav = readFileSync("components/dashboard/GuruNav.tsx", "utf8");

console.log("\nFOUNDER POST-AUTH LANDING");

check(
  "canonical founder dashboard = /guru/beranda",
  redirect.includes('if (isFounder) return "/guru/beranda"'),
);
check(
  "email/password login memakai founder-aware resolver",
  login.includes("resolvePostAuthDestinationForUser") &&
    login.includes("Boolean(dbUser.isFounder)"),
);
check(
  "login tidak lagi memaksa founder sebagai ADMIN",
  !login.includes('dbUser.isFounder ? "ADMIN"'),
);
check(
  "Google OAuth preserve flow memakai founder-aware resolver",
  callback.includes("resolvePostAuthDestinationForUser(existing.role, Boolean(existing.isFounder), next)"),
);
check(
  "semua Google OAuth fallback memakai founder-aware dashboard",
  (callback.match(/dashboardForUser\(dbUser\.role, Boolean\(dbUser\.isFounder\)\)/g) || []).length === 2 &&
    !callback.includes("dashboardForRole(dbUser.role)"),
);
check(
  "legacy login action memakai founder-aware dashboard",
  legacyLogin.includes("dashboardForUser(dbUser.role, Boolean(dbUser.isFounder))"),
);
check(
  "Panel Admin tetap destination eksplisit founder",
  navigation.includes('href: "/admin"') &&
    navigation.includes('label: "Panel Admin"') &&
    navigation.includes('if (isFounder && context !== "admin")'),
);
check(
  "Panel Admin tersedia juga dari drawer mobile Guru",
  guruNav.includes("<RoleSections role={role} isFounder={isFounder} />"),
);

console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
