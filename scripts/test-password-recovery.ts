import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { NextRequest } from "next/server";
import { POST } from "../app/api/auth/forgot-password/route";
import { recoveryRedirect, RECOVERY_FAILURE, RECOVERY_SUCCESS } from "../lib/auth/password-recovery";

async function main() {
  process.env.APP_URL = "https://bahasacerdas.com";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-public-key";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.KV_REST_API_URL;
  assert.equal(recoveryRedirect(), "https://bahasacerdas.com/reset-password");
  assert.throws(() => recoveryRedirect({ APP_URL: "http://evil.example", NODE_ENV: "production" }));
  const originalFetch = globalThis.fetch;
  let providerStatus = 200;
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.pathname, "/auth/v1/recover");
    assert.equal(url.searchParams.get("redirect_to"), "https://bahasacerdas.com/reset-password");
    return new Response(JSON.stringify(providerStatus === 200 ? {} : { msg: "Error sending recovery email", code: "unexpected_failure" }), {
      status: providerStatus, headers: { "Content-Type": "application/json" },
    });
  };
  const request = (email: unknown, ip = "192.0.2.1") => POST(new NextRequest("https://bahasacerdas.com/api/auth/forgot-password", {
    method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ email }),
  }));
  try {
    const success = await request("teacher@example.com");
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), { message: RECOVERY_SUCCESS });
    const unknown = await request("unknown@example.com", "192.0.2.2");
    assert.deepEqual(await unknown.json(), { message: RECOVERY_SUCCESS });
    assert.equal((await request(42)).status, 400);
    assert.equal((await request("bad")).status, 400);
    await request("teacher@example.com");
    await request("teacher@example.com");
    const before = calls;
    const limited = await request("teacher@example.com", "192.0.2.3");
    assert.equal(limited.status, 429); // per-email across IPs
    assert.ok(Number(limited.headers.get("Retry-After")) > 0);
    assert.equal(calls, before);
    const ipLimited = await request("another@example.com");
    assert.equal(ipLimited.status, 429); // per-IP across emails
    providerStatus = 400;
    const failure = await request("provider@example.com", "192.0.2.4");
    assert.equal(failure.status, 503);
    assert.deepEqual(await failure.json(), { error: RECOVERY_FAILURE });
    providerStatus = 429;
    assert.equal((await request("limited@example.com", "192.0.2.5")).status, 429);
    // Concurrent requests cannot bypass the development limiter. Production uses
    // a single Redis script per bucket, tested by the same policy below.
    providerStatus = 200;
    const concurrent = await Promise.all(Array.from({ length: 8 }, () => request("race@example.com", "192.0.2.6")));
    assert.equal(concurrent.filter(r => r.status === 200).length, 3);
    assert.equal(concurrent.filter(r => r.status === 429).length, 5);
    const previews = execFileSync(process.execPath, ["scripts/preview-recovery-email.mjs"], { encoding: "utf8" }).trim().split("\n");
    assert.equal(previews.length, 2);
    for (const file of previews) {
      const rendered = readFileSync(file, "utf8");
      assert.ok(!rendered.includes("{{"));
      assert.ok(rendered.includes("https://bahasacerdas.com/reset-password#contoh-pratinjau"));
      assert.ok(Buffer.byteLength(rendered) < 100_000);
    }
    console.log("PASS: validation, redirects, generic success, provider failure, per-email/IP limits, concurrency, templates");
  } finally { globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
