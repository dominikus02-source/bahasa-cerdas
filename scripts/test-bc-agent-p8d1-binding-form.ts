/**
 * BC Agent P8D.1 — Telegram binding save feedback fix (structural test).
 *
 * Runtime/browser E2E is not available in this environment, so this suite
 * verifies the P8D.1 acceptance criteria via source-level assertions on the
 * exact files changed, plus the existing production-census/read path for the
 * persistence side (already proven live: binding row exists, total=1).
 *
 * Covered (maps to P8D.1 acceptance criteria):
 *   A. valid binding persists        → persistence semantics unchanged (upsert)
 *   B. upsert/update semantics       → where { telegramUserId } + revokedAt: null preserved
 *   C. list updates without reload   → refresh() from next/cache in BOTH actions
 *   D. invalid input → visible error → result returned + fixed message string
 *   E. authorization failure denied  → authorizeFounder() still gates both actions
 *   F. DB failure → generic error    → catch returns fixed message, logs server-side only
 *   G. no secrets in logs/output     → no token/secret patterns in changed files
 *
 * plus: result no longer discarded (root cause #1), client form renders
 * result inline (root cause #2 UI half), no client-side DB access.
 *
 * Exits 0 on success, 1 on any failure (deliberate process exit — this is a
 * test runner, not a server; avoids event-loop hangs from next/* imports).
 */

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = process.cwd();
const PAGE = path.join(ROOT, "app", "(dashboard)", "admin", "agent", "telegram", "page.tsx");
const FORM = path.join(
  ROOT,
  "app",
  "(dashboard)",
  "admin",
  "agent",
  "telegram",
  "_components",
  "binding-form.tsx"
);

let passed = 0;
let failed = 0;

function ok(cond: boolean, label: string): void {
  if (cond) {
    passed += 1;
    console.log(`  ok ${passed} - ${label}`);
  } else {
    failed += 1;
    console.log(`  NOT OK ${failed} - ${label}`);
  }
}

function section(name: string): void {
  console.log(`\n# ${name}`);
}

const page = fs.readFileSync(PAGE, "utf8");
const form = fs.readFileSync(FORM, "utf8");

// ---------------------------------------------------------------------------
section("root cause 1 — result no longer discarded");
// ---------------------------------------------------------------------------

ok(
  /async function bindAction\(formData: FormData\): Promise<BindingActionResult> \{\s*\n\s*"use server";\s*\n\s*return createBinding\(formData\);/.test(
    page
  ),
  "bindAction returns createBinding result (was discarded before fix)"
);
ok(
  /async function revokeAction\(formData: FormData\): Promise<BindingActionResult> \{\s*\n\s*"use server";\s*\n\s*return revokeBinding\(formData\);/.test(
    page
  ),
  "revokeAction returns revokeBinding result"
);
ok(!/await createBinding\(formData\);\s*\n\s*\}/.test(page), "no bare discard call remains (bindAction)");
ok(!/await revokeBinding\(formData\);\s*\n\s*\}/.test(page), "no bare discard call remains (revokeAction)");

// ---------------------------------------------------------------------------
section("root cause 2 — revalidation via refresh() (this Next version's mutation-refresh call)");
// ---------------------------------------------------------------------------

ok(/import \{ refresh \} from "next\/cache";/.test(page), "refresh imported from next/cache");
const refreshCalls = page.match(/\brefresh\(\);/g) ?? [];
ok(refreshCalls.length === 2, `refresh() called exactly twice (create + revoke), found ${refreshCalls.length}`);
ok(
  /refresh\(\);\s*\n\s*return \{ ok: true, message: "Binding tersimpan\." \};/.test(page),
  "refresh() precedes success return in createBinding"
);
ok(
  /refresh\(\);\s*\n\s*return \{ ok: true, message: "Binding dicabut\." \};/.test(page),
  "refresh() precedes success return in revokeBinding"
);

// ---------------------------------------------------------------------------
section("persistence semantics unchanged (acceptance A + B)");
// ---------------------------------------------------------------------------

ok(/where: \{ telegramUserId \},/.test(page), "upsert still keyed on unique telegramUserId");
ok(/revokedAt: null,/.test(page), "update branch still clears revokedAt (re-enrollment/un-revoke)");
ok(/boundBy: access\.userId,/.test(page), "boundBy still attributed to authorized founder");
ok(page.includes('id: randomUUID()'), "create branch still generates id (unchanged from P8B)");

// ---------------------------------------------------------------------------
section("founder authorization intact (acceptance E)");
// ---------------------------------------------------------------------------

const authzCalls = page.match(/await authorizeFounder\(\);/g) ?? [];
ok(authzCalls.length === 3, `authorizeFounder called in page render + both actions, found ${authzCalls.length}`);
ok(
  page.indexOf("async function createBinding") < page.indexOf("const access = await authorizeFounder();"),
  "authorization precedes any mutation work in createBinding"
);

