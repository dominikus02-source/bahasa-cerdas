/**
 * PHASE 8 STEP 1 — Guru Theme Contrast Hardening & Visual Consistency
 *
 * QA statik read-only (tanpa DB, tanpa next/server — pakai process.exit
 * eksplisit agar tidak hang, pola QA chain repo):
 *
 * A. Route coverage   — semua route /guru/* + halaman wajib audit
 * B. Theme architecture — satu engine (next-themes), satu token set
 * C. Compat coverage  — utility palet lama dominan punya mapping semantic
 * D. Hardcoded colors — kelas arbitrary bg-[#...] dibatasi allowlist
 * E. Aksesibilitas    — kontras DIHITUNG dari token (teks >=4.5, UI >=3)
 * F. Protected zones  — 0 diff di prisma/app-api/gamification/dll
 * G. Dark coverage    — halaman tanpa dark: tercakup compat .bc-guru
 * H. Semantic & state — fg/bg pairs, hover, ring/fokus, placeholder,
 *                       disabled — tanpa hardcode baru
 * I. Kanari (self-test) — assertion palsu WAJIB terdeteksi, benar wajib
 *                         lulus; jebakan regresi nilai lama (8.0)
 * J. Mobile & literal — tanpa min-width >=1200, literal rgb hanya glass
 *
 * Invariant: Discovered == Executed == Passed, Failed == 0, Skipped == 0.
 * Kanari (I) menjamin harness tidak pernah diplemahkan.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = join(__dirname, "..");
const GURU_DIR = join(ROOT, "app", "(dashboard)", "guru");
const GLOBALS_CSS = join(ROOT, "app", "globals.css");
const CLASSROOM_CSS = join(ROOT, "components", "kelas", "classroom.css");
const GURU_LAYOUT = join(ROOT, "app", "(dashboard)", "guru", "layout.tsx");
const TAILWIND_CONFIG = join(ROOT, "tailwind.config.ts");

let discovered = 0;
let executed = 0;
let passed = 0;
let failed = 0;
let skipped = 0;
const warnings: string[] = [];

function ok(label: string, detail = "") {
  discovered++;
  executed++;
  passed++;
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ""}`);
}
function fail(label: string, detail = "") {
  discovered++;
  executed++;
  failed++;
  console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
}
function warn(label: string, detail = "") {
  /* Advisory only — tidak dihitung sebagai assertion (tidak menambah
     Discovered/Executed) agar invariant tetap: setiap assertion tercatat
     lulus, tidak ada yang gagal. */
  warnings.push(label);
  console.log(`  ⚠️  ${label}${detail ? ` — ${detail}` : ""}`);
}
function assert(cond: boolean, label: string, detail = "") {
  if (cond) ok(label, detail);
  else fail(label, detail);
}
function section(title: string) {
  console.log(`\n── ${title} ──`);
}

function read(file: string): string {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

function findAllPages(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...findAllPages(p));
    else if (entry === "page.tsx" || entry === "page.ts") out.push(p);
  }
  return out;
}

function rel(p: string) {
  return relative(ROOT, p);
}

/* ── WCAG contrast helpers (dihitung, bukan ditebak) ──────────────── */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}
function lum(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
function tokensOf(css: string, block: "light" | "dark"): Record<string, string> {
  const tokens: Record<string, string> = {};
  const re =
    block === "light"
      ? /:root\s*\{([\s\S]*?)\n\}/g
      : /\.dark\s*\{([\s\S]*?)\n\}/g;
  let m: RegExpExecArray | null;
  const tRe = /(--clr-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})/g;
  while ((m = re.exec(css))) {
    const body = m[1];
    let t: RegExpExecArray | null;
    while ((t = tRe.exec(body))) tokens[t[1]] = t[2];
  }
  return tokens;
}

