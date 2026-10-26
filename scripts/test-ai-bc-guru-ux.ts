/**
 * AI BC 2.2 — GURU FULLSCREEN CONVERSATION WORKSPACE + PEDAGOGICAL LANGUAGE
 *
 * /guru/ai-bc kini workspace percakapan layar-penuh (AiBcGuruWorkspace) DI
 * DALAM Unified App Shell — setara kualitas dengan workspace murid 2.1,
 * namun dengan persona & tema guru (Teman Guru / emerald):
 *
 * A. PAGE WIRING (app/(dashboard)/guru/ai-bc/page.tsx)
 *    - server component; persona guru (TEACHER_PERSONA) dari sesi;
 *      role guard GURU/founder; render AiBcGuruWorkspace.
 * B. WORKSPACE (components/ai-bc/AiBcGuruWorkspace.tsx)
 *    - fullscreen (bleeding melewati padding kanvas guru), tinggi
 *      viewport-anchored, container 900px, tanpa double scrollbar.
 *    - komposer SELALU terlihat; Enter kirim / Shift+Enter baris baru;
 *      tombol kirim disabled saat kosong/loading; touch target >= 44px.
 *    - Zelby via registry resmi (reading/thinking); streaming SSE;
 *      error state 'Coba Lagi'; auto-scroll near-bottom only.
 * C. PERSONA & BAHASA
 *    - "Teman Guru" (bukan persona murid); saran prompt guru-spesifik;
 *      "RPP" bukan copy default — "Rencana Pembelajaran" yang dipakai;
 *      knowledge & context engine tetap tersambung (persona/system prompt).
 * D. SHELL & TEMA
 *    - tidak ada navbar/header AI kedua; theme global (dark:); a11y.
 *
 * Run: npx tsx scripts/test-ai-bc-guru-ux.ts
 */

import { readFileSync, existsSync } from "node:fs";
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

console.log("AI BC 2.2 — GURU FULLSCREEN CONVERSATION WORKSPACE");

const guruPage = read("app/(dashboard)/guru/ai-bc/page.tsx");
const ws = read("components/ai-bc/AiBcGuruWorkspace.tsx");
const sharedStyles = read("components/ai-bc/ai-bc-workspace.module.css");
const viewport = read("components/ai-bc/useAiBcViewport.ts");
const arenaWs = read("components/ai-bc/AiBcArenaWorkspace.tsx");
const personas = read("src/ai/bc/personas.ts");
const types = read("components/ai-bc/ai-bc-types.ts");

/* ------------------------------------------------------------------ */
/* A. PAGE WIRING                                                      */
/* ------------------------------------------------------------------ */

console.log("\nA. Page wiring (/guru/ai-bc)");
test("A1. guru route exists", () => existsSync("app/(dashboard)/guru/ai-bc/page.tsx"));
test("A2. page: server component (getUser)", () => guruPage.includes("getUser"));
test("A3. page: persona guru dari sesi (TEACHER_PERSONA)", () => guruPage.includes("TEACHER_PERSONA"));
test("A4. page: render AiBcGuruWorkspace (fullscreen workspace)", () => guruPage.includes("AiBcGuruWorkspace"));
test("A5. page: role guard guru/founder (bukan murid)", () =>
  guruPage.includes('user.role !== "GURU"') && guruPage.includes("isFounder"));
test("A6. page: non-guru redirect ke /arena/ai (bukan masuk guru AI)", () =>
  guruPage.includes('redirect("/arena/ai")'));
test("A7. page: hints guru dari context engine (getBcHints)", () =>
  guruPage.includes("getBcHints(user)"));
test("A8. page: tanpa header/sidebar sendiri", () =>
  !guruPage.includes("<header") && !guruPage.includes("<aside") && !guruPage.includes("BackHome"));

/* ------------------------------------------------------------------ */
/* B. WORKSPACE COMPONENT                                              */
/* ------------------------------------------------------------------ */

console.log("\nB. Workspace component");
test("B1. workspace: client component", () => ws.includes('"use client"'));
test("B2. workspace: fullscreen (w-full, tanpa pembatas kartu max-w-lg/md/2xl/4xl)", () =>
  ws.includes("flex w-full") &&
  !ws.includes("max-w-lg") &&
  !ws.includes("max-w-md") &&
  !ws.includes("max-w-2xl") &&
  !ws.includes("max-w-4xl") &&
  !ws.includes("min-w-[1200px]"));