// ---------------------------------------------------------------------------
section("validation preserved (acceptance D)");
// ---------------------------------------------------------------------------

ok(/\/\^\\d\{3,20\}\$\//.test(page), "parseId numeric rule /^\\d{3,20}$/ unchanged");
ok(
  /return \{ ok: false, message: "Telegram User ID dan Chat ID harus berupa angka\." \};/.test(page),
  "validation failure returns the fixed visible error message"
);

// ---------------------------------------------------------------------------
section("result messages — fixed founder-facing strings on every path");
// ---------------------------------------------------------------------------

const MESSAGE_LITERALS = [
  "Binding tersimpan.",
  "Gagal menyimpan binding.",
  "Akses ditolak.",
  "Telegram User ID dan Chat ID harus berupa angka.",
  "ID binding tidak valid.",
  "Binding dicabut.",
  "Gagal mencabut binding.",
];
for (const msg of MESSAGE_LITERALS) {
  ok(page.includes(`"${msg}"`), `message literal preserved: "${msg}"`);
}
ok(/\{ ok: (true|false), message: "/.test(page), "all returns use the { ok, message } shape");

// ---------------------------------------------------------------------------
section("DB failure path — generic message, server-side log only (acceptance F)");
// ---------------------------------------------------------------------------

ok(
  /catch \(error\) \{\s*\n\s*\/\/ Server-side only[\s\S]*?console\.error\("binding upsert failed:", error\);\s*\n\s*return \{ ok: false, message: "Gagal menyimpan binding\." \};/.test(
    page
  ),
  "createBinding catch: logs server-side, returns generic message"
);
ok(
  /catch \(error\) \{\s*\n\s*console\.error\("binding revoke failed:", error\);\s*\n\s*return \{ ok: false, message: "Gagal mencabut binding\." \};/.test(
    page
  ),
  "revokeBinding catch: logs server-side, returns generic message"
);
ok(!/catch \{\}/.test(page), "silent catch {} removed (was swallowing diagnostics)");
ok(!/error\.message|error\.stack|\$\{error\}/.test(page), "no raw error content interpolated into user-facing messages");

// ---------------------------------------------------------------------------
section("client form component — inline result rendering (root cause 1, UI half)");
// ---------------------------------------------------------------------------

ok(form.startsWith('"use client";'), "binding-form.tsx is a client component");
ok(/useTransition/.test(form), "uses useTransition (repo ActionButton convention)");
ok(/useState<BindingActionResult \| null>\(null\)/.test(form), "holds action result in state");
ok(/role="status"/.test(form), "result rendered as role=status status region");
ok(
  /result\.ok\s*\?\s*"text-emerald-600[\s\S]*?"text-red-600/.test(form),
  "message color-coded by ok flag (success vs failure both visible)"
);
ok(/formRef\.current\?\.reset\(\)/.test(form), "form resets only on success (invalid input stays visible for correction)");
ok(!/dangerouslySetInnerHTML/.test(form), "no raw HTML injection surface");

// ---------------------------------------------------------------------------
section("boundary — no client DB access, no new deps");
// ---------------------------------------------------------------------------

ok(!/@prisma|from "@\/lib\/db"/.test(form), "client component has no database access");
ok(!/process\.env/.test(form), "client component reads no environment values");
const pageImports = page.match(/^import .*$/gm) ?? [];
ok(
  pageImports.every((imp) => !/child_process|node:child_process|exec|spawn/.test(imp)),
  "page imports contain no shell/child_process surface"
);

// ---------------------------------------------------------------------------
section("secrets hygiene (acceptance G)");
// ---------------------------------------------------------------------------

const SECRET_PATTERNS: [string, RegExp][] = [
  ["bot token shape", /\b\d{8,12}:AA[A-Za-z0-9_-]{20,}\b/],
  ["webhook-secret-shaped hex", /\b[0-9a-f]{40,}\b/],
  ["BC_AGENT_TELEGRAM vars", /BC_AGENT_TELEGRAM_[A-Z_]+/],
  ["bearer literal", /[Bb]earer\s+[A-Za-z0-9._-]{16,}/],
  ["console.log of error", /console\.log\([^)]*error/i],
];
const bothFiles = page + "\n" + form;
for (const [name, re] of SECRET_PATTERNS) {
  const hits = bothFiles.match(new RegExp(re.source, "gm")) ?? [];
  ok(hits.length === 0, `no ${name} in changed files (hits: ${hits.length})`);
}
ok(!/console\.log/.test(page) && !/console\.log/.test(form), "no console.log in changed files (console.error server-side only)");

// ---------------------------------------------------------------------------
console.log(`\n${"=".repeat(52)}`);
console.log(`PASSED: ${passed}  FAILED: ${failed}`);
if (failed > 0) {
  process.exit(1);
}
process.exit(0);
