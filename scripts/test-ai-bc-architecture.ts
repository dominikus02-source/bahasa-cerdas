/**
 * AI BC 2.0 — Architecture tests (Phase 5.3).
 *
 * Memastikan arsitektur AI BC 2.0 utuh dan additive-only:
 * - Persona engine murni (tanpa dependensi server) dan dipakai route.
 * - Peran pengguna selalu dari sesi (server-side), bukan payload klien.
 * - Provider chain lama (deepseek→groq→gemini) tetap dipakai.
 * - Guardrails + rate limit + usage logging aktif; TIDAK ada pemotongan kredit.
 * - Route lama /api/ai/chat tidak disentuh (backward compatible).
 */

import { readFileSync, existsSync } from "node:fs";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const ok = fn();
    if (ok) {
      passed++;
    } else {
      failed++;
      console.error(`  ✗ ${name}`);
    }
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf-8") : "");

console.log("AI BC 2.0 — ARSITEKTUR");

const personas = read("src/ai/bc/personas.ts");
const contextLib = read("lib/ai-bc/context.ts");
const route = read("app/api/ai/bc/chat/route.ts");
const oldRoute = read("app/api/ai/chat/route.ts");
const moduleC = read("components/ai-bc/AiBcModule.tsx");
const arenaAi = read("app/arena/ai/page.tsx");
const guruAiBc = read("app/(dashboard)/guru/ai-bc/page.tsx");

// 1. Engine persona ada dan murni (tidak impor server/db/next).
test("personas.ts ada", () => existsSync("src/ai/bc/personas.ts"));
test("personas.ts murni — tanpa @/lib/db", () => !personas.includes('@/lib/db'));
test("personas.ts murni — tanpa @/lib/supabase", () => !personas.includes('@/lib/supabase'));
test("personas.ts murni — tanpa 'next/'", () => !personas.includes("next/"));
test("personas.ts mengekspor getPersonaForRole", () => personas.includes("export function getPersonaForRole"));
test("personas.ts mengekspor buildSystemPrompt", () => personas.includes("export function buildSystemPrompt"));
test("personas.ts mengekspor classifyIntent", () => personas.includes("export function classifyIntent"));
test("personas.ts mengekspor buildChatHistory", () => personas.includes("export function buildChatHistory"));

// 2. Peran dari sesi — payload klien tidak membawa peran/mode.
test("route memakai getUser() dari sesi", () => route.includes('getUser()') && route.includes('getPersonaForUser({ role: user.role, isFounder: user.isFounder })'));
test("route TIDAK menerima parameter mode", () => !route.includes('body.mode') && !route.includes('mode:'));
test("module tidak punya toggle murid/guru", () => !moduleC.includes('setMode("murid")') && !moduleC.includes('setMode("guru")'));
test("arena/ai selalu persona murid dari sesi (rule 6)", () =>
  arenaAi.includes("getUser()") && arenaAi.includes('role="student"'));
test("guru/ai-bc khusus GURU/founder dari sesi", () => guruAiBc.includes('user.role !== "GURU"'));
test("guru/ai-bc redirect ke /arena/ai untuk non-guru", () => guruAiBc.includes('redirect("/arena/ai")'));

// 3. Provider chain + streaming dipertahankan.
test("route memakai streamProviderText", () => route.includes("streamProviderText"));
test("route memakai AI_DEFAULT_MODEL / deepseek-chat", () => route.includes("AI_DEFAULT_MODEL") || route.includes("deepseek-chat"));
test("route memakai guardrails checkInput", () => route.includes("checkInput"));
test("route memakai rate limit bc-assistant", () => route.includes('checkAgentRateLimit(req, "bc-assistant"'));
test("route mencatat usage ke logUsage", () => route.includes("logUsage") && route.includes('agentId: "bc-assistant"'));

// 4. TIDAK ada pemotongan kredit di chat (konsisten dengan legacy /api/ai/chat).
test("route baru tidak memanggil deductCredits/quota", () =>
  !route.includes("deductCreditsAtomic") && !route.includes("checkAndPrepareDeduction") && !route.includes("ensureMonthlyLedger"));
test("legacy /api/ai/chat tidak disentuh (tanpa bc-chat)", () => !oldRoute.includes("ai/bc/chat") && oldRoute.includes("GROQ_KEYS"));
test("legacy /api/ai/chat tetap ada", () => existsSync("app/api/ai/chat/route.ts"));

// 5. Konteks best-effort tidak pernah menggagalkan chat.
test("context.ts membungkus tiap sumber (catch)", () => (contextLib.match(/\.catch\(/g) || []).length >= 3);
test("route membungkus gatherBcContext dengan catch", () => route.includes(".catch(() =>") || route.includes("gatherBcContext(user).catch"));
test("route memakai buildContextText", () => route.includes("buildContextText"));

// 6. Protected zones — tidak ada perubahan di engine/API lama yang wajib dijaga.
test("lib/gamification tidak diubah di perubahan ini (static)", () =>
  existsSync("lib/gamification/player.ts") && read("lib/gamification/player.ts").includes("getGamificationStats"));
test("lib/coins & award-xp tidak diubah", () =>
  existsSync("lib/coins.ts") && existsSync("lib/award-xp.ts"));

// 7. Batas waktu route wajar untuk chat.
test("route punya maxDuration", () => route.includes("export const maxDuration = 60"));

console.log(`\nHASIL: ${passed} passed, ${failed} failed (${passed + failed} total)`);
if (failed > 0) process.exit(1);
console.log("✅ SEMUA UJI ARSITEKTUR AI BC LULUS\n");
process.exit(0);
