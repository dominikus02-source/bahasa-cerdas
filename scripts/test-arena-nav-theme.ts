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

function read(rel: string): string {
  return fs.readFileSync(rel, "utf-8");
}

function main() {
  console.log("\n📋 ARENA 4.2.1 TEST — Navigation + Theme Control (Student Shell)");
  console.log("=".repeat(60));

  // ── 1. BACK BUTTON ──
  console.log("\n── 1. Tombol Kembali konsisten ──");
  const backBtn = read("components/shared/BackButton.tsx");
  test("BackButton.tsx ada & memakai router.back()",
    () => fs.existsSync("components/shared/BackButton.tsx") && backBtn.includes("router.back()"));
  test("guard: tidak keluar aplikasi bila history kosong (deep-link)",
    () => backBtn.includes("window.history.length > 1") && backBtn.includes("router.replace(fallback)"));
  test("guard: tidak mendarat di /login",
    () => backBtn.includes("/login")) ;
  const muridLayout = read("app/(dashboard)/murid/layout.tsx");
  const arenaLayout = read("app/arena/layout.tsx");
  const mobileNav = read("components/dashboard/MuridMobileNav.tsx");
  test("sidebar murid memakai BackButton (fallback /murid/beranda)",
    () => muridLayout.includes("<BackButton fallback=\"/murid/beranda\"") );
  test("arena desktop header memakai BackButton (fallback /arena)",
    () => arenaLayout.includes("<BackButton fallback=\"/arena\"") );
  test("arena chat header memakai BackButton",
    () => (arenaLayout.match(/<BackButton /g) || []).length >= 2);
  test("drawer mobile memakai BackButton",
    () => mobileNav.includes("BackButton") && mobileNav.includes('fallback="/murid/beranda"'));

  // ── 2. ROLE-BASED DASHBOARD GURU ──
  console.log("\n── 2. Akses dasbor berbasis peran (server-side) ──");
  test("role dibaca server-side via getUser (layout server component)",
    () => muridLayout.includes("await getUser()") && !muridLayout.includes('"use client"'));
  test("guard mengizinkan GURU (mode pratinjau) + Murid + Founder",
    () => muridLayout.includes('user.role !== "MURID" && user.role !== "GURU" && !user.isFounder'));
  test("onboarding hanya untuk MURID",
    () => muridLayout.includes('user.role === "MURID" && !user.onboarded'));
  test("CTA Dashboard Guru render hanya untuk GURU non-founder",
    () => muridLayout.includes('user.role === "GURU" && !user.isFounder') && muridLayout.includes('href="/guru/beranda"'));
  test("CTA label 'Dashboard Guru' hadir di sidebar",
    () => muridLayout.includes("Dashboard Guru"));
  test("founder tetap punya Akses Founder (Dasbor Guru + Panel Admin)",
    () => muridLayout.includes("Akses Founder") && muridLayout.includes("Panel Admin"));
  test("arena header: GURU DAN founder menuju /guru/beranda",
    () => arenaLayout.includes('user.role === "GURU" || user.isFounder') && arenaLayout.includes('isGuruLike ? "/guru/beranda" : "/murid/beranda"'));
  test("arena mobile juga role-based (query string tidak dipakai)",
    () => !arenaLayout.includes("?role="));

  // ── 3. THEME CONTROL ──
  console.log("\n── 3. Toggle tema sidebar + header ──");
  const themeSeg = read("components/theme/theme-segmented.tsx");
  test("ThemeSegmented.tsx ada & memakai useTheme (next-themes, tanpa provider baru)",
    () => fs.existsSync("components/theme/theme-segmented.tsx") && themeSeg.includes("useTheme") && themeSeg.includes("next-themes"));
  test("pilihan Terang / Gelap",
    () => themeSeg.includes('"light"') && themeSeg.includes('"dark"') && themeSeg.includes("Terang") && themeSeg.includes("Gelap"));
  test("aktif = violet (bukan amber)",
    () => themeSeg.includes("bg-violet-600") && !themeSeg.includes("bg-amber"));
  test("sidebar murid memakai ThemeSegmented di footer",
    () => muridLayout.includes("<ThemeSegmented />"));
  const headerActions = read("components/arena/HeaderActions.tsx");
  test("HeaderActions menyediakan ThemeToggle (arena header)",
    () => headerActions.includes("ThemeToggle") && headerActions.includes("<ThemeToggle />"));
  test("ThemeToggle memakai next-themes + toggle terang/gelap",
    () => read("components/theme/theme-toggle.tsx").includes("useTheme") && read("components/theme/theme-toggle.tsx").includes("setTheme"));

  // ── 4. SIDEBAR COLLAPSE ──
  console.log("\n── 4. Ciutkan sidebar (desktop md+) ──");
  const toggle = read("components/dashboard/ShellSidebarToggle.tsx");
  test("ShellSidebarToggle.tsx ada & persist localStorage",
    () => fs.existsSync("components/dashboard/ShellSidebarToggle.tsx") && toggle.includes("localStorage") && toggle.includes("data-shell-collapsed"));
  test("toggle dipasang di header sidebar murid",
    () => muridLayout.includes("<ShellSidebarToggle />"));
  test("CSS collapse ada di globals.css (4rem + label disembunyikan md+)",
    () => read("app/globals.css").includes("data-shell-collapsed=\"1\"] .shell-aside") && read("app/globals.css").includes("shell-user { display: none; }"));

  // ── 5. NAVIGASI ARENA (tidak ada navbar kedua) ──
  console.log("\n── 5. Arena tidak menambah navbar sendiri ──");
  test("arena layout tidak punya navItems / navbar Arena sendiri",
    () => !arenaLayout.includes("navItems") && !arenaLayout.includes('aria-label="Navigasi Arena"'));
  test("mobile nav tetap 6 item (tanpa tab arena baru)",
    () => !mobileNav.includes("/arena/league") && !mobileNav.includes("/arena/game") && !mobileNav.includes("/arena/player"));
  test("chat web tetap exception 1440px (layout konsolidasi tidak diubah)",
    () => arenaLayout.includes("max-w-[1440px]"));

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed > 0) process.exit(1);
  console.log("✅ ALL ARENA 4.2.1 TESTS PASSED\n");
}

main();