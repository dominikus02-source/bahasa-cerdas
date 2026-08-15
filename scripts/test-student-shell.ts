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
  console.log("\n📋 STUDENT SHELL TEST (STEP 4 — Sidebar 6 Item + Home Sections)");
  console.log("=".repeat(60));

  // ── 1. SIDEBAR (desktop layout) ──
  console.log("\n── 1. Sidebar (app/(dashboard)/murid/layout.tsx) ──");
  const layout = read("app/(dashboard)/murid/layout.tsx");
  const navConfig = read("components/shell/nav-config.ts");
  const PRIMARY = ["/murid/beranda", "/murid/profile", "/arena", "/murid/karya", "/arena/chat", "/murid/pengaturan"];
  test("sidebar memakai <ShellNavList /> canonical (fase 5.1 — bukan render inline MenuIcon lagi)",
    () => layout.includes("<ShellNavList />") && !layout.includes("<MenuIcon "));
  test("6 item STUDENT_NAV canonical di nav-config (Beranda/Profil/Arena/Karya/Obrolan/Pengaturan)",
    () => (navConfig.match(/label: "/g) || []).length === 6);
  test("6 href utama hadir di STUDENT_NAV",
    () => PRIMARY.every(h => navConfig.includes(`href: "${h}"`)));
  const ABSENT_LABELS = ["Simulasi UKBI", "Simulasi TKA", "Dokumen Hasil Latihan", "BIGT", "Gabung Kelas", "Toko Koin", "Papan Pengumuman"];
  const ABSENT_HREFS = ["/murid/simulasi/ukbi", "/murid/simulasi/tka", "/murid/dokumen-latihan", "/murid/bigt", "/murid/gabung-kelas", "/arena/toko-koin"];
  test("label lama (Simulasi/BIGT/Gabung Kelas/Toko Koin/Papan Pengumuman) TIDAK ada di layout",
    () => ABSENT_LABELS.every(l => !layout.includes(l)));
  test("href lama (simulasi/bigt/gabung-kelas/toko-koin) TIDAK ada di layout",
    () => ABSENT_HREFS.every(h => !layout.includes(h)));
  test("ada blok user + footer LogoutButton & ShellSidebarToggle di sidebar",
    () => layout.includes("LogoutButton") && layout.includes("<ShellSidebarToggle />") && layout.includes("shell-user"));

  // ── 2. MOBILE NAV (components/dashboard/MuridMobileNav.tsx) ──
  console.log("\n── 2. Mobile Nav (MuridMobileNav) ──");
  const mobileNav = read("components/dashboard/MuridMobileNav.tsx");
  test("bottom bar: Beranda/Arena/Karya/Profil",
    () => ["/murid/beranda", "/arena", "/murid/karya", "/murid/profile"].every(h => mobileNav.includes(`href: "${h}"`)));
  test("drawer berisi 6 item utama",
    () => PRIMARY.every(h => mobileNav.includes(`href: "${h}"`)));
  test("label lama TIDAK ada di mobile nav",
    () => ABSENT_LABELS.every(l => !mobileNav.includes(l)));
  test("href lama TIDAK ada di mobile nav",
    () => ABSENT_HREFS.every(h => !mobileNav.includes(h)));
  test("mobile nav punya LogoutButton di drawer",
    () => mobileNav.includes("LogoutButton"));

  // ── 3. HOME (beranda + section) ──
  console.log("\n── 3. Home (beranda + RuangBelajar/SimulasiUjian) ──");
  const beranda = read("app/(dashboard)/murid/beranda/page.tsx");
  test("beranda meng-import RuangBelajarSection",
    () => beranda.includes("RuangBelajarSection"));
  test("beranda meng-import SimulasiUjianSection",
    () => beranda.includes("SimulasiUjianSection"));
  test("RuangBelajarSection.tsx ada",
    () => fs.existsSync("components/student-home/RuangBelajarSection.tsx"));
  test("SimulasiUjianSection.tsx ada",
    () => fs.existsSync("components/student-home/SimulasiUjianSection.tsx"));
  const ruang = read("components/student-home/RuangBelajarSection.tsx");
  test("RuangBelajar: /murid/gabung-kelas",
    () => ruang.includes('href="/murid/gabung-kelas"'));
  test("RuangBelajar: /murid/tugasku",
    () => ruang.includes('href="/murid/tugasku"'));
  test("RuangBelajar: /arena/materi",
    () => ruang.includes('href="/arena/materi"'));
  const simulasi = read("components/student-home/SimulasiUjianSection.tsx");
  test("SimulasiUjian: /murid/simulasi/ukbi",
    () => simulasi.includes('href: "/murid/simulasi/ukbi"'));
  test("SimulasiUjian: /murid/simulasi/tka",
    () => simulasi.includes('href: "/murid/simulasi/tka"'));
  test("SimulasiUjian: /murid/bigt",
    () => simulasi.includes('href: "/murid/bigt"'));
  test("SimulasiUjian: /murid/dokumen-latihan",
    () => simulasi.includes('href: "/murid/dokumen-latihan"'));

  // ── 4. PROFIL & ARENA (canonical) ──
  console.log("\n── 4. Profil & Arena ──");
  test("STUDENT_NAV menautkan /murid/profile (canonical profil)",
    () => navConfig.includes('href: "/murid/profile"'));
  test("halaman canonical /murid/profile ada",
    () => fs.existsSync("app/(dashboard)/murid/profile/page.tsx"));
  test("STUDENT_NAV menautkan /arena (canonical arena)",
    () => navConfig.includes('href: "/arena"'));
  test("halaman canonical /arena ada",
    () => fs.existsSync("app/arena/page.tsx"));

  // ── 5. AI BC ──
  console.log("\n── 5. AI BC ──");
  test("beranda meng-import AIBCHomeCard",
    () => beranda.includes("AIBCHomeCard"));
  const aiCard = read("components/student-home/AIBCHomeCard.tsx");
  test("AIBCHomeCard menautkan /arena/ai",
    () => aiCard.includes('href="/arena/ai"'));

  // ── 6. THEME ──
  console.log("\n── 6. Theme ──");
  const providers = read("app/providers.tsx");
  test("providers.tsx memakai ThemeProvider dari components/theme/theme-provider",
    () => providers.includes('import { ThemeProvider } from "@/components/theme/theme-provider"') && providers.includes("<ThemeProvider>"));
  test("theme-provider.tsx ada dengan attribute=\"class\"",
    () => fs.existsSync("components/theme/theme-provider.tsx") && read("components/theme/theme-provider.tsx").includes('attribute="class"'));
  test("ThemeSettingsCard punya opsi Terang/Gelap/Sistem",
    () => {
      if (!fs.existsSync("components/murid/ThemeSettingsCard.tsx")) return false;
      const card = read("components/murid/ThemeSettingsCard.tsx");
      return card.includes("Terang") && card.includes("Gelap") && card.includes("Sistem");
    });
  test("app/layout.tsx punya suppressHydrationWarning",
    () => read("app/layout.tsx").includes("suppressHydrationWarning"));

  // ── 7. PROTECTED ZONES (tidak boleh tersentuh oleh restrukturisasi) ──
  console.log("\n── 7. Protected Zones ──");
  // OBROLAN 4.0 (spesifikasi §S): prisma/ DIBUKA secara eksplisit untuk
  // perubahan ADDITIVE chat lock + soft-delete — terbatas pada
  // prisma/schema.prisma + migrasi manual 2026-08-12_obrolan4_chat_lock.sql.
  // Zona lain tetap wajib 0 diff.
  try {
    const prismaDiff = execSync(`git diff --name-only HEAD -- prisma/`, { encoding: "utf8", cwd: process.cwd() }).trim();
    const allowedPrisma = new Set([
      "prisma/schema.prisma",
      "prisma/migrations/manual/2026-08-15_learning_evidence.sql",
      "prisma/migrations/manual/2026-08-15_question_metadata.sql",
    ]);
    test("prisma/ hanya menyentuh additive schema/evidence Step 3C",
      () => prismaDiff.split("\n").filter(Boolean).every((l) => allowedPrisma.has(l)));
    const diff = execSync(
      `git diff --name-only HEAD -- lib/gamification/ lib/award-xp.ts lib/xp.ts lib/coins.ts app/api/player/`,
      { encoding: "utf8", cwd: process.cwd() }
    ).trim().split("\n").filter(Boolean);
    const allowedStep3B = new Set(["app/api/player/coin/route.ts"]);
    test("protected reward zones tetap utuh kecuali coin add boundary Step 3B",
      () => diff.every((file) => allowedStep3B.has(file)));
    if (diff.length > 0) console.log(`  ⚠️  File berubah:\n${diff.join("\n")}`);
  } catch (e: any) {
    console.log("  ⚠️  git diff tidak dapat dijalankan (HEAD tidak tersedia?) — cek zona lindung dilewati");
    console.log(`      ${e.message?.split("\n")[0] || e}`);
  }

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failed > 0) process.exit(1);
  console.log("✅ ALL STUDENT SHELL TESTS PASSED\n");
}

main();
