/**
 * Test: UKBI 200-User Rate-Limit Architecture (Phase 3 — Production Readiness)
 *
 * Verifies the rate-limit key space supports 200 students from ONE school NAT
 * IP without mutual 429s:
 *
 * 1. Authenticated students are bucketed per SESSION (sess|<hash of supabase
 *    auth-token cookie), NOT per IP → 200 students on one public IP get 200
 *    independent buckets → a cohort never trips each other's limits.
 * 2. Anonymous clients (login, public endpoints) are bucketed per IP — that is
 *    the only genuinely shared bucket in a school-NAT scenario, and it only
 *    affects unauthenticated endpoints (see findings in the readiness report).
 * 3. Static wiring assertions lock the current architecture so a future
 *    "optimization" (e.g. switching submit to per-IP) fails loudly.
 *
 * Deterministic — no DB, no network. Simulated headers only.
 */

import { getClientIdentity, getClientKey } from "../lib/security";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

function makeHeaders(opts: {
  ip: string;
  cookies?: string[];
}): Headers {
  const h = new Headers();
  h.set("x-forwarded-for", opts.ip);
  if (opts.cookies && opts.cookies.length > 0) {
    h.set("cookie", opts.cookies.join("; "));
  }
  return h;
}

// Realistic Supabase auth cookies: sb-<ref>-auth-token (JWT) + code-verifier.
function sessionCookie(ref: string, token: string): string {
  return `sb-${ref}-auth-token=${token}`;
}

const NAT_IP = "103.10.120.55"; // satu IP publik sekolah (kantor NAT)

console.log("=".repeat(64));
console.log("  TEST: UKBI 200-USER RATE-LIMIT ARCHITECTURE");
console.log("=".repeat(64));

// ── 1. 200 siswa terautentikasi, SATU IP NAT → 200 bucket terpisah ──
console.log("\n── 1. NAT SCHOOL: 200 AUTHENTICATED STUDENTS, 1 PUBLIC IP ──");
const n = 200;
const buckets = new Set<string>();
for (let i = 0; i < n; i++) {
  const ident = getClientIdentity({
    headers: makeHeaders({ ip: NAT_IP, cookies: [sessionCookie("ref", `token-siswa-${i}`)] }),
  });
  buckets.add(ident.key);
}
assert(buckets.size === n, `${n} siswa satu IP → ${buckets.size} bucket independen (0 cross-talk)`);
const allSess = [...buckets].every((k) => k.startsWith("sess|"));
assert(allSess, "semua bucket ber-prefix sess| (session-scoped, bukan IP)");
const allIdentified = [...buckets].every((k) => {
  return getClientIdentity({
    headers: makeHeaders({ ip: NAT_IP, cookies: [sessionCookie("ref", `token-siswa-${k}`)] }),
  }).identified;
});
assert(allIdentified, "semua siswa terdeteksi identified (bukan anonymous)");

// ── 2. Session-scoped: cookie sama → bucket sama walau IP berbeda ──
console.log("\n── 2. SESSION-SCOPED (IP-INDEPENDENT) ──");
const cookieA = sessionCookie("ref", "token-stabil-1");
const kIp1 = getClientKey({ headers: makeHeaders({ ip: "1.2.3.4", cookies: [cookieA] }) });
const kIp2 = getClientKey({ headers: makeHeaders({ ip: "203.0.113.9", cookies: [cookieA] }) });
assert(kIp1 === kIp2, `cookie sama + IP beda → bucket sama (${kIp1 === kIp2 ? "✓" : "✗"})`);
const kRepeat = getClientKey({ headers: makeHeaders({ ip: NAT_IP, cookies: [cookieA] }) });
assert(kRepeat === kIp1, "cookie sama berulang → bucket identik (stabil)");

// ── 3. Anonymous: IP-shared (hanya untuk endpoint tanpa sesi) ──
console.log("\n── 3. ANONYMOUS IP-SCOPING ──");
const anon1 = getClientKey({ headers: makeHeaders({ ip: NAT_IP }) });
const anon2 = getClientKey({ headers: makeHeaders({ ip: NAT_IP }) });
assert(anon1 === anon2 && anon1.startsWith("ip|"), "anonymous + IP sama → 1 bucket bersama (ip|)");
const anonOther = getClientKey({ headers: makeHeaders({ ip: "198.51.100.7" }) });
assert(anonOther !== anon1, "anonymous + IP beda → bucket berbeda");
assert(getClientIdentity({ headers: makeHeaders({ ip: NAT_IP }) }).identified === false, "tanpa cookie → identified=false");

