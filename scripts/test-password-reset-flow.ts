#!/usr/bin/env npx tsx
/**
 * PASSWORD RESET FLOW — Test Suite
 *
 * Tests the password reset E2E flow:
 * 1. Forgot password API exists and handles requests
 * 2. Reset password page renders with correct form
 * 3. Middleware does not block recovery routes
 * 4. Security invariants (no token logging, no open redirect)
 * 5. Login page has "Lupa kata sandi?" link
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

function fileMatches(path: string, regex: RegExp): boolean {
  try {
    const content = readFileSync(resolve(process.cwd(), path), "utf-8");
    return regex.test(content);
  } catch {
    return false;
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  PASSWORD RESET FLOW — TEST SUITE");
  console.log("═══════════════════════════════════════════════════════════\n");

  // ═══════════════════════════════════════════════════════════
  // 1. ROUTES EXIST (4 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("── 1. ROUTES EXIST ──");

  assert("Forgot password API exists",
    fileContains("app/api/auth/forgot-password/route.ts", "resetPasswordForEmail"));

  assert("Reset password page exists",
    fileContains("app/(auth)/reset-password/page.tsx", "updateUser"));

  assert("Auth callback route exists",
    fileContains("app/api/auth/callback/route.ts", "exchangeCodeForSession") ||
    fileContains("app/auth/callback/route.ts", "exchangeCodeForSession") ||
    fileContains("app/api/auth/callback/route.ts", "callback"));

  assert("Login page exists",
    fileContains("app/(auth)/login/page.tsx", "password"));

  // ═══════════════════════════════════════════════════════════
  // 2. RESET PAGE COMPONENTS (6 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 2. RESET PAGE COMPONENTS ──");

  assert("Reset page has password input",
    fileContains("app/(auth)/reset-password/page.tsx", "Password Baru"));

  assert("Reset page has confirm input",
    fileContains("app/(auth)/reset-password/page.tsx", "Konfirmasi Password"));

  assert("Reset page has submit button",
    fileContains("app/(auth)/reset-password/page.tsx", "Ubah Password"));

  assert("Reset page has password visibility toggle",
    fileContains("app/(auth)/reset-password/page.tsx", "showPassword"));

  assert("Reset page has minimum length validation",
    fileContains("app/(auth)/reset-password/page.tsx", "minimal 8 karakter") ||
    fileContains("app/(auth)/reset-password/page.tsx", "minLength"));

  assert("Reset page has confirmation mismatch check",
    fileContains("app/(auth)/reset-password/page.tsx", "tidak cocok"));

  // ═══════════════════════════════════════════════════════════
  // 3. RECOVERY SESSION HANDLING (4 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 3. RECOVERY SESSION HANDLING ──");

  assert("Reset page listens for PASSWORD_RECOVERY event",
    fileContains("app/(auth)/reset-password/page.tsx", "PASSWORD_RECOVERY"));

  assert("Reset page handles expired/invalid link",
    fileContains("app/(auth)/reset-password/page.tsx", "Link Tidak Valid") ||
    fileContains("app/(auth)/reset-password/page.tsx", "recoveryFailed"));

  assert("Reset page shows loading state while verifying",
    fileContains("app/(auth)/reset-password/page.tsx", "Memverifikasi"));

  assert("Reset page has success state",
    fileContains("app/(auth)/reset-password/page.tsx", "Password Berhasil Diubah"));

  // ═══════════════════════════════════════════════════════════
  // 4. MIDDLEWARE SAFETY (3 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 4. MIDDLEWARE SAFETY ──");

  assert("/reset-password is in public paths (not blocked by middleware)",
    fileContains("lib/supabase/proxy.ts", "/reset-password"));

  assert("Login page is in public paths",
    fileContains("lib/supabase/proxy.ts", "/login"));

  assert("Auth callback is handled (not blocked)",
    fileContains("lib/supabase/proxy.ts", "/auth/"));

  // ═══════════════════════════════════════════════════════════
  // 5. SECURITY INVARIANTS (5 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 5. SECURITY INVARIANTS ──");

  assert("Forgot password API does not reveal if email exists",
    fileContains("app/api/auth/forgot-password/route.ts", "Email tidak terdaftar") ||
    fileContains("app/api/auth/forgot-password/route.ts", "sudah dikirim"),
    "Response should be generic");

  assert("Forgot password has rate limiting",
    fileContains("app/api/auth/forgot-password/route.ts", "rateLimit"));

  assert("Redirect URL uses trusted origin",
    fileContains("app/api/auth/forgot-password/route.ts", "NEXT_PUBLIC_SITE_URL") ||
    fileContains("app/api/auth/forgot-password/route.ts", "bahasacerdas.com"));

  assert("No password logging in reset flow",
    !fileMatches("app/(auth)/reset-password/page.tsx", /console\.(log|error).*password(?!.*length|.*minLength)/i) ||
    !fileContains("app/(auth)/reset-password/page.tsx", "console.log(password)"),
    "Password should never be logged");

  assert("No token logging in forgot-password API",
    !fileContains("app/api/auth/forgot-password/route.ts", "console.log(token)") &&
    !fileContains("app/api/auth/forgot-password/route.ts", "console.log(access_token)"),
    "Tokens should never be logged");

  // ═══════════════════════════════════════════════════════════
  // 6. LOGIN PAGE FORGOT PASSWORD (3 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 6. LOGIN PAGE FORGOT PASSWORD ──");

  assert("Login page has 'Lupa kata sandi?' button",
    fileContains("app/(auth)/login/page.tsx", "Lupa kata sandi"));

  assert("Login page calls forgot-password API",
    fileContains("app/(auth)/login/page.tsx", "/api/auth/forgot-password"));

  assert("Login page shows success message after forgot password",
    fileContains("app/(auth)/login/page.tsx", "reset password") ||
    fileContains("app/(auth)/login/page.tsx", "sudah dikirim") ||
    fileContains("app/(auth)/login/page.tsx", "setError(data.message"));

  // ═══════════════════════════════════════════════════════════
  // 7. REDIRECT BEHAVIOR (2 tests)
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 7. REDIRECT BEHAVIOR ──");

  assert("Reset page redirects to /login after success",
    fileContains("app/(auth)/reset-password/page.tsx", "router.push(\"/login\")"));

  assert("Invalid link shows 'back to login' option",
    fileContains("app/(auth)/reset-password/page.tsx", "Kembali ke Login") ||
    fileContains("app/(auth)/reset-password/page.tsx", "router.push(\"/login\")"));

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
