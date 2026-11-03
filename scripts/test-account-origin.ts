/**
 * Origin allowlist for account mutations (hapus akun, ganti password, kode email).
 * Regression: standalone `node server.js` with HOSTNAME=0.0.0.0 behind Caddy
 * reports req.nextUrl.origin = https://0.0.0.0:3000, so the old exact
 * `origin === req.nextUrl.origin` check rejected every real browser request (403).
 */
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { allowedOrigins, forwardedOrigin, isAllowedOrigin, normalizeOrigin, publicOrigin } from "../lib/http/origin";

const PROD = { NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://www.bahasacerdas.com" };
const PROD_NO_URL = { NODE_ENV: "production" };
const DEV = { NODE_ENV: "development" };

// What the standalone server sees behind Caddy in production.
function standalone(origin: string | null, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { host: "www.bahasacerdas.com", "x-forwarded-proto": "https", "x-forwarded-host": "www.bahasacerdas.com", ...extra };
  if (origin !== null) headers.origin = origin;
  return new NextRequest("https://0.0.0.0:3000/api/user/account", { method: "DELETE", headers });
}

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed++; console.log(`PASS ${name}`); }

test("standalone 0.0.0.0 bind address is what nextUrl reports (precondition)", () => {
  assert.equal(standalone("https://www.bahasacerdas.com").nextUrl.origin, "https://0.0.0.0:3000");
});
test("forwarded headers reconstruct the public origin", () => {
  assert.equal(forwardedOrigin(standalone(null)), "https://www.bahasacerdas.com");
  assert.equal(forwardedOrigin(standalone(null, { "x-forwarded-proto": "https, http", "x-forwarded-host": "www.bahasacerdas.com, internal:3000" })), "https://www.bahasacerdas.com");
  const hostOnly = new NextRequest("https://0.0.0.0:3000/x", { headers: { host: "www.bahasacerdas.com", "x-forwarded-proto": "https" } });
  assert.equal(forwardedOrigin(hostOnly), "https://www.bahasacerdas.com");
});
test("standalone + forwarded headers: www origin accepted (with and without site URL env)", () => {
  assert.equal(isAllowedOrigin(standalone("https://www.bahasacerdas.com"), PROD), true);
  assert.equal(isAllowedOrigin(standalone("https://www.bahasacerdas.com"), PROD_NO_URL), true);
  assert.equal(isAllowedOrigin(standalone("https://bahasacerdas.com"), PROD), true);
});
test("foreign origin rejected", () => {
  assert.equal(isAllowedOrigin(standalone("https://evil.example"), PROD), false);
  assert.equal(isAllowedOrigin(standalone("https://www.bahasacerdas.com.evil.example"), PROD), false);
  assert.equal(isAllowedOrigin(standalone("https://evilbahasacerdas.com"), PROD), false);
});
test("spoofed forwarded host cannot extend the allowlist in production", () => {
  const spoof = standalone("https://evil.example", { host: "evil.example", "x-forwarded-host": "evil.example" });
  assert.equal(isAllowedOrigin(spoof, PROD), false);
  assert.equal(allowedOrigins(spoof, PROD).has("https://evil.example"), false);
  const loopSpoof = standalone("http://localhost:3000", { host: "localhost:3000", "x-forwarded-host": "localhost:3000", "x-forwarded-proto": "http" });
  assert.equal(isAllowedOrigin(loopSpoof, PROD), false);
});
test("bind address, wrong scheme, missing, null and malformed origins rejected", () => {
  assert.equal(isAllowedOrigin(standalone("https://0.0.0.0:3000"), PROD), false);
  assert.equal(isAllowedOrigin(standalone("http://www.bahasacerdas.com"), PROD), false);
  assert.equal(isAllowedOrigin(standalone(null), PROD), false);
  assert.equal(isAllowedOrigin(standalone("null"), PROD), false);
  assert.equal(isAllowedOrigin(standalone("https://www.bahasacerdas.com/"), PROD), false);
  assert.equal(isAllowedOrigin(standalone("https://user:pw@www.bahasacerdas.com"), PROD), false);
  assert.equal(isAllowedOrigin(standalone("javascript:alert(1)"), PROD), false);
});
test("configured app URL is allowlisted; insecure non-loopback config ignored in production", () => {
  assert.equal(isAllowedOrigin(standalone("https://staging.bahasacerdas.com"), { ...PROD, APP_URL: "https://staging.bahasacerdas.com/path" }), true);
  assert.equal(isAllowedOrigin(standalone("http://staging.example"), { ...PROD, NEXT_PUBLIC_APP_URL: "http://staging.example" }), false);
  assert.equal(isAllowedOrigin(standalone("http://localhost:3999"), { ...PROD, NEXT_PUBLIC_APP_URL: "http://localhost:3999" }), true);
});
test("development: own loopback origin accepted, foreign still rejected", () => {
  const dev = (origin: string) => new NextRequest("http://localhost:3000/api/user/password", { method: "POST", headers: { origin, host: "localhost:3000" } });
  assert.equal(isAllowedOrigin(dev("http://localhost:3000"), DEV), true);
  assert.equal(isAllowedOrigin(dev("http://localhost:4000"), DEV), false);
  assert.equal(isAllowedOrigin(dev("https://evil.example"), DEV), false);
});
test("publicOrigin never leaks the bind address", () => {
  assert.equal(publicOrigin(standalone(null), PROD), "https://www.bahasacerdas.com");
  assert.equal(publicOrigin(standalone(null), PROD_NO_URL), "https://www.bahasacerdas.com");
  assert.equal(publicOrigin(standalone(null, { host: "evil.example", "x-forwarded-host": "evil.example" }), PROD_NO_URL), "https://www.bahasacerdas.com");
  assert.equal(publicOrigin(standalone(null), { ...PROD, NEXT_PUBLIC_APP_URL: "https://bahasacerdas.com/" }), "https://bahasacerdas.com");
});
test("normalizeOrigin", () => {
  assert.equal(normalizeOrigin("https://www.bahasacerdas.com/a?b"), "https://www.bahasacerdas.com");
  assert.equal(normalizeOrigin("ftp://x"), null);
  assert.equal(normalizeOrigin("http://x", false), null);
});
console.log(`account-origin: ${passed} tests passed`);
