// Staging load test data seed — creates users, question banks, and cookies
// for cloud staging load tests.
//
// SAFETY:
// - Dry-run by default (--execute to apply)
// - Refuses to run if SUPABASE_URL is production project ref (unless OVERRIDE=true)
// - Only seeds data with staging_ / loadtest_ prefix
//
// Usage:
//   SOURCE env vars from .env.staging.cloud or set manually:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     DATABASE_URL=... DIRECT_URL=... \
//     npx tsx scripts/seed-staging-loadtest.ts --execute

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// ── Config ──
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const DATABASE_URL = process.env.DATABASE_URL || "";
const DIRECT_URL = process.env.DIRECT_URL || "";
const USER_COUNT = 100;
const PASSWORD = "Test123!";
const MURID_PREFIX = "loadtest_murid_";
const GURU_PREFIX = "loadtest_guru_";
const DOMAIN = "example.com";
const TOKEN_OUTPUT = path.resolve("tests/load/.tokens.staging.json");
const EXECUTE = process.argv.includes("--execute");
const DRY_RUN = !EXECUTE;

// Safety: verify this is NOT production
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
const IS_PRODUCTION = PROJECT_REF === "ibtlhoocaoopgtcsnvzr";
if (IS_PRODUCTION) {
  console.error("❌ SAFETY BLOCK: Production Supabase detected. This script is for staging only.");
  process.exit(1);
}

async function main() {
  console.log(`🌱 Staging Load Test Seed — ${DRY_RUN ? "DRY RUN" : "EXECUTE"}`);
  console.log(`   Project: ${PROJECT_REF}`);
  console.log(`   Users: ${USER_COUNT} (${MURID_PREFIX}* + ${GURU_PREFIX}*)\n`);

  if (DRY_RUN) {
    console.log("   Dry-run mode. Pass --execute to apply.");
  }

  // ── 1. Create Supabase Auth users ──
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const usersToCreate: { email: string; password: string; role: string }[] = [];
  for (let i = 1; i <= USER_COUNT; i++) {
    const num = String(i).padStart(3, "0");
    usersToCreate.push({
      email: `${MURID_PREFIX}${num}@${DOMAIN}`,
      password: PASSWORD,
      role: "MURID",
    });
    if (i <= 5) {
      usersToCreate.push({
        email: `${GURU_PREFIX}${num}@${DOMAIN}`,
        password: PASSWORD,
        role: "GURU",
      });
    }
  }

  console.log(`   Creating ${usersToCreate.length} auth users...`);
  const createdAuthUsers: { id: string; email: string; role: string }[] = [];

  for (const u of usersToCreate) {
    if (!DRY_RUN) {
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { role: u.role, source: "loadtest" },
        });
        if (error) {
          console.warn(`   ⚠️  ${u.email}: ${error.message}`);
          continue;
        }
        if (data?.user) {
          createdAuthUsers.push({ id: data.user.id, email: u.email, role: u.role });
        }
      } catch (e: any) {
        console.warn(`   ⚠️  ${u.email}: ${e?.message || e}`);
      }
    } else {
      createdAuthUsers.push({ id: `dry-run-${u.email}`, email: u.email, role: u.role });
    }
  }
  console.log(`   ✅ ${createdAuthUsers.length} auth users created\n`);

  // ── 2. Create Prisma User records + generate cookies ──
  const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
  const cookies: Record<string, { email: string; cookie: string; role: string }> = {};

  console.log("   Creating Prisma User records and generating cookies...");
  for (const au of createdAuthUsers) {
    if (!DRY_RUN) {
      // Upsert User record
      await prisma.user.upsert({
        where: { email: au.email },
        create: {
          supabaseId: au.id,
          email: au.email,
          fullName: au.email.split("@")[0],
          role: au.role as any,
          isPremium: false,
          isFounder: false,
        },
        update: { supabaseId: au.id },
      });

      // Generate SSR cookie via sign-in
      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: au.email,
          password: PASSWORD,
        });
        if (signInError) {
          console.warn(`   ⚠️  Cookie gen failed for ${au.email}: ${signInError.message}`);
          continue;
        }
        if (signInData?.session) {
          // Build the SSR cookie string
          const cookieStr = `sb-${PROJECT_REF}-auth-token=${Buffer.from(JSON.stringify({
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
            expires_at: Math.floor(new Date(signInData.session.expires_at || Date.now() + 3600000).getTime() / 1000),
            expires_in: 3600,
            token_type: "bearer",
            user: signInData.session.user,
          })).toString("base64url")}`;

          cookies[`user_${au.email.split("@")[0]}`] = {
            email: au.email,
            cookie: cookieStr,
            role: au.role,
          };
        }
      } catch (e: any) {
        console.warn(`   ⚠️  Cookie gen error for ${au.email}: ${e?.message || e}`);
      }
    }
  }

  if (!DRY_RUN && Object.keys(cookies).length > 0) {
    fs.mkdirSync(path.dirname(TOKEN_OUTPUT), { recursive: true });
    fs.writeFileSync(TOKEN_OUTPUT, JSON.stringify(cookies, null, 2));
    console.log(`   ✅ ${Object.keys(cookies).length} cookies saved to ${TOKEN_OUTPUT}`);
  } else if (DRY_RUN) {
    console.log(`   📝 Would generate ~${createdAuthUsers.length} cookies → ${TOKEN_OUTPUT}`);
  }

  await prisma.$disconnect();

  // ── Summary ──
  console.log(`\n📊 Summary:`);
  console.log(`   Auth users: ${createdAuthUsers.length}`);
  console.log(`   Cookies: ${Object.keys(cookies).length}`);
  console.log(`   Output: ${TOKEN_OUTPUT}`);
  console.log(`   Mode: ${DRY_RUN ? "DRY RUN (pass --execute to apply)" : "EXECUTED"}`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
