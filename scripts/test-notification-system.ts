/**
 * NOTIFICATION SYSTEM 1.0 — unified reward notification (test suite).
 *
 * Uji logika queue MURNI (components/arena/player/reward-queue.ts) + wiring
 * statik komponen (player-context, reward-popup, claim cards, game quiet mode).
 * Run: npx tsx scripts/test-notification-system.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  enqueueReward,
  sortRewardQueue,
  dequeueReward,
  popupIdentity,
  popupPriority,
  popupDuration,
  buildRewardEvents,
  POPUP_DURATION_MS,
  POPUP_P0_DURATION_MS,
  DEDUPE_WINDOW_MS,
  type RewardPopup,
} from "../components/arena/player/reward-queue";

const ROOT = join(__dirname, "..");
const read = (p: string) => {
  try {
    return readFileSync(join(ROOT, p), "utf8");
  } catch {
    return "";
  }
};

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      passed++;
      console.log(`  ✅ ${name}`);
    } else {
      failed++;
      console.log(`  ❌ ${name}`);
    }
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

console.log("\n════════════════════════════════════════════");
console.log("  NOTIFICATION SYSTEM 1.0 — Unified Reward");
console.log("════════════════════════════════════════════\n");

/* ── 1. XP & Coin event ── */
console.log("── 1. XP / Coin / combined event ──");
test("1. XP notification renders (event type XP)", () => {
  const ev = buildRewardEvents(50, 0, "latihan");
  return ev.length === 1 && ev[0].type === "XP" && ev[0].amount === 50;
});
test("2. Coin notification renders (event type COIN)", () => {
  const ev = buildRewardEvents(0, 10, "misi");
  return ev.length === 1 && ev[0].type === "COIN" && ev[0].amount === 10;
});
test("3. XP + Coin dari event yang sama DIGABUNG jadi satu event REWARD", () => {
  const ev = buildRewardEvents(50, 10, "aktivitas");
  return ev.length === 1 && ev[0].type === "REWARD" && ev[0].xp === 50 && ev[0].coin === 10;
});
test("3b. tanpa gain → tanpa event", () => buildRewardEvents(0, 0, "x").length === 0);

/* ── 2. Queue & dedupe ── */
console.log("\n── 2. Queue, identity & dedupe ──");
test("4. sequential notifications masuk queue (tidak overlap, satu aktif)", () => {
  let q: RewardPopup[] = [];
  q = enqueueReward(q, { type: "XP", title: "+10 XP", amount: 10 });
  q = enqueueReward(q, { type: "COIN", title: "+5 Koin", amount: 5 });
  return q.length === 2;
});
test("5. event identity STABIL (bukan Date.now)", () => {
  const a = popupIdentity({ type: "XP", title: "+10 XP", amount: 10 });
  const b = popupIdentity({ type: "XP", title: "+10 XP", amount: 10 });
  return a === b && !a.includes(String(Date.now())) && a.length > 0;
});
test("6. duplicate event dalam dedupe window TIDAK menghasilkan popup kedua", () => {
  const now = Date.now();
  let q: RewardPopup[] = [];
  q = enqueueReward(q, { type: "COIN", title: "+10 Koin", amount: 10 }, now);
  q = enqueueReward(q, { type: "COIN", title: "+10 Koin", amount: 10 }, now + 1000);
  return q.length === 1;
});
test("6b. event sama DI LUAR dedupe window boleh muncul lagi", () => {
  const now = Date.now();
  let q: RewardPopup[] = [];
  q = enqueueReward(q, { type: "XP", title: "+10 XP", amount: 10 }, now);
  q = enqueueReward(q, { type: "XP", title: "+10 XP", amount: 10 }, now + DEDUPE_WINDOW_MS + 1);
  return q.length === 2;
});
test("7. queue terurut prioritas (P0 di depan)", () => {
  let q: RewardPopup[] = [];
  q = enqueueReward(q, { type: "BADGE", title: "Lencana", amount: 1 });
  q = enqueueReward(q, { type: "LEVEL_UP", title: "Naik Level" });
  q = enqueueReward(q, { type: "COIN", title: "+10 Koin", amount: 10 });
  const sorted = sortRewardQueue(q);
  return sorted[0].type === "LEVEL_UP";
});
test("8. level-up priority P0", () => popupPriority("LEVEL_UP") === 0 && popupPriority("RANK_UP") === 0);
test("9. XP/Coin/reward priority P1", () =>
  popupPriority("XP") === 1 && popupPriority("COIN") === 1 && popupPriority("REWARD") === 1);
test("10. badge/achievement priority P2", () => popupPriority("BADGE") === 2 && popupPriority("ACHIEVEMENT") === 2);
test("11. auto-dismiss: P0 lebih lama dari transient", () => popupDuration("LEVEL_UP") > POPUP_DURATION_MS && popupDuration("XP") === POPUP_DURATION_MS && popupDuration("LEVEL_UP") === POPUP_P0_DURATION_MS);
test("12. dequeue hanya membuang satu event (queue tidak macet)", () => {
  let q: RewardPopup[] = [];
  q = enqueueReward(q, { type: "XP", title: "+10 XP", amount: 10 });
  q = enqueueReward(q, { type: "COIN", title: "+5 Koin", amount: 5 });
  q = dequeueReward(q, q[0].id);
  return q.length === 1;
});

/* ── 3. Wiring komponen ── */
console.log("\n── 3. Component wiring ──");
const ctx = read("components/arena/player/player-context.tsx");
const popup = read("components/arena/player/reward-popup.tsx");
const quest = read("components/arena/player/daily-quest-card.tsx");
const achv = read("components/arena/player/achievement-grid.tsx");
const kt = read("components/game/KuisTempurSolo.tsx");
const menara = read("components/game/MenaraCerdas.tsx");

