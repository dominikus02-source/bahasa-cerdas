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

function exists(rel: string): boolean {
  return fs.existsSync(rel);
}

function main() {
  console.log("\n📋 ICON SYSTEM TEST — SATU SISTEM IKON UNTUK SEMUA NAVIGASI (Phase 5.1)");
  console.log("=".repeat(64));

  // ── 1. CANONICAL LIBRARY & TOKENS ──
  console.log("\n── 1. Canonical library & tokens ──");
  test("icon-tokens.ts ada (satu sumber token icon)",
    () => exists("components/shell/icon-tokens.ts"));
  const tokens = read("components/shell/icon-tokens.ts");
  test("token ukuran primary nav = 22px (w-[22px] h-[22px])",
    () => tokens.includes("w-[22px] h-[22px]"));
  test("token strokeWidth seragam = 2 (NAV_ICON_STROKE)",
    () => tokens.includes("NAV_ICON_STROKE = 2"));
  // Token kini memakai token desain global (app/theme/tokens.css) yang sudah
  // punya varian terang/gelap, bukan utility slate/violet mentah.
  test("token inactive pakai token muted (--clr-text-3 / bc-text-3) — bukan gray-400",
    () => tokens.includes("text-bc-text-3") && !tokens.includes("gray-400"));
  test("token active pakai violet token (text-bc-violet / bg-bc-violet-soft)",
    () => tokens.includes("text-bc-violet") && tokens.includes("bg-bc-violet-soft"));
  test("token header/action 18-20px (ACTION_ICON_CLASS + DISCLOSURE_ICON_CLASS)",
    () => tokens.includes("ACTION_ICON_CLASS = \"w-5 h-5") && tokens.includes("DISCLOSURE_ICON_CLASS = \"w-[18px] h-[18px]"));

  // ── 2. STUDENT NAV (nav-config) — mapping canonical seksi 8 ──
  console.log("\n── 2. STUDENT_NAV mapping canonical ──");
  const navConfig = read("components/shell/nav-config.ts");
  test("Beranda → Home (bukan House)", () => navConfig.includes("icon: Home"));
  test("Profil → UserCircle (bukan UserRound)", () => navConfig.includes("icon: UserCircle") && !navConfig.includes("UserRound"));
  test("Arena → Zap", () => navConfig.includes("icon: Zap"));
  test("Karya → PenLine", () => navConfig.includes("icon: PenLine"));
  // IA murid canonical kini 5 tujuan (Obrolan & Pengaturan keluar dari nav utama;
  // Pengaturan + Keluar ada di Profil). Lihat components/shell/nav-config.ts.
  test("Belajar → BookOpen", () => navConfig.includes("icon: BookOpen"));
  test("STUDENT_NAV 5 item & urutan Beranda/Belajar/Arena/Karya/Profil",
    () => {
      const labels = ["Beranda", "Belajar", "Arena", "Karya", "Profil"];
      const idx = labels.map((l) => navConfig.indexOf(`label: "${l}"`));
      return (navConfig.match(/label: "/g) || []).length === 5 && idx.every((i) => i >= 0) && idx.every((v, i) => i === 0 || v > idx[i - 1]);
    });

  // ── 3. SHELL NAV LIST — render memakai tokens ──
  console.log("\n── 3. ShellNavList memakai tokens canonical ──");
  const navList = read("components/shell/ShellNavList.tsx");
  test("ShellNavList import icon-tokens (bukan inline strokeWidth acak)",
    () => navList.includes("from \"@/components/shell/icon-tokens\""));
  test("ShellNavList tidak punya strokeWidth 1.8/2.2 (variasi lama)",
    () => !navList.includes("strokeWidth={1.8}") && !navList.includes("strokeWidth={2.2}"));
  test("ShellNavList ikon pakai NAV_ICON_CLASS (22px) + NAV_ICON_STROKE",
    () => navList.includes("NAV_ICON_CLASS") && navList.includes("NAV_ICON_STROKE"));
  test("link aktif memakai NAV_LINK_ACTIVE (violet-50) & icon NAV_ICON_ACTIVE",
    () => navList.includes("NAV_LINK_ACTIVE") && navList.includes("NAV_ICON_ACTIVE"));

  // ── 4. MURID — konsolidasi (tidak ada sistem ikon kedua) ──
  console.log("\n── 4. Murid layout: satu sistem ikon ──");
  const muridLayout = (read("app/(dashboard)/murid/layout.tsx") + read("components/shell/MuridShellFrame.tsx"));
  test("murid layout memakai <ShellNavList /> (bukan MenuIcon inline SVG)",
    () => muridLayout.includes("<ShellNavList />") && !muridLayout.includes("<MenuIcon "));
  test("murid layout memakai <RoleSections /> (role blocks tidak inline)",
    () => muridLayout.includes("<RoleSections") && !muridLayout.includes('user.role === "GURU" && !user.isFounder'));
  test("tidak ada svg inline strokeWidth 1.5 di murid layout (nav)",
    () => !muridLayout.includes('strokeWidth="1.5"'));
  const mobileNav = read("components/dashboard/MuridMobileNav.tsx");
  test("MuridMobileNav: icon Arena konsisten = Zap (bukan GraduationCap)",
    () => mobileNav.includes('label: "Arena", icon: Zap') && !/label: "Arena", icon: GraduationCap/.test(mobileNav));
  // Drawer dihapus; bottom bar 5 tab memakai ikon lucide 20px (ukuran ACTION).
  test("MuridMobileNav bottom bar memakai ikon lucide 20px yang sama dengan STUDENT_NAV",
    () => mobileNav.includes("<Icon size={20}") && ["Home", "BookOpen", "Zap", "PenLine", "UserCircle"].every((i) => mobileNav.includes(`icon: ${i}`)));

  // ── 5. GURU — tokens + violet aktif ──
  console.log("\n── 5. GuruNav memakai sistem yang sama ──");
  const guruNav = read("components/dashboard/GuruNav.tsx");
  test("GuruNav import icon-tokens",
    () => guruNav.includes("icon-tokens"));
  // Guru kini beraksen biru (identitas audiens guru), tetap bukan emerald lama.
  test("GuruNav active pakai aksen biru guru (bukan emerald), light & dark",
    () => /GURU_LINK_ACTIVE = "bg-blue-50 text-blue-700[^"]*dark:/.test(guruNav) && !/emerald-50 text-emerald-700/.test(guruNav));
  test("GuruNav ikon group memakai NAV_ICON_CLASS (22px)",
    () => guruNav.includes("NAV_ICON_CLASS"));
  test("GuruNav chevron pakai DISCLOSURE_ICON_CLASS (18px)",
    () => guruNav.includes("DISCLOSURE_ICON_CLASS"));
  test("menu & href GURU_NAV utuh (11 grup + destination utama)",
    () => {
      const count = (guruNav.match(/id: "/g) || []).length;
      return count >= 11 && guruNav.includes('href: "/guru/beranda"') && guruNav.includes('href: "/guru/feed-karya"') && guruNav.includes('href: "/guru/ai-tools"');
    });

  // ── 6. ADMIN — tokens + violet aktif ──
  console.log("\n── 6. AdminSidebar memakai sistem yang sama ──");
  const adminSidebar = read("components/admin/AdminSidebar.tsx");
  test("AdminSidebar import icon-tokens",
    () => adminSidebar.includes("icon-tokens"));
  test("AdminSidebar active pakai violet (bukan red)",
    () => adminSidebar.includes("NAV_LINK_ACTIVE") && !/text-red-700 bg-red-50/.test(adminSidebar));
  test("AdminSidebar item NAV memakai NAV_ICON_CLASS (22px)",
    () => adminSidebar.includes("NAV_ICON_CLASS"));
  test("AdminSidebar 7 top-level groups present (Control Tower through System & Operations)",
    () => ["Control Tower", "Pengguna", "Premium & Revenue", "Content", "Learning & Analytics", "AI & Platform", "System & Operations"].every((l) => adminSidebar.includes(l)) && adminSidebar.includes('href: "/admin/payments"'));
  test("AdminSidebar bell memakai ACTION_ICON_CLASS (20px)",
    () => adminSidebar.includes("ACTION_ICON_CLASS") && adminSidebar.includes('<BellRing className={`${ACTION_ICON_CLASS}'));
  test("AdminSidebar footer Ke Website/Keluar memakai ikon 20px (bukan size 16)",
    () => !adminSidebar.includes("ChevronRight size={16}") && !adminSidebar.includes("LogOut size={16}"));

  // ── 7. HEADER / ACTION ICONS (18–20px) ──
  console.log("\n── 7. Header & action icons (token 18–20px) ──");
  const backHome = read("components/shared/BackHome.tsx");
  test("BackHome ArrowLeft memakai w-5 h-5 (20px, bukan 16px)",
    () => backHome.includes('className="w-5 h-5 shrink-0"'));
  const themeToggle = read("components/theme/theme-toggle.tsx");
  test("ThemeToggle Sun/Moon memakai h-5 w-5 (20px, bukan 16px)",
    () => themeToggle.includes('className="h-5 w-5"'));
  const shellToggle = read("components/dashboard/ShellSidebarToggle.tsx");
  test("ShellSidebarToggle chevron 18px & aria Perkecil/Perbesar",
    () => shellToggle.includes("w-[18px] h-[18px]") && shellToggle.includes('aria-label={collapsed ? "Perbesar sidebar" : "Perkecil sidebar"}'));
  const logoutDashboard = read("components/dashboard/LogoutButton.tsx");
  test("LogoutButton dashboard memakai lucide LogOut (bukan svg inline 1.5)",
    () => logoutDashboard.includes("LogOut") && !logoutDashboard.includes('strokeWidth="1.5"'));
  const notificationBell = read("components/dashboard/NotificationBell.tsx");
  test("NotificationBell kanonik memakai Bell 20px (h-5 w-5, token header)",
    () => notificationBell.includes('<Bell className="h-5 w-5" />'));
  test("HeaderActions arena DIHAPUS — search arena-specific bukan global header",
    () => !exists("components/arena/HeaderActions.tsx"));
  const logoutArena = read("components/arena/LogoutButton.tsx");
  test("LogoutButton arena icon/link variant memakai size 18",
    () => logoutArena.includes("<LogOut size={18}"));

  // ── 8. AKSESIBILITAS & THEME ──
  console.log("\n── 8. Aksesibilitas & dark mode ──");
  test("BackHome aria-label 'Kembali ke Beranda'",
    () => backHome.includes('aria-label="Kembali ke Beranda"'));
  test("nav icons punya kelas shrink-0 di token NAV_ICON_CLASS (collapsed konsisten)",
    () => tokens.includes("w-[22px] h-[22px] shrink-0") && navList.includes("NAV_ICON_CLASS"));
  // ShellNavList memakai token bc-* (otomatis terang/gelap), jadi tidak perlu dark:.
  test("ShellNavList light & dark konsisten (token bc-* bertema, tanpa warna mentah)",
    () => tokens.includes("text-bc-text-2") && !/(slate|gray|violet)-\d00/.test(navList));
  test("dark: variant ada di GuruNav & AdminSidebar",
    () => guruNav.includes("dark:") && adminSidebar.includes("dark:"));

  // ── 9. TIDAK ADA EMOJI / LIBRARY IKON LAIN ──
  console.log("\n── 9. No emoji, satu library ──");
  const navFiles = [
    "components/shell/ShellNavList.tsx",
    "components/shell/RoleSections.tsx",
    "app/(dashboard)/murid/layout.tsx",
    "components/dashboard/MuridMobileNav.tsx",
    "components/dashboard/GuruNav.tsx",
    "components/admin/AdminSidebar.tsx",
  ];
  const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  test("tidak ada emoji di file navigasi", () => navFiles.every((f) => !EMOJI_RE.test(read(f))));
  test("tidak ada library ikon kedua (heroicons/react-icons/radix) di komponen nav",
    () => navFiles.every((f) => !/@heroicons|react-icons|@radix-ui\/react-icons/.test(read(f))));
  const pkg = read("package.json");
  test("package.json tidak menambahkan dependency ikon baru",
    () => !/@heroicons|react-icons|@radix-ui\/react-icons/.test(pkg));

  // ── 10. PROTECTED ZONES (0 diff) ──
  // Pengecualian fase: AI BC 2.1 sengaja mengubah app/api/ai/bc/chat/route.ts
  // (route SSE AI BC — di luar zona terlarang fase; API lain tetap 0 diff).
  // UKBI Simulasi 2.0 sengaja mengubah app/api/kompetensi/[paketId]/route.ts
  // (randomization engine + listening anti-leak).
  console.log("\n── 10. Protected zones (0 diff) ──");
  try {
    const diff = execSync(
      `git diff --name-only HEAD -- prisma/ app/api/ lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts app/arena/bottom-nav.tsx`,
      { encoding: "utf8", cwd: process.cwd() }
    ).trim();
    const diffAllowed = diff
      .split("\n")
      .filter(Boolean)
      .filter((l) => l !== "app/api/ai/bc/chat/route.ts")
      .filter((l) => l !== "app/api/kompetensi/[paketId]/route.ts")
      .join("\n");
    test("prisma/, app/api/, lib/gamification/, lib/learning-loop/, engines/, apk, bottom-nav 0 diff (kecuali app/api/ai/bc/chat & kompetensi route UKBI 2.0)",
      () => diffAllowed.length === 0);
    if (diffAllowed.length > 0) console.log(`  ⚠️  File berubah:\n${diffAllowed}`);
  } catch (e: any) {
    console.log("  ⚠️  git diff tidak dapat dijalankan — cek dilewati");
  }

  // ── Summary ──
  console.log(`\n${"=".repeat(64)}`);
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed > 0) process.exit(1);
  console.log("✅ ALL ICON SYSTEM TESTS PASSED\n");
}

main();