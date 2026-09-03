/**
 * DARK/LIGHT MODE 2.0 — Theme Consistency & Visual Hardening tests.
 *
 * Pattern-based (bukan brittle whitespace check). Memverifikasi:
 *  - fondasi design system (tokens semantik + .dark + darkMode class)
 *  - tidak ada surface light-only tanpa dark variant di permukaan student
 *  - tidak ada typography gelap (gray/slate 700-900, black) tanpa dark variant
 *  - border/placeholder light-only tanpa dark variant
 *  - komponen interaktif (button/input/sidebar/header/bottom nav) punya
 *    theme handling
 *  - AI BC & Arena (gamification) punya theme handling
 *
 * Run: npx tsx scripts/test-theme-consistency.ts
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const ok = fn();
    if (ok) passed++;
    else {
      failed++;
      console.error(`  ✗ ${name}`);
    }
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

const ROOT = join(__dirname, "..");
const read = (p: string) => {
  const full = join(ROOT, p);
  return existsSync(full) ? readFileSync(full, "utf-8") : "";
};

console.log("DARK/LIGHT MODE 2.0 — THEME CONSISTENCY");

/* ------------------------------------------------------------------ */
/* 1. Design system foundation                                         */
/* ------------------------------------------------------------------ */

console.log("\n1. Design system foundation");
test("globals.css punya blok .dark dengan token surface", () => {
  const g = read("app/globals.css");
  return g.includes(".dark {") && g.includes("--surface") && g.includes("--surface-elevated") && g.includes("--surface-muted");
});
test("darkMode class (bukan media) di tailwind config", () =>
  read("tailwind.config.ts").includes('darkMode: ["class"]'));
test("token semantik surface ter-ekspos di tailwind config", () => {
  const t = read("tailwind.config.ts");
  return t.includes('surface: "hsl(var(--surface))"') && t.includes('"surface-elevated"');
});

/* ------------------------------------------------------------------ */
/* 2. Student surfaces — scope scan                                    */
/* ------------------------------------------------------------------ */

const SCOPES = [
  "app/(dashboard)/murid",
  "app/arena",
  "components/arena",
  "components/student-home",
  "components/student-karya",
  "components/murid",
  "components/profile",
  "components/notifikasi",
  "components/dashboard",
  "components/shared",
  "components/shell",
  "components/gamification",
  "components/ai-bc",
  "app/(dashboard)/admin",
  "components/admin",
];

const studentFiles: string[] = [];
for (const scope of SCOPES) {
  const dir = join(ROOT, scope);
  if (!existsSync(dir)) continue;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of readdirSync(cur, { withFileTypes: true })) {
      const p = join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (/\.(tsx|ts)$/.test(e.name) && !e.name.includes(".test.")) studentFiles.push(p);
    }
  }
}

const isComment = (l: string) => {
  const t = l.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
};

function scanLightOnly(re: RegExp): { total: number; samples: string[] } {
  let total = 0;
  const samples: string[] = [];
  for (const f of studentFiles) {
    // Protected zone (APK) & game components (canvas fixed-color by design):
    // surfaces game (MenaraCerdas/ZelbyDash/GamePlay dll.) sengaja memakai
    // kartu putih di atas canvas navy — theme-agnostic, bukan bug.
    // StudentHomeHero juga light-by-design: artwork "banner herocard Arena.png"
    // berkomposisi terang (area putih kiri) sehingga hero card sengaja putih
    // di kedua tema — identitas/CTA memakai teks gelap kontras tinggi di atasnya.
    if (f.includes("app/arena/bottom-nav.tsx") || f.includes("/game/") || f.endsWith("components/student-home/StudentHomeHero.tsx")) continue;
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((line) => {
        if (isComment(line)) return;
        if (line.includes("dark:")) return;
        if (re.test(line) && samples.length < 5) samples.push(`${f.replace(ROOT + "/", "")}: ${line.trim().slice(0, 100)}`);
        if (re.test(line)) total++;
      });
  }
  return { total, samples };
}

console.log("\n2. No light-only surface without dark variant");
const surfaces = scanLightOnly(/\bbg-white(?![/\w-])\b|\bbg-gray-50\b|\bbg-gray-100\b|\bbg-slate-50\b|\bbg-slate-100\b/);
test(`0 light-only surface tanpa dark: (ditemukan ${surfaces.total})`, () => surfaces.total === 0);

