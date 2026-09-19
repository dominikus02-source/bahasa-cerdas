/**
 * P2.6C controlled vertical-slice contract tests.
 *
 * These prove the deterministic, non-DOM boundaries that connect the existing
 * engine. Browser authentication and local Supabase remain separate manual
 * preview prerequisites; this script never claims server-authoritative saves.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DESA_VERTICAL_SLICE, isDesaSliceEncounterId } from "../src/game/rpg/data/vertical-slice";
import { WORLD_MAPS } from "../src/game/rpg/data/world-maps";
import { canonicalEnemyByPrototypeKey } from "../src/game/rpg/data/enemies";
import { createQuestLineState, applyQuestNumber } from "../src/game/rpg/quests/quest-engine";
import { getDialogueTree } from "../src/game/rpg/data/dialogues";
import { collectSignals, selectDialogueStart, startDialogue } from "../src/game/rpg/interaction/dialogue";
import { resolveLearningEffect } from "../src/game/rpg/learning/learning-effect";
import { manifestLookup } from "../src/game/rpg/rendering/rpg-asset-manifest";

const ROOT = process.cwd();
let pass = 0;
let fail = 0;

function check(name: string, condition: boolean) {
  if (condition) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

function source(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

console.log("\n🗺️ P2.6C Desa scope");
const desa = WORLD_MAPS[DESA_VERTICAL_SLICE.mapId];
check("canonical Desa spawn is configured", desa.spawn.x === DESA_VERTICAL_SLICE.spawn.x && desa.spawn.y === DESA_VERTICAL_SLICE.spawn.y);
check("Ki Jaka is the only required NPC", DESA_VERTICAL_SLICE.questGiverId === "ki" && desa.npcSpawns.some((npc) => npc.id === "ki"));
check("exactly three regular Korog opportunities", DESA_VERTICAL_SLICE.encounterIds.length === 3 && new Set(DESA_VERTICAL_SLICE.encounterIds).size === 3 && DESA_VERTICAL_SLICE.encounterIds.every((id) => desa.enemySpawns.find((enemy) => enemy.id === id)?.type === "g"));
check("slice encounter guard rejects extra Desa enemies", isDesaSliceEncounterId("e1") && !isDesaSliceEncounterId("e4") && !isDesaSliceEncounterId("eboss"));

console.log("\n💬 Ki Jaka quest loop");
const ki = getDialogueTree("ki")!;
const intro = startDialogue("ki", 0, selectDialogueStart("ki", { quest: 0, kills: 0, flowers: 0, flags: {}, nowMs: 0, restCooldownUntilMs: 0 }))!;
const introSignals = collectSignals(ki, intro);
check("intro offers canonical quest and 30G", introSignals.some((effect) => effect.type === "QUEST" && effect.amount === 1) && introSignals.some((effect) => effect.type === "GOLD" && effect.amount === 30));
const afterAccept = applyQuestNumber(createQuestLineState(), 1, { quest: 0, kills: 0, flags: {} });
check("quest acceptance is deterministic", afterAccept.main === 1 && applyQuestNumber(afterAccept, 1, { quest: 1, kills: 0, flags: {} }).main === 1);
check("quest cannot complete before three wins", applyQuestNumber({ main: 1, kills: 2, flowers: 0 }, 2, { quest: 1, kills: 2, flags: {} }).main === 1);
check("three wins unlock Ki Jaka report", selectDialogueStart("ki", { quest: 1, kills: 3, flowers: 0, flags: {}, nowMs: 0, restCooldownUntilMs: 0 }) === "report");
const report = startDialogue("ki", 0, "report")!;
const reportSignals = collectSignals(ki, report);
check("report grants canonical quest transition and 60G", reportSignals.some((effect) => effect.type === "QUEST" && effect.amount === 2) && reportSignals.some((effect) => effect.type === "GOLD" && effect.amount === 60));

console.log("\n⚔️ Battle, learning, reward boundaries");
const korog = canonicalEnemyByPrototypeKey("g")!;
check("Korog uses existing canonical combat/reward values", korog.base.hp === 25 && korog.xp === 20 && korog.gold === 12);
check("correct learning answer has canonical combat consequence", resolveLearningEffect({ signal: "CORRECT" } as never).multiplier === 1.5);
check("incorrect learning answer remains a valid normal-damage outcome", resolveLearningEffect({ signal: "INCORRECT" } as never).multiplier === 1);
const engine = source("src/game/rpg/core/game-engine.ts");
check("engine filters slice encounter IDs and retains battle dedup", engine.includes("allowedEncounterIds") && engine.includes("appliedBattleIds.has(battle.battleId)"));
check("engine exposes canonical dialogue commands, not client quest writes", engine.includes("advanceActiveDialogue") && engine.includes("endActiveDialogue") && engine.includes("applyQuestSignals(currentState"));
check("preview interaction control dispatches the canonical INTERACT command", engine.includes('state = processCommand(state, { type: "INTERACT", playerId });'));

console.log("\n🥷 Approved visual and UI wiring");
check("only three approved Arga walk sheets are READY", ["down", "up", "side"].every((dir) => manifestLookup(`sheet-char-arga-walk-${dir}`)?.status === "READY"));
const renderer = source("src/game/rpg/rendering/canvas-renderer.ts");
check("renderer uses READY manifest locomotion and frame-zero idle fallback", renderer.includes('entry?.status === "READY"') && renderer.includes("frame 0") && renderer.includes("renderLiveEnemies"));
const gameUi = source("src/game/rpg/ui/RPGGame.tsx");
check("UI mounts dialogue, objective, and save checkpoints", gameUi.includes("<RPGDialogue") && gameUi.includes("<RPGQuestPanel") && gameUi.includes('engine.on("DIALOGUE_END", saveCheckpoint)'));
check("a save from another map cannot expand the controlled Desa slice", gameUi.includes("legacySave.world.mapId === mapId") && gameUi.includes("const bootMapId = mapId"));
check("slice published as premium-only (P2.8 launch)", source("lib/arena/game-registry.ts").includes("premiumOnly: true"));

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
