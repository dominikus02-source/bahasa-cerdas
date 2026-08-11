import fs from "fs";

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

function main() {
  console.log("\n📋 STUDENT CONSOLIDATION TEST (STEP 2A)");
  console.log("=".repeat(60));

  const layout = fs.readFileSync("app/(dashboard)/murid/layout.tsx", "utf-8");
  const mobileNav = fs.readFileSync("components/dashboard/MuridMobileNav.tsx", "utf-8");
  const playerProfile = fs.readFileSync("app/arena/player/profile/page.tsx", "utf-8");
  const muridAi = fs.readFileSync("app/(dashboard)/murid/ai/page.tsx", "utf-8");
  const pengaturan = fs.readFileSync("app/(dashboard)/murid/pengaturan/page.tsx", "utf-8");
  const bell = fs.readFileSync("components/dashboard/NotificationBell.tsx", "utf-8");

  // 1. Canonical profile: /murid/profile tetap satu-satunya identity center
  console.log("\n── 1. Canonical Profile ──");
  test("halaman canonical /murid/profile ada", () =>
    fs.existsSync("app/(dashboard)/murid/profile/page.tsx"));
  test("/arena/player/profile adalah redirect (bukan renderer profil)",
    () => playerProfile.includes("redirect(") && !playerProfile.includes("ProfileTabs") && !playerProfile.includes("PlayerTheme"));
  test("/arena/player/profile membedakan APK (isApk) vs web",
    () => playerProfile.includes("isApk") && playerProfile.includes('"/arena/player"') && playerProfile.includes('"/murid/profile"'));

  // 2. Sidebar Menu Utama (6 item) di layout murid
  console.log("\n── 2. Sidebar Menu Utama ──");
  test("layout punya 6 item Menu Utama (Beranda/Profil/Arena/Karya/Obrolan/Pengaturan)",
    () => ["/murid/beranda", "/murid/profile", "/arena", "/arena/feed", "/arena/chat", "/murid/pengaturan"].every(h => layout.includes(`href="${h}"`)));
  test("'Dasbor Murid' header dipertahankan", () => layout.includes("Dasbor Murid"));
  test("Toko Koin memakai /arena/toko-koin di nav murid",
    () => layout.includes('href="/arena/toko-koin"') && mobileNav.includes('href: "/arena/toko-koin"') && !layout.includes('href="/murid/toko-koin"') && !mobileNav.includes('href: "/murid/toko-koin"'));

  // 3. Simulasi & Ujian dipertahankan literal (sensitif terhadap test lama)
  console.log("\n── 3. Simulasi & Ujian (test-compat) ──");
  const simulasiLabels = ["Simulasi UKBI", "Simulasi TKA", "Dokumen Hasil Latihan", "BIGT"];
  test("4 label Simulasi & Ujian tetap di layout (literal)",
    () => simulasiLabels.every(l => layout.includes(`"${l}"`)));
  test("4 label Simulasi & Ujian tetap di MuridMobileNav + format double-quote href",
    () => simulasiLabels.every(l => mobileNav.includes(`label: "${l}"`)) && mobileNav.includes('href: "/murid/simulasi/ukbi"'));

  // 4. Grup Event & Lomba / Kemajuan dihapus dari nav
  console.log("\n── 4. Grup Stub Dihapus ──");
  test("tidak ada lagi /murid/olimpiade di nav murid",
    () => !layout.includes("/murid/olimpiade") && !mobileNav.includes("/murid/olimpiade"));
  test("tidak ada lagi /murid/progresku di nav murid (PRIMARY baru = Karya)",
    () => !layout.includes("/murid/progresku") && !mobileNav.includes("/murid/progresku") && mobileNav.includes('href: "/arena/feed", label: "Karya"'));

  // 5. AI BC: /murid/ai redirect ke canonical /arena/ai
  console.log("\n── 5. AI BC ──");
  test("/murid/ai redirect ke /arena/ai", () =>
    muridAi.includes('redirect("/arena/ai")') && !muridAi.includes("useState"));
  test("halaman canonical /arena/ai masih ada", () =>
    fs.existsSync("app/arena/ai/page.tsx"));

  // 6. Pengaturan jadi halaman nyata
  console.log("\n── 6. Pengaturan ──");
  test("pengaturan adalah halaman nyata (server guard + LogoutButton, tanpa redirect keluar)",
    () => pengaturan.includes("getUser") && pengaturan.includes("LogoutButton") && !pengaturan.includes('redirect("/arena'));

  // 7. Fix NotificationBell (bug hardcoded guru)
  console.log("\n── 7. NotificationBell ──");
  test("'Lihat Semua' bell murid menuju /arena/notifikasi (bukan /guru/notifikasi)",
    () => bell.includes('href="/arena/notifikasi"') && !bell.includes('href="/guru/notifikasi"'));

  // 8. Ekonomi TIDAK dimigrasi (STOP — koin & streak tetap dua jalur)
  console.log("\n── 8. Ekonomi Tidak Disentuh ──");
  test("lib/coins.ts masih menulis User.coins (awardCoins)",
    () => fs.readFileSync("lib/coins.ts", "utf-8").includes("coins: { increment"));
  test("lib/gamification/coin-engine.ts masih menulis PlayerProfile.coin",
    () => fs.readFileSync("lib/gamification/coin-engine.ts", "utf-8").includes("coin: { increment"));
  test("tidak ada migrasi schema baru hari ini (dari 2026-08-11)",
    () => !fs.existsSync("prisma/migrations/manual/2026-08-11_student_consolidation.sql") &&
          fs.readFileSync("prisma/schema.prisma", "utf-8").includes("coins                 Int"));

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed > 0) process.exit(1);
  console.log("✅ ALL STUDENT CONSOLIDATION TESTS PASSED\n");
}

main();
