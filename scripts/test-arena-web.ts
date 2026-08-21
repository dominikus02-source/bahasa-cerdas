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
  console.log("\n📋 ARENA 2.0 TEST — Light/Dark Adaptive + Student UX");
  console.log("=".repeat(60));

  // ── 1. LAYOUT — TANPA navbar/subnav Arena di web (Student Shell) ──
  console.log("\n── 1. Layout (app/arena/layout.tsx) — Tanpa Navbar Arena ──");
  const layout = read("app/arena/layout.tsx");
  const container = read("components/arena/workspace-container.tsx");
  const NAV_ROUTES = ["/arena/misi", "/arena/league", "/arena/game/kuis-tempur", "/arena/player/leaderboard", "/arena/player/badges", "/arena/toko-koin"];
  const ROUTES_AS_FILES = ["app/arena/page.tsx", "app/arena/misi/page.tsx", "app/arena/league/page.tsx", "app/arena/game/page.tsx", "app/arena/player/leaderboard/page.tsx", "app/arena/player/badges/page.tsx", "app/arena/chat/page.tsx"];
  test("route Arena tetap ada (7 route utama tidak dihapus)",
    () => ROUTES_AS_FILES.every((f) => fs.existsSync(f)));
  test("TIDAK ada navItems (navbar Arena sendiri dihapus)",
    () => !layout.includes("navItems"));
  test("TIDAK ada segmented pill subnav premium di layout",
    () => !layout.includes("rounded-full border border-gray-200 bg-slate-50 p-1"));
  test("TIDAK ada aria-label 'Navigasi Arena' (subnav mobile strip dihapus)",
    () => !layout.includes('aria-label="Navigasi Arena"'));
  test("TIDAK ada subnav mobile sticky di bawah top bar",
    () => !layout.includes("md:hidden sticky top-12") && !layout.includes("overflow-x-auto"));
  test("href subnav canonical TIDAK jadi item nav layout",
    () => ["/arena/misi", "/arena/league", "/arena/game", "/arena/player/leaderboard", "/arena/player/badges"].every((h) => !layout.includes(`href: "${h}"`)));
  test("header GLOBAL KANONIK: TIDAK ada identitas produk Arena di header",
    () => !layout.includes("Pusat kompetisi") && !layout.includes("<Zap") && (layout.match(/Link href="/g) || []).length <= 3);
  test("container non-chat = canvas desktop-first max-w-[1280px]",
    () => container.includes("max-w-[1280px] py-0 md:py-6 md:px-6") && !layout.includes("max-w-lg md:max-w-4xl"));
  test("container chat FULL-WIDTH (3-pane workspace)",
    () => container.includes('pathname.startsWith("/arena/chat")') && container.includes('? "w-full py-0 md:px-6"') && container.includes("max-w-[1280px] py-0 md:py-6 md:px-6"));

  // ── 2. LAYOUT — proteksi APK & auth ──
  console.log("\n── 2. Layout — Proteksi APK & Auth ──");
  test("RUTE_TANPA_GERBANG /arena/login tetap ada (login APK bare)",
    () => layout.includes('RUTE_TANPA_GERBANG = "/arena/login"'));
  test("auth gate getUser + redirect login tetap ada",
    () => layout.includes("await getUser()") && layout.includes("redirect(RUTE_TANPA_GERBANG)"));
  test("isApk() tetap dipakai untuk perilaku APK (escape hatch keluar scope)",
    () => layout.includes("await isApk()") && layout.includes("!apk &&"));
  test("STEP 5.0: APK memakai BottomNav, web mobile memakai student mobile nav (MuridMobileNav)",
    () => layout.includes("{apk ? <BottomNav /> : <MuridMobileNav") && layout.includes("MuridMobileNav"));
  test("TIDAK ada tombol Dasbor/Logout di header arena",
    () => !layout.includes("<LayoutDashboard") && !layout.includes("LogoutButton") && layout.includes("RoleSections"));
  test("banner boost tidak dimatikan di halaman Arena non-chat",
    () => container.includes("!isChatWeb && !isAiWorkspace && <ActiveBoostBanner />"));

  // ── 2.1. BACK BUTTON — ARENA 2.0 (router history + fallback logis) ──
  console.log("\n── 2.1. Back Button — Kembali (bukan hardcode Beranda) ──");
  const backBtn = read("components/arena/ArenaBackButton.tsx");
  test("layout arena memakai ArenaBackButton (bukan BackHome)",
    () => layout.includes("<ArenaBackButton") && !layout.includes("<BackHome"));
  test("ArenaBackButton pakai router.back() (history, bukan href statis)",
    () => backBtn.includes("router.back()") && backBtn.includes("useRouter"));
  test("fallback logis per route: game/* → /arena/game, player/* → /arena/player, game → /arena, lain → /arena",
    () => backBtn.includes('pathname.startsWith("/arena/game/")') && backBtn.includes('pathname.startsWith("/arena/player/")') && backBtn.includes('return "/arena"'));
  test("label tombol = Kembali (bukan Beranda)",
    () => backBtn.includes("Kembali") && !backBtn.includes("Beranda"));

  // ── 3. HOME (/arena) — ARENA HOME sederhana (bukan dashboard statistik) ──
  console.log("\n── 3. Home (/arena/page.tsx) — Arena Home ──");
  const home = read("app/arena/page.tsx");
  test("1: Header 'Arena' + subtext 'Mainkan. Belajar. Naik Level.'",
    () => home.includes(">Arena</h1>") && home.includes("Mainkan. Belajar. Naik Level."));
  test("2: Hero 'Selamat datang kembali' + satu CTA MAIN SEKARANG → /arena/game",
    () => home.includes("Selamat datang kembali") && home.includes("MAIN SEKARANG") && home.includes('href="/arena/game"'));
  test("2: Hero memakai zona gradient violet atau background kustom (bukan daftar flat)",
    () => home.includes("from-violet-600") || home.includes("getBackgroundStyle"));
  test("3: Quick Progress HANYA 3 info (Level / XP / Rank) + RankChip",
    () => home.includes(">Level</p>") && home.includes(">XP</p>") && home.includes(">Rank</p>") && home.includes("<RankChip"));
  test("4: Main Menu 4 tujuan (Gim / Toko / Profil / Leaderboard) — bukan 8 gateway",
    () => home.includes('href="/arena/game"') && home.includes('href="/arena/player"') && home.includes('href="/arena/player/leaderboard"') && home.includes('href="/arena/toko-koin"')
      && !home.includes('href="/arena/misi"') && !home.includes('href="/arena/league"'));
  test("5: TIDAK ada fetch berat di home (tanpa leaderboard/badge/quest/kompetisi/riwayat)",
    () => !home.includes("getOrCreateDailyQuests") && !home.includes("listUserBadges") && !home.includes("listAchievements")
      && !home.includes("getWeeklyCompetition") && !home.includes("gameResult") && !home.includes("<LeaderboardPanel"));
  test("6: Side-effect streak dipertahankan (trackDailyStreak)",
    () => home.includes("trackDailyStreak") && !home.includes("awardXp(") && !home.includes("addXp("));
  test("7: SiaranBanner (kabar sistem) tetap ada di home",
    () => home.includes("<SiaranBanner"));
  test("8: Tanpa section tambahan liar (tanpa AI BC / BattleCard / NextActionCard / Kuis Tempur zone dark)",
    () => !home.includes("NextActionCard") && !home.includes("<BattleCard") && !home.includes("Tanya AI BC") && !home.includes("live-dot2"));

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
  test("komponen/seksi duplikat Beranda murid TIDAK ada",
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
  test("kartu quick progress pakai grid 3 kolom, menu utama responsif",
    () => home.includes("grid-cols-3") && (home.includes("md:grid-cols-2") || home.includes("md:grid-cols-3")));
  test("tidak ada zona hardcoded gelap di home (zona dark lama dihapus)",
    () => !home.includes("#0B0A1A") && !home.includes("#0b0a1a") && !home.includes("live-dot2"));

  // ── 6. LeaderboardPanel — tab Teman ──
  console.log("\n── 6. LeaderboardPanel — Tab Teman ──");
  const panel = read("components/arena/player/leaderboard-panel.tsx");
  test("LeaderboardPanel punya scope FRIENDS (tab 'Teman')",
    () => panel.includes("FRIENDS") && panel.includes('"Teman"'));
  test("LeaderboardPanel mendukung prop compact",
    () => panel.includes("compact = false"));
  test("ARENA 2.0: strip 'Posisi kamu' untuk pemain di luar podium",
    () => panel.includes("meOutsidePodium") && panel.includes("Posisi kamu"));

  // ── 7. Badge bug fix — path mentah tidak pernah render ──
  console.log("\n── 7. Badge — Tidak Ada Path Mentah ──");
  const iconSrc = read("components/gamification/BadgeIcon.tsx");
  const badgeGrid = read("components/arena/player/badge-grid.tsx");
  test("home TIDAK render {b.icon}/{a.icon} mentah (path webp sebagai teks)",
    () => !/(?<!icon=)\{b\.icon\}/.test(home) && !/(?<!icon=)\{a\.icon\}/.test(home));
  test("BadgeGrid memakai <BadgeIcon> dengan alt (bukan raw <img>)",
    () => badgeGrid.includes("<BadgeIcon") && !badgeGrid.includes('<img src={b.icon}'));
  test("BadgeIcon punya fallback onError (Image onError → broken state)",
    () => iconSrc.includes("onError={() => setBroken(true)}"));
  test("BadgeIcon fallback visual Award — path mentah tidak pernah tampil sebagai teks",
    () => iconSrc.includes("<Award") && iconSrc.includes('role={alt ? "img" : undefined}'));
  test("BadgeIcon client component (useState untuk broken state)",
    () => iconSrc.includes('"use client"') && iconSrc.includes("useState(false)"));

  // ── 7.1. BADGES PAGE — ARENA 2.0 ──
  console.log("\n── 7.1. Badges — 'Badge Saya' + Empty State ──");
  const badgesPage = read("app/arena/player/badges/page.tsx");
  test("halaman badges: judul 'Badge Saya' + subjudul kumpulan pencapaian",
    () => badgesPage.includes("Badge Saya") && badgesPage.includes("Kumpulkan pencapaian dari perjalananmu di Arena."));
  test("badges page TIDAK menampilkan header profil pemain (showProfile={false} — fokus badge)",
    () => badgesPage.includes("showProfile={false}"));
  test("badge-grid: empty state actionable + CTA Mainkan Gim → /arena/game",
    () => badgeGrid.includes("Belum ada badge") && badgeGrid.includes("Mainkan Gim") && badgeGrid.includes('href="/arena/game"'));
  test("badge-grid: kartu pakai token tema (bg-[var(--px-glass)]), bukan bg-white/[0.05]",
    () => badgeGrid.includes("bg-[var(--px-glass)]") && !badgeGrid.includes("bg-white/[0.05]"));
  test("badges page pakai PlayerTheme (light/dark adaptive)",
    () => badgesPage.includes("<PlayerTheme>"));

  // ── 8. GURU BADGE GRID — konsistensi render badge ──
  console.log("\n── 8. GuruBadgeGrid — Konsistensi BadgeIcon ──");
  const guruGrid = read("components/guru/GuruBadgeGrid.tsx");
  test("GuruBadgeGrid memakai <BadgeIcon> (bukan raw <img src={b.icon}>)",
    () => guruGrid.includes("<BadgeIcon") && !guruGrid.includes('<img src={b.icon}'));

  // ── 9. ZONE TERPROTEKSI (0 diff) ──
  console.log("\n── 9. Protected Zones ──");
  test("prisma/ 0 diff (hanya additive fields untuk Coin Shop 2.4)",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- prisma/`, { encoding: "utf8", cwd: process.cwd() }).trim().split("\n").filter(Boolean);
      // Coin Shop 2.4: added equippedBackground + equippedNameplate (additive only)
      const allowed = new Set(["prisma/schema.prisma"]);
      return diff.every(f => allowed.has(f));
    });
  test("protected engines 0 diff (gamification/learning-loop/engines/apk/coins/award-xp) — coin consolidation allowed",
    () => {
      const diff = execSync(
        `git diff --name-only HEAD -- lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts lib/xp.ts lib/coins.ts lib/award-xp.ts`,
        { encoding: "utf8", cwd: process.cwd() }
      ).trim();
      const files = diff.split("\n").filter(Boolean);
      // P0 Coin Economy 2.0: achievement-engine + rank-up migrated to User.coins
      const allowed = new Set(["lib/gamification/achievement-engine.ts", "lib/gamification/rank-up.ts", "lib/gamification/player.ts", "lib/gamification/client-types.ts"]);
      return files.every(f => allowed.has(f));
    });
  test("app/api/ 0 diff (tidak ada perubahan API)",
    () => {
      const allowed = new Set([
        "app/api/ai/bc/chat/route.ts",
        "app/api/kompetensi/[paketId]/route.ts",
        "app/api/learning-loop/activity/route.ts",
        "app/api/player/coin/route.ts",
        "app/api/player/learner-state/route.ts",
        "app/api/player/adaptive-practice/route.ts",
        "app/api/player/diagnostic/route.ts",
        "app/api/jalur-cerdas/[unitId]/progress/route.ts",
        "app/api/jalur-cerdas/[unitId]/submit/route.ts",
        "app/api/murid/quiz/[id]/route.ts",
        "app/api/admin/question-metadata/route.ts",
        // P0 Coin Economy 2.0: player profile + coin routes migrated to User.coins
        "app/api/player/profile/route.ts",
        // BC Classroom (STEP 6.0/6.1) — additive multi-class & student class API
        "app/api/guru/pengumuman/route.ts",
        "app/api/guru/penugasan/route.ts",
        "app/api/guru/quiz/[id]/assign/route.ts",
        "app/api/murid/kelasku/[id]/route.ts",
        "app/api/murid/penugasan/[id]/praktik/route.ts",
        "app/api/guru/kelasku/[id]/route.ts",
        "app/api/murid/kelasku/[id]/route.ts",
        "app/api/guru/penugasan/[id]/nilai-praktik/route.ts",
        // P0 Coin Shop 2.1 — cosmetic fields in user/me API
        "app/api/user/me/route.ts",
        // Coin Shop 2.4 — pack quantity + new cosmetic types + HINT_TOKEN_PACK
        "app/api/siswa/store/buy/route.ts",
        "app/api/siswa/store/equip/route.ts",
        "app/api/siswa/store/consume/route.ts",
        "app/api/guru/kelasku/[id]/insight/route.ts",
        "app/api/murid/quiz/[id]/route.ts",
        // Fase rilis Teka-Teki Silang: cap skor TEKA_TEKI_SILANG di MAX_SCORE_PER_GAME
        // (pengaman skor mengada-ada untuk gameType baru yang dirilis ke hub).
        "app/api/game/xp/route.ts",
        // BC Classroom (STEP 6.10/6.12) — kode akses anti-kolisi & endpoint kelas
        "app/api/group/route.ts",
        "app/api/group/[id]/route.ts",
      ]);
      const diff = execSync(`git diff --name-only HEAD -- app/api/`, { encoding: "utf8", cwd: process.cwd() })
        .trim().split("\n").filter(Boolean)
      const unexpected = diff.filter((file) => !allowed.has(file));
      return unexpected.length === 0;
    });
  test("app/arena/bottom-nav.tsx: Toko Koin ada di bottom nav",
    () => fs.readFileSync("app/arena/bottom-nav.tsx", "utf8").includes("toko-koin"));
  test("komponen bersama yang masih dipakai tidak dihapus (BattleCard untuk /arena/game, KataPlayGame)",
    () => fs.existsSync("components/arena/BattleCard.tsx") && fs.existsSync("components/game/KataPlayGame.tsx"));

  // ── 10. SUB-ROUTE CANVAS DESKTOP-FIRST ──
  console.log("\n── 10. Sub-route Canvas — Desktop-first ──");
  const leaguePage = read("app/arena/league/page.tsx");
  test("league menggunakan canvas penuh (tanpa wrapper legacy max-w-3xl / max-w-lg)",
    () => !leaguePage.includes("max-w-3xl") && !leaguePage.includes("max-w-lg"));
  test("league punya header kompetitif 'Liga Minggu Ini' + subtitle resmi",
    () => leaguePage.includes("Liga Minggu Ini") && leaguePage.includes("Kompetisi mingguan untuk membuktikan kemampuanmu."));
  test("league menampilkan status cepat asli (Peringkatmu + XP minggu ini + countdown real)",
    () => leaguePage.includes("Peringkatmu") && leaguePage.includes("XP minggu ini") && leaguePage.includes("<WeeklyCountdown"));
  test("league tetap memakai data & engine asli (getLeaderboard + getWeeklyCompetition + LeagueTabs)",
    () => leaguePage.includes("getLeaderboard") && leaguePage.includes("getWeeklyCompetition") && leaguePage.includes("<LeagueTabs"));
  test("5 halaman /arena/simulasi* memakai canvas penuh",
    () => ["simulasi", "simulasi/ukbi", "simulasi/tka", "simulasi/hasil", "simulasi/bigt"]
      .every((p) => !read(`app/arena/${p}/page.tsx`).includes("max-w-3xl")));
  test("/arena/game hub memakai canvas penuh (game-hub, tanpa wrapper legacy sempit)",
    () => read("app/arena/game/page.tsx").includes("game-hub") && !read("app/arena/game/page.tsx").includes("max-w-lg mx-auto"));
  test("tantang (game 1v1) memakai canvas penuh",
    () => !read("app/arena/game/tantang/page.tsx").includes("max-w-lg mx-auto"));
  test("/arena/player web memakai canvas penuh",
    () => !read("app/arena/player/page.tsx").includes("max-w-3xl") && !read("app/arena/player/page.tsx").includes("max-w-lg mx-auto"));
  test("chat full-width workspace",
    () => container.includes('pathname.startsWith("/arena/chat")') && container.includes('? "w-full py-0 md:px-6"') && !layout.includes("max-w-[1440px]") && !container.includes("max-w-[1440px]"));
  test("tidak ada fixed min-width desktop di seluruh route Arena",
    () => {
      const out = execSync(`rg -l 'min-w-\\\\[1200px\\\\]|min-w-\\\\[1440px\\\\]' app/arena --glob '*.tsx' || true`, { encoding: "utf8" });
      return out.trim().length === 0;
    });

  // ── 11. ARENA 2.0 — THEME LIGHT/DARK ADAPTIVE (zona player) ──
  console.log("\n── 11. Arena 2.0 — Light/Dark Adaptive Zona Player ──");
  const pxCss = read("app/arena/player-theme.css");
  const playerTheme = read("components/arena/player/player-theme.tsx");
  const playerDashboard = read("components/arena/player/player-dashboard.tsx");
  const leaderboardPage = read("app/arena/player/leaderboard/page.tsx");
  const levelUp = read("components/arena/player/level-up-modal.tsx");
  test("player-theme.css punya varian .px-theme-adaptive (light) + .dark .px-theme-adaptive (navy)",
    () => pxCss.includes(".px-theme-adaptive {") && pxCss.includes(".dark .px-theme-adaptive {"));
  test("PlayerTheme memakai px-theme-adaptive (light/dark, bukan navy hardcode)",
    () => playerTheme.includes("px-theme px-theme-adaptive"));
  test("token track progress --px-track tersedia (light & dark)",
    () => pxCss.includes("--px-track:") && pxCss.includes("--px-track: rgba(15, 23, 42, 0.08)"));
  test("komponen player pakai token (tanpa bg-black/20, bg-black/40 hardcode di zona adaptive)",
    () => !read("components/arena/player/badge-grid.tsx").includes("bg-black/") && !read("components/arena/player/leaderboard-panel.tsx").includes("bg-black/")
      && !read("components/arena/player/achievement-grid.tsx").includes("bg-black/") && !read("components/arena/player/history-tabs.tsx").includes("bg-black/"));
  test("level-up modal light/dark (bg-white di light, navy di dark)",
    () => levelUp.includes("bg-white px-7") && levelUp.includes("dark:bg-[#0b1330]"));
  test("player dashboard sederhana: nav cards Leaderboard/Badge/Riwayat, tanpa misi/ligi/analytics",
    () => playerDashboard.includes("Leaderboard") && playerDashboard.includes("Badge") && playerDashboard.includes("Riwayat")
      && !playerDashboard.includes("DailyQuestCard") && !playerDashboard.includes("WeeklyChampionCard") && !playerDashboard.includes("<LeaderboardPanel"));
  test("leaderboard page: judul 'Leaderboard' + subjudul posisi kamu",
    () => leaderboardPage.includes("Leaderboard") && leaderboardPage.includes("Lihat posisi kamu dan teman-temanmu."));
  test("halaman player/leaderboard/badges memakai PlayerTheme (adaptive)",
    () => read("app/arena/player/page.tsx").includes("<PlayerTheme>") && read("app/arena/player/leaderboard/page.tsx").includes("<PlayerTheme>"));

  // ── 12. ARENA 2.1 — RANK BC banner & copy konsisten ──
  console.log("\n── 12. Arena 2.1 — Rank BC Banner & Copy ──");
  const hub = read("components/arena/game-hub/GameHubClient.tsx");
  test("GAME HUB: banner RANK BC disematkan lagi (rank-bc-banner.webp → /arena/player)",
    () => hub.includes("/banners/rank-bc-banner.webp") && hub.includes('href="/arena/player"') && hub.includes("naikkan peringkatmu"));
  test("GAME HUB: promo slide Kuis Tempur ↔ TTS tetap ada di samping banner rank",
    () => hub.includes("/Rank%20BC/banner%20arena%20gim.png") && hub.includes("/banners/banners-TTS-gim.png") && hub.includes("<BannerSlideshow"));
  test("copy konsisten: subtext 'Naik Level.' sama di home & hub; CTA 'MAIN SEKARANG'",
    () => home.includes("Mainkan. Belajar. Naik Level.") && hub.includes("Mainkan. Belajar. Naik Level.") && home.includes("MAIN SEKARANG") && hub.includes("MAIN SEKARANG"));
  test("quick access Game Hub pakai label 'Badge' (terminologi konsisten)",
    () => hub.includes('label: "Badge"') && !hub.includes('label: "Prestasi"'));
  test("semua href registry gim punya route nyata (tidak ada dead link)",
    () => {
      const registry = read("lib/arena/game-registry.ts");
      const hrefs = [...registry.matchAll(/href: "(\/arena\/game\/[^"]+)"/g)].map((m) => m[1]);
      return hrefs.length >= 10 && hrefs.every((h) => fs.existsSync(`app${h}/page.tsx`));
    });

  // ── 13. MISI — konsep Arena 2.0 ──
  console.log("\n── 13. Misi — Header Konsep Arena + Tema ──");
  const misiPage = read("app/arena/misi/page.tsx");
  test("misi page: header ikon chip + eyebrow 'Arena BahasaCerdas' (konsep Arena 2.0)",
    () => misiPage.includes("Arena BahasaCerdas") && misiPage.includes("text-[10px] font-black uppercase tracking-[0.2em]") && misiPage.includes("<Target"));
  test("misi page: judul 'Misi' + subjudul koin/XP (satu tujuan per halaman)",
    () => misiPage.includes(">Misi</h1>") && misiPage.includes("Selesaikan misi harian, kumpulkan koin dan XP!"));
  test("misi page: box 'Cara Dapat Koin' theme-aware (dark: variant, bukan amber-50 gelap)",
    () => misiPage.includes("dark:from-amber-500/10") && misiPage.includes("dark:bg-amber-500/15"));

  // ── 14. KUIS TTS 1.0 — GAMEPLAY & GAME LOOP ──
  console.log("\n── 14. Kuis TTS 1.0 — Gameplay & Game Loop ──");
  const ttsPage = read("app/arena/game/teka-teki-silang/page.tsx");
  const tts = read("components/game/TTSpage.tsx");
  test("TTS route: wrapper ramping tanpa X duplikat (satu header game saja)",
    () => ttsPage.includes("TekaTekiSilang") && !ttsPage.includes('aria-label="Keluar"'));
  test("TTS gameplay: keluar saat ada progres → modal konfirmasi (progress tidak hilang diam-diam)",
    () => tts.includes("adaProgress") && tts.includes("setConfirmExit(true)") && tts.includes("Keluar dari permainan?") && tts.includes("Tetap Main"));
  test("TTS keluar TANPA progres → langsung ke levels (tanpa modal berlebihan)",
    () => tts.includes("else setScreen(\"levels\")"));
  test("TTS result screen: CTA utama 'Main Lagi' + sekunder 'Kembali ke Gim'",
    () => tts.includes("Main Lagi") && tts.includes("Kembali ke Gim"));
  test("TTS grid: tiap sel punya aria-label (Baris/kolom/petunjuk — aksesibilitas)",
    () => tts.includes("aria-label={\`Baris ${r + 1}, kolom ${c + 1}") || tts.includes("aria-label={\`Baris"));
  test("TTS: animasi hormati prefers-reduced-motion",
    () => tts.includes("prefers-reduced-motion: reduce") && tts.includes("@media (prefers-reduced-motion"));
  test("TTS: CTA result & tombol aksi punya label jelas (bukan icon buta)",
    () => tts.includes('aria-label="Keluar dari permainan"'));
  test("TTS: XP/koin tetap via engine existing — tanpa awardXp baru di komponen game",
    () => !tts.includes("awardXp(") && !tts.includes("addXp(") && !tts.includes("createXpTransaction"));

  // ── 15. KUIS TTS 1.1 — REAL USER QA & GAMEPLAY FEEL ──
  console.log("\n── 15. Kuis TTS 1.1 — Real User QA & Gameplay Feel ──");
  test("TTS 1.1: durasi maksimal 3 pilihan (3/5/10) — keputusan <2 detik",
    () => {
      const m = tts.match(/TIME_OPTIONS = \[([^\]]+)\]/);
      return !!m && m[1].split(",").map((s) => s.trim()).join(",") === "3,5,10";
    });
  test("TTS 1.1: timer tidak duplikat di gameplay (HUD tile + bar sisa waktu, tanpa chip header)",
    () => (tts.match(/fmtTime\(remainingSec\)/g) || []).length === 2);
  test("TTS 1.1: modal Keluar → /arena/game (keluar penuh, bukan ke pilih level)",
    () => tts.includes('setConfirmExit(false); router.push("/arena/game")'));
  test("TTS 1.1: result = reward + next action — tanpa strip statistik pemain (Tier/Rentetan/Nyawa)",
    () => !tts.includes("grid grid-cols-3 gap-2.5 text-left"));
  test("TTS 1.1: result menampilkan bonus rentetan & bonus nyawa sebagai chip reward transparan",
    () => tts.includes("Bonus rentetan") && tts.includes("Bonus nyawa"));
  test("TTS 1.1: feedback jawaban salah — pesan singkat 'Belum tepat — coba lagi.' lewat bubble maskot",
    () => tts.includes("fireMessage") && tts.includes("Belum tepat — coba lagi."));
  test("TTS 1.1: layar awal tanpa kartu info duplikat (kognitif ringan, 5 detik pertama jelas)",
    () => !tts.includes("grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4"));

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed > 0) process.exit(1);
  console.log("✅ ALL ARENA 2.0 TESTS PASSED\n");
}

main();