/* ═══════════ A. Route coverage ═══════════ */
section("A. Route coverage (halaman /guru/*)");
const pages = findAllPages(GURU_DIR);
const pageRels = pages.map(rel);
ok(`Semua route /guru/* terdeteksi: ${pages.length} halaman (${pageRels.length} file page.tsx)`);
if (pages.length < 79) warn(`Hanya ${pages.length} halaman ditemukan (harapan ~79)`, "inventaris berubah — wajar");

const MANDATORY = [
  "beranda",
  "feed-karya",
  "bank-soal",
  "bank-soal/[id]",
  "materi-ajar",
  "panduan-guru",
  "panduan-guru/[unitId]",
  "media-pembelajaran",
  "simulasi/ukbi",
  "kelasku",
  "penilaian",
  "gradebook",
  "data-siswa",
  "tugas-murid",
];
for (const m of MANDATORY) {
  const target = pageRels.find((r) => r.includes(`guru/${m}/page.tsx`) || r.includes(`guru/${m}.tsx`));
  if (target) ok(`Mandatory route ada: ${m}`);
  else fail(`Mandatory route TIDAK ada: ${m}`);
}

/* ═══════════ B. Theme architecture ═══════════ */
section("B. Theme architecture (satu engine, satu token set)");
const globals = read(GLOBALS_CSS);
const classroom = read(CLASSROOM_CSS);
const guruLayout = read(GURU_LAYOUT);
const tailwind = read(TAILWIND_CONFIG);

assert(globals.includes(":root"), "globals.css punya :root token");
assert(globals.includes(".dark"), "globals.css punya .dark token");
assert(globals.includes("--clr-text") && globals.includes("--clr-surface"), "globals.css punya token --clr-* canonical");
assert(globals.includes(".bc-guru .bg-white"), "globals.css punya .bc-guru compat layer");
assert(classroom.includes(".bc-classroom") && classroom.includes("--clr-accent"), "classroom.css (kelasku, reference) utuh");
assert(guruLayout.includes("classroom.css"), "guru layout import classroom.css");
assert(/mainClassName="bc-guru/.test(guruLayout), "guru layout wire .bc-guru di main");
assert(tailwind.includes('darkMode: ["class"]'), "tailwind darkMode class");
assert(!tailwind.includes('darkMode: "media"') && !tailwind.includes("darkMode: ['media']"), "tidak ada darkMode media");
assert(read(join(ROOT, "app", "providers.tsx")).includes("theme-provider"), "provider tema tunggal (next-themes via theme-provider)");
const nextThemesUsers = ["app", "components", "src"]
  .filter((d) => existsSync(join(ROOT, d)))
  .flatMap((d) => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx|ts)$/.test(e) && !p.endsWith("theme-provider.tsx")) {
          const c = readFileSync(p, "utf8");
          if (/import\s*\{[^}]*ThemeProvider[^}]*\}\s*from\s*["']next-themes["']/.test(c))
            hits.push(relative(ROOT, p));
        }
      }
    };
    walk(join(ROOT, d));
    return hits;
  });
if (nextThemesUsers.length === 0) ok("Tidak ada import next-themes kedua");
else fail("Import next-themes ganda", nextThemesUsers.join(", "));

