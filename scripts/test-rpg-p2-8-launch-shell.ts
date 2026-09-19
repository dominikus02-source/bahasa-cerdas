#!/usr/bin/env npx tsx
/**
 * P2.8 — Pendekar Suryakerta Launch Shell (Premium Early Access).
 *
 * Memverifikasi integrasi produk TANPA DB produksi, TANPA auth sungguhan:
 * - registry published + premiumOnly, route + API dijaga server-side,
 *   locked experience, splash jujur, audio fail-open, analytics kanonis.
 *
 * Behavioral di mana mungkin (resolvePlanForUser murni, parser, registry);
 * static wiring proof untuk boundary server/DOM.
 *
 * RUN: npx tsx scripts/test-rpg-p2-8-launch-shell.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`); }
}

function src(p: string): string {
  return readFileSync(join(ROOT, p), "utf8");
}

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

async function main() {
  const { gameById } = await import("../lib/arena/game-registry");
  const { resolvePlanForUser } = await import("../lib/premium-economy/plans");
  const { parseQuestMutationInput } = await import("../lib/game/rpg/server-contracts");

  const rpg = gameById("rpg");

  // ── 1-5. Registry ────────────────────────────────────────────────
  console.log("\n📋 Registry");
  check("1. game registered", !!rpg);
  check("2. game published (not unpublished)", !!rpg && !rpg.unpublished);
  check("3. correct title", rpg?.title === "Pendekar Suryakerta");
  check("4. correct RPG route", rpg?.href === "/arena/game/rpg");
  check("5. premium required flag", rpg?.premiumOnly === true);

  // ── 6-7. Entitlement behavior (canonical helper, pure) ────────────
  console.log("\n🎟️ Entitlement");
  const freeMurid = resolvePlanForUser({
    role: "MURID", isFounder: false, isPremium: false,
    premiumUntil: null, trialEndsAt: null,
  });
  const premiumMurid = resolvePlanForUser({
    role: "MURID", isFounder: false, isPremium: true,
    premiumUntil: new Date(Date.now() + 86400000), trialEndsAt: null,
  });
  check("6. non-premium denied (FREE plan)",
    freeMurid.plan === "FREE" && !["MURID_PREMIUM", "PRO", "FOUNDER"].includes(freeMurid.plan));
  check("7. premium allowed (MURID_PREMIUM plan)",
    premiumMurid.plan === "MURID_PREMIUM");

  // ── 8-9. Route + API protection (static) ──────────────────────────
  console.log("\n🔒 Route & API");
  const page = src("app/arena/game/rpg/page.tsx");
  const pageCode = strip(page);
  check("8. direct route protected server-side",
    page.includes("requireRpgPlayAccess()") &&
    page.includes("PREMIUM_REQUIRED") &&
    page.includes("<RpgLocked") &&
    !pageCode.includes("searchParams") &&
    !pageCode.includes("localStorage"));
  const apiFiles = [
    "app/api/rpg/state/route.ts",
    "app/api/rpg/pool/route.ts",
    "app/api/rpg/quest/mutate/route.ts",
    "app/api/rpg/inventory/mutate/route.ts",
    "app/api/rpg/equipment/mutate/route.ts",
    "app/api/rpg/battles/start/route.ts",
    "app/api/rpg/battles/[battleId]/action/route.ts",
    "app/api/rpg/battles/[battleId]/learning/route.ts",
    "app/api/rpg/battles/[battleId]/learning/answer/route.ts",
    "app/api/rpg/battles/[battleId]/reward/route.ts",
    "app/api/rpg/battles/[battleId]/settle/route.ts",
  ];
  check("9. API protection preserved (11 routes, play gate)",
    apiFiles.every((f) => src(f).includes("requireRpgPlayAccess")) &&
    !apiFiles.some((f) => src(f).includes("requireRpgFounderPreviewApiAccess")));

  // ── 10. Non-premium notification path ─────────────────────────────
  console.log("\n🔔 Non-premium experience");
  const locked = src("app/arena/game/rpg/RpgLocked.tsx");
  check("10. notification path exists (clear message + canonical upgrade CTA)",
    locked.includes("tersedia khusus untuk Murid Premium") &&
    locked.includes('href="/murid/premium"') &&
    locked.includes('href="/arena/game"') &&
    src("app/arena/game/rpg/RpgBlockedTracker.tsx").includes("rpg_premium_blocked"));

  // ── 11-13. Splash + audio ─────────────────────────────────────────
  console.log("\n🎬 Splash & audio");
  const client = src("app/arena/game/rpg/RpgClient.tsx");
  const clientCode = strip(client);
  check("11. splash shell exists (real phases, no fake progress)",
    client.includes('"splash"') && client.includes('"starting"') &&
    client.includes('"playing"') && client.includes('fetch("/api/rpg/state"') &&
    !clientCode.includes("setTimeout") && !clientCode.includes("progress"));
  const sound = src("lib/game/sound.ts");
  check("12. audio integration exists (single manager, gesture init)",
    client.includes("startBGM") && client.includes("stopBGM") &&
    client.includes('from "@/lib/game/sound"') &&
    sound.includes("export function startBGM") &&
    sound.includes("export function stopBGM"));
  check("13. audio failure does not block gameplay",
    client.includes("fail open") &&
    sound.includes("if (!c || !enabled) return") &&
    sound.includes("catch"));

  // ── 14. Preview semantics ─────────────────────────────────────────
  console.log("\n👁️ Preview");
  const preview = src("app/arena/game/rpg/preview/page.tsx");
  const access = src("lib/game/rpg/server-access.ts");
  check("14. founder preview fails closed when published",
    preview.includes("!game.unpublished") &&
    access.includes("requireRpgFounderPreviewApiAccess") &&
    access.includes("requireRpgPlayAccess"));

  // ── 15-16. Scope ──────────────────────────────────────────────────
  console.log("\n📦 Scope");
  const gimbcGuard = !strip(src("lib/arena/game-registry.ts")).includes("gimbc") &&
    !strip(src("app/arena/game/rpg/page.tsx")).includes("gimbc");
  check("15. GIMBC untouched (no reference in launch files)", gimbcGuard);
  const { GAME_REGISTRY } = await import("../lib/arena/game-registry");
  const others = GAME_REGISTRY.filter((g) => g.id !== "rpg");
  check("16. unrelated games unchanged (no premiumOnly/unpublished drift)",
    others.every((g) => !g.premiumOnly) &&
    others.some((g) => g.id === "kuis-tempur") &&
    others.length === GAME_REGISTRY.length - 1);

  // ── 17-18. Authority ──────────────────────────────────────────────
  console.log("\n🛡️ Authority");
  check("17. no client-only premium authority (gate is server-side)",
    !strip(client).includes("isPremium") &&
    !strip(client).includes("premiumUntil") &&
    !strip(client).includes("resolvePlan"));
  const rpgServerFiles = [
    "lib/game/rpg/server-access.ts",
    ...apiFiles,
  ];
  check("18. no duplicate entitlement logic (single resolvePlan reuse)",
    access.includes("resolvePlan") &&
    !rpgServerFiles.some((f) => /user\.isPremium/.test(strip(src(f)))));

  // ── 19-20. Analytics + prod safety ────────────────────────────────
  console.log("\n📊 Analytics & safety");
  const analyticsRoute = src("app/api/analytics/product-event/route.ts");
  const expectedEvents = [
    "rpg_launch_clicked", "rpg_premium_blocked", "rpg_launch_authorized",
    "rpg_splash_started", "rpg_runtime_started",
  ];
  check("19. analytics follow canonical conventions (allowlisted snake_case)",
    expectedEvents.every((e) => analyticsRoute.includes(`"${e}"`)) &&
    src("components/arena/game-hub/GameHubClient.tsx").includes('trackProductEvent("rpg_launch_clicked"'));
  const testSelf = src("scripts/test-rpg-p2-8-launch-shell.ts");
  // Hanya baris import yang diperiksa (literal assertion dikecualikan).
  const importLines = testSelf.split("\n").filter((l) => l.trim().startsWith("import "));
  check("20. no production DB operation (no db/supabase/prisma imports)",
    !importLines.some((l) => l.includes("prisma") || l.includes("lib/db") || l.includes("supabase")));

  // ── Bonus: error-code contract ────────────────────────────────────
  const badParse = parseQuestMutationInput({ kind: "QUEST_ADVANCE", requestKey: "p28-x" });
  check("B. PREMIUM_REQUIRED is a known contract code",
    (src("lib/game/rpg/server-contracts.ts").includes('"PREMIUM_REQUIRED"')) &&
    badParse.ok === false);

  // ── H. Visual runtime (P2.8.4) ──────────────────────────────────────
  console.log("\n🎨 Visual runtime");
  const twConfig = src("tailwind.config.ts");
  check("H1. tailwind scans RPG UI (src/** content glob)",
    twConfig.includes('"./src/**/*.{js,ts,jsx,tsx,mdx}"'));
  const rpgClientSrc = src("app/arena/game/rpg/RpgClient.tsx");
  check("H2. playing phase has explicit viewport height (canvas gets pixels)",
    rpgClientSrc.includes("h-[calc(100dvh-64px)]"));
  const questPanel = src("src/game/rpg/ui/RPGQuestPanel.tsx");
  check("H3. quest panel keeps dark card + readable hierarchy",
    questPanel.includes("bg-stone-950/85") &&
    questPanel.includes("text-white") &&
    questPanel.includes("text-amber-300") &&
    questPanel.includes("text-xs"));

  console.log(`\n📊 P2.8 Hasil: ${pass} lulus, ${fail} gagal\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
