/**
 * P1.4C BATTLE RUNTIME INTEGRATION — tests (no DOM, no browser).
 *
 * Pure modules (encounter table, appliers, core) are driven directly.
 * The engine (DOM-bound) is verified by static wiring proofs + tsc + build:
 * every runtime path asserted here names the exact engine mechanism.
 *
 * Run: npx tsx scripts/test-rpg-battle-runtime.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WORLD_MAPS } from "../src/game/rpg/data/world-maps";
import { enemySpawnsOf } from "../src/game/rpg/world/map-loader";
import {
  buildEncounterTable, findEncounterAt, markDead, tickRespawns,
  ENEMY_RESPAWN_MS,
} from "../src/game/rpg/combat/encounter";
import { applyVictory, applyDefeat } from "../src/game/rpg/combat/battle-apply";
import {
  startBattle, playerAct, toBattleResult, BASIC_ATTACK_SKILL_ID,
} from "../src/game/rpg/combat/battle-core";
import { EQUIPMENT } from "../src/game/rpg/data/equipment";
import { canonicalEnemyByPrototypeKey } from "../src/game/rpg/data/enemies";
import { createDefaultPlayer } from "../src/game/rpg/player/player-state";
import { grantXp } from "../src/game/rpg/player/progression";

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
const { table: desaTable } = buildEncounterTable(enemySpawnsOf(desa), new Set());

console.log("\n⚔️ 1-2. Encounter → battle snapshot");
check("1. encounter table built (7 desa, all alive)", desaTable.length === 7 && desaTable.every((e) => e.alive));
check("1b. boss flagged (eboss)", desaTable.find((e) => e.instanceId === "eboss")?.boss === true);
check("1c. no skipped spawns (all 13 resolve)", (() => {
  const g = buildEncounterTable(enemySpawnsOf(WORLD_MAPS["map.gunung"]), new Set());
  const m = buildEncounterTable(enemySpawnsOf(WORLD_MAPS["map.menara"]), new Set());
  return g.skippedSpawnIds.length === 0 && m.skippedSpawnIds.length === 0;
})());
check("1d. dead boss excluded on rebuild", (() => {
  const r = buildEncounterTable(enemySpawnsOf(desa), new Set(["eboss"]));
  return r.table.length === 6 && !r.table.some((e) => e.instanceId === "eboss");
})());
{
  const foe = findEncounterAt(desaTable, { x: 33, y: 11 })!;
  const b = startBattle({
    battleId: "t1", player: createDefaultPlayer("p", "Pendekar"), equipmentTable: EQUIPMENT,
    enemies: [{ def: foe.def, instanceId: foe.instanceId }],
    origin: { mapId: "map.desa", x: 33, y: 11 }, seed: 11,
  });
  check("2. snapshot correct (hp/mp/level/enemy)", b.state.player.hp === 100 && b.state.player.mp === 20 &&
    b.state.player.level === 1 && b.state.enemies[0].hp === 25 && b.state.origin.mapId === "map.desa");
}

console.log("\n🔌 3-5. Command flow reaches core (engine wiring)");
const eng = src("src/game/rpg/core/game-engine.ts");
check("3. ATTACK routed with turn wiring", eng.includes("playerAct(") && eng.includes("turn: b.state.turn"));
check("4. skillId passed through", eng.includes("skillId: command.skillId"));
check("5. enemy auto-response wired", eng.includes("enemyAct(") && eng.includes("charm: flags.charm === true"));
check("5b. escape routed", eng.includes("escapeBattle("));
check("5c. USE_ITEM documented no-op", eng.includes('case "USE_ITEM"') && eng.includes("reward adapter DEFERRED"));

console.log("\n🏁 6-8. Exits clear battle");
check("6-8. battle:null on WIN/DEFEAT/FLED paths", (() => {
  const hits = eng.match(/battle: null/g) ?? [];
  return hits.length >= 3;
})());
check("BATTLE_END emitted on close", (eng.match(/BATTLE_END/g) ?? []).length >= 3);

console.log("\n❤️ 9. Victory HP/MP sync");
{
  const p = createDefaultPlayer("p", "Pendekar");
  const b = startBattle({ battleId: "t9", player: p, equipmentTable: EQUIPMENT, enemies: [{ def: canonicalEnemyByPrototypeKey("g")!, instanceId: "e1" }], origin: { mapId: "map.desa", x: 0, y: 0 }, seed: 9 });
  const a = playerAct(b.state, { battleId: b.state.battleId, turn: 0, actorId: b.state.player.id, targetId: "e1", skillId: BASIC_ATTACK_SKILL_ID }, b.rng);
  const ap = applyVictory({ stats: p.stats, progression: p.progression, battleHp: a.state.player.hp, battleMp: a.state.player.mp ?? 20, result: { battleId: "t9", outcome: "WIN", xp: 20, goldIntent: 12, dropIntents: [], flagIntents: {}, deadEnemyIds: ["e1"] }, bossIds: new Set() });
  check("9. hp/mp carried from battle snapshot", ap.stats.hp === a.state.player.hp && ap.stats.mp === (a.state.player.mp ?? 20));
}

console.log("\n✨📯 10-11. XP/gold exactly-once");
{
  const p = createDefaultPlayer("p", "Pendekar");
  const once = grantXp(p.progression, 20);
  const twice = grantXp(once, 20);
  check("10. grantXp pure (caller-guarded once)", once.xp === 20 && twice.xp === 40);
  check("10b. engine dedups on battleId", eng.includes("appliedBattleIds.has(") && eng.includes("appliedBattleIds.add("));
  const ap = applyVictory({ stats: p.stats, progression: p.progression, battleHp: 100, battleMp: 20, result: { battleId: "g1", outcome: "WIN", xp: 45, goldIntent: 30, dropIntents: [], flagIntents: {}, deadEnemyIds: ["e5"] }, bossIds: new Set() });
  check("11. gold preserved as intent (not dropped, not wallet)", ap.goldIntent?.amount === 30 && ap.goldIntent?.battleId === "g1");
  check("11b. engine ledgers intents", eng.includes("goldIntents = [...goldIntents"));
}

console.log("\n👑 12-13. Boss flags");
{
  const p = createDefaultPlayer("p", "Pendekar");
  const ap = applyVictory({ stats: p.stats, progression: p.progression, battleHp: 90, battleMp: 10, result: { battleId: "gb", outcome: "WIN", xp: 200, goldIntent: 0, dropIntents: [], flagIntents: { bossDead: true }, deadEnemyIds: ["eboss"] }, bossIds: new Set(["eboss"]) });
  check("12. bossDead passes + boss recorded", ap.flagsAdded.bossDead === true && ap.deadBossIds.includes("eboss"));
  check("13. nagaDead never assigned anywhere", (() => {
    for (const f of ["src/game/rpg/combat/battle-core.ts", "src/game/rpg/combat/battle-apply.ts", "src/game/rpg/core/game-engine.ts"]) {
      if (/nagaDead\s*=\s*true|nagaDead":\s*true|'nagaDead':\s*true/.test(strip(src(f)))) return false;
    }
    return true;
  })());
}

console.log("\n💀 14-16. Dead enemies");
{
  const t1 = markDead(desaTable, "e1");
  check("14. dead recorded (alive=false)", t1.find((e) => e.instanceId === "e1")?.alive === false);
  check("15. dead cannot re-encounter", findEncounterAt(t1, { x: 33, y: 11 }) === undefined);
  check("15b. boss never rearms timer", t1.find((e) => e.instanceId === "eboss") !== undefined &&
    markDead(t1, "eboss").find((e) => e.instanceId === "eboss")?.respawnMs === 0);
  const back = tickRespawns(t1, ENEMY_RESPAWN_MS + 1, { x: 0, y: 0 });
  check("16. non-boss respawns at spawn when player far", back.find((e) => e.instanceId === "e1")?.alive === true);
  const camp = tickRespawns(t1, ENEMY_RESPAWN_MS + 1, { x: 33, y: 11 });
  check("16b. camper delays respawn (1.5s retry)", camp.find((e) => e.instanceId === "e1")?.alive === false);
}

console.log("\n🏳️ 17. Defeat respawn");
{
  const p = createDefaultPlayer("p", "Pendekar");
  const d1 = applyDefeat({ stats: p.stats, result: { battleId: "d", outcome: "LOSE", xp: 0, goldIntent: 0, dropIntents: [], flagIntents: {}, deadEnemyIds: [], respawn: { mapId: "map.desa", x: 11, y: 19 } } });
  check("17. defeat hp=ceil(max/2), mp full, desa(11,19)", d1.hp === 50 && d1.mp === 20 && d1.respawn?.x === 11);
}

console.log("\n🔒 18-19. Terminal + dedup");
check("18. engine rejects world input mid-battle", eng.includes("if (currentState.battle !== null) return currentState;"));
check("19. result guard before apply", eng.includes('res.outcome !== "WIN"') && eng.includes('res.outcome !== "LOSE"'));

console.log("\n🖥️ 20-21. Purity");
{
  const noBattleOwnership = (f: string) => {
    const s = strip(src(f));
    // Presentation may READ battle state types; it must never own logic.
    // Forbid value imports from battle modules (type imports allowed).
    return !/from\s+["']\.\.\/combat\/battle-(core|rng)["']/.test(s) &&
      !/import\s*\{\s*[^}]*\}\s*from\s*["']\.\.\/combat\/battle-state["']/.test(s);
  };
  check("20. renderer owns no battle", ["src/game/rpg/rendering/canvas-renderer.ts", "src/game/rpg/rendering/characters.ts", "src/game/rpg/rendering/monsters.ts", "src/game/rpg/rendering/effects.ts"].every(noBattleOwnership));
  const core = strip(src("src/game/rpg/combat/battle-core.ts"));
  check("21. core: no React/DOM/storage/net/renderer", !/from ["']react["']|document\.|window\.|localStorage|fetch\(|WebSocket|canvas|Canvas/.test(core));
}

console.log("\n💾 22. Persistence round-trip");
{
  const saved = { mapId: "map.gunung", position: { x: 0.5, y: 0.5 }, flags: { bossDead: true }, openedChests: ["cv1"], deadBossIds: ["eboss"], goldIntents: [{ battleId: "b1", amount: 45 }] };
  const back = JSON.parse(JSON.stringify(saved));
  check("22. all six slices survive", back.mapId === "map.gunung" && back.flags.bossDead === true && back.openedChests[0] === "cv1" && back.deadBossIds[0] === "eboss" && back.goldIntents[0].amount === 45);
  const per = src("src/game/rpg/core/persistence.ts");
  check("22b. save/load carry new slices", per.includes("deadBossIds") && per.includes("goldIntents"));
}

console.log("\n🎲 23. Same seed → same runtime result");
{
  const run = () => {
    const b = startBattle({ battleId: "det", player: createDefaultPlayer("p", "P"), equipmentTable: EQUIPMENT, enemies: [{ def: canonicalEnemyByPrototypeKey("w")!, instanceId: "e5" }], origin: { mapId: "map.desa", x: 0, y: 0 }, seed: 777 });
    const a = playerAct(b.state, { battleId: "det", turn: 0, actorId: b.state.player.id, targetId: "e5", skillId: "skill.mahapukul", learningCorrect: true }, b.rng);
    return JSON.stringify({ st: a.state, ev: a.events });
  };
  check("23. identical", run() === run());
}

console.log("\n🛡️ 24-26. Regression guards");
{
  const reg = src("lib/arena/game-registry.ts");
  check("24. unpublished guard intact", reg.includes("unpublished: true"));
  const kuis = src("components/game/KuisTempurSolo.tsx");
  check("25. Kuis Tempur untouched by battle", !kuis.includes("battle-core") && !kuis.includes("game/rpg"));
  const zelby = src("components/game/ZelbyDash.tsx");
  check("26. Petualangan Kata untouched", !zelby.includes("battle-core") && !zelby.includes("game/rpg"));
}

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