test("B3. workspace: tinggi viewport-anchored desktop (preseden arena-AI)", () =>
  ws.includes("useAiBcViewport(workspaceRef)") && sharedStyles.includes("calc(100dvh - 3.5rem)"));
test("B4. workspace: tinggi mobile memperhitungkan bottom nav (GuruMobileNav)", () =>
  viewport.includes(".bc-mobile-nav, .arena-bottom-nav") && viewport.includes("navRect.top"));
test("B5. workspace: bleeding melewati padding kanvas guru (tanpa double scrollbar)", () =>
  ws.includes("-mx-3.5 sm:-mx-6 lg:-mx-8") && ws.includes("-mt-3.5 sm:-mt-6 lg:-mt-8") && ws.includes("-mb-24 md:-mb-8") && ws.includes("styles.guruWorkspace") && sharedStyles.includes("width: calc(100% + 1.75rem)"));
test("B6. workspace: container konten 900px", () => ws.includes("max-w-[900px]"));
test("B7. workspace: TANPA gerbang 'mulai percakapan' (komposer selalu terlihat)", () =>
  !ws.includes('"landing"') && !ws.includes('"chat"'));
test("B8. workspace: placeholder guru", () =>
  ws.includes("placeholder={PLACEHOLDER}") && ws.includes("Tulis pesan untuk Nara…"));
test("B9. workspace: Enter kirim / Shift+Enter baris baru", () =>
  ws.includes('e.key === "Enter"') && ws.includes("Shift"));
test("B10. workspace: kirim nonaktif saat kosong/streaming", () =>
  ws.includes("!input.trim() || streaming"));
test("B11. workspace: tombol kirim touch target >= 44px (h-11 = 44px)", () =>
  ws.includes("h-11 w-11"));
test("B12. workspace: indikator streaming role=status + aria-live", () =>
  ws.includes('role="status"') && ws.includes('aria-live="polite"'));
test("B13. workspace: label thinking 'Nara sedang berpikir…'", () =>
  ws.includes("Nara sedang berpikir…") && !ws.includes("Sebentar, aku pikirkan…"));
test("B14. workspace: teks error ramah tanpa detail internal", () =>
  ws.includes("Maaf, Nara belum bisa menjawab sekarang.") &&
  !ws.includes("stack") &&
  !ws.includes("provider") &&
  !ws.includes("API details"));
test("B15. workspace: retry 'Coba Lagi' + 'Tanya ulang'", () =>
  ws.includes("Coba Lagi") && ws.includes("Tanya ulang"));
test("B15b. workspace: label 'Nara sedang menulis…' saat jawaban mengalir", () =>
  ws.includes("Nara sedang menulis…") && ws.includes("{WRITING_LABEL}"));
test("B15b. workspace: tombol Hentikan menyimpan jawaban sebagian", () =>
  ws.includes('aria-label="Hentikan jawaban"') && ws.includes("stoppedRef.current = controller") &&
  ws.includes("STOPPED_NOTE") && ws.includes("STOPPED_EMPTY_COPY"));
test("B15b. workspace: 'Tanya ulang' hanya di balasan terakhir & tidak saat streaming", () =>
  ws.includes("!streaming && i === messages.length - 1"));
test("B16. workspace: salin 'Salin'/'Tersalin'", () =>
  ws.includes("Salin") && ws.includes("Tersalin"));
test("B17. workspace: label AI 'NARA' (bukan Asisten/Assistant/AI BC)", () =>
  ws.includes('const AI_LABEL = "NARA"') && !ws.includes('"AI BC"'));
test("B18. workspace: reset 'Mulai baru' + aria-label", () =>
  ws.includes("Mulai baru") && ws.includes('aria-label="Mulai percakapan baru"'));
test("B19. workspace: Zelby via registry resmi (tanpa path hardcoded)", () =>
  ws.includes("<AICompanionCharacter") &&
  !ws.includes("public/junior/karakter") &&
  !ws.includes("zelby_reading.webp"));
test("B20. workspace: karakter thinking saat streaming", () =>
  /<AICompanionCharacter\s+state="thinking"/.test(ws));
test("B21. workspace: karakter dekoratif aria-hidden (via AICompanionCharacter)", () =>
  ws.includes("AICompanionCharacter"));
