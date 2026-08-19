/**
 * TEST — GURU BERANDA DARK MODE 2.0 (Bagian 3b compat layer)
 *
 * Memverifikasi:
 *  A. Setiap utility warna yang dipakai 16 file scope beranda guru TERCINTA
 *     oleh compat layer (Bagian 3 atau Bagian 3b globals.css) — atau ada di
 *     allowlist sengaja-unmapped (teks putih / navy banner fallback).
 *  B. 0 variant `dark:` di file scope (dark mode harus murni dari token).
 *  C. 0 arbitrary hex baru di file scope (allowlist: gradien navy banner lama).
 *  D. Positive: mapping kunci 3b ada (gradien from/via/to, ring, shadow,
 *     icon chip *-500/90, dark-override gradien putih, hover variants).
 *  E. Protected zones: git status hanya berisi file yang diizinkan.
 *
 * Run: npm run test:guru-beranda-theme
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

const GLOBALS_CSS = path.join(ROOT, "app/globals.css");
const SCOPE_FILES = [
  "app/(dashboard)/guru/beranda/page.tsx",
  "components/guru/GuruLeaderboardCard.tsx",
  "components/guru/GuruBerkarya.tsx",
  "components/guru/GuruBerkaryaComments.tsx",
  "components/guru/TrialStatusCard.tsx",
  "components/guru/AiCreditBalance.tsx",
  "components/guru/AktivitasAnalytics.tsx",
  "components/guru/GuruBadgeGrid.tsx",
  "components/guru/misi/GuruMissionCard.tsx",
  "components/guru/misi/NextActionGuru.tsx",
  "components/guru/misi/MissionItem.tsx",
  "components/guru/misi/MissionProgress.tsx",
  "components/guru/misi/LevelCard.tsx",
  "components/guru/misi/RewardCard.tsx",
  "components/public/BannerProgramGuruCerdas.tsx",
  "components/public/BannerSlideshow.tsx",
];

/** Utility warna yang sengaja TIDAK dipetakan (desain fix di kedua mode). */
const ALLOW_UNMAPPED = new Set([
  "text-white", // teks di atas hue solid / navy banner — sengaja tetap putih
  "text-white/70", // desc kartu fallback navy (gradien inline, gelap kedua mode)
  "bg-black/35", // overlay dots banner navy
  "bg-black/40", // overlay overlay
  "bg-violet-500/25", // chip dekoratif di kartu fallback navy (gradien inline)
  "text-violet-200", // ikon di kartu fallback navy
]);

/** Hex arbitrary yang eksis di scope (banner navy + seri warna chart brand — theme rule #5). */
const ALLOW_HEX = new Set(["0B0A1A", "2D1566", "8B5CF6", "FB7185", "0EA5E9"]);

const COLOR_CLASS_RE = /\b(?:bg|text|border|ring|shadow|from|to|via)-(?:white(?:\/\d+)?|[a-z]+-[0-9]+(?:\/[0-9]+)?)\b/g;

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(desc: string, ok: boolean, extra = "") {
  if (ok) passed++;
  else {
    failed++;
    failures.push(`${desc}${extra ? ` — ${extra}` : ""}`);
  }
}

function scopedFileContent(): string {
  return SCOPE_FILES.map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
}

const css = fs.readFileSync(GLOBALS_CSS, "utf8");

// ── A. Coverage: setiap utility warna di scope tercinta globals.css ──
{
  const used = new Set<string>();
  for (const f of SCOPE_FILES) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const m of src.matchAll(COLOR_CLASS_RE)) used.add(m[0]);
  }
  const unmapped: string[] = [];
  for (const cls of used) {
    if (ALLOW_UNMAPPED.has(cls)) continue;
    const escaped = cls.replace(/\//g, "\\/").replace(/:/g, "\\:");
    if (!css.includes(escaped)) unmapped.push(cls);
  }
  check(
    "A1. Semua utility warna scope beranda tercinta compat layer (non-allowlist)",
    unmapped.length === 0,
    unmapped.join(", ")
  );
  check(
    "A2. Total utility warna unik di scope tercinta/Bagian 3b",
    used.size >= 60,
    `${used.size} kelas unik`
  );
}

// ── B. 0 variant `dark:` di file scope ──
{
  const withDark = SCOPE_FILES.filter((f) =>
    fs.readFileSync(path.join(ROOT, f), "utf8").includes("dark:")
  );
  check("B1. 0 `dark:` di 16 file scope (dark murni dari token)", withDark.length === 0, withDark.join(", "));
}

// ── C. 0 arbitrary hex baru di file scope ──
{
  const badHex: string[] = [];
  for (const f of SCOPE_FILES) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const m of src.matchAll(/#[0-9A-Fa-f]{6}\b/g)) {
      const norm = m[0].slice(1).toUpperCase();
      if (![...ALLOW_HEX].includes(norm)) badHex.push(`${f}: ${m[0]}`);
    }
  }
  check("C1. 0 arbitrary hex baru di scope", badHex.length === 0, badHex.join(", "));
}

