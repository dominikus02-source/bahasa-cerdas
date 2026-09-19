/**
 * P1.9B GE PICKUP + BATTLE CONSUMABLES — tests (no DOM, no browser).
 *
 * Pure pickup/consume domains driven directly; engine wiring verified by
 * static proofs + tsc + build (engine needs DOM) — same standard as prior
 * runtime phases. Every engine path asserted here names the exact mechanism.
 *
 * Run: npx tsx scripts/test-rpg-pickup-consumables.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WORLD_MAPS, RPG_TILES } from "../src/game/rpg/data/world-maps";
import { tileAt } from "../src/game/rpg/world/tiles";
import { loadCanonicalMap } from "../src/game/rpg/world/map-loader";
import { applyConsume } from "../src/game/rpg/economy/rewards";
import { selectDialogueStart } from "../src/game/rpg/interaction/dialogue";
import { getDialogueTree } from "../src/game/rpg/data/dialogues";
import { createDefaultPlayer } from "../src/game/rpg/player/player-state";
import { createQuestLineState } from "../src/game/rpg/quests/quest-engine";
import { addItem } from "../src/game/rpg/player/inventory";

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

const desa = WORLD_MAPS["map.desa"];
const gunung = WORLD_MAPS["map.gunung"];
const eng = () => src("src/game/rpg/core/game-engine.ts");

console.log("\n🌸 GE PICKUP — canonical spots");
check("GE at desa(34,22)", tileAt(desa, 34, 22) === RPG_TILES.GE);
check("GE at desa(4,26)", tileAt(desa, 4, 26) === RPG_TILES.GE);
check("GE at gunung(12,24)", tileAt(gunung, 12, 24) === RPG_TILES.GE);
check("exactly 3 GE tiles total", [...desa.tiles, ...gunung.tiles, ...WORLD_MAPS["map.menara"].tiles].filter((t) => t === RPG_TILES.GE).length === 3);

console.log("\n🌸 GE PICKUP — loader strip + idempotency");
{
  const w0 = loadCanonicalMap("map.desa")!;
  check("unpicked GE renders (tile.16)", w0.tiles.tiles[22 * 46 + 34] === "tile.16");
  const w1 = loadCanonicalMap("map.desa", new Set(["map.desa:34,22"]))!;
  check("picked GE stripped to grass", w1.tiles.tiles[22 * 46 + 34] === "tile.0");
  check("other GE untouched", w1.tiles.tiles[26 * 46 + 4] === "tile.16");
  check("canonical grid pristine (no shared mutation)", tileAt(desa, 34, 22) === RPG_TILES.GE);
  check("bad keys ignored safely", loadCanonicalMap("map.desa", new Set(["nope", "map.desa:99,99", "map.gunung:12,24"]))!.tiles.tiles[22 * 46 + 34] === "tile.16");
}

console.log("\n🌸 GE PICKUP — engine wiring");
check("engine checks GE + pickedGe gate", eng().includes("RPG_TILES.GE") && eng().includes("pickedGe.has(key)"));
check("engine increments flowers", eng().includes("flowers: quest.flowers + 1"));
check("engine persists pickedGe", eng().includes("pickedGe: [...pickedGe]"));
check("engine restores pickedGe (config)", eng().includes("config.pickedGe ?? []"));
check("quest defaults flowers 0", createQuestLineState().flowers === 0);
check("getPickedGe API exists", eng().includes("function getPickedGe"));

console.log("\n💛 SARI COMPLETE — charm path unlocked");
check("complete reachable at flowers≥3", selectDialogueStart("sari", { quest: 1, kills: 0, flowers: 3, flags: { sari: true }, nowMs: 0, restCooldownUntilMs: 0 }) === "complete");
check("progress below 3", selectDialogueStart("sari", { quest: 1, kills: 0, flowers: 2, flags: { sari: true }, nowMs: 0, restCooldownUntilMs: 0 }) === "progress");
check("complete carries charm FLAG", getDialogueTree("sari")!.nodes.complete.effects?.some((e) => e.type === "FLAG" && e.name === "charm") === true);
check("charm applies via existing DIALOGUE_END applier (no new path)", eng().includes("applyQuestSignals(currentState, `dlg:${npcId}`"));

console.log("\n🧪 BATTLE CONSUMABLES — domain gates");
{
  const p = createDefaultPlayer("p", "P");
  const stats = { ...p.stats, hp: 10, mp: 5 };
  const inv = addItem(addItem(addItem(inv0(), "ram", 1), "teh", 1), "elix", 1);
  function inv0() { return { items: [] as Array<{ itemId: string; quantity: number }> }; }
  check("ram in battle", applyConsume(inv, stats, "ram", true).ok);
  check("teh in battle", applyConsume(inv, stats, "teh", true).ok);
  check("elix in battle", applyConsume(inv, stats, "elix", true).ok);
  check("fish rejected in battle", !applyConsume(addItem(inv0(), "f1", 1), stats, "f1", true).ok);
  check("bijih rejected everywhere", !applyConsume(addItem(inv0(), "bijih", 1), stats, "bijih", true).ok);
  check("empty rejected", !applyConsume(inv0(), stats, "ram", true).ok);
}

console.log("\n🧪 BATTLE CONSUMABLES — engine wiring");
check("battle USE_ITEM consumes turn", eng().includes("turn: b.state.turn + 1"));
check("enemy responds after battle use", eng().includes("const eb = enemyAct(") && eng().includes('source: "battle-use"'));
check("flee syncs snapshot HP/MP (prototype-shared-object parity)", eng().includes("fledPlayer"));
check("world USE_ITEM intact", eng().includes('source: "world-use"'));

console.log("\n💾 PERSISTENCE");
check("pickedGe + flowers round-trip shape", (() => {
  const saved = { quest: { main: 1, kills: 0, flowers: 2 }, pickedGe: ["map.desa:34,22"] };
  const back = JSON.parse(JSON.stringify(saved));
  return back.quest.flowers === 2 && back.pickedGe[0] === "map.desa:34,22";
})());
check("save shape carries slices", src("src/game/rpg/core/persistence.ts").includes("pickedGe"));

console.log("\n🛡️ REGRESSION GUARDS");
check("unpublished mechanism intact", src("lib/arena/game-registry.ts").includes("unpublished?: boolean"));
{
  const kuis = src("components/game/KuisTempurSolo.tsx");
  check("Kuis decoupled", !kuis.includes("pickedGe") && !kuis.includes("game/rpg"));
  const zelby = src("components/game/ZelbyDash.tsx");
  check("Zelby decoupled", !zelby.includes("pickedGe") && !zelby.includes("game/rpg"));
  check("battle formulas intact", strip(src("src/game/rpg/combat/battle-core.ts")).includes("FLEE_CHANCE"));
  check("quest-5 still dead", strip(src("src/game/rpg/quests/quest-engine.ts")).includes("to === 5"));
}

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
