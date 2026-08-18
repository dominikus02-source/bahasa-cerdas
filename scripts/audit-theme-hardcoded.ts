/**
 * THEME REGRESSION AUDIT — klasifikasi BLOCKING / REVIEW / LEGITIMATE / SAFE (STEP 8.2.1)
 *
 * READ-ONLY — tidak menulis DB/file apa pun.
 *
 * Klasifikasi (founder STEP 8.2.1):
 *   BLOCKING   — warna light-only yang berpotensi theme regression (kondisi ini jelas
 *                rusak di dark mode). Contoh: bg-white, text-white, text-black, bg-black,
 *                text-slate-900, bg-slate-100, border-slate-200 di file yang TIDAK
 *                dilindungi compat layer (.bc-guru/.bc-admin) — terutama komponen
 *                shared/reusable yang dirender lintas produk. Adjudication per baris:
 *                baris yang MEMILIKI pasangan dark:* TIDAK dihitung blocking (dual-mode
 *                eksplisit); text-black pada gradient emas (brand premium) juga tidak.
 *   REVIEW     — butuh penilaian manusia: dark:* tanpa masalah (legit vs redundant),
 *                arbitrary hex/rgb, inline color style, warna SVG/chart non-brand.
 *   LEGITIMATE — warna brand/visual yang disengaja: #161B3A, #FFF6E0, #25D366,
 *                series chart violet/rose/sky, gradient emas + text-black (badge premium),
 *                overlay bg-black/50 (scrim), fixed width desktop (bukan warna).
 *   SAFE       — token semantic (bg-background, bg-card, bg-muted, text-foreground,
 *                text-muted-foreground, border-border, bg-primary, text-primary-foreground,
 *                dst.) + light-palette di GURU/ADMIN yang di-mitigasi compat layer
 *                (.bc-guru/.bc-admin — runtime-safe, dikonversi ke token saat dark).
 *
 * Kebijakan:
 *   - TIDAK ada "target 0 untuk REVIEW/LEGITIMATE" — jumlah boleh besar; tujuan
 *     klasifikasi, bukan penghapusan.
 *   - BLOCKING > 0  → exit code 1 (CI-enforceable). REVIEW/LEGITIMATE tidak men-fail.
 *   - Utility GURU/ADMIN light-palette = MITIGATED (compat) → dihitung SAFE, tercatat
 *     terpisah sebagai "mitigated".
 *   - GURU/ADMIN: text-white TIDAK dihitung BLOCKING (kebijakan 8.1: text-white &
 *     blok gelap sengaja tidak dipetakan — kontras di atas brand/gradient).
 *
 * Jalankan: npm run audit:theme-hardcoded
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const AREAS: Record<string, string[]> = {
  guru: ["app/(dashboard)/guru"],
  admin: ["app/(dashboard)/admin"],
  sharedScoped: ["components/guru", "components/admin", "components/dashboard"],
  sharedUnscoped: ["components/ui", "components/shell", "components/theme", "components/shared"],
};

/** Light-only palette yang berpotensi regresi (founder §2) */
const BLOCKING_RE =
  /\b(?:bg-white|bg-black|text-black|text-slate-900|bg-slate-100|border-slate-200)\b/g;

/** Palette light di GURU/ADMIN — runtime-safe via compat .bc-guru/.bc-admin */
const MITIGATED_RE =
  /\b(?:bg-white(?:\/[0-9]+)?|bg-slate-(?:50|100|200)|bg-gray-(?:50|100|200)|text-slate-(?:300|400|500|600|700|800|900|950)|text-gray-(?:300|400|500|600|700|800|900|950)|border-slate-(?:100|200|300|400)|border-gray-(?:100|200|300|400))\b/g;

/** Token semantic global (SAFE) */
const SEMANTIC_RE =
  /\b(?:bg-background|bg-card|bg-popover|bg-muted|bg-secondary|bg-accent|bg-destructive|bg-primary(?!-)|text-foreground|text-card-foreground|text-popover-foreground|text-muted-foreground|text-secondary-foreground|text-accent-foreground|text-primary-foreground|border-border|border-input|ring-ring|border-primary|placeholder:text-muted-foreground)\b/g;

