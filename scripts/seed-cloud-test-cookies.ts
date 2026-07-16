// Seed cloud test auth cookies for Vercel Preview load tests
//
// Generates Supabase SSR auth cookies for N test users using the Admin API
// (service role key). Saves cookies to tests/load/.tokens.cloud.json
// for k6 to read via open().
//
// SAFETY:
// - Dry-run by default (--execute to apply)
// - Refuses production unless ALLOW_PRODUCTION_LOAD_TEST=true
// - Only touches users with loadtest_ prefix
//
// Usage:
//   ALLOW_PRODUCTION_LOAD_TEST=true SUPABASE_SERVICE_ROLE_KEY="..." \
//     npx tsx scripts/seed-cloud-test-cookies.ts --count=10 --execute
//   ALLOW_PRODUCTION_LOAD_TEST=true SUPABASE_SERVICE_ROLE_KEY="..." \
//     npx tsx scripts/seed-cloud-test-cookies.ts --count=20 --execute
//   ALLOW_PRODUCTION_LOAD_TEST=true SUPABASE_SERVICE_ROLE_KEY="..." \
//     npx tsx scripts/seed-cloud-test-cookies.ts --count=20 --execute --overwrite-existing

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ── Config ──
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const PASSWORD = "Test123!";
const PREFIX = "loadtest_";
const DOMAIN = "example.com";
const OUTPUT_FILE = path.resolve("tests/load/.tokens.cloud.json");
const OVERWRITE_EXISTING = process.argv.includes("--overwrite-existing");

// Parse args
const COUNT_ARG = process.argv.find(a => a.startsWith("--count="));
const USER_COUNT = COUNT_ARG ? parseInt(COUNT_ARG.split("=")[1], 10) : 10;
const EXECUTE = process.argv.includes("--execute");
const DRY_RUN = !EXECUTE;

// Safety: refuse production unless explicitly allowed
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
const IS_PRODUCTION = PROJECT_REF && !["127.0.0.1", "localhost"].includes(PROJECT_REF);
const ALLOW_PRODUCTION = process.env.ALLOW_PRODUCTION_LOAD_TEST === "true";

if (IS_PRODUCTION && !ALLOW_PRODUCTION) {
  console.error(`
  ❌ SAFETY BLOCK: Production Supabase detected (${PROJECT_REF}).
  Set ALLOW_PRODUCTION_LOAD_TEST=true to confirm you want to run this against production.
  This will create ${USER_COUNT} test users (loadtest_*@${DOMAIN}) in Supabase Auth.
  `);
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is required. Set it via env var.");
  process.exit(1);
}

// ── Helpers ──
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function getProjectRef(url: string): string {
  const m = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return m ? m[1] : 
    url.includes("127.0.0.1") ? "local" : 
    url.includes("localhost") ? "local" : "unknown";
}

const PROJECT_REF_SHORT = getProjectRef(SUPABASE_URL);

// Supabase SSR cookie format: sb-<ref>-auth-token = base64-<base64url(json)>
function buildSsrCookie(session: any): string {
  if (!session?.access_token) return "";
  const cookiePayload = {
    access_token: session.access_token,
    token_type: session.token_type || "bearer",
    expires_in: session.expires_in || 3600,
    expires_at: session.expires_at || Math.floor(Date.now() / 1000) + 3600,
    refresh_token: session.refresh_token || "",
    user: session.user || null,
  };
  const json = JSON.stringify(cookiePayload);
  const base64 = Buffer.from(json).toString("base64url");
  return `base64-${base64}`;
}

function emailFor(i: number): string {
  return `${PREFIX}${String(i).padStart(3, "0")}@${DOMAIN}`;
}

// ── Main ──
async function main() {
  console.log(`\n🔑 Cloud Test Cookie Generator`);
  console.log(`   Target:       ${SUPABASE_URL}`);
  console.log(`   Users:        ${USER_COUNT}`);
  console.log(`   Mode:         ${DRY_RUN ? "DRY RUN (use --execute to apply)" : "EXECUTE"}`);
  console.log(`   Output:       ${OUTPUT_FILE}`);
  console.log(`   Production:   ${IS_PRODUCTION ? (ALLOW_PRODUCTION ? "✅ ALLOWED" : "❌ BLOCKED") : "✅ Local"}`);
  console.log(`   Overwrite:    ${OVERWRITE_EXISTING ? "yes" : "no"}\n`);

  // Load existing cookies if any
  let existing: Record<string, { email: string; cookie: string; expiresAt: number }> = {};
  if (fs.existsSync(OUTPUT_FILE) && !OVERWRITE_EXISTING) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
      console.log(`   Found ${Object.keys(existing).length} existing cookies in ${OUTPUT_FILE}`);
    } catch { /* ignore */ }
  }

  const cookies: Record<string, { email: string; cookie: string; expiresAt: number }> = { ...existing };
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 1; i <= USER_COUNT; i++) {
    const email = emailFor(i);
    const key = `user_${i}`;

    // Skip if already exists and not overwriting
    if (cookies[key] && !OVERWRITE_EXISTING) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] Would create/get session for ${email}`);
      created++;
      continue;
    }

    try {
      // Step 1: Ensure user exists via Admin API (create if not exists)
      const { data: existingUser, error: lookupError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
      
      if (lookupError || !existingUser?.user) {
        // Create user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { role: "MURID", source: "loadtest" },
        });

        if (createError) {
          console.error(`  ✗ ${email}: create failed - ${createError.message}`);
          failed++;
          continue;
        }
        console.log(`  ✓ ${email}: created`);
      } else {
        console.log(`  ✓ ${email}: already exists`);
      }

      // Step 2: Sign in to get session
      const userClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
      const { data, error: loginError } = await userClient.auth.signInWithPassword({
        email,
        password: PASSWORD,
      });

      if (loginError || !data.session) {
        console.error(`  ✗ ${email}: login failed - ${loginError?.message || "no session"}`);
        failed++;
        continue;
      }

      // Step 3: Build SSR cookie
      const cookie = buildSsrCookie(data.session);
      if (!cookie) {
        console.error(`  ✗ ${email}: failed to build cookie`);
        failed++;
        continue;
      }

      cookies[key] = {
        email,
        cookie: `sb-${PROJECT_REF_SHORT}-auth-token=${cookie}`,
        expiresAt: data.session.expires_at || Math.floor(Date.now() / 1000) + 3600,
      };
      created++;

      if (i % 5 === 0) {
        console.log(`   Progress: ${i}/${USER_COUNT} (${created} ok, ${failed} fail, ${skipped} skip)`);
      }
    } catch (err) {
      console.error(`  ✗ ${email}: unexpected error - ${err}`);
      failed++;
    }

    // Small delay to avoid overwhelming API
    if (!DRY_RUN) await new Promise(r => setTimeout(r, 200));
  }

  // Write output
  if (!DRY_RUN) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cookies, null, 2));
    console.log(`\n✅ Cookies saved to ${OUTPUT_FILE}`);
  } else {
    console.log(`\n[DRY RUN] Would save ${created} cookies to ${OUTPUT_FILE}`);
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created:   ${created}`);
  console.log(`   Skipped:   ${skipped}`);
  console.log(`   Failed:    ${failed}`);
  console.log(`   Total:     ${Object.keys(cookies).length} in output`);

  if (failed > 0 && !DRY_RUN) process.exit(1);
}

main().catch(console.error);