test("B22. workspace: a11y komposer ber-aria-label", () =>
  ws.includes('aria-label="Tulis pesan untuk Nara"'));
test("B23. workspace: auto-scroll hanya saat dekat bawah", () =>
  ws.includes("nearBottomRef") && ws.includes("SCROLL_NEAR_BOTTOM_PX"));
test("B24. workspace: motion-reduce dihormati (animasi pulse dimatikan)", () =>
  ws.includes("motion-reduce:animate-none"));
test("B25. workspace: safe-area-bottom (komposer tidak tertutup)", () =>
  sharedStyles.includes("env(safe-area-inset-bottom") && sharedStyles.includes(".composer"));
test("B26. workspace: tanpa navigasi kedua (header/theme/bell/logout)", () =>
  !ws.includes("<header") &&
  !ws.includes("BackHome") &&
  !ws.includes("ThemeToggle") &&
  !ws.includes("NotificationBell") &&
  !ws.includes("LogOut"));
test("B27. workspace: tanpa emoji", () => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(ws));
test("B28. workspace: dark mode tersedia", () => ws.includes("bg-background") && ws.includes("text-foreground") && sharedStyles.includes("hsl(var(--background))"));
test("B29. workspace: aksen dari token audiens bersama (guru = biru via .bc-guru-shell)", () =>
  ws.includes("styles.sendButton") && sharedStyles.includes("var(--clr-aud)") &&
  !sharedStyles.includes("var(--clr-violet"));
test("B30. workspace: tidak mengimpor modul lama", () => !ws.includes("AiBcModule"));

/* ------------------------------------------------------------------ */
/* C. PERSONA & BAHASA                                                 */
/* ------------------------------------------------------------------ */

console.log("\nC. Persona & language");
test("C1. guru persona = NARA + tagline (sub-label lama 'Teman Guru' tidak dipakai)", () =>
  /TEACHER_PERSONA[\s\S]*?label: "NARA"[\s\S]*?title: BC_TAGLINE/.test(personas) && !personas.includes('title: "Teman Guru"'));
test("C2. persona murid TIDAK dipakai di workspace guru", () =>
  !ws.includes("STUDENT_PERSONA") && !ws.includes("Teman Belajarmu"));
