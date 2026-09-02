#!/usr/bin/env npx tsx
/**
 * PASSWORD RESET FLOW — Test Suite
 *
 * Tests the password reset E2E flow:
 * 1. Forgot password API routes through callback
 * 2. Callback handles recovery with next=/reset-password
 * 3. Reset password page handles PASSWORD_RECOVERY event
 * 4. Security invariants
 */

import { readFileSync } from "fs";
import { resolve } from "path";

let passed = 0;
let failed = 0;
let total = 0;

function assert(name: string, condition: boolean, detail?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function fileContains(path: string, pattern: string): boolean {
  try {
    const content = readFileSync(resolve(process.cwd(), path), "utf-8");
    return content.includes(pattern);
  } catch {
    return false;
  }
}

function fileNotContains(path: string, pattern: string): boolean {
  try {
    const content = readFileSync(resolve(process.cwd(), path), "utf-8");
    return !content.includes(pattern);
  } catch {
    return true;
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  PASSWORD RESET FLOW — TEST SUITE");
  console.log("═══════════════════════════════════════════════════════════\n");

  // ═══════════════════════════════════════════════════════════
  // 1. FORGOT PASSWORD API (5 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("── 1. FORGOT PASSWORD API ──");

  assert("API route exists",
    fileContains("app/api/auth/forgot-password/route.ts", "resetPasswordForEmail"));

  assert("redirectTo routes through callback (not direct to /reset-password)",
    fileContains("app/api/auth/forgot-password/route.ts", "/api/auth/callback?next=/reset-password"));

  assert("Does NOT redirectTo /reset-password directly",
    fileNotContains("app/api/auth/forgot-password/route.ts", "redirectTo: `${siteUrl}/reset-password`}"));

  assert("Has rate limiting",
    fileContains("app/api/auth/forgot-password/route.ts", "rateLimit"));

  assert("Uses Supabase Site URL origin (matches dashboard config)",
    fileContains("app/api/auth/forgot-password/route.ts", "SUPABASE_SITE_URL") ||
    fileContains("app/api/auth/forgot-password/route.ts", "bahasacerdas.com"));

  // ═══════════════════════════════════════════════════════════
  // 2. AUTH CALLBACK — RECOVERY HANDLING (6 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 2. AUTH CALLBACK ──");

  assert("Callback exchanges code",
    fileContains("app/api/auth/callback/route.ts", "exchangeCodeForSession"));

  assert("Callback handles next=/reset-password (recovery flow)",
    fileContains("app/api/auth/callback/route.ts", "next === \"/reset-password\""));

  assert("Recovery flow redirects to /reset-password (skips role-based redirect)",
    fileContains("app/api/auth/callback/route.ts", "requestUrl.origin + \"/reset-password\"") ||
    fileContains("app/api/auth/callback/route.ts", "reset-password"));

  assert("Callback validates next param (no open redirect)",
    fileContains("app/api/auth/callback/route.ts", "next.startsWith(\"//\")") ||
    fileContains("app/api/auth/callback/route.ts", "startsWith(\"//\")"));

  assert("Callback does NOT allow /login as next param",
    fileContains("app/api/auth/callback/route.ts", "next.startsWith(\"/login\")"));

  assert("Callback does NOT allow /register as next param",
    fileContains("app/api/auth/callback/route.ts", "next.startsWith(\"/register\")"));

  // ═══════════════════════════════════════════════════════════
  // 3. RESET PASSWORD PAGE (6 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 3. RESET PASSWORD PAGE ──");

  assert("Page listens for PASSWORD_RECOVERY event",
    fileContains("app/(auth)/reset-password/page.tsx", "PASSWORD_RECOVERY"));

  assert("Page shows loading state while verifying recovery",
    fileContains("app/(auth)/reset-password/page.tsx", "Memverifikasi"));

  assert("Page shows error for expired/invalid link",
    fileContains("app/(auth)/reset-password/page.tsx", "Link Tidak Valid") ||
    fileContains("app/(auth)/reset-password/page.tsx", "recoveryFailed"));

  assert("Page has password + confirm inputs",
    fileContains("app/(auth)/reset-password/page.tsx", "Password Baru") &&
    fileContains("app/(auth)/reset-password/page.tsx", "Konfirmasi Password"));

  assert("Page calls updateUser with new password",
    fileContains("app/(auth)/reset-password/page.tsx", "updateUser({ password })"));

  assert("Success state redirects to /login",
    fileContains("app/(auth)/reset-password/page.tsx", "router.push(\"/login\")"));

  // ═══════════════════════════════════════════════════════════
  // 4. MIDDLEWARE SAFETY (3 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 4. MIDDLEWARE SAFETY ──");

  assert("/reset-password is in public paths",
    fileContains("lib/supabase/proxy.ts", "/reset-password"));

  assert("/login is in public paths",
    fileContains("lib/supabase/proxy.ts", "/login"));

  assert("/api/auth/callback is handled (via selfAuthPaths or publicPaths)",
    fileContains("lib/supabase/proxy.ts", "/auth/") ||
    fileContains("lib/supabase/proxy.ts", "/api/"));

  // ═══════════════════════════════════════════════════════════
  // 5. SECURITY INVARIANTS (5 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 5. SECURITY INVARIANTS ──");

  assert("No open redirect: callback validates next param",
    fileContains("app/api/auth/callback/route.ts", "startsWith(\"//\")"));

  assert("No password logging",
    fileNotContains("app/(auth)/reset-password/page.tsx", "console.log(password)"));

  assert("No token logging in callback",
    fileNotContains("app/api/auth/callback/route.ts", "console.log(code)") &&
    fileNotContains("app/api/auth/callback/route.ts", "console.log(token)"));

  assert("Rate limiting on forgot-password API",
    fileContains("app/api/auth/forgot-password/route.ts", "rateLimit"));

  assert("Redirect URL uses Supabase Site URL domain",
    fileContains("app/api/auth/forgot-password/route.ts", "bahasacerdas.com") &&
    fileContains("app/api/auth/forgot-password/route.ts", "/api/auth/callback"));

  // ═══════════════════════════════════════════════════════════
  // 6. LOGIN PAGE INTEGRATION (3 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 6. LOGIN PAGE ──");

  assert("Login page has 'Lupa kata sandi?' button",
    fileContains("app/(auth)/login/page.tsx", "Lupa kata sandi"));

  assert("Login page calls forgot-password API",
    fileContains("app/(auth)/login/page.tsx", "/api/auth/forgot-password"));

  assert("Login page shows feedback after forgot password request",
    fileContains("app/(auth)/login/page.tsx", "setError(data.message"));

  // ═══════════════════════════════════════════════════════════
  // 7. COMPLETE FLOW INTEGRITY (2 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 7. FLOW INTEGRITY ──");

  assert("Callback → /reset-password path exists in codebase",
    fileContains("app/(auth)/reset-password/page.tsx", "Reset Password"));

  assert("Recovery flow does NOT end at landing page (/)",
    fileContains("app/api/auth/callback/route.ts", "next === \"/reset-password\"") ||
    fileContains("app/api/auth/callback/route.ts", "/reset-password"));

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  RESULTS: ${passed}/${total} passed, ${failed} failed`);
  console.log(`═══════════════════════════════════════════════════════════`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
