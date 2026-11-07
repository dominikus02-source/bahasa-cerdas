import assert from "node:assert/strict";
import { mobileOAuthHandoff } from "../lib/auth/mobile-oauth-handoff";

async function main() {
  const accepted = mobileOAuthHandoff({
    code: "one-time-code",
    next: "/jumpa/room-123",
    flow: "login",
  });
  assert.equal(accepted.status, 200);
  assert.match(accepted.headers.get("cache-control") || "", /no-store/);
  assert.equal(accepted.headers.get("referrer-policy"), "no-referrer");
  assert.match(accepted.headers.get("content-security-policy") || "", /script-src 'nonce-/);
  const body = await accepted.text();
  assert.match(body, /bahasacerdas:\/\/oauth\/callback\?code=one-time-code/);
  assert.match(body, /flow=login/);
  assert.match(body, /next=%2Fjumpa%2Froom-123/);
  assert.doesNotMatch(body, /access_token|refresh_token/);

  const unsafe = mobileOAuthHandoff({ code: "once", next: "//evil.example", flow: "register" });
  const unsafeBody = await unsafe.text();
  assert.match(unsafeBody, /flow=register/);
  assert.doesNotMatch(unsafeBody, /evil\.example/);

  for (const badCode of ["", "x".repeat(2049), "\n", "\u007f"]) {
    const rejected = mobileOAuthHandoff({ code: badCode, next: null, flow: "login" });
    assert.equal(rejected.status, 400);
  }
  console.log("PASS: 6 mobile Google OAuth handoff checks");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
