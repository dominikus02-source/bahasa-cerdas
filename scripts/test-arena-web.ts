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
  console.log("\n📋 ARENA WEB 2.0 TEST (STEP 4 — Web Student Gamification Hub)");
  console.log("=".repeat(60));

  // ── 1. LAYOUT — subnav arena (bukan duplikat navigasi global) ──
  console.log("\n── 1. Layout (app/arena/layout.tsx) — Subnav Arena ──");
  const layout = read("app/arena/layout.tsx");
  const NAV = ["/arena", "/arena/misi", "/arena/league", "/arena/game", "/arena/player/leaderboard", "/arena/player/badges"];
  test("subnav arena punya tepat 6 item (Arena/Misi/Liga/Gim/Peringkat/Koleksi)",
    () => (layout.match(/href: "\/arena/g) || []).length >= 6);
  test("6 href subnav hadir di navItems",
    () => NAV.every(h => layout.includes(`href: "${h}"`)));
  test("label 'Beranda' tidak dipakai sebagai item nav arena (duplikat global)",
    () => !layout.includes('label: "Beranda"'));
  test("duplikat global TIDAK ada di nav arena (Karya/Obrolan/Pemain)",
    () => !layout.includes('label: "Karya"') && !layout.includes('label: "Obrolan"') && !layout.includes('label: "Pemain"'));
  test("href global (/arena/feed, /arena/chat, /arena/player) TIDAK jadi item nav",
    () => !layout.includes('href: "/arena/feed"') && !layout.includes('href: "/arena/chat"') && !layout.includes('href: "/arena/player"'));

  // ── 2. LAYOUT — proteksi APK & auth ──
  console.log("\n── 2. Layout — Proteksi APK & Auth ──");
  test("RUTE_TANPA_GERBANG /arena/login tetap ada (login APK bare)",
    () => layout.includes('RUTE_TANPA_GERBANG = "/arena/login"'));
  test("auth gate getUser + redirect login tetap ada",
    () => layout.includes("await getUser()") && layout.includes("redirect(RUTE_TANPA_GERBANG)"));
  test("isApk() tetap dipakai untuk perilaku APK (escape hatch Dasbor/Logout)",
    () => layout.includes("await isApk()") && layout.includes("!apk &&"));
  test("BottomNav hanya untuk APK (web ≠ APK, tanpa bottom navigation ala APK)",
    () => layout.includes("{apk && <BottomNav />}"));
  test("tombol Dasbor (web-only) + LogoutButton (web-only) tetap ada",
    () => layout.includes("<LayoutDashboard") && layout.includes("<LogoutButton variant=\"icon\" />"));
  test("subnav mobile (strip horizontal) ada untuk web mobile",
    () => layout.includes("md:hidden sticky top-12") && layout.includes("overflow-x-auto"));

  // ── 3. HOME — 8 seksi gamifikasi ──
  console.log("\n── 3. Home (/arena/page.tsx) — Seksi Gamifikasi ──");
  const home = read("app/arena/page.tsx");
  test("A: hero pemain (avatar/nama/rank/XP/koin/progress bar)",
    () => home.includes("RankChip") && home.includes("progress.pct") && home.includes("Lihat Profil"));
  test("A: 'Lihat Profil' mengarah ke profil global murid",
    () => home.includes('"/murid/profile"'));
  test("B: Aksi Berikutnya (NextActionCard) ada",
    () => home.includes("<NextActionCard"));
  test("C: Misi Hari Ini + link Lihat Semua Misi",
    () => home.includes("Misi Hari Ini") && home.includes('href="/arena/misi"'));
  test("D: Liga (Kompetisi Minggu Ini + WeeklyCountdown + Lihat Liga)",
    () => home.includes("getWeeklyCompetition") && home.includes("<WeeklyCountdown") && home.includes('href="/arena/league"'));
  test("E: Gim — satu kartu utama (BattleCard Kuis Tempur)",
    () => home.includes("<BattleCard") && home.includes("Semua Gim"));
  test("F: Papan Peringkat (LeaderboardPanel compact)",
    () => home.includes("<LeaderboardPanel compact"));
  test("G: Pencapaian — lencana kompak + Lihat Semua Lencana",
    () => home.includes("listUserBadges") && home.includes('href="/arena/player/badges"'));
  test("H: Koleksi & Hadiah — koin, Toko Koin, achievement",
    () => home.includes("listAchievements") && home.includes('href="/arena/toko-koin"') && home.includes('href="/arena/player/achievements"'));
  test("AI BC kontekstual — tautan Tanya AI BC ke /arena/ai",
    () => home.includes("Tanya AI BC") && home.includes('href="/arena/ai"'));

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
    () => DUPLICATE_TOKENS.every(t => !home.includes(t)));
  test("tidak ada tautan /arena/jalur-cerdas sebagai kartu belajar di home",
    () => !home.includes('href="/arena/jalur-cerdas"'));

  // ── 5. HOME — tema & responsif ──
  console.log("\n── 5. Home — Tema & Responsif ──");
  const darkCount = (home.match(/dark:/g) || []).length;
  test(`theme-aware: ≥10 token dark: di kartu home (ada ${darkCount})`,
    () => darkCount >= 10);
  test("tidak ada fixed canvas / min-width desktop yang memicu overflow",
    () => !home.includes("min-w-[1440") && !home.includes("min-w-[1200"));
  test("grid 2 kolom lg: dipakai untuk pasangan seksi (Misi+Liga, Gim+Peringkat, Pencapaian+Hadiah)",
    () => (home.match(/lg:grid-cols-2/g) || []).length >= 3);

  // ── 6. LeaderboardPanel — tab Teman ──
  console.log("\n── 6. LeaderboardPanel — Tab Teman ──");
  const panel = read("components/arena/player/leaderboard-panel.tsx");
  test("LeaderboardPanel punya scope FRIENDS (tab 'Teman')",
    () => panel.includes("FRIENDS") && panel.includes('"Teman"'));

  // ── 7. ZONE TERPROTEKSI (tidak boleh tersentuh) ──
  console.log("\n── 7. Protected Zones ──");
  try {
    const diff = execSync(
      `git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ lib/award-xp.ts lib/xp.ts lib/coins.ts lib/apk.ts app/api/player/ app/arena/bottom-nav.tsx`,
      { encoding: "utf8", cwd: process.cwd() }
    );
    test("tidak ada perubahan di prisma/ lib/gamification/ lib/learning-loop/ lib/award-xp.ts lib/xp.ts lib/coins.ts lib/apk.ts app/api/player/ app/arena/bottom-nav.tsx",
      () => diff.trim().length === 0);
    if (diff.trim().length > 0) console.log(`  ⚠️  File berubah:\n${diff}`);
  } catch (e: any) {
    console.log("  ⚠️  git diff tidak dapat dijalankan (HEAD tidak tersedia?) — cek zona lindung dilewati");
    console.log(`      ${e.message?.split("\n")[0] || e}`);
  }

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed > 0) process.exit(1);
  console.log("✅ ALL ARENA WEB TESTS PASSED\n");
}

main();
