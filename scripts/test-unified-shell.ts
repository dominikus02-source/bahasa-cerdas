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

function main() {
  console.log("\n📋 UNIFIED SHELL TEST — SATU SHELL, BANYAK PRODUK (Murid/Arena/Obrolan/Guru/Admin)");
  console.log("=".repeat(64));

  // ── 1. CORE SHELL EXIST ──
  console.log("\n── 1. Unified shell components ──");
  test("components/shell/ShellLayout.tsx ada (kerangka global)",
    () => exists("components/shell/ShellLayout.tsx"));
  test("ShellLayout render <aside class=shell-aside> (sidebar collapsible)",
    () => read("components/shell/ShellLayout.tsx").includes("shell-aside") && read("components/shell/ShellLayout.tsx").includes("<aside"));
  test("ShellLayout render <div class=shell-main> (content canvas)",
    () => read("components/shell/ShellLayout.tsx").includes("shell-main"));
  test("ShellLayout render <main> (selector .game-fullscreen tetap bekerja)",
    () => read("components/shell/ShellLayout.tsx").includes("<main"));
  test("components/shell/nav-config.ts STUDENT_NAV 6 item canonical (Beranda/Profil/Arena/Karya/Obrolan/Pengaturan)",
    () => exists("components/shell/nav-config.ts") && ["Beranda", "Profil", "Arena", "Karya", "Obrolan", "Pengaturan"].every(l =>
      read("components/shell/nav-config.ts").includes(`label: "${l}"`)));
  test("ShellNavList (nav universal student) ada",
    () => exists("components/shell/ShellNavList.tsx") && read("components/shell/ShellNavList.tsx").includes("usePathname"));
  test("ShellSidebarFooter (Logout+Collapse) ada",
    () => exists("components/shell/ShellSidebarFooter.tsx") && read("components/shell/ShellSidebarFooter.tsx").includes("ShellSidebarToggle"));
  test("RoleSections (Mode Guru / Akses Founder) reuse — authorization tetap server-side",
    () => exists("components/shell/RoleSections.tsx") && read("components/shell/RoleSections.tsx").includes("user.role === \"GURU\"") === false);

  // ── 2. ARENA / OBROLAN ──
  console.log("\n── 2. Arena + Obrolan memakai Unified Shell ──");
  const arenaLayout = read("app/arena/layout.tsx");
  test("arena layout memakai ShellLayout",
    () => arenaLayout.includes("ShellLayout"));
  test("arena sidebar global = ShellNavList + RoleSections + ShellSidebarFooter",
    () => arenaLayout.includes("ShellNavList") && arenaLayout.includes("RoleSections") && arenaLayout.includes("ShellSidebarFooter"));
  test("arena memakai BackHome (deterministik)",
    () => arenaLayout.includes("<BackHome"));
  test("arena header GLOBAL kanonik = ThemeToggle + NotificationBell + UserAvatar langsung (tanpa HeaderActions)",
    () => arenaLayout.includes("<ThemeToggle />") && arenaLayout.includes("<NotificationBell />") && arenaLayout.includes("UserAvatar") && !arenaLayout.includes("HeaderActions"));
  test("HeaderActions DIHAPUS (search/bell/tema arena-specific bukan global header)",
    () => !exists("components/arena/HeaderActions.tsx"));
  test("TIDAK ada navbar Arena kedua",
    () => !arenaLayout.includes("navItems") && !arenaLayout.includes('aria-label="Navigasi Arena"'));
  test("RUTE_TANPA_GERBANG = /arena/login (heritage)", 
    () => arenaLayout.includes('RUTE_TANPA_GERBANG = "/arena/login"'));
  test("STEP 5.0: APK memakai BottomNav, web mobile memakai MuridMobileNav (student mobile nav), BackHome hidden saat apk",
    () => arenaLayout.includes("{apk ? <BottomNav /> : <MuridMobileNav") && arenaLayout.includes("!apk &&"));
  test("apk = await isApk() (lib/apk untouched)",
    () => arenaLayout.includes("await isApk()"));
  test("obrolan = produk dalam shell yang sama (isChatWeb dipertahankan)",
    () => arenaLayout.includes("isChatWeb") && read("components/arena/workspace-container.tsx").includes("isChatWeb"));
  test("chat workspace 3-pane TIDAK diubah (chat-client masih utuh; apk kini via prop server isApk() — first paint stabil)",
    () => read("app/arena/chat/chat-client.tsx").includes("ChatClient") && read("app/arena/chat/chat-client.tsx").includes("apk: boolean") && read("app/arena/chat/page.tsx").includes("await isApk()"));
  test("gamut game-fullscreen CSS masih menarget main",
    () => read("app/arena/arena.css").includes(".game-fullscreen") && read("app/arena/arena.css").includes("main"));

  // ── 3. GURU ──
  console.log("\n── 3. Guru memakai Unified Shell ──");
  const guruLayout = read("app/(dashboard)/guru/layout.tsx");
  test("guru layout memakai ShellLayout",
    () => guruLayout.includes("ShellLayout"));
  test("guru sidebar = GuruNavList kanonik (tanpa sidebar baru)",
    () => guruLayout.includes("GuruNavList") && exists("components/dashboard/GuruNav.tsx"));
  test("guru header = BackHome deterministik → /guru/beranda",
    () => guruLayout.includes("BackHome") && (guruLayout.includes('href="/guru/beranda"') || guruLayout.includes('href = "/guru/beranda"')));
  test("guru memakai ThemeToggle + NotificationBell di header",
    () => guruLayout.includes("<ThemeToggle />") && guruLayout.includes("NotificationBell"));
  test("guru sidebar collapsible (shell-label di GuruNav; shell-link via NAV_LINK_BASE token 5.1)",
    () => read("components/dashboard/GuruNav.tsx").includes("shell-label") && read("components/shell/icon-tokens.ts").includes("shell-link group flex items-center gap-3"));
  test("guru layout tetap server-side guard + side-effects (getUser/redirect)",
    () => guruLayout.includes("getUser()") && guruLayout.includes("redirect"));

  // ── 4. ADMIN ──
  console.log("\n── 4. Admin/Founder memakai Unified Shell ──");
  const adminLayout = read("app/(dashboard)/admin/layout.tsx");
  test("admin layout memakai ShellLayout",
    () => adminLayout.includes("ShellLayout"));
  test("admin sidebar = AdminSidebar kanonik (tanpa sidebar baru)",
    () => adminLayout.includes("AdminSidebar") && exists("components/admin/AdminSidebar.tsx"));
  test("admin memakai BackHome deterministik → /admin (role home)",
    () => adminLayout.includes("BackHome") && (adminLayout.includes('href="/admin"') || adminLayout.includes('href = "/admin"')));
  test("admin memakai ThemeToggle",
    () => adminLayout.includes("<ThemeToggle />"));
  test("admin guard server-side tetap",
    () => adminLayout.includes("getUser()") && adminLayout.includes("redirect"));
  test("admin nav intact (payment + DollarSign di AdminSidebar)",
    () => read("components/admin/AdminSidebar.tsx").includes("/admin/payments") && read("components/admin/AdminSidebar.tsx").includes("DollarSign"));

  // ── 5. COLLAPSE / EXPAND ──
  console.log("\n── 5. Collapse/Expand sidebar ──");
  const css = read("app/globals.css");
  const toggle = read("components/dashboard/ShellSidebarToggle.tsx");
  test("collapsed = width 4rem (CSS md+)",
    () => css.includes('[data-shell-collapsed="1"] .shell-aside') && css.includes("4rem"));
  test("expand reversibel: ChevronLeft/ChevronRight di ShellSidebarToggle",
    () => toggle.includes("ChevronLeft") && toggle.includes("ChevronRight"));
  test("ChevronRight tetap visible saat collapsed (aria Perbesar)",
    () => toggle.includes('"Perbesar sidebar"'));
  test("localStorage key bc.shell.collapsed",
    () => toggle.includes("bc.shell.collapsed"));

  // ── 6. THEME ──
  console.log("\n── 6. Theme global SATU provider ──");
  test("SATU ThemeProvider (next-themes) di app/providers.tsx",
    () => read("app/providers.tsx").includes("ThemeProvider") && read("components/theme/theme-provider.tsx").includes("NextThemesProvider"));
  test("ThemeToggle reusable dipakai di murid + arena + guru + admin",
    () => read("app/(dashboard)/murid/layout.tsx").includes("<ThemeToggle />") &&
         arenaLayout.includes("<ThemeToggle />") &&
         guruLayout.includes("<ThemeToggle />") && adminLayout.includes("<ThemeToggle />"));
  test("theme toggle tidak ada duplikat (ThemeSegmented tidak ada)",
    () => !exists("components/theme/theme-segmented.tsx"));

  // ── 7. BACK NAV ──
  console.log("\n── 7. Back navigation ──");
  test("BackHome deterministic (Link, tanpa router.back)",
    () => {
      const src = read("components/shared/BackHome.tsx").split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");
      return !src.includes("router.back") && read("components/shared/BackHome.tsx").includes("Link");
    });
  test("TIDAK ada router.back() di 4 layout utama",
    () => [arenaLayout, guruLayout, adminLayout, read("app/(dashboard)/murid/layout.tsx")].every(c => !c.includes("router.back")));

  // ── 8. PROTECTED ZONES ──
  console.log("\n── 8. Protected zones ──");
  test("lib/apk.ts untouched (APK_COOKIE bc_apk)",
    () => read("lib/apk.ts").includes('APK_COOKIE = "bc_apk"') || read("lib/apk.ts").includes('"bc_apk"'));
  test("app/arena/bottom-nav.tsx untouched",
    () => exists("app/arena/bottom-nav.tsx") && read("app/arena/bottom-nav.tsx").includes("BottomNav"));
  test("gamification engine untouched (levels/ranks/xp-config ada)",
    () => exists("lib/gamification/levels.ts") && exists("lib/gamification/ranks.ts") && exists("lib/gamification/xp-config.ts"));
  test("prisma schema tidak tersentuh (tanpa model shell baru)",
    () => !read("prisma/schema.prisma").includes("Shell"));
  test("lib/learning-loop tidak tersentuh",
    () => exists("lib/learning-loop/activity.ts") && exists("lib/learning-loop/next-action.ts"));

  // ── 9. VISUAL HARDENING 5.0.1 ──
  console.log("\n── 9. Visual Hardening 5.0.1 (Admin identity / Guru nav / Chat full-width) ──");
  const guruNav = read("components/dashboard/GuruNav.tsx");
  const chatClient = read("app/arena/chat/chat-client.tsx");
  const adminSidebar = read("components/admin/AdminSidebar.tsx");
  test("ADMIN: identitas 'Panel Admin' tepat 1× per file — layout = header context, AdminSidebar = brand block (TIDAK duplikat)",
    () => (adminLayout.match(/Panel Admin/g) || []).length === 1 && (adminSidebar.match(/Panel Admin/g) || []).length === 1);
  test("ADMIN: sidebar slot = AdminSidebar + ShellSidebarToggle (satu identity, satu user card, satu bell)",
    () => adminLayout.includes("<AdminSidebar") && adminLayout.includes("ShellSidebarToggle"));
  test("ADMIN: header context 'Panel Admin' tetap (1× viewport — sidebar 1 + header context 1)",
    () => adminLayout.includes("Panel Admin"));
  test("ADMIN: user/identity AdminSidebar utuh (Bell + logout + nav intact)",
    () => adminSidebar.includes("Bell") && adminSidebar.includes("/admin/payments"));
  test("GURU: GURU_NAV TIDAK punya grup 'Admin' redundant (founder akses via RoleSections)",
    () => !guruNav.includes('label: "Admin"'));
  test("GURU: founder tetap dapat 'Dasbor Guru' + 'Panel Admin' via navigation-context (RoleSections di guru layout)",
    () => guruLayout.includes("RoleSections") && read("components/shell/RoleSections.tsx").includes("getRoleNavItems") && read("components/shell/navigation-context.ts").includes("Panel Admin") && read("components/shell/navigation-context.ts").includes("Dasbor Guru"));
  test("GURU: item nav lain / GuruMobileNav utuh (12 grup tidak wajib, string menu tidak berubah)",
    () => guruNav.includes("GuruMobileNav") && guruNav.includes("Beranda"));
  test("CHAT: arena layout chat = full-width w-full (tanpa cap 1440px) — ternary kini di ArenaWorkspaceContainer",
    () => read("components/arena/workspace-container.tsx").includes('pathname.startsWith("/arena/chat")') && read("components/arena/workspace-container.tsx").includes('? "w-full py-0 md:px-6"'));
  test("CHAT: non-chat tetap 1280px (Arena Home desktop-first)",
    () => read("components/arena/workspace-container.tsx").includes("max-w-[1280px] py-0 md:py-6 md:px-6"));
  test("CHAT: TIDAK ada max-w-[1440px] tersisa di arena layout",
    () => !arenaLayout.includes("max-w-[1440px]"));
  test("CHAT: message list full-width (tanpa max-w-3xl mx-auto sempit)",
    () => chatClient.includes("space-y-1.5 w-full") && !chatClient.includes("max-w-3xl mx-auto"));
  test("CHAT: class list clamp(300px,25vw,360px) shrink-0 (bukan fixed w-72/lg:w-80)",
    () => chatClient.includes("md:w-[clamp(300px,25vw,360px)]") && !chatClient.includes("md:w-72 lg:w-80"));
  test("CHAT: conversation pane flex-1 min-w-0 (melebar otomatis + collapsed sidebar)",
    () => chatClient.includes("flex-1 min-w-0"));
  test("CHAT: bubble pesan tetap max-w-[85%] md:max-w-[70%] (batas per-bubble, bukan container)",
    () => chatClient.includes("max-w-[85%] md:max-w-[70%]"));
  test("CHAT: APK behavior utuh (apk prop dari server + drawer mobile)",
    () => chatClient.includes("bc_apk") && chatClient.includes("apk: boolean") && chatClient.includes("md:hidden"));

  // ── Summary ──
  console.log(`\n${"=".repeat(64)}`);
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed > 0) process.exit(1);
  console.log("✅ ALL UNIFIED SHELL TESTS PASSED\n");
}

main();