console.log("\n3. No dark typography without dark variant");
const type = scanLightOnly(/\btext-black\b|\btext-gray-900\b|\btext-gray-800\b|\btext-gray-700\b|\btext-gray-600\b|\btext-gray-500\b|\btext-slate-900\b|\btext-slate-800\b|\btext-slate-700\b|\btext-slate-600\b|\btext-slate-500\b/);
test(`0 light-only dark text tanpa dark: (ditemukan ${type.total})`, () => type.total === 0);

console.log("\n4. No light-only border/placeholder without dark variant");
const border = scanLightOnly(/\bborder-gray-100\b|\bborder-gray-200\b|\bborder-gray-300\b|\bborder-slate-100\b|\bborder-slate-200\b|\bplaceholder-gray-400\b|\bplaceholder-gray-500\b/);
test(`0 light-only border/placeholder tanpa dark: (ditemukan ${border.total})`, () => border.total === 0);

console.log("\n4b. No light-only tint surface/border/status-text without dark variant");
const tint = scanLightOnly(
  /\bbg-(amber|green|red|blue|violet|emerald|yellow|orange|sky|purple)-50\b|\bborder-(amber|green|red|blue|violet|emerald|yellow|orange|sky|purple)-(100|200|300)\b|\btext-(amber|green|red|blue|violet|emerald|yellow|orange|sky|purple)-(500|600|700)\b/
);
test(`0 light-only tint tanpa dark: (ditemukan ${tint.total})`, () => tint.total === 0);

/* ------------------------------------------------------------------ */
/* 4c. Interaction states (hover/active/focus/selected)                */
/* ------------------------------------------------------------------ */

