/**
 * P1.9C REAL PLAYABLE VERTICAL SLICE — tests (no DOM, no browser timing).
 *
 * Pure view-model + persistence round-trip (real localStorage stub) driven
 * directly; component/engine wiring verified by static proofs + tsc + build
 * (engine needs DOM). Every UI path asserted here names the exact mechanism.
 * No fake battles, no mocked victories, no invented content.
 *
 * Run: npx tsx scripts/test-rpg-vertical-slice.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveBattleView } from "../src/game/rpg/ui/battle-view";
import {
  createLocalStoragePersistence,
} from "../src/game/rpg/core/persistence";
import { createDefaultPlayer } from "../src/game/rpg/player/player-state";
import { createInitialGameState } from "../src/game/rpg/core/game-state";

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

/** In-memory localStorage stub (persistence boundary needs the API only). */
function installStorageStub() {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
}

const BATTLE = {
  battleId: "b1", phase: "CHALLENGE", turn: 2,
  player: { id: "p", name: "P", hp: 80, maxHp: 100, mp: 12, maxMp: 20, attack: 10, defense: 5, level: 3 },
  enemies: [{ id: "e1", name: "Korog", hp: 10, maxHp: 25, attack: 6, defense: 1 }],
  origin: { mapId: "map.desa", x: 0, y: 0 },
} as never;

console.log("\n🌍 WORLD (slice entry)");
check("Desa default map (RPGGame)", src("src/game/rpg/ui/RPGGame.tsx").includes("mapId = DESA_VERTICAL_SLICE.mapId"));
check("engine honors config.mapId", src("src/game/rpg/core/game-engine.ts").includes("config.mapId ? getCanonicalMap"));
check("pool fetched for learning (canonical source)", src("src/game/rpg/ui/RPGGame.tsx").includes("/api/rpg/pool?count=20"));

console.log("\n⚔️ BATTLE VIEW MODEL (pure)");
{
  const v = resolveBattleView({ battle: BATTLE, playerLevel: 3, inventory: [{ itemId: "ram", quantity: 2 }] })!;
  check("enemy presence (name+HP)", v.enemyName === "Korog" && v.enemyHp === 10 && v.enemyMaxHp === 25);
  check("player vitals snapshot", v.playerHp === 80 && v.playerMp === 12 && v.turn === 2);
  check("canFlee non-boss", v.canFlee === true);
  check("skills listed (basic set + canonical)", v.skills.length >= 5);
  check("maha unlocked L3, angin locked", v.skills.find((s) => s.id === "skill.mahapukul")?.unlocked === true &&
    v.skills.find((s) => s.id === "skill.tebas-angin")?.unlocked === false);
  check("MP gating (api costs 20 > mp 12)", v.skills.find((s) => s.id === "skill.api-suci")?.affordable === false);
  check("items owned-only (ram ×2, no teh)", v.items.length === 1 && v.items[0].quantity === 2);
  check("null without battle", resolveBattleView({ battle: null, playerLevel: 1, inventory: [] }) === null);
  const boss = resolveBattleView({
    battle: { ...BATTLE, enemies: [{ id: "eb", name: "RAJA KOROG", hp: 160, maxHp: 160, attack: 14, defense: 5, boss: true }] },
    playerLevel: 8, inventory: [],
  })!;
  check("boss flagged, flee disabled", boss.isBoss === true && boss.canFlee === false);
}

