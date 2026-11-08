import assert from "node:assert/strict";
import { mobileOAuthHandoff } from "../lib/auth/mobile-oauth-handoff";

async function main() {
  for (const flow of ["login", "register"] as const) {
    const response = mobileOAuthHandoff({
      code: "dummy-one-time-code",
      next: "/guru/beranda",
      flow,
    });
    const html = await response.text();
    assert.equal(response.status, 200, `${flow}: callback should hand off to Android`);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.match(response.headers.get("content-security-policy") ?? "", /script-src 'nonce-/);
    assert.match(html, /bahasacerdas:\/\/oauth\/callback/);
    assert.match(html, /code=dummy-one-time-code/);
    assert.match(html, /next=%2Fguru%2Fberanda/);
    assert.match(html, /Buka aplikasi BahasaCerdas/);
  }

  const blockedNext = mobileOAuthHandoff({
    code: "dummy-one-time-code",
    next: "https://attacker.example/steal",
    flow: "login",
  });
  const blockedHtml = await blockedNext.text();
  assert.doesNotMatch(blockedHtml, /attacker\.example/);

  const invalidCode = mobileOAuthHandoff({
    code: "bad\ncode",
    next: "/",
    flow: "login",
  });
  assert.equal(invalidCode.status, 400);

  const oversized = mobileOAuthHandoff({
    code: "a".repeat(2049),
    next: "/",
    flow: "login",
  });
  assert.equal(oversized.status, 400);

  // Route handlers depend on React server context, which a standalone tsx
  // test cannot instantiate. Check their guarded wiring without importing them.
  const { readFileSync } = await import("node:fs");
  for (const [path, flow] of [
    ["app/api/auth/callback/route.ts", "login"],
    ["app/auth/callback/route.ts", "register"],
  ] as const) {
    const route = readFileSync(path, "utf8");
    assert.match(route, /requestUrl\.searchParams\.get\("bc_app"\) === "1"/);
    assert.ok(
      route.includes('mobileOAuthHandoff({ code, next, flow: "' + flow + '" })'),
      path + ": OAuth handoff must be explicit",
    );
    assert.ok(
      route.indexOf("mobileOAuthHandoff({ code, next") <
        route.indexOf("exchangeCodeForSession(code)"),
      path + ": Android handoff must precede server PKCE exchange",
    );
  }
  const middleware = readFileSync("middleware.ts", "utf8");
  assert.match(middleware, /const androidOAuthHandoff = pathname === "\/auth\/callback"/);
  assert.match(middleware, /pathname\.startsWith\("\/api\/"\) \|\| androidOAuthHandoff/);

  console.log("PASS: Android OAuth handoff, route wiring, middleware CSP guard, secure headers, invalid-code rejection");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