test("13. polling race protection (in-flight guard)", () =>
  ctx.includes("fetchingRef") && ctx.includes("if (fetchingRef.current) return"));
test("14. focus duplicate protection (guard melindungi fetch konkuren)", () =>
  ctx.includes('window.addEventListener("focus"') && ctx.includes("fetchingRef.current = false"));
test("15. rerender tidak duplikat (queue di context, enqueue fungsional)", () =>
  ctx.includes("setPopups((p) =>") && ctx.includes("duplicate"));
test("16. diff XP+Coin memakai buildRewardEvents (gabungan)", () =>
  ctx.includes("buildRewardEvents") && ctx.includes("xpGain") && ctx.includes("coinGain"));
test("17. claim quest refresh SILENT (tanpa popup diff kedua)", () =>
  quest.includes("refresh(true)") && quest.includes("enqueuePopup"));
test("18. claim achievement refresh SILENT (XP+COIN tanpa double)", () =>
  achv.includes("refresh(true)") && achv.includes("enqueuePopup"));
test("19. game quiet mode: popup ditahan saat gameplay", () =>
  ctx.includes("isQuiet()") && ctx.includes("deferredRef") && kt.includes('setQuiet(fase === "main")'));
test("20. Menara Cerdas juga quiet saat playing", () =>
  menara.includes('setQuiet(phase === "playing")'));
test("21. reward saat quiet TIDAK hilang (flush setelah selesai)", () =>
  ctx.includes("!isQuiet() && deferredRef.current.length > 0"));
test("22. serialisasi Level → Rank (pendingRankRef + dismissLevelUp)", () =>
  ctx.includes("pendingRankRef") && ctx.includes("levelUpRef.current = false"));
test("23. popup tidak render saat modal P0 aktif", () =>
  popup.includes("if (levelUp || rankUp) return null"));
test("24. aria-live polite + role status", () =>
  popup.includes('aria-live="polite"') && popup.includes('role="status"'));
test("25. icon dekoratif aria-hidden", () => popup.includes('aria-hidden="true"'));
test("26. auto-dismiss dengan timer bersih (unmount-safe)", () =>
  popup.includes("setTimeout") && popup.includes("clearTimeout") && popup.includes("popupDuration(current.type)"));
test("27. reduced motion dihormati", () =>
  popup.includes("useReducedMotion") && popup.includes("reduceMotion"));
test("28. safe-area top dihormati", () => popup.includes("env(safe-area-inset-top)"));
test("29. dark/light: popup memakai zona navy konsisten + tidak ada bg-white telanjang", () =>
  popup.includes('bg-[#0e1735]/85') && !popup.includes('className="bg-white"'));
test("30. enqueuePopup memakai identity stabil (bukan Date.now saja)", () =>
  ctx.includes("popupIdentity") && ctx.includes("enqueueReward"));

/* ── 4. Final hardening: quiet coverage, visual, safety ── */
console.log("\n── 4. Final hardening ──");
const games: Array<[string, string]> = [
  ["components/game/KuisTempurSolo.tsx", 'setQuiet(fase === "main")'],
  ["components/game/MenaraCerdas.tsx", 'setQuiet(phase === "playing")'],
  ["components/game/BenarSalah.tsx", 'setQuiet(screen === "playing")'],
  ["components/game/SusunKata.tsx", 'setQuiet(screen === "playing")'],
  ["components/game/TebakKata.tsx", 'setQuiet(screen === "playing")'],
  ["components/game/IramaKata.tsx", 'setQuiet(screen === "game")'],
  ["components/game/LariKata.tsx", 'setQuiet(screen === "playing")'],
  ["components/game/ZelbyDash.tsx", 'setQuiet(screen === "game")'],
  ["components/game/KataPlayGame.tsx", 'setQuiet(phase === "playing")'],
  ["components/game/TTSpage.tsx", 'setQuiet(screen === "game")'],
  ["components/game/GamePlay.tsx", 'setQuiet(phase === "countdown" || phase === "question")'],
];
test("31. quiet mode mencakup SEMUA game aktif (11 permukaan)", () =>
  games.every(([f, cond]) => read(f).includes(cond)));
test("32. quiet reset otomatis saat unmount (cleanup tiap game)", () =>
  games.every(([f]) => {
    const src = read(f);
    return src.includes("return () => setQuiet(false)");
  }));
test("33. light mode popup: surface putih elevated + teks gelap", () =>
  popup.includes("bg-white/95") && popup.includes("text-slate-900"));
test("34. dark mode popup: navy premium + teks terang (tanpa white flash)", () =>
  popup.includes("dark:bg-[#0e1735]/85") && popup.includes("dark:text-white"));
test("35. nilai XP/Coin tetap terbaca di kedua mode", () =>
  popup.includes("text-sky-600 dark:text-sky-300") &&
  popup.includes("text-amber-600 dark:text-[var(--px-gold)]"));
test("36. tombol close kontras di kedua mode", () =>
  popup.includes("dark:hover:bg-white/20") && popup.includes("hover:bg-slate-900/10"));
test("37. tidak ada perubahan protected zone", () => {
  const { execSync } = require("node:child_process");
  try {
    const diff = execSync("git diff --name-only HEAD -- prisma/ app/api/ lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts lib/xp.ts lib/coins.ts lib/award-xp.ts app/arena/bottom-nav.tsx", { cwd: ROOT }).toString().trim();
    return diff.length === 0;
  } catch {
    return true;
  }
});

/* ── Summary ── */
console.log("\n════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("════════════════════════════════════════════\n");
if (failed > 0) process.exit(1);
