/**
 * AI BC 2.1 — ARENA AI FULLSCREEN CONVERSATION WORKSPACE (test suite).
 *
 * /arena/ai kini workspace percakapan layar-penuh (AiBcArenaWorkspace)
 * DI DALAM Unified App Shell — bukan lagi kartu tengah modul lama:
 *
 * A. PAGE WIRING (app/arena/ai/page.tsx)
 *    - server component; persona murid (STUDENT_PERSONA) dari sesi.
 *    - render AiBcArenaWorkspace dengan title/greeting/hints.
 *    - TANPA navigasi kedua (header/sidebar/router.back).
 * B. WORKSPACE (components/ai-bc/AiBcArenaWorkspace.tsx)
 *    - full-width, tinggi viewport-anchored, container 900px.
 *    - komposer SELALU terlihat (tanpa gerbang "mulai percakapan").
 *    - streaming SSE, Enter/Shift+Enter, retry, copy, reset.
 *    - Zelby via registry resmi; label "AI BC"; saran murid-only.
 * C. LAYOUT (app/arena/layout.tsx)
 *    - /arena/ai full-width seperti Obrolan; banner boost disembunyikan.
 *    - isChatWeb/chat web tidak diubah (regresi Obrolan).
 * D. PROTECTED ZONES
 *    - route SSE /api/ai/bc/chat TIDAK berubah; prisma/engine dkk. 0 diff.
 */

import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

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

const ROOT = join(__dirname, "..");
const read = (p: string) => {
  const full = join(ROOT, p);
  return existsSync(full) ? readFileSync(full, "utf-8") : "";
};
const gitDiffNames = (paths: string) =>
  execSync(`git diff --name-only HEAD -- ${paths}`, { cwd: ROOT }).toString().trim();

console.log("AI BC 2.1 — ARENA AI FULLSCREEN WORKSPACE");

const page = read("app/arena/ai/page.tsx");
const workspace = read("components/ai-bc/AiBcArenaWorkspace.tsx");
const layout = read("app/arena/layout.tsx");
const guruPage = read("app/(dashboard)/guru/ai-bc/page.tsx");
const moduleFile = read("components/ai-bc/AiBcModule.tsx");

/* ------------------------------------------------------------------ */
/* A. PAGE WIRING                                                      */
/* ------------------------------------------------------------------ */

console.log("\nA. Page wiring (/arena/ai)");
test("page: server component (getUser)", () => page.includes("getUser"));
test("page: persona murid dari sesi (STUDENT_PERSONA, bukan TEACHER_PERSONA)", () =>
  page.includes("STUDENT_PERSONA") && !page.includes("TEACHER_PERSONA"));
test("page: render AiBcArenaWorkspace (fullscreen workspace)", () => page.includes("AiBcArenaWorkspace"));
test("page: title persona dikirim dari STUDENT_PERSONA.title", () =>
  page.includes("personaTitle={STUDENT_PERSONA.title}"));
test("page: sapaan persona dikirim dari STUDENT_PERSONA.greeting", () =>
  page.includes("greeting={STUDENT_PERSONA.greeting}"));
test("page: hints murid dipaksa (roleOverride student)", () =>
  page.includes('getBcHints(user, "student")'));
test("page: tidak lagi memakai AiBcModule (guru kini workspace penuh 2.2)", () =>
  !page.includes("AiBcModule") && guruPage.includes("AiBcGuruWorkspace"));
test("page: tanpa header/sidebar sendiri", () =>
  !page.includes("<header") && !page.includes("<aside") && !page.includes("BackHome"));
test("page: tanpa router.back()", () => !page.includes("router.back()"));

/* ------------------------------------------------------------------ */
/* B. WORKSPACE COMPONENT                                              */
/* ------------------------------------------------------------------ */

console.log("\nB. Workspace component");
test("workspace: client component", () => workspace.includes('"use client"'));
test("workspace: full-width (w-full, tanpa pembatas kartu max-w-lg/md/2xl)", () =>
  workspace.includes("flex w-full") &&
  !workspace.includes("max-w-lg") &&
  !workspace.includes("max-w-md") &&
  !workspace.includes("max-w-2xl") &&
  !workspace.includes("min-w-[1200px]"));
test("workspace: tinggi viewport-anchored web (preseden Obrolan)", () =>
  workspace.includes("h-[calc(100dvh-3.5rem)]"));
test("workspace: tinggi viewport-anchored APK (header + BottomNav)", () =>
  workspace.includes("h-[calc(100dvh-7.5rem)]"));
test("workspace: container konten 900px", () => workspace.includes("max-w-[900px]"));
test("workspace: TANPA gerbang 'mulai percakapan' (komposer selalu terlihat)", () =>
  !workspace.includes('"landing"') && !workspace.includes('"chat"'));
test("workspace: placeholder komposer murid", () =>
  workspace.includes('placeholder={PLACEHOLDER}') && workspace.includes("Tanyakan sesuatu tentang pelajaranmu..."));
test("workspace: Enter kirim / Shift+Enter baris baru", () =>
  workspace.includes('e.key === "Enter"') && workspace.includes("Shift"));
test("workspace: kirim nonaktif saat streaming", () =>
  workspace.includes("!input.trim() || streaming"));
test("workspace: indikator streaming role=status + aria-live", () =>
  workspace.includes('role="status"') && workspace.includes('aria-live="polite"'));