/** Garis dengan pasangan dark:* / gradient emas = dual-mode atau brand premium */
const DUAL_MODE_LINE_RE = /\bdark:[a-z-]+/;
const GOLD_GRADIENT_RE = /from-gold|to-gold|gold-4|gold-6/;

/** Warna brand/visual yang disengaja (LEGITIMATE) */
const BRAND_HEXES = [
  "#161B3A", // navy brand
  "#FFF6E0", // cream brand
  "#25D366", // whatsapp brand
  "#0D0A1F", // dark navy
  // series chart brand (violet/rose/sky + violet ramp)
  "#8b5cf6", "#fb7185", "#0ea5e9", "#a5b4fc", "#818cf8", "#6366f1", "#7c3aed",
  "#4c1d95", "#94a3b8", "#c4b5fd", "#ddd6fe", "#ede9fe",
  "rgba(139,92,246", "rgba(251,113,133", "rgba(14,165,233",
].map((h) => h.toLowerCase());

const REVIEW_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "dark:* patch", re: /\bdark:\S+/g },
  { id: "arbitrary hex (non-brand)", re: /\b(?:bg|text|border|ring|from|to|via|fill|stroke|shadow)-\[#(?:[0-9a-fA-F]{3,8})\]/g },
  { id: "arbitrary rgb/rgba/hsl (non-brand)", re: /\b(?:bg|text|border|ring|from|to|via)-\[(?:rgba?|hsl)\(/g },
  { id: "inline color style", re: /style=\{\{\s*(?:color|backgroundColor|borderColor|fill|stroke|background)\s*:/g },
  { id: "svg fill/stroke hex (non-brand)", re: /(?:fill|stroke)="#(?:[0-9a-fA-F]{3,8})"/g },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(p)) out.push(p);
  }
  return out;
}

function readFiles(dirs: string[]) {
  return dirs.flatMap((d) => walk(join(ROOT, d)).map((f) => ({ path: f.replace(ROOT + "/", ""), src: readFileSync(f, "utf8") })));
}

function countMatches(src: string, re: RegExp, ignore: RegExp | null = null): number {
  const clean = ignore ? src.replace(ignore, " ") : src;
  const m = clean.match(re);
  return m ? m.length : 0;
}

const files = readFiles(Object.values(AREAS).flat());
let blocking = 0;
let review = 0;
let legitimate = 0;
let safe = 0;
let mitigated = 0;
let darkPatches = 0;
let p0InvertedDark = 0;

const blockingHits: { file: string; n: number }[] = [];
const reviewHits: { file: string; n: number }[] = [];
const p0DarkHits: { file: string; pattern: string }[] = [];

for (const { path: file, src } of files) {
  const inScoped = /^app\/\(dashboard\)\/(guru|admin)\//.test(file);
  const inSharedUnscoped = /^components\/(ui|shell|theme|shared)\//.test(file);

  // ── BLOCKING: palette light-only di file yang tidak dilindungi compat / bukan kebijakan ──
  if (inSharedUnscoped) {
    // Adjudication per BARIS: hanya baris TANPA dark:* dan TANPA gradient emas dihitung.
    const lines = src.split("\n");
    let n = 0;
    for (const line of lines) {
      if (!BLOCKING_RE.test(line)) continue;
      if (DUAL_MODE_LINE_RE.test(line)) continue; // dual-mode eksplisit → LEGITIMATE
      if (GOLD_GRADIENT_RE.test(line)) continue; // text-black di badge premium → LEGITIMATE
      // scrim overlay modal (bg-black/50) sengaja gelap di kedua mode → LEGITIMATE
      const rest = line.replace(/\bbg-black\/[0-9]+\b/g, "");
      if (!BLOCKING_RE.test(rest)) continue;
      n += (line.match(BLOCKING_RE) as RegExpMatchArray).length;
    }
    if (n > 0) {
      blocking += n;
      blockingHits.push({ file, n });
    }
  }

  // ── P0 inverted dark: bg putih / teks hitam DI dalam dark mode ──
  const p0m = src.match(/\bdark:(?:bg-white(?!\/)|bg-black|text-black)\b/g);
  if (p0m) {
    p0InvertedDark += p0m.length;
    for (const pattern of p0m) p0DarkHits.push({ file, pattern });
  }

  // ── dark:* total (debt historis) ──
  darkPatches += countMatches(src, /\bdark:[a-z-]+/g);

  // ── REVIEW: dark:*, arbitrary non-brand, inline style, svg non-brand ──
  // (blok guru/admin TLIDAK dihitung arbitrary → review; dihitung per pattern)
  for (const p of REVIEW_PATTERNS) {
    const m = src.match(p.re);
    if (!m) continue;
    let n = m.length;
    if (p.id.includes("hex") || p.id.includes("rgb") || p.id.includes("svg")) {
      // filter brand → LEGITIMATE
      const brandN = m.filter((v) => BRAND_HEXES.some((b) => v.toLowerCase().includes(b))).length;
      n -= brandN;
      legitimate += brandN;
    }
    if (n > 0) {
      review += n;
      reviewHits.push({ file, n });
    }
  }

  // ── SAFE 1: token semantic (untuk file dalam cakupan audit) ──
  safe += countMatches(src, SEMANTIC_RE);

  // ── SAFE 2: palette light di GURU/ADMIN → mitigated oleh compat layer ──
  if (inScoped) mitigated += countMatches(src, MITIGATED_RE);
}

const fmt = (n: number) => n.toLocaleString("id-ID");

console.log("═".repeat(72));
console.log(" THEME REGRESSION AUDIT — STEP 8.2.1");
console.log(" READ-ONLY · tanpa DB · tidak menulis apa pun · cakupan: guru 79, admin 21, shared");
console.log("═".repeat(72));

console.log("\n◆ BLOCKING (regresi nyata — wajib 0)");
if (blocking === 0) console.log("  0 — tidak ada palette light-only di komponen shared/unscoped");
else blockingHits.forEach((h) => console.log(`  ✗ ${String(h.n).padStart(3)}  ${h.file}`));

console.log("\n◆ P0 inverted dark: (dark:bg-white|dark:bg-black|dark:text-black)");
if (p0InvertedDark === 0) console.log("  0 — tidak ada inversi warna di dark mode");
else p0DarkHits.forEach((h) => console.log(`  ✗ ${h.pattern.padEnd(16)} ${h.file}`));

console.log("\n◆ REVIEW (butuh penilaian manusia — tidak men-fail)");
if (review === 0) console.log("  0");
else {
  const top = reviewHits.sort((a, b) => b.n - a.n).slice(0, 15);
  top.forEach((h) => console.log(`  ${String(h.n).padStart(4)}  ${h.file}`));
  if (reviewHits.length > 15) console.log(`  … +${reviewHits.length - 15} file lain`);
}

console.log("\n◆ LEGITIMATE (brand/viz sengaja)");
console.log(`  ${fmt(legitimate)} promoche (hex/rgb/svg brand: #161B3A #FFF6E0 #25D366 violet/rose/sky)`);
console.log(`  Text putih di atas brand/gradient GURU/ADMIN = kebijakan 8.1 (tidak dihitung)`);

console.log("\n◆ SAFE (token semantic + mitigated compat)");
console.log(`  ${fmt(safe)} penggunaan token semantic (bg-background/foreground/card/muted/primary/dst.)`);
console.log(`  ${fmt(mitigated)} utility light-palette GURU/ADMIN di-mitigasi compat .bc-guru/.bc-admin (runtime-safe)`);

console.log("\n◆ THEME DEBT — HISTORICAL (dark:* patches)");
console.log(`  ${fmt(darkPatches)} dark:* (debt historis — P0 sudah dipindai; P1/P2 dibiarkan)`);

const status = blocking === 0 && p0InvertedDark === 0 ? "PASS" : "FAIL";
console.log("\n" + "═".repeat(72));
console.log(" THEME AUDIT");
console.log(" " + "─".repeat(34));
console.log(`  BLOCKING     ${fmt(blocking)}`);
console.log(`  REVIEW       ${fmt(review)}`);
console.log(`  LEGITIMATE   ${fmt(legitimate)}`);
console.log(`  SAFE         ${fmt(safe)}`);
console.log(" " + "─".repeat(34));
console.log(`  STATUS: ${status}${status === "PASS" ? "  (BLOCKING = 0, P0 dark: = 0)" : "  (BLOCKING > 0 → perbaiki sebelum fitur baru)"}`);
console.log("═".repeat(72));

if (status === "FAIL") process.exit(1);