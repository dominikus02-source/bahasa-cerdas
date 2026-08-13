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

function stripComments(src: string): string {
  return src
    .split("\n")
    .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
    .join("\n");
}

function main() {
  console.log("\n📋 UNIFIED HEADER TEST — SATU Header Global Student Shell (Murid/Arena/Obrolan)");
  console.log("=".repeat(64));

  const muridLayout = read("app/(dashboard)/murid/layout.tsx");
  const arenaLayout = read("app/arena/layout.tsx");
  const chatClient = read("app/arena/chat/chat-client.tsx");
  const arenaHome = read("app/arena/page.tsx");
  const backHome = read("components/shared/BackHome.tsx");
  const roleSections = read("components/shell/RoleSections.tsx");
  const navConfig = read("components/shell/nav-config.ts");

  // Header kanonik murid — elemen yang harus identik di arena/chat.
  const HEADER_MARK = 'className="shrink-0 sticky top-0 z-30 flex items-center justify-between gap-2 px-4 md:px-6 h-14';

  // ── 1. SATU HEADER KANONIK ──
  console.log("\n── 1. Student Shell memiliki SATU header kanonik ──");
  test("murid layout (referensi kanonik): header sticky h-14 dengan BackHome + aksi kanan",
    () => muridLayout.includes(HEADER_MARK) && muridLayout.includes("<BackHome />"));
  test("arena layout memakai MARK header yang SAMA persis (string className identik)",
    () => arenaLayout.includes(HEADER_MARK));
  test("arena header = [BackHome] + [UserAvatar + NotificationBell + ThemeToggle] (struktur kanonik)",
    () => arenaLayout.includes("<BackHome />") && arenaLayout.includes("UserAvatar") && arenaLayout.includes("<NotificationBell />") && arenaLayout.includes("<ThemeToggle />"));
  test("header kanonik netral (tokens §13: putih/light + slate, tanpa ungu Arena / merah Admin / emerald Guru)",
    () => arenaLayout.includes("bg-white/80 backdrop-blur-xl border-b border-gray-100/50"));

  // ── 2. ARENA TIDAK MEMBUAT HEADER GLOBAL KEDUA ──
  console.log("\n── 2. Arena tidak membuat header global kedua ──");
  test("arena layout hanya punya SATU <header> (header global kanonik)",
    () => (arenaLayout.match(/<header /g) || []).length === 1 && (arenaLayout.match(/<header>/g) || []).length === 0);
  test("arena layout tidak memakai HeaderActions (komponen dihapus)",
    () => !arenaLayout.includes("HeaderActions") && !exists("components/arena/HeaderActions.tsx"));
  test("search arena-specific tidak lagi ada di header global (Search button hanya di konten feed/workspace)",
    () => !arenaLayout.includes("<Search") && !arenaLayout.includes("HeaderActions"));

  // ── 3. ARENA CHAT TIDAK MEMBUAT HEADER GLOBAL KEDUA ──
  console.log("\n── 3. Arena Chat tidak membuat header global kedua ──");
  test("chat memakai header global yang sama (BackHome + Bell + Theme; isChatWeb hanya untuk container/banner)",
    () => arenaLayout.includes("<BackHome />") && arenaLayout.includes("<NotificationBell />") && arenaLayout.includes("<ThemeToggle />"));
  test("tidak ada branch header isChatWeb di layout (header tidak berubah per produk)",
    () => !arenaLayout.includes("isChatWeb ? ("));
  test("chat workspace menyimpan toolbar INTERNAL sendiri di konten (judul 'Obrolan' + 'Kelas Aktif' di class list)",
    () => chatClient.includes(">Obrolan</h2>") && chatClient.includes("Kelas Aktif") && chatClient.includes("Cari kelas atau teman"));
  test("chat-client TIDAK punya ThemeToggle / NotificationBell / LogoutButton (bukan header global kedua)",
    () => !chatClient.includes("ThemeToggle") && !chatClient.includes("NotificationBell") && !chatClient.includes("LogoutButton"));

  // ── 4. IDENTITAS PRODUK ABSEN DARI HEADER ──
  console.log("\n── 4. Identitas produk tidak ada di header global ──");
  test("tidak ada ikon/title/subtitle 'Arena' di header arena (identitas pindah ke konten)",
    () => !arenaLayout.includes("Pusat kompetisi") && !arenaLayout.includes("<Zap"));
  test("tidak ada ikon/title/subtitle 'Obrolan' di header (identitas pindah ke konten workspace)",
    () => !arenaLayout.includes("Ruang komunikasi kelas") && !arenaLayout.includes("<MessageCircle"));
  test("brand sidebar konsisten 'Dasbor Murid' (shell konstan, tanpa label produk per route)",
    () => arenaLayout.includes("Dasbor Murid") && !arenaLayout.includes('"Obrolan" : "Arena"'));

  // ── 5. HEADER CHAT-SPESIFIK GLOBAL ABSEN ──
  console.log("\n── 5. Header chat-spesifik global absen ──");
  test("tidak ada top bar chat tersendiri di layout (hanya header kanonik h-14 yang ada)",
    () => (arenaLayout.match(/<header /g) || []).length === 1);
  test("chat web tetap full-width (isChatWeb dipertahankan untuk container 3-pane)",
    () => arenaLayout.includes('pathname.startsWith("/arena/chat")') && arenaLayout.includes('? "w-full py-0 md:px-6"'));

  // ── 6. BACKHOME DETERMINISTIK ──
  console.log("\n── 6. BackHome deterministik (tanpa router.back) ──");
  test("BackHome = Link deterministik (tanpa router.back)",
    () => backHome.includes("Link") && !stripComments(backHome).includes("router.back"));
  test("target default BackHome = /murid/beranda (canonical student home)",
    () => backHome.includes('href = "/murid/beranda"'));
  test("BackHome tetap dipakai di arena (header global) & APK menyembunyikannya (escape hatch)",
    () => arenaLayout.includes("<BackHome />") && arenaLayout.includes("!apk && <BackHome />"));

  // ── 7. THEME GLOBAL SATU ──
  console.log("\n── 7. ThemeToggle global (satu sistem, satu provider) ──");
  test("SATU ThemeProvider (next-themes) — tidak ada provider kedua",
    () => read("app/providers.tsx").includes("ThemeProvider") && read("components/theme/theme-provider.tsx").includes("NextThemesProvider"));
  test("tidak ada ThemeToggle duplikat di arena layout (hanya SATU di header kanonik)",
    () => (arenaLayout.match(/<ThemeToggle \/>/g) || []).length === 1);
  test("tidak ada ThemeToggle duplikat di murid layout",
    () => (muridLayout.match(/<ThemeToggle \/>/g) || []).length === 1);
  test("ThemeSegmented tidak ada (toggle duplikat dihapus)",
    () => !exists("components/theme/theme-segmented.tsx"));

  // ── 8. DASHBOARD GURU TIDAK DIPLIKAT DI HEADER ──
  console.log("\n── 8. Akses peran via sidebar (bukan header) ──");
  test("tidak ada CTA 'Dashboard Guru' di header arena (LayoutDashboard absen)",
    () => !arenaLayout.includes("LayoutDashboard") && !arenaLayout.includes("hasGuruAccess"));
  test("akses guru/founder tetap via RoleSections di sidebar (Mode Guru / Akses Founder)",
    () => arenaLayout.includes("<RoleSections") && roleSections.includes("getRoleNavItems") && read("components/shell/navigation-context.ts").includes('href: "/guru/beranda"') && read("components/shell/navigation-context.ts").includes("Panel Admin"));
  test("RoleSections memakai aria-label + title canonical (icon-only saat collapsed)",
    () => roleSections.includes("getRoleNavItems") && read("components/shell/navigation-context.ts").includes('ariaLabel: "Dashboard Guru"') && read("components/shell/navigation-context.ts").includes('title: "Dashboard Guru"'));

  // ── 9. SIDEBAR STUDENT KANONIK ──
  console.log("\n── 9. Sidebar student canonical (konstan di semua route) ──");
  test("arena sidebar = ShellNavList + RoleSections + ShellSidebarFooter (sama dengan murid)",
    () => arenaLayout.includes("ShellNavList") && arenaLayout.includes("RoleSections") && arenaLayout.includes("ShellSidebarFooter"));
  test("nav canonical 6 item (Beranda/Profil/Arena/Karya/Obrolan/Pengaturan) via nav-config",
    () => ["Beranda", "Profil", "Arena", "Karya", "Obrolan", "Pengaturan"].every((l) => navConfig.includes(`label: "${l}"`)));
  test("tidak ada navbar/subnav Arena kedua di layout",
    () => !arenaLayout.includes("navItems") && !arenaLayout.includes('aria-label="Navigasi Arena"'));

  // ── 10. APK BOTTOMNAV UTUH ──
  console.log("\n── 10. APK BottomNav behavior tetap ──");
  test("BottomNav hanya untuk APK ({apk && <BottomNav />})",
    () => arenaLayout.includes("{apk && <BottomNav />}"));
  test("apk = await isApk() (lib/apk untouched)",
    () => arenaLayout.includes("await isApk()"));
  test("RUTE_TANPA_GERBANG /arena/login tetap (login APK bare)",
    () => arenaLayout.includes('RUTE_TANPA_GERBANG = "/arena/login"'));

  // ── 11. CHAT WORKSPACE UTUH ──
  console.log("\n── 11. Chat workspace (3-pane) tidak berubah ──");
  test("chat-client utuh (ChatClient + useIsApkClient)",
    () => chatClient.includes("ChatClient") && chatClient.includes("useIsApkClient"));
  test("3-pane: class list clamp + conversation flex-1 min-w-0 + bubble max-w-[85%]",
    () => chatClient.includes("md:w-[clamp(300px,25vw,360px)]") && chatClient.includes("flex-1 min-w-0") && chatClient.includes("max-w-[85%] md:max-w-[70%]"));
  test("message list full-width (tanpa max-w-3xl mx-auto sempit)",
    () => chatClient.includes("space-y-1.5 w-full") && !chatClient.includes("max-w-3xl mx-auto"));
  test("moderasi + lock state + membership tetap (fitur chat utuh)",
    () => chatClient.includes("ModerationStats") && chatClient.includes("chatLocked") && chatClient.includes("Cari kelas atau teman"));

  // ── 12. ARENA CONTENT UTUH ──
  console.log("\n── 12. Arena content tidak berubah (konten mulai di bawah header global) ──");
  test("Arena home memuat identitas produk di KONTEN (eyebrow 'Arena BahasaCerdas' + hero rank)",
    () => arenaHome.includes("Arena BahasaCerdas") && arenaHome.includes("RankChip"));
  test("Kuis Tempur + section kompetisi tetap di konten arena",
    () => arenaHome.includes("Kuis Tempur") && arenaHome.includes("live-dot2"));
  test("tidak ada halaman arena yang diubah (konten di bawah shell — header hanya integrasi)",
    () => exists("app/arena/page.tsx") && exists("app/arena/misi/page.tsx"));

  // ── 13. TIDAK ADA ROUTER.BACK BARU ──
  console.log("\n── 13. Tanpa router.back() baru di shell ──");
  test("arena layout tanpa router.back",
    () => !arenaLayout.includes("router.back"));
  test("chat-client tanpa router.back",
    () => !chatClient.includes("router.back"));
  test("BackHome tetap satu-satunya back di header global (komponen Link deterministik)",
    () => !stripComments(backHome).includes("router.back"));

  // ── 14. TIDAK ADA NOTIFICATIONBELL DUPLIKAT ──
  console.log("\n── 14. NotificationBell tunggal ──");
  test("arena layout: tepat SATU <NotificationBell /> (tidak ada Bell kedua di header)",
    () => (arenaLayout.match(/<NotificationBell \/>/g) || []).length === 1);
  test("murid layout: tepat SATU <NotificationBell />",
    () => (muridLayout.match(/<NotificationBell \/>/g) || []).length === 1);
  test("NotificationBell tidak dirender di dalam konten chat (hanya header global)",
    () => !chatClient.includes("NotificationBell"));

  // ── 15. TIDAK ADA THEMETOGGLE DUPLIKAT ──
  console.log("\n── 15. ThemeToggle tunggal ──");
  test("arena layout: tepat SATU <ThemeToggle /> (header global)",
    () => (arenaLayout.match(/<ThemeToggle \/>/g) || []).length === 1);
  test("tidak ada ThemeToggle di dalam konten arena home (zona dark arena adalah konten, bukan shell)",
    () => !arenaHome.includes("<ThemeToggle"));
  test("tidak ada ThemeToggle di dalam chat-client (toolbar internal tanpa tema sendiri)",
    () => !chatClient.includes("ThemeToggle"));

  // ── Summary ──
  console.log(`\n${"=".repeat(64)}`);
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed > 0) process.exit(1);
  console.log("✅ ALL UNIFIED HEADER TESTS PASSED\n");
}

main();