test("C3. tepat 3 saran prompt guru didefinisikan", () => {
  const block = ws.match(/export const GURU_AI_BC_SUGGESTED_PROMPTS[\s\S]*?\];/)?.[0] ?? "";
  return block.includes('"Bantu saya menyusun rencana pembelajaran Bahasa Indonesia."') &&
    (block.match(/^  "/gm) || []).length === 3;
});
test("C4. saran prompt guru-spesifik (materi/asesmen/aktivitas)", () =>
  ws.includes("rencana pembelajaran") &&
  ws.includes("melatih literasi siswa") &&
  ws.includes("membuat asesmen"));
test("C5. 'RPP' TIDAK jadi copy default workspace guru", () =>
  !ws.includes("RPP") && !/buat(kan)? rpp/i.test(ws));
test("C6. 'Rencana Pembelajaran' dipakai di saran prompt", () =>
  ws.includes("rencana pembelajaran"));
test("C7. welcome state: headline + line guru", () =>
  ws.includes("Halo! Saya Nara, rekan Anda di BahasaCerdas.") &&
  ws.includes("Mau bertanya, mencari ide, atau menyiapkan sesuatu hari ini? Mari kita kerjakan bersama!"));
test("C8. quick action guru: sub tanpa 'RPP' (Rencana pembelajaran)", () =>
  types.includes("sub: \"Rencana pembelajaran & modul ajar\"") && !types.includes("sub: \"RPP"));
test("C9. knowledge engine tetap tersambung (persona + system prompt utuh)", () =>
  personas.includes("BASE_AI_BC_IDENTITY") && personas.includes("buildSystemPrompt"));
test("C10. system prompt guru tetap memahami RPP (user language, teknis)", () =>
  personas.includes("rpp") && personas.includes("rencana pembelajaran"));
test("C11. follow-up produktif (bukan spam CTA RPP)", () =>
  personas.includes("jangan selalu menutup dengan tawaran membuat RPP"));
test("C12. context engine tetap tersambung (getBcHints guru)", () =>
  read("lib/ai-bc/context.ts").includes("teacher"));

/* ------------------------------------------------------------------ */
/* D. KONSISTENSI DENGAN WORKSPACE MURID                               */
/* ------------------------------------------------------------------ */

console.log("\nD. Satu produk, dua persona");
test("D1. kedua peran memakai gaya bersama dengan aksen token audiens", () =>
  arenaWs.includes("styles.sendButton") && ws.includes("styles.sendButton") && sharedStyles.includes("var(--clr-aud)"));
test("D2. keduanya memakai streamBcChat (satu pipeline SSE)", () =>
  ws.includes("streamBcChat") && arenaWs.includes("streamBcChat"));
test("D3. keduanya memakai AICompanionCharacter (Zelby kanonik)", () =>
  ws.includes("<AICompanionCharacter") && arenaWs.includes("<AICompanionCharacter"));
test("D4. keduanya container 900px", () =>
  ws.includes("max-w-[900px]") && arenaWs.includes("max-w-[900px]"));
test("D5. keduanya aria-label 'Tulis pesan untuk Nara'", () =>
  ws.includes('aria-label="Tulis pesan untuk Nara"') && arenaWs.includes('aria-label="Tulis pesan untuk Nara"'));
test("D6. route SSE /api/ai/bc/chat tidak berubah (engine reuse)", () =>
  read("app/api/ai/bc/chat/route.ts").length > 0);

/* ------------------------------------------------------------------ */
/* E. FLOATING BUTTON EXCLUSION (AI BC 2.2 FINAL POLISH)               */
/* ------------------------------------------------------------------ */

console.log("\nE. Floating AI button hidden on AI BC workspaces");
const fab = read("components/shared/AIFloatingButton.tsx");
const arenaLayout = read("app/arena/layout.tsx");
// Kerangka murid (termasuk FAB) dipindah ke components/shell/MuridShellFrame.tsx.
const muridLayout = read("app/(dashboard)/murid/layout.tsx") + read("components/shell/MuridShellFrame.tsx");
const guruLayout = read("app/(dashboard)/guru/layout.tsx");
test("E1. FAB route-aware (usePathname)", () => fab.includes("usePathname"));
test("E2. /arena/ai dikecualikan", () => fab.includes('"/arena/ai"'));
test("E3. /guru/ai-bc dikecualikan", () => fab.includes('"/guru/ai-bc"'));
test("E4. return null total (tanpa empty container/overlay/aria-label)", () =>
  fab.includes("return null") && fab.includes("AI_BC_WORKSPACE_PATHS"));
test("E5. /arena/ai tidak me-mount FAB (arena layout bersih)", () =>
  !arenaLayout.includes("AIFloatingButton"));
test("E6. route lain tetap menampilkan FAB (murid & guru layout masih me-mount)", () =>
  muridLayout.includes("AIFloatingButton") && guruLayout.includes("AIFloatingButton"));
test("E7. FAB tetap menuju /ai-bc (secondary entry point utuh)", () =>
  fab.includes('href="/ai-bc"'));
test("E8. aria-label 'Ngobrol dengan Nara' tetap ada (hanya hilang saat tidak dirender)", () =>
  fab.includes('aria-label="Ngobrol dengan Nara"'));
test("E9. guard tanpa logika duplikat (satu set path, tanpa provider/nav baru)", () =>
  fab.includes("AI_BC_WORKSPACE_PATHS") && !fab.includes("ThemeProvider") && !fab.includes("<nav"));
test("E10. hooks dipanggil sebelum early return (rules-of-hooks)", () => {
  const stateIdx = fab.indexOf("useState");
  const effectIdx = fab.indexOf("useEffect");
  const guardIdx = fab.indexOf("AI_BC_WORKSPACE_PATHS.has(pathname)");
  return stateIdx > -1 && effectIdx > -1 && guardIdx > stateIdx && guardIdx > effectIdx;
});

/* ------------------------------------------------------------------ */
/* F. MURID SURFACE (AI BC 2.1 — Teman Belajar)                        */
/* ------------------------------------------------------------------ */

console.log("\nF. Murid surface (/arena/ai)");
const arenaPage = read("app/arena/ai/page.tsx");
const studentPrompts =
  arenaWs.match(/export const ARENA_AI_SUGGESTED_PROMPTS[\s\S]*?\];/)?.[0] ?? "";