// ── D. Positive: mapping kunci Bagian 3b ──
{
  const has = (sel: string) => css.includes(sel);
  const must = (needle: string) => check(`D. selector ada: ${needle}`, has(needle));

  // D1 – tanda seksi
  must("Bagian 3b: Perluasan compat layer");

  // D2 – opacity soft-tint
  [".bg-white\\/40", ".bg-violet-50\\/40", ".bg-violet-50\\/50", ".bg-emerald-50\\/60", ".bg-emerald-50\\/70",
   ".bg-emerald-100\\/40", ".bg-amber-100\\/40", ".bg-rose-50\\/50", ".bg-gray-50\\/60"].forEach(must);

  // D3 – hue tambahan
  [".bg-rose-50,", ".bg-rose-600,", ".bg-rose-200", ".bg-orange-50,", ".bg-orange-300", ".bg-sky-50,",
   ".bg-teal-100\\/30", ".bg-emerald-400", ".bg-amber-400"].forEach(must);

  // D4 – icon chip *-500/90
  [".bg-emerald-500\\/90,", ".bg-violet-500\\/90,", ".bg-amber-500\\/90,", ".bg-sky-500\\/90"].forEach(must);

  // D5 – text
  [".text-emerald-800,", ".text-violet-800,", ".text-violet-300", ".text-rose-400,", ".text-orange-400,",
   ".text-sky-600,", ".text-amber-300", ".text-amber-800,", ".text-amber-950", ".text-amber-900\\/80",
   ".text-purple-700\\/80"].forEach(must);

  // D6 – border
  [".border-gray-50,", ".border-violet-300", ".border-rose-200", ".border-orange-200"].forEach(must);

  // D7 – hover
  [".hover\\:bg-violet-100:hover", ".hover\\:bg-amber-100:hover", ".hover\\:bg-rose-100:hover",
   ".hover\\:bg-rose-200:hover", ".hover\\:bg-rose-700:hover", ".hover\\:bg-emerald-50\\/60:hover",
   ".hover\\:border-violet-300:hover", ".hover\\:border-emerald-100:hover", ".hover\\:text-violet-800:hover",
   ".hover\\:text-amber-800:hover", ".hover\\:text-emerald-700:hover", ".hover\\:text-rose-500:hover",
   ".hover\\:from-emerald-600:hover"].forEach(must);

  // D8 – ring & focus
  [".ring-violet-100", ".ring-emerald-100", ".ring-emerald-200", ".ring-amber-100", ".ring-amber-200",
   ".focus\\:ring-violet-100:focus", ".focus\\:border-violet-300:focus", ".focus\\:bg-white:focus"].forEach(must);

  // D9 – shadow warna
  [".shadow-emerald-100\\/50", ".shadow-emerald-500\\/20", ".shadow-violet-300\\/50", ".shadow-amber-100\\/50",
   ".shadow-amber-500\\/30", ".shadow-orange-200\\/50", ".shadow-slate-300\\/50"].forEach(must);

  // D10 – gradien from/via/to
  [".from-emerald-50,", ".from-emerald-400,", ".from-violet-50,", ".from-violet-400,", ".from-amber-50,",
   ".from-amber-300,", ".from-blue-50,", ".from-blue-400,", ".from-gray-50,", ".from-gray-300,", ".from-white",
   ".via-white,", ".via-purple-50,", ".via-teal-50,", ".via-yellow-400,",
   ".to-emerald-50,", ".to-emerald-600,", ".to-emerald-700,", ".to-violet-50,", ".to-purple-600,",
   ".to-amber-50,", ".to-amber-50\\/40", ".to-amber-500,", ".to-cyan-50,", ".to-cyan-600,",
   ".to-slate-50,", ".to-gray-400", ".to-white"].forEach(must);

  // D11 – dark override gradien + teks putih + chip
  [".from-emerald-400, .from-emerald-500, .from-emerald-600, .from-emerald-700, .from-teal-500, .from-teal-600",
   ".to-emerald-600, .to-emerald-700, .to-teal-500, .to-teal-600",
   ".to-purple-600, .to-indigo-600, .to-violet-600",
   ".to-orange-500, .to-orange-600, .to-amber-500, .to-yellow-500",
   ".bg-emerald-500\\/90, .bg-teal-500\\/90",
   ".bg-violet-500\\/90, .bg-purple-500\\/90, .bg-indigo-500\\/90",
   ".bg-amber-500\\/90, .bg-orange-500\\/90",
   ".bg-rose-600, .bg-rose-700"].forEach((sel) =>
    check(`D11. dark override ${sel}`, css.includes(`.dark .bc-guru :is(${sel}`.replace(":is(", ":is(")))
  );
  check("D12. Urutan sel dalam :is dark override emerald mengandung 55% bg", css.includes("var(--clr-accent-strong) 55%, var(--clr-bg)"));

  // D13 – BannerSlideshow fallback → text-white/70 (bukan text-slate-300)
  const banner = fs.readFileSync(path.join(ROOT, "components/public/BannerSlideshow.tsx"), "utf8");
  check("D13. BannerSlideshow desc fallback pakai text-white/70", banner.includes("text-white/70 mt-0.5"));
  check("D14. BannerSlideshow tidak lagi pakai text-slate-300 (akan ter-mapping)", !banner.includes("text-slate-300"));
}

// ── E. Protected zones: git status hanya file izin ──
{
  const dirty = execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .map((l) => l.trim().slice(3))
    .filter(Boolean);

  const blocked = dirty.filter((f) =>
    /^(prisma\/|app\/api\/|lib\/gamification\/|lib\/learning-loop\/|engines\/|lib\/apk.ts|app\/arena\/bottom-nav.tsx|lib\/coins.ts|lib\/award-xp.ts)/.test(f)
  );
  check("E1. Protected zones 0 diff", blocked.length === 0, blocked.join(", "));
}

// ── Ringkasan ──
console.log(`\nGURU BERANDA THEME`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
if (failed > 0) {
  failures.forEach((f) => console.log(`  ✗ ${f}`));
  process.exit(1);
}
console.log("  SEMUA LULUS ✅");
process.exit(0);