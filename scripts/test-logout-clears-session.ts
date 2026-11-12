import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { authCookieExpireHeaders } from "../lib/auth/expire-auth-cookies";
import { leaveAccount, pathAfterLogout } from "../lib/auth/leave-account";
import { resumeLoginSession } from "../lib/auth/resume-login-session";

let count = 0;

function source(path: string) {
  return readFileSync(path, "utf8");
}

async function run() {
  assert.equal(pathAfterLogout("/login"), "/login?logged_out=1"); count++;
  assert.equal(pathAfterLogout("/arena/login"), "/arena/login?logged_out=1"); count++;
  assert.equal(pathAfterLogout("//evil.example"), "/login?logged_out=1"); count++;

  const headers = authCookieExpireHeaders(
    ["sb-xxxx-auth-token", "sb-xxxx-auth-token.0", "theme", "supabase-auth-token"],
    "www.bahasacerdas.com",
  );
  assert.equal(headers.some((h) => h.startsWith("theme=")), false); count++;
  for (const name of ["sb-xxxx-auth-token", "sb-xxxx-auth-token.0", "supabase-auth-token"]) {
    const hostOnly = headers.filter((h) => h.startsWith(`${name}=`) && !h.includes("Domain="));
    const domain = headers.filter((h) => h.startsWith(`${name}=`) && h.includes("Domain=.bahasacerdas.com"));
    assert.equal(hostOnly.length, 1, `host-only expiry missing for ${name}`);
    assert.equal(domain.length, 1, `domain expiry missing for ${name}`);
    assert.match(hostOnly[0], /Max-Age=0/);
    assert.match(hostOnly[0], /Path=\//);
    assert.match(domain[0], /Max-Age=0/);
    assert.match(domain[0], /Secure/);
    count++;
  }
  const local = authCookieExpireHeaders(["sb-xxxx-auth-token"], "localhost:3000");
  assert.equal(local.length, 1);
  assert.equal(local[0].includes("Domain="), false);
  assert.equal(local[0].includes("Secure"), false);
  count++;

  let probed = false;
  const target = await resumeLoginSession({
    search: "?logged_out=1",
    arenaEntry: false,
    signal: new AbortController().signal,
    fetcher: async () => {
      probed = true;
      return new Response(JSON.stringify({ success: true, user: { role: "GURU", isFounder: true } }));
    },
  });
  assert.equal(target, null);
  assert.equal(probed, false);
  count++;

  const events: string[] = [];
  let navigated = "";
  await leaveAccount("/login", {
    fetch: async (url, options) => {
      events.push(`fetch:${url}:${options?.method}:${options?.credentials}:${options?.cache}`);
      return new Response(JSON.stringify({ message: "Logged out" }), { status: 200 });
    },
    signOut: async () => { events.push("signOut"); },
    clearCookies: () => { events.push("clearCookies"); },
    navigate: (path) => { navigated = path; events.push(`nav:${path}`); },
  });
  assert.deepEqual(events, [
    "fetch:/api/auth/logout:POST:same-origin:no-store",
    "signOut",
    "clearCookies",
    "nav:/login?logged_out=1",
  ]);
  assert.equal(navigated, "/login?logged_out=1");
  count++;

  const failedEvents: string[] = [];
  await leaveAccount("/login", {
    fetch: async () => { throw new Error("offline"); },
    signOut: async () => { failedEvents.push("signOut"); },
    clearCookies: () => { failedEvents.push("clearCookies"); },
    navigate: (path) => { failedEvents.push(`nav:${path}`); },
  });
  assert.deepEqual(failedEvents, ["signOut", "clearCookies", "nav:/login?logged_out=1"]);
  count++;

  const logoutRoute = source("app/api/auth/logout/route.ts");
  assert.match(logoutRoute, /await supabase\.auth\.signOut\(\)/);
  assert.match(logoutRoute, /appendAuthCookieExpiry/);
  count++;

  const entryPoints: Array<[string, RegExp]> = [
    ["components/arena/LogoutButton.tsx", /leaveAccount\(to\)/],
    ["components/dashboard/LogoutButton.tsx", /leaveAccount\("\/login"\)/],
    ["components/dashboard/GuruSidebar.tsx", /leaveAccount\("\/login"\)/],
    ["components/admin/AdminSidebar.tsx", /leaveAccount\("\/login"\)/],
    ["components/admin/AdminMobileNav.tsx", /leaveAccount\("\/login"\)/],
    ["components/account/AccountSecurityPanel.tsx", /leaveAccount\("\/login"\)/],
    ["app/auth/akses-ditolak/logout-button.tsx", /leaveAccount\("\/login"\)/],
    ["app/(dashboard)/guru/profile/page.tsx", /ArenaLogoutButton variant="settings" to="\/login"/],
    ["app/(dashboard)/murid/profile/page.tsx", /ArenaLogoutButton variant="settings" to="\/login"/],
    ["lib/auth/resume-login-session.ts", /"logged_out"/],
  ];
  for (const [file, pattern] of entryPoints) {
    assert.match(source(file), pattern, file);
    count++;
  }

  const arena = source("components/arena/LogoutButton.tsx");
  assert.doesNotMatch(arena, /router\.push/);
  count++;

  console.log(`RESULT ${count} passed, 0 failed`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