test("F1. murid: fullscreen workspace (w-full + viewport-anchored + 900px, tanpa kartu sempit)", () =>
  arenaWs.includes("flex w-full") &&
  arenaWs.includes("useAiBcViewport(workspaceRef)") && sharedStyles.includes("calc(100dvh - 3.5rem)") &&
  arenaWs.includes("max-w-[900px]") &&
  !arenaWs.includes("max-w-lg") &&
  !arenaWs.includes("max-w-2xl") &&
  !arenaWs.includes("max-w-4xl"));
test("F2. murid: composer initial state (tanpa gerbang landing/chat)", () =>
  !arenaWs.includes('"landing"') && !arenaWs.includes('"chat"') &&
  arenaWs.includes("placeholder={PLACEHOLDER}"));
test("F3. murid: welcome ringkas + placeholder pelajaran", () =>
  arenaWs.includes("Hai! Aku Nara, teman ngobrolmu di BahasaCerdas.") &&
  arenaWs.includes("Mau bertanya, mencari ide, atau membuat sesuatu hari ini? Yuk, kita kerjakan bareng!") &&
  arenaWs.includes("Tulis pesan untuk Nara…"));
test("F4. murid: persona NARA murid (STUDENT_PERSONA dari sesi, bukan TEACHER)", () =>
  arenaPage.includes("STUDENT_PERSONA") && !arenaPage.includes("TEACHER_PERSONA") &&
  /STUDENT_PERSONA[\s\S]*?label: "NARA"[\s\S]*?title: BC_TAGLINE/.test(personas));
test("F5. murid: workspace tanpa CTA RPP", () => !arenaWs.includes("RPP") && !/buat(kan)? rpp/i.test(arenaWs));
test("F6. murid: workspace tanpa istilah guru (rencana pembelajaran/asesmen/modul ajar)", () =>
  !arenaWs.includes("rencana pembelajaran") &&
  !arenaWs.includes("asesmen") &&
  !arenaWs.includes("modul ajar") &&
  !arenaWs.includes("kisi-kisi"));
test("F7. murid: page tanpa CTA guru (tanpa persona/route guru)", () =>
  !arenaPage.includes("TEACHER_PERSONA") && !arenaPage.includes('"/guru/ai-bc"'));
test("F8. murid: saran prompt student-safe (tanpa alur kerja guru)", () =>
  !/rpp|rencana pembelajaran|asesmen|modul ajar|kisi-kisi|buat soal/i.test(studentPrompts) &&
  (studentPrompts.match(/^  "/gm) || []).length === 3);
test("F9. murid: Zelby reading/thinking via registry resmi", () =>
  /<AICompanionCharacter\s+state="idle"/.test(arenaWs) &&
  /<AICompanionCharacter\s+state="thinking"/.test(arenaWs));

/* ------------------------------------------------------------------ */
/* G. LANGUAGE AUDIT (user-facing copy)                                */
/* ------------------------------------------------------------------ */

console.log("\nG. Language audit (no English default copy)");
const surfaces = [ws, arenaWs, guruPage, arenaPage];
for (const banned of ["Chatbot", "Start Chat", "New Chat", "Teacher AI", "Ask anything", "How can I help?"]) {
  const hit = surfaces.some((s) => s.includes(banned));
  test(`G. tanpa "${banned}" di semua surface AI BC`, () => !hit);
}
test("G. 'Assistant' tidak dipakai sebagai label user-facing guru/murid", () =>
  !ws.includes("Assistant") && !arenaWs.includes("Assistant") &&
  !guruPage.includes("Assistant") && !arenaPage.includes("Assistant"));
test("G. 'Retry'/'Submit' tidak muncul sebagai teks UI (hanya identifier internal)", () =>
  !ws.includes(">Retry") && !ws.includes('"Retry"') && !arenaWs.includes(">Retry") && !arenaWs.includes('"Retry"') &&
  !ws.includes(">Submit") && !arenaWs.includes(">Submit"));
test("G. guru & murid memakai personaTitle dari persona sesi (tagline NARA, bukan chatbot/assistant)", () =>
  ws.includes("personaTitle") && arenaWs.includes("personaTitle"));

/* ------------------------------------------------------------------ */
/* SUMMARY                                                             */
/* ------------------------------------------------------------------ */

console.log(`\nHASIL: ${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed > 0) process.exit(1);
console.log("✅ SEMUA UJI WORKSPACE AI BC GURU LULUS\n");
process.exit(0);
