import fs from "fs";
import { getNavigationContext, getRoleNavItems } from "../components/shell/navigation-context";

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

function singleNavigationContextCase(pathname: string, expected: string): boolean {
  return getNavigationContext(pathname) === expected;
}

function singleRoleCase(
  role: string,
  isFounder: boolean,
  pathname: string,
  expectation: { dashboardGuru?: boolean; panelAdmin?: boolean; count?: number }
): boolean {
  const items = getRoleNavItems({ role, isFounder, pathname });
  const hasGuru = items.some((i) => i.id === "dashboard-guru");
  const hasAdmin = items.some((i) => i.id === "panel-admin");
  if (expectation.count !== undefined && items.length !== expectation.count) return false;
  if (expectation.dashboardGuru !== undefined && hasGuru !== expectation.dashboardGuru) return false;
  if (expectation.panelAdmin !== undefined && hasAdmin !== expectation.panelAdmin) return false;
  return true;
}

function main() {
  console.log("\n📋 NAVIGATION CONTEXT TEST — Role-Switch Context-Aware (Phase 5.2.1)");
  console.log("=".repeat(64));

  const util = read("components/shell/navigation-context.ts");
  const roleSections = read("components/shell/RoleSections.tsx");
  const mobileNav = read("components/dashboard/MuridMobileNav.tsx");
  const muridLayout = read("app/(dashboard)/murid/layout.tsx");
  const arenaLayout = read("app/arena/layout.tsx");
  const guruLayout = read("app/(dashboard)/guru/layout.tsx");
  const shellSidebarToggle = read("components/dashboard/ShellSidebarToggle.tsx");

  // ── 1. getNavigationContext murni ──
  console.log("\n── 1. getNavigationContext() — satu sumber konteks produk ──");
  test("helper getNavigationContext ada di components/shell/navigation-context.ts",
    () => util.includes("export function getNavigationContext"));
  test("'student' untuk /murid/beranda, /arena, /arena/chat, /arena/player",
    () =>
      singleNavigationContextCase("/murid/beranda", "student") &&
      singleNavigationContextCase("/arena", "student") &&
      singleNavigationContextCase("/arena/chat", "student") &&
      singleNavigationContextCase("/arena/player/leaderboard", "student"));
  test("'guru' untuk /guru/beranda dan seluruh /guru/*",
    () => singleNavigationContextCase("/guru/beranda", "guru") && singleNavigationContextCase("/guru/game/history", "guru"));
  test("'admin' untuk /admin dan seluruh /admin/*",
    () => singleNavigationContextCase("/admin", "admin") && singleNavigationContextCase("/admin/users", "admin"));

  // ── 2. Aturan inti: CURRENT CONTEXT role-switch = hidden ──
  console.log("\n── 2. Current context → roli-switch destination disembunyikan (CASE §20) ──");
  test("CASE 1: GURU di /guru/beranda → Dashboard Guru HIDDEN (redundant)",
    () => singleRoleCase("GURU", false, "/guru/beranda", { dashboardGuru: false, count: 0 }));
  test("CASE 2: GURU di /guru/game (sub-halaman) → Dashboard Guru HIDDEN",
    () => singleRoleCase("GURU", false, "/guru/game", { dashboardGuru: false, count: 0 }));
  test("CASE 3: GURU di /murid/beranda (pratinjau) → Dashboard Guru VISIBLE",
    () => singleRoleCase("GURU", false, "/murid/beranda", { dashboardGuru: true, count: 1 }));
  test("CASE 4: GURU di /arena → Dashboard Guru VISIBLE (student experience)",
    () => singleRoleCase("GURU", false, "/arena", { dashboardGuru: true, count: 1 }));
  test("CASE 5: GURU di /arena/chat → Dashboard Guru VISIBLE",
    () => singleRoleCase("GURU", false, "/arena/chat", { dashboardGuru: true, count: 1 }));
  test("CASE 6: GURU di /arena/player → Dashboard Guru VISIBLE",
    () => singleRoleCase("GURU", false, "/arena/player", { dashboardGuru: true, count: 1 }));
  test("CASE 7: FOUNDER di /guru/beranda → Dasbor Guru HIDDEN, Panel Admin VISIBLE",
    () => singleRoleCase("FOUNDER", true, "/guru/beranda", { dashboardGuru: false, panelAdmin: true, count: 1 }));
  test("CASE 8: FOUNDER di /arena → Dasbor Guru + Panel Admin VISIBLE (cross-access)",
    () => singleRoleCase("FOUNDER", true, "/arena", { dashboardGuru: true, panelAdmin: true, count: 2 }));
  test("CASE 9: FOUNDER di /murid/profile → Dasbor Guru + Panel Admin VISIBLE",
    () => singleRoleCase("FOUNDER", true, "/murid/profile", { dashboardGuru: true, panelAdmin: true, count: 2 }));
  test("CASE 10: FOUNDER di /admin → Panel Admin HIDDEN, Dasbor Guru VISIBLE",
    () => singleRoleCase("FOUNDER", true, "/admin", { dashboardGuru: true, panelAdmin: false, count: 1 }));
  test("CASE 10b: FOUNDER di /admin/users → Panel Admin HIDDEN",
    () => singleRoleCase("FOUNDER", true, "/admin/users", { dashboardGuru: true, panelAdmin: false, count: 1 }));
  test("CASE 11: MURID di route mana pun → Dashboard Guru SELALU absen",
    () =>
      singleRoleCase("MURID", false, "/murid/beranda", { count: 0 }) &&
      singleRoleCase("MURID", false, "/arena", { count: 0 }) &&
      singleRoleCase("MURID", false, "/arena/chat", { count: 0 }));
  test("CASE 12: GURU tidak pernah mendapat Panel Admin",
    () => singleRoleCase("GURU", false, "/arena", { panelAdmin: false, count: 1 }));

  // ── 3. Konsumsi UI: satu aturan, desktop = mobile ──
  console.log("\n── 3. Konsumsi UI (desktop sidebar = mobile drawer) ──");
  test("RoleSections (desktop) memakai getRoleNavItems — tidak ada logika inline",
    () => roleSections.includes("getRoleNavItems") && !roleSections.includes('role === "GURU" &&') && !roleSections.includes('isFounder && ('));
  test("MuridMobileNav (mobile drawer) memakai getRoleNavItems — tidak ada logika inline",
    () => mobileNav.includes("getRoleNavItems") && !mobileNav.includes('role === "GURU" &&') && !mobileNav.includes("isFounder && ("));
  test("TIDAK ada duplikasi literal role-switch di layout (murid/arena/guru)",
    () =>
      !muridLayout.includes('aria-label="Dashboard Guru"') &&
      !arenaLayout.includes('aria-label="Dashboard Guru"') &&
      !guruLayout.includes('aria-label="Dashboard Guru"'));
  test("Goal hidden dibuat di util: context !== guru/admin rule",
    () => util.includes('context !== "guru"') && util.includes('context !== "admin"'));
  test("RoleSections render null saat tidak ada item (GURU di /guru/*)",
    () => roleSections.includes("items.length === 0") && roleSections.includes("return null"));

  // ── 4. Label + ikon canonical (5.2.1: drawer permanen 'Panel Admin') ──
  console.log("\n── 4. Label canonical ──");
  test("Label Dashboard Guru (GURU non-founder) dan Dasbor Guru (founder) di util",
    () => util.includes('label: isFounder ? "Dasbor Guru" : "Dashboard Guru"'));
  test("Label Panel Admin seragam (sidebar + drawer) — tidak ada 'Admin Panel'",
    () => util.includes('label: "Panel Admin"') && !read("components/dashboard/MuridMobileNav.tsx").includes("Admin Panel") && !roleSections.includes("Admin Panel"));
  test("Icon per item dipetakan di komponen (Bukan di util): GraduationCap/ShieldCheck/LayoutDashboard",
    () => roleSections.includes("GraduationCap") && roleSections.includes("ShieldCheck") && mobileNav.includes("Shield"));

  // ── 5. Collapse tetap reversibel (regresi 4.2.2) ──
  console.log("\n── 5. Collapse sidebar tetap utuh ──");
  test("ShellSidebarToggle memakai localStorage bc.shell.collapsed",
    () => shellSidebarToggle.includes("bc.shell.collapsed"));
  test("ShellSidebarToggle reversibel (ChevronRight saat collapsed)",
    () => shellSidebarToggle.includes("ChevronRight") && shellSidebarToggle.includes("ChevronLeft"));
  test("RoleSections memakai shell-label (icon-only saat collapsed)",
    () => roleSections.includes("shell-label"));

  // ── 6. Guard file protected (5.2.1 tidak menyentuh) ──
  console.log("\n── 6. File protected zones tetap utuh ──");
  test("GuruNav/AdminSidebar tidak diubah oleh 5.2.1 (struktur menu utuh)",
    () => exists("components/dashboard/GuruNav.tsx") && exists("components/admin/AdminSidebar.tsx"));
  test("nav-config.ts tetap sumber kebenaran item navigasi student",
    () => exists("components/shell/nav-config.ts") && fs.statSync("components/shell/nav-config.ts").size > 0);

  console.log("\n" + "=".repeat(64));
  console.log(`HASIL: ${passed} lulus, ${failed} gagal`);
  if (failed > 0) {
    console.log("⚠️  ADA KEGAGALAN — periksa sebelum lanjut.");
    process.exit(1);
  }
}

main();