// ── 4. Satu murid double-click submit → SATU bucket (30/60 detik per sesi) ──
console.log("\n── 4. DOUBLE-SUBMIT SAME BUCKET ──");
const murid = sessionCookie("ref", "token-murid-dobel");
const submit1 = getClientKey({ headers: makeHeaders({ ip: NAT_IP, cookies: [murid] }) });
const submit2 = getClientKey({ headers: makeHeaders({ ip: NAT_IP, cookies: [murid] }) });
assert(submit1 === submit2, "retry/double-submit memakai bucket yang sama → counter 30/60 dipakai bersama (bukan 2x kuota)");

// ── 5. Wiring statis arsitektur (lock anti-regresi) ──
console.log("\n── 5. STATIC WIRING (LOCKED) ──");
import fs from "fs";
const rateLimitSrc = fs.readFileSync("lib/rate-limit.ts", "utf-8");
assert(
  rateLimitSrc.includes("getClientKey(req)") && rateLimitSrc.includes("Per session, not per IP"),
  "rateLimitRoute memakai getClientKey (session-scoped) — komentar desain ada"
);
const submitSrc = fs.readFileSync("app/api/kompetensi/[paketId]/submit/route.ts", "utf-8");
assert(
  submitSrc.includes('identifier: "simulation-submit"') &&
    submitSrc.includes("maxRequests: 30") &&
    submitSrc.includes("windowSeconds: 60"),
  "submit paket: rateLimitRoute 30 req / 60 detik per SESI"
);
const loginSrc = fs.readFileSync("app/api/auth/login/route.ts", "utf-8");
assert(
  loginSrc.includes('identifier: "login"') &&
    loginSrc.includes("maxRequests: 10") &&
    loginSrc.includes("windowSeconds: 600"),
  "login: rateLimitRoute 10 req / 600 detik (anonymous = IP-shared — dokumentasikan, jangan naikkan tanpa bukti)"
);
const middlewareSrc = fs.readFileSync("middleware.ts", "utf-8");
assert(
  middlewareSrc.includes('rateLimit(getClientKey(request), "ai", 30)'),
  "middleware: scope ai 30/menit via getClientKey (session-scoped)"
);
const getRouteSrc = fs.readFileSync("app/api/kompetensi/[paketId]/route.ts", "utf-8");
assert(
  !getRouteSrc.includes("rateLimitRoute"),
  "GET/PATCH paket TANPA rate limit (sengaja — session-scoped & replay murah; snapshot immutable)"
);
const supabaseSrc = fs.readFileSync("lib/supabase/server.ts", "utf-8");
assert(
  supabaseSrc.includes('"sb-forwarded-for"') && supabaseSrc.includes("getForwardedIp"),
  "Supabase client meneruskan sb-forwarded-for (IP asli per siswa via header)"
);
assert(
  submitSrc.includes("getLatestProgres(") && submitSrc.includes('", paketId)'),
  "Recovery P2002 memakai paketId yang benar (fix 2026-08-20) — bukan '' "
);

// ── 6. Simulasi beban logika bucket (tanpa Redis) ──
console.log("\n── 6. LOGIC SIMULATION ──");
const students = Array.from({ length: 200 }, (_, i) =>
  getClientKey({ headers: makeHeaders({ ip: NAT_IP, cookies: [sessionCookie("ref", `t${i}`)] }) })
);
const uniqueStudents = new Set(students).size;
assert(uniqueStudents === 200, `200 siswa → ${uniqueStudents} bucket unik (harus 200)`);
const burstsPerStudent = 5;
const totalKeys = new Set(
  Array.from({ length: 200 }, (_, i) => {
    const keys: string[] = [];
    for (let b = 0; b < burstsPerStudent; b++) {
      keys.push(getClientKey({ headers: makeHeaders({ ip: NAT_IP, cookies: [sessionCookie("ref", `t${i}`)] }) }));
    }
    return keys;
  }).flat()
).size;
assert(totalKeys === 200, `${200} siswa × ${burstsPerStudent} submit berturut → ${totalKeys} bucket (tanpa saling menumpuk)`);

console.log("\n" + "=".repeat(64));
console.log(`  RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed === 0) {
  console.log("  ✅ 200-USER RATE-LIMIT ARCHITECTURE OK");
} else {
  console.log(`  ❌ ${failed} TESTS FAILED`);
}
console.log("=".repeat(64));
process.exit(failed > 0 ? 1 : 0);
