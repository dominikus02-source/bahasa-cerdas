/**
 * AI BC 2.0 — Navigation tests (Phase 5.3).
 *
 * AI BC harus TIDAK punya sistem navigasi kedua:
 * - /ai-bc (publik): pengguna masuk diarahkan sesuai peran; anonim lihat laman.
 * - /arena/ai: dipakai murid (student shell), tanpa header/sidebar sendiri.
 * - /guru/ai-bc: dipakai guru (guru shell), terdaftar di GuruNav.
 * - AIFloatingButton tetap menuju /ai-bc (yang mengarahkan sesuai peran).
 */

import { readFileSync, existsSync } from "node:fs";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const ok = fn();
    if (ok) passed++;
    else {
      failed++;
      console.error(`  ✗ ${name}`);
    }
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf-8") : "");

console.log("AI BC 2.0 — NAVIGASI");

const publicPage = read("app/ai-bc/page.tsx");
const publicLayout = read("app/ai-bc/layout.tsx");
const arenaAi = read("app/arena/ai/page.tsx");
const guruAiBc = read("app/(dashboard)/guru/ai-bc/page.tsx");
const guruNav = read("components/dashboard/GuruNav.tsx");
const floatingBtn = read("components/shared/AIFloatingButton.tsx");
const muridAi = read("app/(dashboard)/murid/ai/page.tsx");
const moduleC = read("components/ai-bc/AiBcModule.tsx");

// 1. /ai-bc publik → redirect per peran
test("ai-bc: MURID → /arena/ai", () => publicPage.includes('redirect(isTeacher ? "/guru/ai-bc" : "/arena/ai")'));
test("ai-bc: GURU/founder → /guru/ai-bc", () =>
  publicPage.includes('user.role === "GURU" || user.role === "ADMIN" || user.isFounder') &&
  publicPage.includes('redirect(isTeacher ? "/guru/ai-bc" : "/arena/ai")'));
test("ai-bc: anonim melihat laman perkenalan", () =>
  publicPage.includes("Teman cerdas untuk belajar dan mengajar Bahasa Indonesia.") && publicPage.includes('href="/login"'));
test("ai-bc: tidak ada mode switch manual", () => !publicPage.includes("setMode"));
test("ai-bc/layout metadata baru (teman belajar & mengajar)", () =>
  publicLayout.includes("Teman cerdas untuk belajar dan mengajar Bahasa Indonesia"));

// 2. /arena/ai memakai shell Arena (tanpa header/nav sendiri)
test("arena/ai: server component (getUser)", () => arenaAi.includes("getUser"));
test("arena/ai: memakai AiBcModule", () => arenaAi.includes("AiBcModule"));
test("arena/ai: tanpa header sendiri", () => !arenaAi.includes("<header") && !arenaAi.includes("BackHome"));
test("arena/ai: tanpa sidebar sendiri", () => !arenaAi.includes("<aside"));
test("arena/ai: tanpa router.back()", () => !arenaAi.includes("router.back()"));
test("arena/ai: murid/ai redirect tetap hidup", () => muridAi.includes('redirect("/arena/ai")'));

// 3. /guru/ai-bc di dalam guru shell
test("guru/ai-bc: halaman ada", () => existsSync("app/(dashboard)/guru/ai-bc/page.tsx"));
test("guru/ai-bc: server component", () => guruAiBc.includes("getUser"));
test("guru/ai-bc: memakai AiBcModule", () => guruAiBc.includes("AiBcModule"));
test("guru/ai-bc: tanpa header sendiri", () => !guruAiBc.includes("<header"));
test("GuruNav: item AI BC terdaftar", () =>
  guruNav.includes('id: "ai-bc"') && guruNav.includes('href: "/guru/ai-bc"') && guruNav.includes("Sparkles"));
test("GuruNav: Alat AI tetap ada", () => guruNav.includes('href: "/guru/ai-tools"'));

// 4. Modul tidak menduplikasi navigasi global
test("AiBcModule: tanpa BackHome", () => !moduleC.includes("BackHome"));
test("AiBcModule: tanpa ThemeToggle", () => !moduleC.includes("ThemeToggle"));
test("AiBcModule: tanpa NotificationBell", () => !moduleC.includes("NotificationBell"));
test("AiBcModule: tanpa logout", () => !moduleC.toLowerCase().includes("logout") && !moduleC.includes("LogOut"));
test("AiBcModule: tanpa router.back()", () => !moduleC.includes("router.back()"));

// 5. Floating button tetap konsisten
test("AIFloatingButton → /ai-bc", () => floatingBtn.includes('href="/ai-bc"'));

console.log(`\nHASIL: ${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed > 0) process.exit(1);
console.log("✅ SEMUA UJI NAVIGASI AI BC LULUS\n");
process.exit(0);