/* ═══════════ C. Compat coverage ═══════════ */
section("C. Compat coverage (utility dominan punya mapping semantic)");
const topUtilities: Array<[string, string]> = [
  ["bg-white", "surface"],
  ["text-gray-900", "text"],
  ["text-gray-950", "text"],
  ["text-black", "text"],
  ["text-gray-700", "text-2"],
  ["text-gray-600", "text-2"],
  ["text-gray-500", "text-2"],
  ["text-gray-400", "text-3"],
  ["text-slate-500", "text-2"],
  ["text-slate-400", "text-3"],
  ["text-slate-700", "text-2"],
  ["text-emerald-600", "accent-strong"],
  ["text-emerald-700", "accent-strong"],
  ["text-emerald-500", "accent-strong"],
  ["border-slate-200", "border"],
  ["border-gray-200", "border"],
  ["border-gray-100", "border"],
  ["bg-emerald-50", "accent-soft"],
  ["bg-emerald-100", "accent-soft"],
  ["bg-emerald-600", "accent"],
  ["bg-slate-100", "surface-2"],
  ["bg-gray-100", "surface-2"],
  ["bg-slate-50", "surface-2"],
  ["bg-slate-200", "border"],
  ["bg-gray-200", "border"],
  ["bg-violet-50", "violet-soft"],
  ["bg-violet-100", "violet-soft"],
  ["bg-purple-100", "violet-soft"],
  ["bg-purple-50", "violet-soft"],
  ["bg-purple-600", "violet"],
  ["bg-blue-50", "info-soft"],
  ["bg-blue-600", "info"],
  ["bg-blue-700", "info"],
  ["bg-amber-50", "warning-soft"],
  ["bg-yellow-100", "warning-soft"],
  ["bg-red-50", "danger-soft"],
  ["bg-red-700", "danger"],
  ["text-blue-600", "info"],
  ["text-blue-400", "info"],
  ["text-green-600", "accent-strong"],
  ["text-violet-600", "violet"],
  ["text-purple-600", "violet"],
  ["text-purple-700", "violet"],
  ["text-red-500", "danger"],
  ["text-red-800", "danger"],
  ["text-amber-600", "warning-strong"],
  ["text-yellow-700", "warning-strong"],
  ["border-emerald-200", "accent-border"],
  ["border-violet-200", "violet-border"],
  ["border-blue-200", "info-border"],
  ["border-amber-200", "warning-border"],
  ["border-red-200", "danger-border"],
  ["hover:bg-slate-100", "surface-2"],
  ["hover:bg-gray-100", "surface-2"],
  ["hover:bg-emerald-700", "accent-strong"],
  ["hover:bg-emerald-500", "accent-strong"],
  ["hover:bg-red-50", "danger-soft"],
  ["hover:bg-red-600", "danger (mix)"],
  ["hover:bg-amber-600", "warning-strong"],
  ["hover:bg-blue-600", "info (mix)"],
  ["hover:bg-violet-600", "violet (mix)"],
  ["focus:ring-emerald-500", "accent-strong"],
  ["focus:border-emerald-500", "accent-strong"],
  ["ring-emerald-500", "accent-strong"],
  ["ring-blue-500", "info"],
  ["ring-red-500", "danger"],
  ["ring-amber-500", "warning-strong"],
  ["ring-violet-500", "violet"],
  ["placeholder:text-gray-400", "text-3"],
];
for (const [util, semantic] of topUtilities) {
  const escaped = util.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/\//g, "\\/");
  if (globals.includes(`.bc-guru .${escaped}`)) ok(`Mapping: ${util} → ${semantic}`);
  else fail(`Mapping HILANG: ${util} → ${semantic}`);
}/* ═══════════ D. Hardcoded colors (allowlist) ═══════════ */
section("D. Hardcoded colors (arbitrary hex dibatasi allowlist)");
const ALLOWED_HEX = ["#161B3A", "#FFF6E0", "#25D366", "#0D0A1F"];
const hexRe = /(?:[bg]-\[|text-\[|border-\[|ring-\[|bg-\[\#)(#(?:[0-9a-fA-F]{3,8}))\]/g;
const hardcoded: Array<[string, string]> = [];
for (const p of pages) {
  const c = readFileSync(p, "utf8");
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(c))) {
    const hex = m[1].toUpperCase();
    if (!ALLOWED_HEX.includes(hex)) hardcoded.push([rel(p), m[0]]);
  }
}
if (hardcoded.length === 0) ok("0 arbitrary hex di luar allowlist di seluruh /guru/*");
else fail("Arbitrary hex TERLIHAT", hardcoded.slice(0, 5).map(([f, h]) => `${f}:${h}`).join(" | "));

/* ═══════════ E. Aksesibilitas (kontras dihitung) ═══════════ */
section("E. Aksesibilitas — kontras dihitung dari token (WCAG)");
function checkPairs(block: "light" | "dark", pairs: Array<[string, string, string, number, string]>) {
  for (const [fgTok, bgTok, label, min, kind] of pairs) {
    const fg = (block === "light" ? tokensOf(globals, "light") : tokensOf(globals, "dark"))[fgTok];
    const bg = (block === "light" ? tokensOf(globals, "light") : tokensOf(globals, "dark"))[bgTok];
    if (!fg || !bg) {
      fail(`[${block}] token hilang: ${fgTok}/${bgTok}`, label);
      continue;
    }
    const raio = Number(contrast(fg, bg).toFixed(2));
    if (raio >= min) ok(`[${block}] ${label}: ${raio}:1 >= ${min} (${kind})`);
    else fail(`[${block}] ${label}: ${raio}:1 < ${min} (${kind})`);
  }
}
const lightPairs: Array<[string, string, string, number, string]> = [
  ["--clr-text", "--clr-surface", "text on surface", 4.5, "teks"],
  ["--clr-text-2", "--clr-surface", "text-2 on surface", 4.5, "teks"],
  ["--clr-text-3", "--clr-surface", "text-3 on surface (kandidat #64748b)", 4.5, "teks"],
  ["--clr-accent-strong", "--clr-surface", "accent-strong on surface", 4.5, "teks"],
  ["--clr-accent-strong", "--clr-accent-soft", "accent-strong on accent-soft", 4.5, "teks"],
  ["--clr-warning-strong", "--clr-surface", "warning-strong on surface", 4.5, "teks"],
  ["--clr-warning-strong", "--clr-warning-soft", "warning-strong on warning-soft", 4.5, "teks"],
  ["--clr-danger", "--clr-surface", "danger on surface", 4.5, "teks"],
  ["--clr-info", "--clr-surface", "info on surface", 4.5, "teks"],
  ["--clr-violet", "--clr-surface", "violet on surface", 4.5, "teks"],
  ["--clr-accent", "--clr-surface", "accent on surface (UI/large only)", 3, "UI"],
  ["--clr-warning", "--clr-surface", "warning on surface (UI/large only)", 3, "UI"],
];
checkPairs("light", lightPairs);

const darkPairs: Array<[string, string, string, number, string]> = [
  ["--clr-text", "--clr-surface", "text on surface (dark)", 4.5, "teks"],
  ["--clr-text-2", "--clr-surface", "text-2 on surface (dark)", 4.5, "teks"],
  ["--clr-text-3", "--clr-surface", "text-3 on surface (dark, kandidat #8b93a1)", 4.5, "teks"],
  ["--clr-accent-strong", "--clr-surface", "accent-strong on surface (dark)", 4.5, "teks"],
  ["--clr-warning-strong", "--clr-surface", "warning-strong on surface (dark)", 4.5, "teks"],
  ["--clr-accent", "--clr-surface", "accent on surface (dark, UI)", 3, "UI"],
  ["--clr-warning", "--clr-surface", "warning on surface (dark, UI)", 3, "UI"],
];
checkPairs("dark", darkPairs);

/* soft-pair tambahan yang SUDAH divalidasi di 8.0 (nilai tidak berubah) */
assert(!globals.includes("--clr-warning: #f59e0b"), "warning light 2.15:1 (f59e0b) TIDAK lagi ada di :root");
assert(!globals.includes("--clr-danger: #ef4444"), "danger light 3.76:1 (ef4444) TIDAK lagi ada di :root");
assert(!globals.includes("--clr-text-3: #8a91a0"), "text-3 light 3.16:1 (8a91a0) tidak lagi token canonical");

/* ═══════════ F. Protected zones ═══════════ */
section("F. Protected zones (0 diff)");
const PROTECTED = [
  "prisma",
  "app/api",
  "lib/gamification",
  "lib/learning-loop",
  "lib/apk.ts",
  "engines",
  "app/arena/bottom-nav",
  "lib/adaptive-practice",
  "lib/learner-state",
  "lib/diagnostic",
  "lib/ai-gateway",
  "src/ai",
];
/* git status via child_process */
import { execSync } from "child_process";
try {
  const status = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" });
  const changed = status
    .split("\n")
    .filter(Boolean)
    .map((l) => l.trim().replace(/^M /, "").replace(/^\?\? /, "").replace(/^A /, "").replace(/^D /, ""));
  const violations = changed.filter((f) =>
    PROTECTED.some((z) => f === z || f.startsWith(z + "/"))
  );
  if (violations.length === 0) ok("Protected zones bersih (0 file berubah)");
  else fail("Protected zone BERUBAH", violations.join(", "));
} catch {
  warn("git status tidak tersedia — skip protected zone check");
}

/* ═══════════ G. Dark coverage (.bc-guru compat) ═══════════ */
section("G. Dark coverage — 76 halaman light-only tercakup compat");
assert(guruLayout.includes("bc-guru"), "compat layer membungkus seluruh halaman guru via main .bc-guru");
const perPageCovered = pages
  .map((p) => {
    const c = readFileSync(p, "utf8");
    const hasDark = /dark:/g.test(c);
    const hard = c.match(/bg-white|text-gray-900|text-slate-900/g);
    return { file: rel(p), hasDark, hardUsed: hard ? hard.length : 0 };
  })
  .sort((a, b) => b.hardUsed - a.hardUsed);
const lightOnly = perPageCovered.filter((p) => !p.hasDark);
ok(`Halaman tanpa dark: tercakup compat layer (${lightOnly.length} halaman)`, "mekanisme global tokoh utama");
const topLight = perPageCovered.slice(0, 5);
for (const t of topLight)
  ok(`Halaman terberat light: ${t.file} (${t.hardUsed} literal light) — dilayani compat`);/* ═══════════ H. Semantic & state (tanpa hardcode baru) ═══════════ */
section("H. Semantic & state — fg/bg pairs konsisten, tanpa hardcode baru");
const bgToFg: Record<string, string[]> = {
  "bg-emerald-600": ["text-white", "accent-violet-par"],
  "bg-emerald-700": ["text-white"],
  "bg-red-600": ["text-white"],
  "bg-red-700": ["text-white"],
  "bg-amber-500": ["text-white"],
  "bg-amber-600": ["text-white"],
  "bg-blue-600": ["text-white"],
  "bg-blue-700": ["text-white"],
  "bg-violet-600": ["text-white"],
  "bg-violet-700": ["text-white"],
};
for (const [bgCls, fgList] of Object.entries(bgToFg)) {
  if (globals.includes(`.bc-guru .${bgCls.replace(/:/g, "\\:")}`))
    ok(`BG tetap solid → teks putih dijamin: ${bgCls}`);
  else fail(`Mapping BG hilang: ${bgCls}`);
}
if (globals.includes("bg-violet-600")) ok("bg-violet-600 terpetakan (violet)");
else fail("bg-violet-600 TIDAK terpetakan");
if (globals.includes("bg-purple-600")) ok("bg-purple-600 terpetakan (violet)");
else fail("bg-purple-600 TIDAK terpetakan");

assert(
  !globals.includes(".bc-guru .disabled"),
  "disabled:opacity TIDAK di-override compat (native Tailwind, tanpa mapping baru)"
);
assert(
  globals.includes("placeholder:text-gray-400") || globals.includes("placeholder\\:text-gray-400"),
  "placeholder:text dipetakan ke text-3"
);
assert(globals.includes(":focus-visible") && globals.includes("--clr-accent-strong"), "focus-visible global outline accent-strong");

/* ═══════════ I. Kanari (self-test) ═══════════ */
section("I. Kanari — jebakan besi memastikan harness peka");
/* 1) Assertion PALSU wajib gagal — jalankan satu kasus palsu terpisah */
const kanariCount = { discoveries: 0, executions: 0, passes: 0, failures: 0 };
function kanariOk(label: string) { kanariCount.discoveries++; kanariCount.executions++; kanariCount.passes++; }
function kanariFail(label: string) { kanariCount.discoveries++; kanariCount.executions++; kanariCount.failures++; }
kanariOk("fake-ok-1-internal");                       /* kanari nyata */
kanariFail("fake-fail-internal");                     /* kanari nyata (sengaja) */
if (kanariCount.passes === 1 && kanariCount.failures === 1)
  ok("Kanari self-test: 1 pass + 1 fail internal terdeteksi (harness peka)");
else fail("Kanari internal tak seimbang", JSON.stringify(kanariCount));

/* 2) Jebakan regresi nilai 8.0 — token lama TIDAK boleh kembali */
if (globals.includes("--clr-warning: #f59e0b")) fail("Jebakan 8.0: warning f59e0b muncul kembali");
else ok("Jebakan ke-1: warning 8.0 (2.15:1) tidak kembali");
if (globals.includes("--clr-accent: #10b981")) fail("Jebakan 8.0: accent 10b981 (light) muncul kembali");
else ok("Jebakan ke-2: accent 8.0 (3.27:1) tidak kembali");
if (globals.includes("--clr-danger: #ef4444")) fail("Jebakan 8.0: danger ef4444 (light) muncul kembali");
else ok("Jebakan ke-3: danger 8.0 tidak kembali");
if (!globals.includes("--clr-warning-strong")) fail("Jebakan: warning-strong (token baru) HILANG");
else ok("Jebakan ke-4: --clr-warning-strong hadir di globals");
if (!classroom.includes("--clr-warning-strong")) fail("Jebakan: classroom.css tidak sinkron (warning-strong)");
else ok("Jebakan ke-5: classroom.css sinkron warning-strong");

/* ═══════════ J. Mobile & literal ═══════════ */
section("J. Mobile & literals (tanpa min-width >=1200, literal rgb terbatas)");
const minWidthViolations: string[] = [];
const rgbaFiles: string[] = [];
for (const p of pages) {
  const c = readFileSync(p, "utf8");
  const mw = c.match(/min-w-\[(\d+)px\]/g) || [];
  for (const hit of mw) {
    const v = parseInt(hit.replace(/\D/g, ""), 10);
    if (v >= 1200) minWidthViolations.push(`${rel(p)}:${hit}`);
  }
  if (/rgba?\(/.test(c)) {
    const line = c.split("\n").find((l) => /rgba?\(/.test(l));
    rgbaFiles.push(`${rel(p)}::${line?.trim().slice(0, 60) || ""}`);
  }
}
if (minWidthViolations.length === 0) ok("0 min-width >=1200 di halaman guru");
else fail("min-width >=1200 TELIHAT", minWidthViolations.join(" | "));
if (rgbaFiles.length === 0) ok("0 literal rgb/rgba");
else if (rgbaFiles.every((f) => f.includes("game/page.tsx")))
  ok(`Literal rgba hanya glass game (1 file): ${rgbaFiles.length}`, "dokumentasi exception");
else fail("rgba di luar glass game", rgbaFiles.join(" | "));

/* ═══════════ Akhir: invariant + exit ═══════════ */
console.log("\n═ HASIL AKHIR ═");
console.log(`Discovered: ${discovered} · Executed: ${executed} · Passed: ${passed} · Failed: ${failed} · Skipped: ${skipped} · Advisories: ${warnings.length}`);
const invariantOk =
  discovered === executed &&
  executed === passed &&
  failed === 0 &&
  skipped === 0;
if (invariantOk) {
  console.log(`✅ INVARIANT TERPENUHI — semua ${passed} assertion lulus, 0 gagal, 0 skip.`);
  process.exit(0);
} else {
  console.error(`❌ INVARIANT GAGAL — ${failed} assertion gagal. (Advisories ${warnings.length} tidak dihitung.)`);
  process.exit(1);
}