test("workspace: label thinking 'Sebentar, aku pikirkan…'", () =>
  workspace.includes("Sebentar, aku pikirkan…"));
test("workspace: teks error persis", () =>
  workspace.includes("Maaf, aku belum bisa menjawab sekarang. Coba kirim pertanyaanmu lagi."));
test("workspace: retry 'Coba Lagi' + 'Tanya ulang'", () =>
  workspace.includes("Coba Lagi") && workspace.includes("Tanya ulang"));
test("workspace: salin 'Salin'/'Tersalin'", () =>
  workspace.includes("Salin") && workspace.includes("Tersalin"));
test("workspace: label AI 'AI BC' (bukan Asisten/Assistant)", () =>
  workspace.includes("const AI_LABEL = \"AI BC\"") &&
  !workspace.includes("Asisten") &&
  !workspace.includes("Assistant"));
test("workspace: reset 'Mulai baru' + aria-label", () =>
  workspace.includes("Mulai baru") && workspace.includes('aria-label="Mulai percakapan baru"'));
test("workspace: Zelby via registry resmi (tanpa path hardcoded)", () =>
  workspace.includes("<AICompanionCharacter") &&
  !workspace.includes("public/junior/karakter") &&
  !workspace.includes("zelby_reading.webp"));
test("workspace: 6 saran awal murid didefinisikan", () =>
  (workspace.match(/"([^"]+)"/g) || []).filter((s) => s.length > 20).length >= 6 &&
  workspace.includes("ARENA_AI_SUGGESTED_PROMPTS"));
const promptBlock =
  workspace.match(/export const ARENA_AI_SUGGESTED_PROMPTS[\s\S]*?\];/)?.[0] ?? "";
test("workspace: saran awal murid-only (tanpa alur kerja guru)", () =>
  !/rpp|materi ajar|kisi-kisi|buat soal/i.test(promptBlock));
test("workspace: chips saran hanya bila hints tersedia", () =>
  workspace.includes("hints.length > 0"));
test("workspace: komposer memakai safe-area-bottom", () =>
  workspace.includes("safe-area-bottom"));
test("workspace: tanpa navigasi kedua (header/theme/bell/logout)", () =>
  !workspace.includes("<header") &&
  !workspace.includes("BackHome") &&
  !workspace.includes("ThemeToggle") &&
  !workspace.includes("NotificationBell") &&
  !workspace.includes("LogOut"));
test("workspace: tanpa emoji", () => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(workspace));
test("workspace: dark mode tersedia", () => workspace.includes("dark:"));
test("workspace: tema murid violet", () => workspace.includes("violet-"));
test("workspace: karakter thinking saat streaming", () =>
  workspace.includes('<AICompanionCharacter state="thinking"'));
test("workspace: a11y komposer ber-aria-label", () =>
  workspace.includes('aria-label="Pertanyaan untuk AI BC"'));
test("workspace: tidak mengimpor modul lama", () => !workspace.includes("AiBcModule"));

/* ------------------------------------------------------------------ */
/* C. LAYOUT                                                           */
/* ------------------------------------------------------------------ */

console.log("\nC. Layout (app/arena/layout.tsx + ArenaWorkspaceContainer)");
// FIX FIRST-PAINT: isChatWeb/isAiWorkspace + ternary container + banner pindah
// ke components/arena/workspace-container.tsx (client, usePathname) — strings
// dibaca dari file baru, identik.
const container = read("components/arena/workspace-container.tsx");
test("layout: isChatWeb dipertahankan (chat web full-width hanya web)", () =>
  container.includes('!apk && pathname.startsWith("/arena/chat")'));
test("layout: workspace AI dikenali via isAiWorkspace", () =>
  container.includes('pathname.startsWith("/arena/ai")'));
test("layout: banner boost disembunyikan di workspace AI (dan chat web)", () =>
  container.includes("!isChatWeb && !isAiWorkspace && <ActiveBoostBanner />"));
test("layout: container full-width memakai ternary yang sama (w-full py-0 md:px-6)", () =>
  container.includes('? "w-full py-0 md:px-6"') && container.includes("max-w-[1280px] py-0 md:py-6 md:px-6"));
test("layout: tanpa branch header isChatWeb (header global tidak berubah)", () =>
  !layout.includes("isChatWeb ? (") && !container.includes("isChatWeb ? ("));

/* ------------------------------------------------------------------ */
/* D. PROTECTED ZONES                                                  */
/* ------------------------------------------------------------------ */

console.log("\nD. Protected zones");
test("route SSE /api/ai/bc/chat TIDAK berubah (git diff HEAD kosong)", () =>
  gitDiffNames("app/api/ai/bc/chat/route.ts") === "");
test("prisma + engine + koin/xp/apk: 0 diff (git diff HEAD kosong)", () =>
  gitDiffNames("prisma lib/gamification lib/learning-loop engines lib/apk.ts lib/xp.ts lib/coins.ts lib/award-xp.ts") === "");
test("modul lama AiBcModule tetap utuh di repo (guru pindah ke workspace 2.2)", () =>
  moduleFile.includes('"landing"') && moduleFile.includes('"chat"') && guruPage.includes("AiBcGuruWorkspace"));

/* ------------------------------------------------------------------ */
/* SUMMARY                                                             */
/* ------------------------------------------------------------------ */

console.log(`\nHASIL: ${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed > 0) process.exit(1);
console.log("✅ SEMUA UJI WORKSPACE AI BC ARENA LULUS\n");
process.exit(0);
