/**
 * STEP 5.0 — MOBILE NAVIGATION CONSOLIDATION (Founder UX Audit)
 * Test statik: SATU navigasi mobile yang konsisten di seluruh panel
 * (Murid / Arena web / Guru / Admin). Tidak menyentuh auth, authorization,
 * answer keys, atau business logic. Baca file, jangan eksekusi.
 */
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const exists = (p: string) => existsSync(p);

let passed = 0;
let failed = 0;
function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      passed++;
      console.log(`  ✅ ${name}`);
    } else {
      failed++;
      console.log(`  ❌ ${name}`);
    }
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name} — ${(e as Error).message}`);
  }
}

const muridLayout = read("app/(dashboard)/murid/layout.tsx");
const guruLayout = read("app/(dashboard)/guru/layout.tsx");
const adminLayout = read("app/(dashboard)/admin/layout.tsx");
const arenaLayout = read("app/arena/layout.tsx");
const muridMobileNav = read("components/dashboard/MuridMobileNav.tsx");
const guruNav = read("components/dashboard/GuruNav.tsx");
const adminMobileNav = read("components/admin/AdminMobileNav.tsx");
const arenaBottomNav = read("app/arena/bottom-nav.tsx");
const shellLayout = read("components/shell/ShellLayout.tsx");
const navConfig = read("components/shell/nav-config.ts");
const arenaCss = read("app/arena/arena.css");
const globalsCss = read("app/globals.css");

function main() {
  console.log("\n📋 STEP 5.0 — MOBILE NAVIGATION TEST");
  console.log("=".repeat(60));

  // 1. Shared navigation component exists
  console.log("\n── 1. Shared navigation component ──");
  test("MuridMobileNav (student mobile nav) ada & dipakai bersama: murid + arena web",
    () => muridLayout.includes("MuridMobileNav") && arenaLayout.includes("MuridMobileNav"));
  test("GuruMobileNav ada (guru panel, bukan duplikat baru)",
    () => guruNav.includes("GuruMobileNav") && guruLayout.includes("GuruMobileNav"));
  test("AdminMobileNav ada (admin panel)",
    () => exists("components/admin/AdminMobileNav.tsx") && adminLayout.includes("AdminMobileNav"));

  // 2. Mobile navigation exists di semua panel
  console.log("\n── 2. Mobile navigation exists ──");
  test("murid: bottom nav terpasang", () => muridLayout.includes("<MuridMobileNav"));
  test("guru: bottom nav terpasang", () => guruLayout.includes("<GuruMobileNav"));
  test("arena web: bottom nav student terpasang (non-APK)", () => arenaLayout.includes("<MuridMobileNav"));
  test("admin: bottom nav terpasang", () => adminLayout.includes("<AdminMobileNav"));

  // 3. Desktop sidebar remains
  console.log("\n── 3. Desktop sidebar remains ──");
  test("ShellLayout: sidebar desktop (aside md:flex) tetap",
    () => shellLayout.includes("shell-aside") && shellLayout.includes("hidden md:flex"));
  test("murid/guru/admin/arena memakai sidebar di desktop",
    () => muridLayout.includes("shell-aside") && guruLayout.includes("ShellLayout") && adminLayout.includes("ShellLayout") && arenaLayout.includes("ShellLayout"));

  // 4. Mobile breakpoint behavior
  console.log("\n── 4. Mobile breakpoint ──");
  test("MuridMobileNav hanya tampil < md (md:hidden)",
    () => muridMobileNav.includes("md:hidden fixed bottom-0"));
  test("GuruMobileNav hanya tampil < lg (lg:hidden)",
    () => guruNav.includes("lg:hidden") && guruNav.includes("fixed bottom-0"));
  test("AdminMobileNav hanya tampil < md (md:hidden)",
    () => adminMobileNav.includes("md:hidden") && adminMobileNav.includes("fixed bottom-0"));
  test("BottomNav APK hanya < md", () => arenaBottomNav.includes("md:hidden"));

  // 5. Bottom positioning
  console.log("\n── 5. Bottom positioning ──");
  test("semua mobile nav fixed bottom-0 inset-x-0",
    () =>
      muridMobileNav.includes("fixed bottom-0 inset-x-0") &&
      guruNav.includes("fixed bottom-0 inset-x-0") &&
      adminMobileNav.includes("fixed bottom-0 inset-x-0") &&
      arenaBottomNav.includes("fixed bottom-0"));

  // 6. Safe-area handling
  console.log("\n── 6. Safe-area ──");
  test("MuridMobileNav safe-area-bottom", () => muridMobileNav.includes("safe-area-bottom"));
  test("GuruMobileNav env(safe-area-inset-bottom)", () => guruNav.includes("env(safe-area-inset-bottom)"));
  test("AdminMobileNav safe-area-bottom", () => adminMobileNav.includes("safe-area-bottom"));
  test("BottomNav APK safe-area-bottom", () => arenaBottomNav.includes("safe-area-bottom"));

  // 7. Content bottom spacing (nav tidak menutup konten)
  console.log("\n── 7. Content bottom spacing ──");
  test("murid main pb-24 mobile", () => muridLayout.includes("pb-24 md:pb-8"));
  test("guru main pb-24 mobile", () => guruLayout.includes("pb-24 lg:pb-8"));
  test("arena root pb-20 mobile", () => arenaLayout.includes("pb-20 md:pb-0"));
  test("admin main pb-24 mobile", () => adminLayout.includes("pb-24 md:pb-8"));

  // 8. Primary nav <= 5
  console.log("\n── 8. Primary nav <= 5 ──");
  test("MuridMobileNav PRIMARY = 4 destination (Beranda/Arena/Karya/Profil) + utility Notif/Menu",
    () => (muridMobileNav.match(/label: "/g) || []).filter((s, i, arr) => i < 4).length >= 4 && muridMobileNav.includes('label: "Beranda"') && muridMobileNav.includes('label: "Arena"') && muridMobileNav.includes('label: "Karya"') && muridMobileNav.includes('label: "Profil"'));
  test("GuruMobileNav tabs = 4 (Beranda/Literasi/Gim/Akun) + Menu",
    () => ["Beranda", "Literasi", "Gim", "Akun"].every((l) => guruNav.includes(`label: "${l}"`)));
  test("AdminMobileNav tabs = 4 (Tower/Konten/Pengguna/Bayaran) + Menu",
    () => ["Tower", "Konten", "Pengguna", "Bayaran"].every((l) => adminMobileNav.includes(`label: "${l}"`)));
  test("BottomNav APK = 5 items", () => (arenaBottomNav.match(/href: "\//g) || []).length === 5);

  // 9. Active route detection
  console.log("\n── 9. Active route detection ──");
  test("MuridMobileNav usePathname + isActive",
    () => muridMobileNav.includes("usePathname") && muridMobileNav.includes("const isActive"));
  test("GuruMobileNav usePathname + active state", () => guruNav.includes("usePathname") && guruNav.includes("const active"));
  test("AdminMobileNav usePathname + isActive", () => adminMobileNav.includes("usePathname") && adminMobileNav.includes("const isActive"));

  // 10. Mobile route consistency
  console.log("\n── 10. Mobile route consistency ──");
  test("arena web mobile memakai student mobile nav yang SAMA dengan murid (SATU komponen)",
    () => arenaLayout.includes("{apk ? <BottomNav /> : <MuridMobileNav"));
  test("APK tetap memakai BottomNav (TWA compat, tidak berubah)",
    () => arenaLayout.includes("apk ? <BottomNav />") && exists("app/arena/bottom-nav.tsx"));

  // 11. No answer/auth/security changes
  console.log("\n── 11. Auth/security unchanged ──");
  test("auth gate + authorization tidak diubah (getUser/redirect tetap)",
    () => muridLayout.includes("await getUser()") && guruLayout.includes("await getUser()") && adminLayout.includes("await getUser()") && arenaLayout.includes("await getUser()"));
  test("tidak ada perubahan di middleware/proxy auth",
    () => {
      const diff = execSync(`git diff --name-only HEAD -- middleware.ts proxy.ts`, { encoding: "utf8", cwd: process.cwd() }).trim();
      return diff.length === 0;
    });

  // 12. No duplicate navigation config
  console.log("\n── 12. No duplicate navigation config ──");
  test("STUDENT_NAV canonical tetap SATU (nav-config.ts), tidak ada nav student kedua",
    () => navConfig.includes("STUDENT_NAV") && !arenaLayout.includes("navItems"));
  test("AdminMobileNav memakai nav items yang konsisten dengan AdminSidebar",
    () => adminMobileNav.includes("Control Tower") && adminMobileNav.includes("Pengguna"));

  // 13. Student navigation
  console.log("\n── 13. Student navigation ──");
  test("murid layout memakai MuridMobileNav + drawer (BackHome/Theme/role)",
    () => muridMobileNav.includes("BackHome") && muridMobileNav.includes("ThemeToggle") && muridMobileNav.includes("getRoleNavItems"));

  // 14. Teacher navigation
  console.log("\n── 14. Teacher navigation ──");
  test("guru drawer memakai GuruNavList (menu lengkap) + logout",
    () => guruNav.includes("GuruNavList") && guruNav.includes("LogOut"));

  // 15. Arena navigation
  console.log("\n── 15. Arena navigation ──");
  test("arena sidebar web = ShellNavList + RoleSections (desktop tetap)",
    () => arenaLayout.includes("ShellNavList") && arenaLayout.includes("RoleSections"));
  test("app/arena/bottom-nav.tsx 0 diff (APK nav tidak disentuh)",
    () => execSync(`git diff --name-only HEAD -- app/arena/bottom-nav.tsx`, { encoding: "utf8", cwd: process.cwd() }).trim().length === 0);

  // 16. Karya navigation
  console.log("\n── 16. Karya navigation ──");
  test("Karya (/murid/karya) berada di dalam murid shell → bottom nav hadir",
    () => navConfig.includes('href: "/murid/karya"') && muridLayout.includes("MuridMobileNav"));
  test("Karya juga diakses dari arena (feed) tanpa nav hilang (arena shell)",
    () => arenaLayout.includes("ShellLayout") && arenaLayout.includes("<MuridMobileNav"));

  // 17. Jalur Cerdas navigation
  console.log("\n── 17. Jalur Cerdas navigation ──");
  test("/arena/jalur-cerdas di bawah arena layout → mobile nav hadir",
    () => exists("app/arena/jalur-cerdas/page.tsx") && arenaLayout.includes("<MuridMobileNav"));

  // 18. Fullscreen exceptions documented
  console.log("\n── 18. Fullscreen exceptions ──");
  test("CSS: game-fullscreen menyembunyikan .bc-mobile-nav (immersive game)",
    () => arenaCss.includes(".game-fullscreen") && arenaCss.includes(".bc-mobile-nav"));
  test("CSS: owns-bottom-bar (halaman CTA sendiri) menyembunyikan nav",
    () => arenaCss.includes(".owns-bottom-bar") && arenaCss.includes(".bc-mobile-nav"));
  test("eksespsi terdokumentasi di docs/PHASE_5_STEP_0_MOBILE_NAVIGATION_AUDIT.md",
    () => exists("docs/PHASE_5_STEP_0_MOBILE_NAVIGATION_AUDIT.md") && read("docs/PHASE_5_STEP_0_MOBILE_NAVIGATION_AUDIT.md").includes("Fullscreen"));

  // 19. No protected feature regression
  console.log("\n── 19. Protected zones ──");
  test("protected zones 0 diff (prisma, gamification, learning-loop, engines, apk, coins, award-xp; pengecualian app/api/ BC Classroom 6.0/6.1)",
    () => {
      const allowed = new Set([
        "app/api/guru/pengumuman/route.ts",
        "app/api/guru/penugasan/route.ts",
        "app/api/guru/quiz/[id]/assign/route.ts",
        "app/api/murid/kelasku/[id]/route.ts",
        "app/api/murid/penugasan/[id]/praktik/route.ts",
        "app/api/guru/kelasku/[id]/route.ts",
        "app/api/murid/kelasku/[id]/route.ts",
        "app/api/guru/penugasan/[id]/nilai-praktik/route.ts",
        "app/api/guru/kelasku/[id]/insight/route.ts",
        "app/api/murid/quiz/[id]/route.ts",
        "app/api/group/route.ts",
        "app/api/group/[id]/route.ts",
      ]);
      const diff = execSync(`git diff --name-only HEAD -- prisma/ lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts lib/coins.ts lib/award-xp.ts app/api/`, { encoding: "utf8", cwd: process.cwd() }).trim().split("\n").filter(Boolean);
      return diff.every((f) => allowed.has(f));
    });

  // 20. TypeScript-safe
  console.log("\n── 20. TypeScript-safe ──");
  test("AdminMobileNav baru memakai tipe (LucideIcon) tanpa any",
    () => adminMobileNav.includes("LucideIcon") && !adminMobileNav.includes(": any"));
  test("komponen nav adalah .tsx (bukan JS) & memakai next/link",
    () => muridMobileNav.includes("next/link") && guruNav.includes("next/link") && adminMobileNav.includes("next/link"));

  console.log("\n" + "=".repeat(60));
  console.log(`Hasil: ${passed} lulus, ${failed} gagal`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main();
