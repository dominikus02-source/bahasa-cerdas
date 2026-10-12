/**
 * Regression gate for the unified login implementation.
 * Run: npx tsx scripts/test-unified-login-routing.ts
 * Static checks only; end-to-end auth still needs staging/device verification.
 */
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
let passed = 0;
let failed = 0;
function check(label: string, ok: boolean) {
  if (ok) {
    passed++;
    console.log(`PASS ${label}`);
  } else {
    failed++;
    console.error(`FAIL ${label}`);
  }
}

const login = read("app/(auth)/login/page.tsx");
const arenaLogin = read("app/arena/login/page.tsx");
const legacyArenaLogin = read("app/auth/arena-login/page.tsx");
const arenaLayout = read("app/arena/layout.tsx");
const proxy = read("lib/supabase/proxy.ts");
const manifest = JSON.parse(read("public/manifest.json")) as { start_url?: string; scope?: string };
const twa = JSON.parse(read("twa/twa-manifest.json")) as { startUrl?: string; fullScopeUrl?: string };

check("single shared login component is the canonical UI", arenaLogin.includes('@/app/(auth)/login/page'));
check("legacy Arena login redirects to the shared Arena entry", legacyArenaLogin.includes("redirect(`/arena/login?"));
check("Arena login keeps its auth-layout exemption", arenaLayout.includes('const RUTE_TANPA_GERBANG = "/arena/login"'));
check("anonymous Arena navigation still selects the in-scope entry", proxy.includes('pathname.startsWith("/arena") ? "/arena/login" : "/login"'));
check("Arena login is public/no-store to prevent stale-cookie redirect loops",
  proxy.includes('"/arena/login"') &&
  proxy.includes('pathname === "/login" || pathname === "/arena/login" || pathname === "/auth/arena-login"') &&
  proxy.includes('response.headers.set("Cache-Control", "private, no-store")'));
check("Arena login preserves default next=/arena", login.includes('params.get("next") || (isArenaEntry ? "/arena" : "")'));
check("Arena password login preserves student-only policy", login.includes('isArenaEntry && result.user.role !== "MURID"'));
check("web role redirects use canonical resolver", login.includes("resolvePostAuthDestinationForUser"));
check("Arena registration stays in the Android TWA scope", login.includes('const registerHref = isArenaEntry ? "/arena/register" : "/register"'));
check("Google OAuth uses shared API callback", login.includes("/api/auth/callback") && login.includes("encodeURIComponent(authNext)"));
check("PWA service worker registration is retained on Arena entry", login.includes("{isArenaEntry && <SwRegister />}"));
check("PWA manifest still launches Arena", manifest.start_url?.startsWith("/arena") === true);
check("Android TWA remains scoped to Arena", twa.startUrl?.startsWith("/arena") === true && twa.fullScopeUrl?.endsWith("/arena") === true);
check("old route no longer contains a second login form", !legacyArenaLogin.includes("loginWithBrowserPassword") && !legacyArenaLogin.includes("<form"));
check("legacy route remains marked public to avoid auth redirect loop", proxy.includes('"/auth/arena-login"'));

console.log(`RESULT ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
