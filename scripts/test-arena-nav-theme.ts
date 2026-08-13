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

function exists(rel: string): boolean {
  return fs.existsSync(rel);
}

function countOccurrences(content: string, needle: string): number {
  return content.split(needle).length - 1;
}

function stripComments(content: string): string {
  return content
    .split("\n")
    .filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
    .join("\n");
}

function main() {
  console.log("\n📋 ARENA 4.2.2 TEST — Navigation + Sidebar + Theme UX Fix (Student Shell)");
  console.log("=".repeat(60));

  // ── 1. KEMBALI DETERMINISTIK (BackHome) ──
  console.log("\n── 1. Kembali deterministik (← Beranda) ──");
  const backHome = exists("components/shared/BackHome.tsx") ? read("components/shared/BackHome.tsx") : "";
  test("BackHome.tsx ada & memakai next/link Link (bukan router)",
    () => exists("components/shared/BackHome.tsx") && backHome.includes("next/link") && backHome.includes("Link"));
  test("target selalu /murid/beranda (canonical student home)",
    () => backHome.includes('href="/murid/beranda"') || backHome.includes('href = "/murid/beranda"'));
  test("aria-label 'Kembali ke Beranda'",
    () => backHome.includes('aria-label="Kembali ke Beranda"'));
  test("TIDAK memakai router.back()",
    () => !stripComments(backHome).includes("router.back"));
  test("BackButton.tsx lama TIDAK ada (digantikan BackHome)",
    () => !exists("components/shared/BackButton.tsx"));
  test("tidak ada router.back() di app/ atau components/ (produksi)",
    () => {
      const files = [
        "app/arena/layout.tsx",
        "app/(dashboard)/murid/layout.tsx",
        "components/dashboard/MuridMobileNav.tsx",
        "components/shared/BackHome.tsx",
      ];
      return files.every(f => !stripComments(read(f)).includes("router.back"));
    });
  const muridLayout = read("app/(dashboard)/murid/layout.tsx");
  const arenaLayout = read("app/arena/layout.tsx");
  const mobileNav = read("components/dashboard/MuridMobileNav.tsx");
  const roleSections = read("components/shell/RoleSections.tsx");
  test("sidebar murid memakai <BackHome /> di top shell header",
    () => muridLayout.includes("<BackHome />"));
  test("arena desktop header memakai <BackHome />",
    () => arenaLayout.includes("<BackHome />"));
  test("arena & chat berbagi SATU BackHome kanonik di header global (tanpa varian iconOnly terpisah)",
    () => (arenaLayout.match(/<BackHome /g) || []).length >= 1 && !arenaLayout.includes("<BackHome iconOnly"));
  test("drawer mobile memakai <BackHome iconOnly",
    () => mobileNav.includes("<BackHome iconOnly"));

  // ── 2. ROLE-BASED DASHBOARD GURU ──
  console.log("\n── 2. Dasbor peran (server-side, bakal tujuan bukan back) ──");
  test("role dibaca server-side via getUser (layout server component)",
    () => muridLayout.includes("await getUser()") && !muridLayout.includes('"use client"'));
  test("guard mengizinkan MURID + GURU (pratinjau) + Founder",
    () => muridLayout.includes('user.role !== "MURID" && user.role !== "GURU" && !user.isFounder'));
  test("onboarding hanya untuk MURID",
    () => muridLayout.includes('user.role === "MURID"') && muridLayout.includes("onboarded"));
  test("RoleSections (shared, 5.1): Mode Guru hanya GURU non-founder; murid layout memakai <RoleSections />",
    () => muridLayout.includes("<RoleSections") && roleSections.includes('role === "GURU" && !isFounder') && roleSections.includes('href="/guru/beranda"'));
  test("CTA memakai aria-label + title (icon-only saat collapsed)",
    () => roleSections.includes('aria-label="Dashboard Guru"') && roleSections.includes('title="Dashboard Guru"'));
  test("setiap CTA role memakai span kelas shell-label (sembunyi saat collapsed)",
    () => roleSections.includes('className="shell-label') );
  test("Akses Founder (Dasbor Guru + Panel Admin) untuk founder saja",
    () => roleSections.includes("Akses Founder") && roleSections.includes("Panel Admin") && roleSections.includes('href="/admin"'));
  test("TIDAK ada CTA 'Dashboard Guru' di header arena (akses role via RoleSections sidebar, bukan header)",
    () => !arenaLayout.includes("hasGuruAccess") && !arenaLayout.includes("<LayoutDashboard") && !arenaLayout.includes('href="/guru/beranda"') && arenaLayout.includes("<RoleSections"));
  test("query string role tidak dipakai",
    () => !arenaLayout.includes("?role="));

  // ── 3. THEME CONTROL (ThemeToggle, tanpa duplikat) ──
  console.log("\n── 3. Toggle tema top shell + drawer ──");
  const themeToggle = read("components/theme/theme-toggle.tsx");
  test("ThemeToggle.tsx memakai useTheme (next-themes)",
    () => themeToggle.includes("useTheme") && themeToggle.includes("next-themes"));
  test("ThemeToggle punya setTheme terang/gelap",
    () => themeToggle.includes("setTheme"));
  test("top shell header murid memakai <ThemeToggle />",
    () => muridLayout.includes("<ThemeToggle />"));
  test("drawer mobile memakai <ThemeToggle />",
    () => mobileNav.includes("<ThemeToggle />"));
  test("arena header memakai <ThemeToggle /> langsung (kanonik, HeaderActions dihapus)",
    () => arenaLayout.includes("<ThemeToggle />") && !exists("components/arena/HeaderActions.tsx"));
  test("ThemeSegmented DIHAPUS (tidak ada toggle duplikat)",
    () => !exists("components/theme/theme-segmented.tsx") && !muridLayout.includes("<ThemeSegmented") && !mobileNav.includes("ThemeSegmented"));

  // ── 4. SIDEBAR COLLAPSE (footer, reversibel) ──
  console.log("\n── 4. Ciutkan sidebar (desktop md+, footer) ──");
  const toggle = read("components/dashboard/ShellSidebarToggle.tsx");
  test("ShellSidebarToggle.tsx persist localStorage bc.shell.collapsed",
    () => exists("components/dashboard/ShellSidebarToggle.tsx") && toggle.includes("bc.shell.collapsed") && toggle.includes("data-shell-collapsed"));
  test("aria-label Perkecil/Perbesar sidebar sesuai state",
    () => toggle.includes('aria-label={collapsed ? "Perbesar sidebar" : "Perkecil sidebar"}'));
  test("ikon ChevronLeft (expanded) / ChevronRight (collapsed)",
    () => toggle.includes("ChevronLeft") && toggle.includes("ChevronRight"));
  test("dipasang di footer sidebar murid (di samping LogoutButton)",
    () => muridLayout.includes("<ShellSidebarToggle />") && muridLayout.includes("<LogoutButton />"));
  test("CSS collapse di globals.css (4rem, label ter-hidden, link terpusat)",
    () => {
      const css = read("app/globals.css");
      return css.includes('[data-shell-collapsed="1"] .shell-aside') &&
        css.includes('[data-shell-collapsed="1"] .shell-label { display: none; }') &&
        css.includes('[data-shell-collapsed="1"] .shell-link') &&
        css.includes("shell-main");
    });

  // ── 5. NAVIGASI ARENA (tidak ada navbar kedua) ──
  console.log("\n── 5. Arena tanpa navbar kedua ──");
  test("arena layout tidak punya navItems / navbar Arena sendiri",
    () => !arenaLayout.includes("navItems") && !arenaLayout.includes('aria-label="Navigasi Arena"'));
  test("mobile nav tetap 6 item (tanpa tab arena baru)",
    () => !mobileNav.includes("/arena/league") && !mobileNav.includes("/arena/game") && !mobileNav.includes("/arena/player"));
  test("chat web full-width workspace (w-full, tanpa cap 1440px di layout)",
    () => arenaLayout.includes('pathname.startsWith("/arena/chat")') && arenaLayout.includes('? "w-full py-0 md:px-6"') && !arenaLayout.includes("max-w-[1440px]"));

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed > 0) process.exit(1);
  console.log("✅ ALL ARENA 4.2.2 TESTS PASSED\n");
}

main();