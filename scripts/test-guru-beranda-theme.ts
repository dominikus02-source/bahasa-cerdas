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
 *  F. Teacher Command Center (hero baru): keberadaan, data props (bukan
 *     hardcoded), route CTA benar, label Bahasa Indonesia, prioritas visual
 *     Tugas Menunggu, children slot CreateMenu, tanpa dead icons.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

const GLOBALS_CSS = path.join(ROOT, "app/globals.css");
const SCOPE_FILES = [
  "app/(dashboard)/guru/beranda/page.tsx",
  // Komposisi beranda yang benar-benar dirender (page -> GuruBerandaClient -> TeacherHomeV3).
  // TeacherCommandCenter & TrialStatusCard tidak lagi dipasang di beranda, jadi keluar dari
  // scope warna; TeacherCommandCenter tetap diverifikasi oleh blok F di bawah.
  "components/guru/GuruBerandaClient.tsx",
  "components/guru/TeacherHomeV3.tsx",
  "components/guru/GuruLeaderboardCard.tsx",
  "components/guru/GuruBerkarya.tsx",
  "components/guru/GuruBerkaryaComments.tsx",
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
    // Token desain `*-bc-*` (mis. shadow-bc-1) bukan palet mentah — dark-aware dari tokens.css.
    for (const m of src.matchAll(COLOR_CLASS_RE)) if (!/-bc-/.test(m[0])) used.add(m[0]);
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

// ── F. Teacher Command Center — hero baru beranda guru ──
{
  const tcPath = path.join(ROOT, "components/guru/TeacherCommandCenter.tsx");
  const tc = fs.existsSync(tcPath) ? fs.readFileSync(tcPath, "utf8") : "";
  const page = fs.readFileSync(path.join(ROOT, "app/(dashboard)/guru/beranda/page.tsx"), "utf8");

  check("F1. TeacherCommandCenter.tsx ada dan \"use client\"", tc.startsWith('"use client"'));
  check("F2. Komponen baru 0 variant dark:", !tc.includes("dark:"));
  check("F3. Metric dari props (bukan hardcoded)",
    tc.includes("totalSiswa: number") &&
    tc.includes("kelasAktif: number") &&
    tc.includes("tugasMenunggu: number") &&
    tc.includes("greeting: string") &&
    tc.includes("fullName: string"));
  // Beranda guru kini memakai komposisi TeacherHomeV3 (lihat test-guru-engagement2-phase1);
  // page.tsx = server wrapper -> GuruBerandaClient. TeacherCommandCenter tidak lagi dipasang.
  const berandaClient = fs.readFileSync(path.join(ROOT, "components/guru/GuruBerandaClient.tsx"), "utf8");
  check("F4. Page meneruskan data nyata (user + fetch /api/guru/misi), bukan mock",
    page.includes("displayName={resolveGreetingName(user)}") &&
    page.includes("userKey={user?.id ?? null}") &&
    berandaClient.includes('fetch("/api/guru/misi"'));
  check("F5. Route CTA benar & existing",
    tc.includes('href="/guru/materi-ajar"') &&
    tc.includes('href="/guru/ai-bc"') &&
    tc.includes('href: "/guru/penilaian"') &&
    tc.includes('href: "/guru/kelasku"') &&
    tc.includes('href: "/guru/data-siswa"'));
  check("F6. Label Bahasa Indonesia (hero + metric + CTA)",
    tc.includes("Hari ini kamu memiliki") &&
    tc.includes("Tugas Menunggu") &&
    tc.includes("Kelas Aktif") &&
    tc.includes("Buat Materi") &&
    tc.includes(">NARA<") &&
    tc.includes("perlu dinilai") &&
    tc.includes("sedang dikelola") &&
    tc.includes("di ekosistemmu"));
  check("F7. Prioritas visual: Tugas Menunggu pertama + ukuran besar",
    tc.indexOf('key: "tugas"') < tc.indexOf('key: "kelas"') &&
    tc.includes("prominent: true"));
  check("F8. Warna metric calm & konsisten token (amber/emerald/violet 700)",
    tc.includes("text-amber-700") &&
    tc.includes("text-emerald-700") &&
    tc.includes("text-violet-700"));
  check("F9. Loading skeleton via prop loading (placeholder —)", tc.includes("loading") && tc.includes("—"));
  check("F10. Page merender GuruBerandaClient -> TeacherHomeV3 (komposisi utama)",
    page.includes("<GuruBerandaClient") && berandaClient.includes("<TeacherHomeV3"));
  // F11 diperbarui: TrialStatusCard sudah lama dilepas dari beranda (status kuota kini lewat
  // quota-status-client). Yang dijaga sekarang: kartu itu TIDAK dipasang ulang di beranda.
  const teacherHome = fs.readFileSync(path.join(ROOT, "components/guru/TeacherHomeV3.tsx"), "utf8");
  check("F11. Beranda tidak memasang ulang TrialStatusCard",
    !page.includes("<TrialStatusCard") &&
    !berandaClient.includes("<TrialStatusCard") &&
    !teacherHome.includes("<TrialStatusCard"));
  check("F12. Dead icons Crown/LayoutDashboard dihapus dari page",
    !page.includes("Crown") && !page.includes("LayoutDashboard"));
  check("F13. Component tidak memakai Library ikon kedua / emoji label",
    !tc.includes("FontAwesome") && !tc.includes("lucide-react'"));
}

// ── G. Foto beranda guru dipulihkan (keputusan founder 2026-10-26) ──
// #171 (d1e15a9) menghapus seluruh foto beranda guru saat merapikan mode gelap.
// Founder meminta semua gambar kembali; mode gelap tetap murni token (B/C di atas).
{
  const home = fs.readFileSync(path.join(ROOT, "components/guru/TeacherHomeV3.tsx"), "utf8");
  const promo = fs.readFileSync(path.join(ROOT, "components/public/BannerProgramGuruCerdas.tsx"), "utf8");
  const tokens = fs.readFileSync(path.join(ROOT, "app/theme/tokens.css"), "utf8");
  const nextConfig = fs.readFileSync(path.join(ROOT, "next.config.ts"), "utf8");
  const mw = fs.readFileSync(path.join(ROOT, "middleware.ts"), "utf8");

  const photos = [
    "photo-1654356709115-3f68998bead4", // hero + quote
    "photo-1778489769184-45868633c527", // kelas (Main Bersama)
    "photo-1743385779312-73ea241025d8", // menulis (Buat Karya)
    "photo-1516321318423-f06f85e504b3", // NARA
    "photo-1503676260728-1c00da094a0b", // Dasbor Murid
  ];
  check("G1. TeacherHomeV3 memakai next/image", home.includes('import Image from "next/image"'));
  check("G2. Kelima foto beranda kembali", photos.every((id) => home.includes(id)), photos.filter((id) => !home.includes(id)).join(", "));
  check("G3. Hero bergambar (priority) + scrim token", /function TeacherHero[\s\S]*?<Image[\s\S]*?src=\{PHOTO\.hero\}[\s\S]*?priority[\s\S]*?bc-media-scrim/.test(home));
  check("G4. Empat pintasan bergambar", (home.match(/image: PHOTO\./g) || []).length === 4 && /src=\{action\.image\}/.test(home));
  check("G5. Pengumuman Main Bersama bergambar dipasang", /<MainBersamaAnnouncement \/>/.test(home) && /src=\{PHOTO\.classroom\}/.test(home));
  check("G6. Quote Minggu Ini bergambar dipasang", /<QuoteCard \/>/.test(home) && /function QuoteCard[\s\S]*?<Image/.test(home));
  check("G7. Promo Guru Cerdas memakai /landing/banner-1.webp", promo.includes('src="/landing/banner-1.webp"') && promo.includes('import Image from "next/image"'));
  check("G8. Aset promo ada di public/", fs.existsSync(path.join(ROOT, "public/landing/banner-1.webp")));
  check("G9. Unsplash diizinkan next/image & CSP img-src", nextConfig.includes("images.unsplash.com") && /"img-src"[^\n]*images\.unsplash\.com/.test(mw));
  check("G10. Token media terang + gelap (peredup) tersedia",
    tokens.includes("--bc-media-scrim-hero") && /\.dark \.bc-guru-shell[\s\S]*--bc-media-dim:/.test(tokens));
  check("G11. Gambar dekoratif ber-alt kosong (tidak dibacakan pembaca layar)",
    (home.match(/alt=""/g) || []).length >= 3 && promo.includes('alt=""'));
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