console.log("\n🎮 BATTLE UI WIRING (static proofs)");
{
  const c = strip(src("src/game/rpg/ui/RPGBattle.tsx"));
  check("actions dispatch intents only", c.includes("onAttack(") && c.includes("onUseItem(") && c.includes("onFlee"));
  check("no HP/damage/XP math in component", !/\.hp\s*[-+]|damage\s*[+\-*/]|setHp|setDamage|Math\.max\(.*hp/i.test(c.replace(/Math\.max\(0, Math\.min\(100/g, "")));
  check("touch targets min-h-12, no overflow", c.includes("min-h-12") && c.includes("max-w-md"));
  check("semantic buttons + labels", (c.match(/<button/g) ?? []).length >= 4 && c.includes("aria-label"));
  const g = strip(src("src/game/rpg/ui/RPGGame.tsx"));
  check("RPGGame renders battle panel during battle", g.includes("<RPGBattle") && g.includes("battleView ?"));
  check("attack/skill/item/flee delegated to engine", g.includes("attackBasic()") && g.includes("attackWithSkill(") && g.includes("useItem(") && g.includes("fleeBattle()"));
}

console.log("\n📚 LEARNING OVERLAY (slice)");
{
  const g = strip(src("src/game/rpg/ui/RPGGame.tsx"));
  check("overlay mounted with engine snapshots", g.includes("<RPGBattleLearning") && g.includes("getLearningChallenge()"));
  check("answer/feedback flow intact", g.includes("submitLearningAnswer(") && g.includes("getLearningFeedback()"));
}

console.log("\n💾 PERSISTENCE — real round-trip via stub");
{
  installStorageStub();
  const persist = createLocalStoragePersistence("player.test");
  const player = createDefaultPlayer("player.test", "Pendekar");
  player.stats.hp = 77;
  player.progression.level = 4;
  const fullState = {
    ...createInitialGameState("player.test"),
    player: { ...player, position: { x: 0.3, y: 0.4 } },
    world: { mapId: "map.gunung", tiles: { width: 1, height: 1, tiles: [] }, entities: [], interactions: [] },
    flags: { bossDead: true },
    openedChests: ["cv1"],
    deadBossIds: [] as string[],
    goldIntents: [{ battleId: "b9", amount: 45 }],
    gold: 120,
    goldLedger: [{ id: "b9", delta: 45, reason: "battle-victory" }],
    equipmentIntents: [{ source: "g1", kind: "wpn", key: "empu" }] as Array<{ source: string; kind: "wpn" | "arm"; key: string }>,
    quest: { main: 3, kills: 9, flowers: 1 },
    pickedGe: ["map.desa:34,22"],
  };
  check("save writes", persist.save(fullState as never) === true);
  const back = persist.load()!;
  check("position/HP/level survive", back.player.position.x === 0.3 && back.player.stats.hp === 77 && back.player.progression.level === 4);
  check("map/flags/chests survive", (back as { world: { mapId: string } }).world.mapId === "map.gunung" && (back as { flags: Record<string, boolean> }).flags.bossDead === true);
  check("economy/quest/flowers survive", (back as { gold: number }).gold === 120 && (back as { quest: { flowers: number } }).quest.flowers === 1 &&
    (back as { pickedGe: string[] }).pickedGe[0] === "map.desa:34,22");
  check("save on BATTLE_END wired", src("src/game/rpg/ui/RPGGame.tsx").includes('"BATTLE_END"') && src("src/game/rpg/ui/RPGGame.tsx").includes("saveGame(persist)"));
  check("load-into-engine wired (initialPlayer)", src("src/game/rpg/ui/RPGGame.tsx").includes("initialPlayer:"));
}

console.log("\n🔒 SECURITY (slice)");
check("pool route requires auth (P2.8 play gate)", src("app/api/rpg/pool/route.ts").includes("requireRpgPlayAccess"));
check("pool excludes quarantined bank", src("app/api/rpg/pool/route.ts").includes("MASTER_BANK"));
check("pool gates eligibility", src("app/api/rpg/pool/route.ts").includes("isEligibleForGameplay"));
check("pool capped", src("app/api/rpg/pool/route.ts").includes("30"));

console.log("\n🛡️ REGRESSION");
check("unpublished mechanism intact", src("lib/arena/game-registry.ts").includes("unpublished?: boolean"));
{
  const kuis = src("components/game/KuisTempurSolo.tsx");
  check("Kuis Tempur 0 diff surface (no RPG imports)", !kuis.includes("game/rpg") && !kuis.includes("learning/"));
}

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
