// Pre-generate auth tokens for all 100 load test users
// Saves to tests/load/auth-tokens.json for k6 to read
//
// Usage: npx tsx scripts/seed-local-auth-tokens.ts

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const USER_COUNT = 100;
const PASSWORD = "Test123!";
const OUTPUT = path.resolve("tests/load/auth-tokens.json");

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const tokens: Record<string, { email: string; token: string; refreshToken: string }> = {};

  let success = 0;
  let failed = 0;

  for (let i = 1; i <= USER_COUNT; i++) {
    const email = `loadtest_${String(i).padStart(3, "0")}@example.com`;
    const key = `user_${i}`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: PASSWORD,
      });

      if (error || !data.session?.access_token) {
        console.error(`✗ ${email}: ${error?.message || "no token"}`);
        failed++;
        continue;
      }

      tokens[key] = {
        email,
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
      success++;

      if (i % 10 === 0) {
        console.log(`✓ ${i}/${USER_COUNT} done (${success} ok, ${failed} fail)`);
      }
    } catch (err) {
      console.error(`✗ ${email}: ${err}`);
      failed++;
    }
  }

  // Write tokens to file
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(tokens, null, 2));

  console.log(`\nDone: ${success} success, ${failed} failed`);
  console.log(`Tokens saved to ${OUTPUT}`);

  if (failed > 0) process.exit(1);
}

main();
