import fs from "fs";
import { execSync } from "child_process";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}`);
      failed++;
    }
  } catch (e: any) {
    console.log(`  ❌ ${name} — ${e.message}`);
    failed++;
  }
}

function read(rel: string): string {
  return fs.readFileSync(rel, "utf-8");
}

function main() {
  console.log("\n📋 ARENA FINAL CONSOLIDATION TEST — Student Shell Competitive Hub");
  console.log("=".repeat(60));

  // ── 1. LAYOUT — TANPA navbar/subnav Arena di web (Student Shell) ──
  console.log("\n── 1. Layout (app/arena/layout.tsx) — Tanpa Navbar Arena ──");
  const layout = read("app/arena/layout.tsx");
  const NAV_ROUTES = ["/arena/misi", "/arena/league", "/arena/game/kuis-tempur", "/arena/player/leaderboard", "/arena/player/badges", "/arena/toko-koin"];
  const ROUTES_AS_FILES = ["app/arena/page.tsx", "app/arena/misi/page.tsx", "app/arena/league/page.tsx", "app/arena/game/page.tsx", "app/arena/player/leaderboard/page.tsx", "app/arena/player/badges/page.tsx", "app/arena/chat/page.tsx"];
  test("route Arena tetap ada (7 route utama tidak dihapus)",
    () => ROUTES_AS_FILES.every((f) => fs.existsSync(f)));
  test("TIDAK ada navItems (navbar Arena sendiri dihapus)",
    () => !layout.includes("navItems"));
  test("TIDAK ada segmented pill subnav premium (rounded-full border … p-1) di layout",
    () => !layout.includes("rounded-full border border-gray-200 bg-slate-50 p-1"));
  test("TIDAK ada aria-label 'Navigasi Arena' (subnav mobile strip dihapus)",
    () => !layout.includes('aria-label="Navigasi Arena"'));
  test("TIDAK ada subnav mobile sticky di bawah top bar (md:hidden sticky top-12 / overflow-x-auto)",
    () => !layout.includes("md:hidden sticky top-12") && !layout.includes("overflow-x-auto"));
  test("href subnav canonical (Misi/Liga/Gim/Peringkat/Koleksi) TIDAK jadi item nav layout",
    () => ["/arena/misi", "/arena/league", "/arena/game", "/arena/player/leaderboard", "/arena/player/badges"].every((h) => !layout.includes(`href: "${h}"`)));
  test("header GLOBAL KANONIK: TIDAK ada identitas produk Arena (ikon/title/subtitle) di header",
    () => !layout.includes("Pusat kompetisi") && !layout.includes("<Zap") && (layout.match(/Link href="/g) || []).length <= 3);
  test("container non-chat = canvas desktop-first max-w-[1280px] (bukan max-w-lg md:max-w-4xl)",
    () => layout.includes("max-w-[1280px] py-0 md:py-6 md:px-6") && !layout.includes("max-w-lg md:max-w-4xl"));
  test("container chat FULL-WIDTH (3-pane workspace tanpa cap max-w, melebar sampai 1920+)",
    () => layout.includes('pathname.startsWith("/arena/chat")') && layout.includes('? "w-full py-0 md:px-6"') && layout.includes("max-w-[1280px] py-0 md:py-6 md:px-6"));

  // ── 2. LAYOUT — proteksi APK & auth ──
  console.log("\n── 2. Layout — Proteksi APK & Auth ──");
  test("RUTE_TANPA_GERBANG /arena/login tetap ada (login APK bare)",
    () => layout.includes('RUTE_TANPA_GERBANG = "/arena/login"'));
  test("auth gate getUser + redirect login tetap ada",
    () => layout.includes("await getUser()") && layout.includes("redirect(RUTE_TANPA_GERBANG)"));
  test("isApk() tetap dipakai untuk perilaku APK (escape hatch BackHome keluar scope)",
    () => layout.includes("await isApk()") && layout.includes("!apk &&"));
  test("BottomNav hanya untuk APK (web tanpa bottom navigation ala APK)",
    () => layout.includes("{apk && <BottomNav />}"));
  test("TIDAK ada tombol Dasbor/Logout di header arena (akses guru via RoleSections sidebar; logout via footer/Pemain)",
    () => !layout.includes("<LayoutDashboard") && !layout.includes("LogoutButton") && layout.includes("RoleSections"));
  test("banner boost tidak dimatikan di halaman Arena non-chat ({!isChatWeb && <ActiveBoostBanner />})",
    () => layout.includes("!isChatWeb && !isAiWorkspace && <ActiveBoostBanner />"));

  // ── 3. HOME — hierarki 8 seksi (Spec§5) ──
  console.log("\n── 3. Home (/arena/page.tsx) — Hierarki Kompetisi ──");
  const home = read("app/arena/page.tsx");
  test("1: Arena Rank Hero (RankChip + level + XP/koin + progress bar + Lihat Profil)",
    () => home.includes("RankChip") && home.includes("progress.pct") && home.includes("Lihat Profil"));
  test("1: Hero memakai zona gradient violet (bukan daftar flat) — arena-hero/docs",
    () => /from-violet-[67]00/.test(home) || home.includes("bg-gradient-to-br from-violet-600") || home.includes("from-violet-500"));
  test("2: Kuis Tempur Featured — dark immersive zone + Swords + Terpopuler (live-dot2)",
    () => home.includes("Kuis Tempur") && home.includes("live-dot2") && home.includes("Swords") && home.includes('kuisTempurHref = "/arena/game/kuis-tempur"'));
  test("2: klaim featured faktual (+80 XP / ±5 menit / 2–8 pemain) tanpa angka karangan lain",
    () => home.includes("+80 XP") && home.includes("menit") && home.includes("2–8 pemain"));
  test("3: 3 Arena Action cards eksak (MISI / GIM / LIGA) — bukan 6 gateway",
    () => home.includes('href="/arena/misi"') && home.includes('href="/arena/game"') && home.includes('href="/arena/league"'));
  test("4: Kompetisi Minggu Ini = Misi + Liga digabung (getWeeklyCompetition + WeeklyCountdown + questProgressText)",
    () => home.includes("getWeeklyCompetition") && home.includes("<WeeklyCountdown") && home.includes("questProgressText"));
  test("4: Misi Hari Ini memakai getQuestMeta + rewardCoins asli dari DB",
    () => home.includes("getQuestMeta") && home.includes("rewardCoins"));
  test("5: Game Arena — Kuis Tempur mini + 3 gim sekunder real + 'Lihat Semua Gim'",
    () => home.includes("Lihat Semua Gim") && home.includes('href: "/arena/game/menara"') && home.includes('href: "/arena/game/irama-kata"') && home.includes('href: "/arena/game/petualangan-kata"'));
  test("6: Papan Peringkat compact (LeaderboardPanel compact + Lihat Semua → /arena/player/leaderboard)",
    () => home.includes("<LeaderboardPanel compact") && home.includes('href="/arena/player/leaderboard"'));
  test("7: Reward & Pencapaian SATU seksi — BadgeIcon + listAchievements + Toko Koin CTA",
    () => home.includes("listUserBadges") && home.includes("listAchievements") && home.includes('href="/arena/toko-koin"') && home.includes('href="/arena/player/badges"') && home.includes('href="/arena/player/achievements"'));
  test("8: Tanpa section tambahan liar — tidak ada AI BC card / NextActionCard / BattleCard / Jelajahi Arena di home",
    () => !home.includes("NextActionCard") && !home.includes("<BattleCard") && !home.includes("Jelajahi Arena") && !home.includes("Tanya AI BC"));
  test("data asli dari engine (getorCreateDailyQuests, getWeeklyCompetition, awardXp tidak dipanggil di home)",
    () => home.includes("getOrCreateDailyQuests") && !home.includes("awardXp(") && !home.includes("addXp("));

  // ── 4. HOME — duplikasi Beranda/Profil global dihapus ──
  console.log("\n── 4. Home — Tanpa Duplikasi Student Shell ──");
  const DUPLICATE_TOKENS = [
    "PembelajaranCard",
    "LeagueMini",
    "Simulasi dan Ujian",
    "Aksi Cepat",
    "Statistik Kamu",
    "Tulis Karya",
    "Gabung Kelas",
    "Pemenang Game",
    "MentorCard",
    "SkillRadar",
  ];
  test("komponen/seksi duplikat Beranda murid TIDAK ada (PembelajaranCard/LeagueMini/Simulasi/Aksi Cepat/Statistik/Tulis Karya/Gabung Kelas/Mentor/SkillRadar)",
    () => DUPLICATE_TOKENS.every((t) => !home.includes(t)));
  test("tidak ada tautan /arena/jalur-cerdas sebagai kartu belajar di home",
    () => !home.includes('href="/arena/jalur-cerdas"'));

  // ── 5. HOME — tema & responsif ──
  console.log("\n── 5. Home — Tema & Responsif ──");
  const darkCount = (home.match(/dark:/g) || []).length;
  test(`theme-aware: ≥15 token dark: di kartu home (ada ${darkCount})`,
    () => darkCount >= 15);
  test("tidak ada fixed canvas / min-width desktop yang memicu overflow",
    () => !home.includes("min-w-[1440") && !home.includes("min-w-[1200"));
  test("grid 2 kolom lg: dipakai untuk pasangan seksi (Kompetisi/Gim/Peringkat/Hadiah)",
    () => (home.match(/lg:grid-cols-2/g) || []).length >= 3);
  test("kartu action pakai grid responsif (sm:grid-cols-3 untuk 3 Arena Actions)",
    () => home.includes("sm:grid-cols-3") || home.includes("grid-cols-3"));

  // ── 6. LeaderboardPanel — tab Teman ──
  console.log("\n── 6. LeaderboardPanel — Tab Teman ──");
  const panel = read("components/arena/player/leaderboard-panel.tsx");
  test("LeaderboardPanel punya scope FRIENDS (tab 'Teman')",
    () => panel.includes("FRIENDS") && panel.includes('"Teman"'));
  test("LeaderboardPanel mendukung prop compact (digunakan home)",
    () => panel.includes("compact = false"));

  // ── 7. Badge bug fix — path mentah tidak pernah render ──
  console.log("\n── 7. Badge Bug Fix — Tidak Ada Path Mentah ──");
  const iconSrc = read("components/gamification/BadgeIcon.tsx");
  test("home TIDAK render {b.icon}/{a.icon} mentah (path webp sebagai teks)",
    () => !/(?<!icon=)\{b\.icon\}/.test(home) && !/(?<!icon=)\{a\.icon\}/.test(home));
  test("home pakai <BadgeIcon> untuk lencana & pencapaian dengan alt",
    () => home.includes("BadgeIcon icon={b.icon}") && home.includes("BadgeIcon icon={a.icon}"));
  test("BadgeIcon punya fallback onError (Image onError → broken state)",
    () => iconSrc.includes("onError={() => setBroken(true)}"));
  test("BadgeIcon fallback visual Award — path mentah tidak pernah tampil sebagai teks",
    () => iconSrc.includes("<Award") && iconSrc.includes('role={alt ? "img" : undefined}'));
  test("BadgeIcon client component (useState untuk broken state)",
    () => iconSrc.includes('"use client"') && iconSrc.includes("useState(false)"));

  // ── 8. GURU BADGE GRID — konsistensi render badge ──
  console.log("\n── 8. GuruBadgeGrid — Konsistensi BadgeIcon ──");
  const guruGrid = read("components/guru/GuruBadgeGrid.tsx");
  test("GuruBadgeGrid memakai <BadgeIcon> (bukan raw <img src={b.icon}>)",
    () => guruGrid.includes("<BadgeIcon") && !guruGrid.includes('<img src={b.icon}'));

  // ── 9. ZONE TERPROTEKSI (0 diff — konsolidasi TIDAK menyentuh sama sekali) ──
  console.log("\n── 9. Protected Zones ──");
  test("prisma/ 0 diff (konsolidasi Arena tanpa pengecualian schema)",
    () => execSync(`git diff --name-only HEAD -- prisma/`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0);
  test("ZERO TOUCH: lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts lib/xp.ts lib/coins.ts lib/award-xp.ts 0 diff",
    () => {
      const diff = execSync(
        `git diff --name-only HEAD -- lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts lib/xp.ts lib/coins.ts lib/award-xp.ts`,
        { encoding: "utf8", cwd: process.cwd() }
      ).trim();
      return diff.length === 0;
    });
  test("app/api/ SELURUHNYA 0 diff kecuali app/api/ai/bc/chat (route AI BC role-safe fase 2.1)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- app/api/`, { encoding: "utf8", cwd: process.cwd() })
        .trim().split("\n").filter(Boolean).filter((l) => l !== "app/api/ai/bc/chat/route.ts").join("\n");
      return diff.length === 0;
    });
  test("app/arena/bottom-nav.tsx 0 diff (APK bottom nav tidak disentuh)",
    () => execSync(`git diff --name-only HEAD -- app/arena/bottom-nav.tsx`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0);
  test("komponen bersama yang masih dipakai tidak dihapus (BattleCard untuk /arena/game, KataPlayGame)",
    () => fs.existsSync("components/arena/BattleCard.tsx") && fs.existsSync("components/game/KataPlayGame.tsx"));

  // ── 10. ARENA 4.2 — SUB-ROUTE CANVAS DESKTOP-FIRST ──
  console.log("\n── 10. Sub-route Canvas (ARENA 4.2) — Desktop-first, bukan kolom mobile ──");
  const leaguePage = read("app/arena/league/page.tsx");
  test("league menggunakan canvas penuh (tanpa wrapper legacy max-w-3xl / max-w-lg)",
    () => !leaguePage.includes("max-w-3xl") && !leaguePage.includes("max-w-lg"));
  test("league punya header kompetitif 'Liga Minggu Ini' + subtitle resmi",
    () => leaguePage.includes("Liga Minggu Ini") && leaguePage.includes("Kompetisi mingguan untuk membuktikan kemampuanmu."));
  test("league menampilkan status cepat asli (Peringkatmu + XP minggu ini + countdown real)",
    () => leaguePage.includes("Peringkatmu") && leaguePage.includes("XP minggu ini") && leaguePage.includes("<WeeklyCountdown"));
  test("league tetap memakai data & engine asli (getLeaderboard + getWeeklyCompetition + LeagueTabs)",
    () => leaguePage.includes("getLeaderboard") && leaguePage.includes("getWeeklyCompetition") && leaguePage.includes("<LeagueTabs"));
  test("5 halaman /arena/simulasi* memakai canvas penuh (tanpa max-w-3xl legacy)",
    () => ["simulasi", "simulasi/ukbi", "simulasi/tka", "simulasi/hasil", "simulasi/bigt"]
      .every((p) => !read(`app/arena/${p}/page.tsx`).includes("max-w-3xl")));
  test("/arena/game hub memakai canvas penuh (game-hub, tanpa wrapper legacy sempit)",
    () => read("app/arena/game/page.tsx").includes("game-hub") && !read("app/arena/game/page.tsx").includes("max-w-lg mx-auto"));
  test("tantang (game 1v1) memakai canvas penuh (tanpa max-w-lg mx-auto legacy)",
    () => !read("app/arena/game/tantang/page.tsx").includes("max-w-lg mx-auto"));
  test("/arena/player web memakai canvas penuh (tanpa wrapper legacy sempit)",
    () => !read("app/arena/player/page.tsx").includes("max-w-3xl") && !read("app/arena/player/page.tsx").includes("max-w-lg mx-auto"));
  test("chat full-width workspace (w-full, tanpa max-w-[1440px] legacy)",
    () => layout.includes('pathname.startsWith("/arena/chat")') && layout.includes('? "w-full py-0 md:px-6"') && !layout.includes("max-w-[1440px]"));
  test("tidak ada fixed min-width desktop (min-w-[1200px]/min-w-[1440px]) di seluruh route Arena",
    () => {
      const out = execSync(`rg -l 'min-w-\\[1200px\\]|min-w-\\[1440px\\]' app/arena --glob '*.tsx' || true`, { encoding: "utf8" });
      return out.trim().length === 0;
    });

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed > 0) process.exit(1);
  console.log("✅ ALL ARENA CONSOLIDATION TESTS PASSED\n");
}

main();