console.log("\n4c. Interaction states have dark/translucent handling");
function scanInteraction(re: RegExp, label: string): { total: number } {
  let total = 0;
  for (const f of studentFiles) {
    if (f.includes("app/arena/bottom-nav.tsx") || f.includes("/game/") || f.endsWith("components/student-home/StudentHomeHero.tsx")) continue;
    readFileSync(f, "utf8")
      .split("\n")
      .forEach((line) => {
        if (isComment(line)) return;
        if (line.includes("dark:")) return;
        if (re.test(line)) total++;
      });
  }
  return { total };
}
const bareHoverWhite = scanInteraction(/\bhover:bg-white(?![/\w])\b|\bactive:bg-white(?![/\w])\b|\bfocus:bg-white(?![/\w])\b/, "bare hover/active/focus bg-white");
test(`0 hover/active/focus:bg-white tanpa dark/translucent: (ditemukan ${bareHoverWhite.total})`, () => bareHoverWhite.total === 0);
const invalidDup = scanInteraction(/\bbg-white bg-white\//, "stray duplicate bg-white");
test(`0 duplikat stray 'bg-white bg-white/N' (ditemukan ${invalidDup.total})`, () => invalidDup.total === 0);
const brokenArb = scanInteraction(/ \/\[[0-9.]+\]/, "broken arbitrary class `/[0.NN]`");
test(`0 kelas rusak 'bg-white /[0.NN]' (ditemukan ${brokenArb.total})`, () => brokenArb.total === 0);
const hoverGray = scanInteraction(/\bhover:bg-gray-(50|100)\b|\bactive:bg-gray-(50|100|200)\b/, "hover/active gray");
test(`0 hover/active:bg-gray-50/100/200 tanpa dark: (ditemukan ${hoverGray.total})`, () => hoverGray.total === 0);
test("league tabs (Harian/Mingguan) punya dark handling (selected + inactive + hover)", () => {
  const lt = read("app/arena/league/league-tabs.tsx");
  return lt.includes("dark:text-violet-300") &&
    lt.includes("dark:text-slate-400") &&
    lt.includes("dark:hover:text-violet-300") &&
    lt.includes("dark:from-slate-800/80");
});
test("leaderboard row memakai zone glass (bukan bg-white solid)", () => {
  const lb = read("components/arena/player/leaderboard-panel.tsx");
  return lb.includes("bg-[var(--px-glass)] hover:bg-[var(--px-glass-strong)]");
});
test("profil interactive (follow/like) glass hover translusen", () => {
  const ph = read("components/profile/ProfileHero.tsx");
  return !ph.includes("hover:bg-white\"") && !ph.includes("hover:bg-white ");
});
test("beranda cards (student-home) hover tidak solid white", () => {
  const src = ["AIBCHomeCard", "RecentWorksSection", "RuangBelajarSection", "SimulasiUjianSection", "LearningJourneySection"]
    .map((n) => read(`components/student-home/${n}.tsx`))
    .join("\n");
  return !src.includes("hover:bg-white dark:bg-slate-800/90") && !src.includes("hover:bg-white\"");
});

/* ------------------------------------------------------------------ */
/* 5. Interactive components have theme handling                       */
/* ------------------------------------------------------------------ */

console.log("\n5. Interactive components have theme handling");
const interactive = [
  "components/theme/theme-toggle.tsx",
  "components/shared/BackHome.tsx",
  "components/dashboard/ShellSidebarToggle.tsx",
  "components/dashboard/LogoutButton.tsx",
  "components/arena/LogoutButton.tsx",
  "components/dashboard/NotificationBell.tsx",
  "components/shared/AIFloatingButton.tsx",
  "components/ai-bc/AiBcArenaWorkspace.tsx",
  "components/ai-bc/AiBcGuruWorkspace.tsx",
  "components/arena/player/rank-card.tsx", // skip via player/ filter
  "components/arena/player/player-header.tsx", // skip via player/ filter
  "components/arena/player/CompetitionHero.tsx",
  "components/arena/player/SkillRadar.tsx",
];
for (const f of interactive) {
  if (f.includes("player/")) continue; // player pakai sistem --px-* (navy premium di kedua mode, by design)
  test(`${f} punya dark variant`, () => read(f).includes("dark:"));
}
test("player components memakai sistem token --px (theme-agnostic by design)", () => {
  const rc = read("components/arena/player/rank-card.tsx");
  const ph = read("components/arena/player/player-header.tsx");
  return rc.includes("--px-") || rc.includes("GlassCard") || (ph.includes("--px-") || ph.includes("GlassCard"));
});
test("halaman player dibungkus PlayerTheme (zona arena navy premium)", () => {
  const p = read("app/arena/player/page.tsx");
  const lb = read("app/arena/player/leaderboard/page.tsx");
  return p.includes("PlayerTheme") && lb.includes("PlayerTheme");
});

/* ------------------------------------------------------------------ */
/* 6. Inputs & forms                                                   */
/* ------------------------------------------------------------------ */

console.log("\n6. Inputs & forms have theme handling");
const inputs = [
  "app/(dashboard)/murid/profile/page.tsx",
  "app/(dashboard)/murid/pengaturan/page.tsx",
  "app/(dashboard)/murid/karya/tulis/page.tsx",
  "app/arena/chat/chat-client.tsx",
  "components/ai-bc/AiBcArenaWorkspace.tsx",
  "components/ai-bc/AiBcGuruWorkspace.tsx",
];
for (const f of inputs) {
  test(`${f} punya dark variant`, () => read(f).includes("dark:"));
}

/* ------------------------------------------------------------------ */
/* 7. Sidebar / header / bottom nav                                    */
/* ------------------------------------------------------------------ */

console.log("\n7. Sidebar, header & mobile nav have theme handling");
test("shell aside dark variant", () => read("components/shell/ShellLayout.tsx").includes("dark:bg-slate-900/80"));
test("murid layout root dark gradient", () => read("app/(dashboard)/murid/layout.tsx").includes("dark:from-slate-950"));
test("murid header dark", () => read("app/(dashboard)/murid/layout.tsx").includes("dark:bg-slate-900/80"));
test("MuridMobileNav dark", () => read("components/dashboard/MuridMobileNav.tsx").includes("dark:"));
test("arena layout root dark", () => read("app/arena/layout.tsx").includes("dark:"));
test("guru layout root dark", () => read("app/(dashboard)/guru/layout.tsx").includes("dark:from-slate-950"));

/* ------------------------------------------------------------------ */
/* 8. AI BC theme                                                      */
/* ------------------------------------------------------------------ */

console.log("\n8. AI BC theme handling");
const arenaWs = read("components/ai-bc/AiBcArenaWorkspace.tsx");
const guruWs = read("components/ai-bc/AiBcGuruWorkspace.tsx");
test("AI BC murid: komposer/bubbles/zona dark", () =>
  arenaWs.includes("dark:bg-slate-900/70") && arenaWs.includes("dark:bg-slate-900/80") && arenaWs.includes("dark:text-slate-100"));
test("AI BC guru: komposer/bubbles/zona dark", () =>
  guruWs.includes("dark:bg-slate-900/70") && guruWs.includes("dark:bg-slate-900/80") && guruWs.includes("dark:text-slate-100"));
test("AI BC karakter object-contain (tanpa white box)", () =>
  read("components/ai-bc/AICompanionCharacter.tsx").includes("object-contain"));

/* ------------------------------------------------------------------ */
/* 9. Arena & gamification                                             */
/* ------------------------------------------------------------------ */

console.log("\n9. Arena & gamification theme handling");
const arenaFiles = [
  "app/arena/page.tsx",
  "app/arena/league/league-tabs.tsx",
];
for (const f of arenaFiles) {
  test(`${f} punya dark variant`, () => read(f).includes("dark:"));
}
// Zona player memakai sistem --px-* (theme-agnostic navy premium) — bukan dark: class.
const zoneFiles = [
  "components/arena/player/player-dashboard.tsx",
  "components/arena/player/leaderboard-panel.tsx",
  "components/arena/player/badge-grid.tsx",
  "components/arena/player/xp-history-timeline.tsx",
  "components/arena/player/leaderboard-panel.tsx",
];
for (const f of zoneFiles) {
  test(`${f} memakai token zone --px (bukan bg-white solid)`, () =>
    !read(f).includes("bg-white ") && !read(f).includes("bg-white\"" ) && read(f).includes("--px-"));
}
test("player-theme tidak pure black (navy premium)", () => {
  const css = read("app/arena/player-theme.css");
  return css.includes("#0b132b") || css.includes("0b132b");
});

/* ------------------------------------------------------------------ */
/* 10. Light/Dark 2.2 — beranda & profile theme-aware                  */
/* ------------------------------------------------------------------ */

console.log("\n10. Light/Dark 2.2 — beranda & profile theme-aware");
test("beranda wrapper memakai px-theme px-theme-app", () =>
  read("app/(dashboard)/murid/beranda/page.tsx").includes("px-theme-app"));
test("player-theme.css punya .px-theme-app (light) + .dark .px-theme-app (navy)", () => {
  const css = read("app/arena/player-theme.css");
  return css.includes(".px-theme-app") && css.includes(".dark .px-theme-app");
});
test("globals.css punya .bc-card-premium + .bc-hero-card + .dark .bc-card-premium", () => {
  const g = read("app/globals.css");
  return g.includes(".bc-card-premium") && g.includes(".bc-hero-card") && g.includes(".dark .bc-card-premium");
});
test("ProfileHero memakai bc-hero-card + darkText foreground", () => {
  const ph = read("components/profile/ProfileHero.tsx");
  return ph.includes("bc-hero-card") && (ph.includes("darkText") || ph.includes("isDarkInk"));
});

// ContinueLearningCard & StudentHomeHero memakai token --px-* (px-card/
// px-chip/var(--px-text)) yang di-flip oleh .dark .px-theme-app — theme-aware
// tanpa dark: class (pola sama dengan zona player, seksi 9).
const isPxTokenAware = (src: string) => /px-card|px-chip|px-skeleton|--px-/.test(src);
const homeCards = [
  "AIBCHomeCard",
  "RecentWorksSection",
  "RuangBelajarSection",
  "SimulasiUjianSection",
  "LearningJourneySection",
  "ContinueLearningCard",
  "ArenaHomeSection",
  "SecondaryLearningInfo",
  "StudentHomeHero",
];
for (const n of homeCards) {
  test(`student-home ${n} theme-aware`, () => {
    const src = read(`components/student-home/${n}.tsx`);
    return src.includes("dark:") || isPxTokenAware(src);
  });
}

const profileCards = [
  "ProfileHero",
  "PlayerStatusBar",
  "ProfileMotto",
  "PlayerStatsGrid",
  "ActivityFeed",
  "ActivityChart",
  "FeaturedWorksGallery",
  "SocialConnections",
  "BadgeShowcasePanel",
];
for (const n of profileCards) {
  test(`profile ${n} punya dark variant`, () => read(`components/profile/${n}.tsx`).includes("dark:"));
}

const adminPages = [
  "app/(dashboard)/admin/page.tsx",
  "app/(dashboard)/admin/payments/page.tsx",
  "app/(dashboard)/admin/ai-quota/page.tsx",
  "app/(dashboard)/admin/data-center/page.tsx",
  "components/admin/AdminSidebar.tsx",
];
for (const f of adminPages) {
  test(`${f} punya dark variant`, () => read(f).includes("dark:"));
}

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

console.log(`\nHASIL: ${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed > 0) {
  console.log("\nSisa masalah (sampel):");
  console.log("  surface:", surfaces.samples);
  console.log("  typography:", type.samples);
  console.log("  border:", border.samples);
  process.exit(1);
}
console.log("✅ SEMUA UJI KONSISTENSI TEMA LULUS\n");
process.exit(0);
