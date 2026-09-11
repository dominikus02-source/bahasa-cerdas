/**
 * P1.4B BATTLE CORE — deterministic tests (no DOM, no browser).
 *
 * Covers: creation, damage, skill, enemy action, escape, lifecycle,
 * idempotency, 100-iteration determinism, reward boundary, boss flags
 * (incl. nagaDead NEVER set), regression guards.
 *
 * Run: npx tsx scripts/test-rpg-battle-core.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RPGPlayerState } from "../src/game/rpg/player/player-state";
import { createDefaultPlayer } from "../src/game/rpg/player/player-state";
import { EQUIPMENT } from "../src/game/rpg/data/equipment";
import { CANONICAL_ENEMIES } from "../src/game/rpg/data/enemies";
import type { RPGEnemyDefinition } from "../src/game/rpg/data/enemies";
import { createBattle } from "../src/game/rpg/combat/battle-state";
import {
  startBattle, playerAct, enemyAct, escapeBattle, toBattleResult,
  resolveCombatStats, snapshotPlayer, BASIC_ATTACK_SKILL_ID,
  FLEE_CHANCE, FLAG_INTENT_NAGA_NOTE,
} from "../src/game/rpg/combat/battle-core";
import { createBattleRng, rngNext } from "../src/game/rpg/combat/battle-rng";
import { computeDamage } from "../src/game/rpg/combat/battle-engine";

const ROOT = process.cwd();
let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`); }
}

function makePlayer(level = 1, mp = 20): RPGPlayerState {
  const p = createDefaultPlayer("player.test", "Pendekar");
  p.progression.level = level;
  p.stats.mp = mp;
  return p;
}

function defOf(key: string): RPGEnemyDefinition {
  const d = CANONICAL_ENEMIES.find((e) => e.prototypeKey === key);
  if (!d) throw new Error(`missing canonical enemy ${key}`);
  return d;
}

function startKorog(seed = 7) {
  return startBattle({
    player: makePlayer(),
    equipmentTable: EQUIPMENT,
    enemies: [{ def: defOf("g"), instanceId: "e1" }],
    origin: { mapId: "map.desa", x: 33, y: 11 },
    seed,
  });
}

/** Drive a full battle: player basic-attacks, first alive enemy responds. */
function fightToEnd(seed: number, enemyKey = "g", level = 1) {
  const battleId = `test-battle-${seed}-${enemyKey}`;
  let { state, rng } = startBattle({
    battleId,
    player: makePlayer(level),
    equipmentTable: EQUIPMENT,
    enemies: [{ def: defOf(enemyKey), instanceId: "e1" }],
    origin: { mapId: "map.desa", x: 0, y: 0 },
    seed,
  });
  const events: unknown[] = [];
  let guard = 0;
  while (state.result === undefined && guard++ < 300) {
    const target = state.enemies.find((e) => e.hp > 0)!;
    const a = playerAct(state, {
      battleId: state.battleId, turn: state.turn, actorId: state.player.id,
      targetId: target.id, skillId: BASIC_ATTACK_SKILL_ID,
    }, rng);
    if (!a.ok) break;
    state = a.state; rng = a.rng; events.push(...a.events);
    if (state.result !== undefined) break;
    const foe = state.enemies.find((e) => e.hp > 0)!;
    const b = enemyAct(state, {
      battleId: state.battleId, turn: state.turn, actorId: foe.id, enemyId: foe.id,
    }, rng);
    if (!b.ok) break;
    state = b.state; rng = b.rng; events.push(...b.events);
  }
  return { state, rng, events };
}

console.log("\n⚔️ Creation");
{
  const { state, events } = startKorog();
  check("valid Korog battle (CHALLENGE, turn 0)", state.phase === "CHALLENGE" && state.turn === 0);
  check("BATTLE_START emitted", events.some((e) => e.type === "BATTLE_START"));
  check("snapshot isolation (player untouched)", (() => {
    const p = makePlayer();
    const before = JSON.stringify(p);
    startBattle({ player: p, equipmentTable: EQUIPMENT, enemies: [{ def: defOf("g"), instanceId: "e1" }], origin: { mapId: "map.desa", x: 0, y: 0 }, seed: 1 });
    return JSON.stringify(p) === before;
  })());
  const boss = startBattle({ player: makePlayer(), equipmentTable: EQUIPMENT, enemies: [{ def: defOf("b"), instanceId: "eboss" }], origin: { mapId: "map.desa", x: 0, y: 0 }, seed: 2 });
  check("valid boss battle (boss flag on actor)", boss.state.enemies[0].boss === true);
  const empty = startBattle({ player: makePlayer(), equipmentTable: EQUIPMENT, enemies: [], origin: { mapId: "map.desa", x: 0, y: 0 }, seed: 3 });
  const atk = playerAct(empty.state, { battleId: empty.state.battleId, turn: 0, actorId: empty.state.player.id, targetId: "nope", skillId: BASIC_ATTACK_SKILL_ID }, empty.rng);
  check("empty list: action rejected TARGET_MISSING", !atk.ok && atk.reason === "TARGET_MISSING");
  const bad = enemyAct(empty.state, { battleId: empty.state.battleId, turn: 0, actorId: "x", enemyId: "nope" }, empty.rng);
  check("invalid enemy rejected", !bad.ok && bad.reason === "TARGET_MISSING");
}

console.log("\n💥 Damage");
check("baseline semantic max(1, base+atk-def)", computeDamage({ id: "a", name: "a", hp: 10, maxHp: 10, attack: 1, defense: 0 }, { id: "b", name: "b", hp: 10, maxHp: 10, attack: 0, defense: 999 }, { baseDamage: 0 }).damage === 1);
{
  const { state, rng } = startKorog(11);
  const r = playerAct(state, { battleId: state.battleId, turn: 0, actorId: state.player.id, targetId: "e1", skillId: BASIC_ATTACK_SKILL_ID }, rng);
  check("basic attack resolves, damage >= 1", r.ok && (r.events[0] as { damage: number }).damage >= 1);
  let min = Infinity;
  for (let s = 0; s < 30; s++) {
    const b = startKorog(s);
    const rr = playerAct(b.state, { battleId: b.state.battleId, turn: 0, actorId: b.state.player.id, targetId: "e1", skillId: BASIC_ATTACK_SKILL_ID }, b.rng);
    if (rr.ok) min = Math.min(min, (rr.events[0] as { damage: number }).damage);
  }
  check("damage floor 1 across seeds", min >= 1);
  const seen = new Set<number>();
  for (let s = 0; s < 30; s++) {
    const b = startKorog(s);
    const rr = playerAct(b.state, { battleId: b.state.battleId, turn: 0, actorId: b.state.player.id, targetId: "e1", skillId: BASIC_ATTACK_SKILL_ID }, b.rng);
    if (rr.ok) seen.add((rr.events[0] as { damage: number }).damage);
  }
  check("variance exists (seeded spread)", seen.size > 1);
}

console.log("\n✨ Skill");
{
  const { state, rng } = startKorog(21);
  const r = playerAct(state, { battleId: state.battleId, turn: 0, actorId: state.player.id, targetId: "e1", skillId: "skill.mahapukul" }, rng);
  check("valid skill (maha, MP 20→12)", r.ok && r.state.player.mp === 12);
  const bad = playerAct(state, { battleId: state.battleId, turn: 0, actorId: state.player.id, targetId: "e1", skillId: "skill.nope" }, rng);
  check("invalid skill → SKILL_MISSING", !bad.ok && bad.reason === "SKILL_MISSING");
  const locked = playerAct(state, { battleId: state.battleId, turn: 0, actorId: state.player.id, targetId: "e1", skillId: "skill.tebas-angin" }, rng);
  check("locked skill (angin needs 5) → SKILL_LOCKED", !locked.ok && locked.reason === "SKILL_LOCKED");
  const poor = startBattle({ player: makePlayer(1, 0), equipmentTable: EQUIPMENT, enemies: [{ def: defOf("g"), instanceId: "e1" }], origin: { mapId: "map.desa", x: 0, y: 0 }, seed: 21 });
  const nomp = playerAct(poor.state, { battleId: poor.state.battleId, turn: 0, actorId: poor.state.player.id, targetId: "e1", skillId: "skill.mahapukul" }, poor.rng);
  check("insufficient MP → INSUFFICIENT_MP", !nomp.ok && nomp.reason === "INSUFFICIENT_MP");
  const dead = playerAct(state, { battleId: state.battleId, turn: 0, actorId: state.player.id, targetId: "ghost", skillId: BASIC_ATTACK_SKILL_ID }, rng);
  check("dead/missing target → TARGET_MISSING", !dead.ok);
  const intro = createBattle(state.player, state.enemies);
  const wp = playerAct(intro, { battleId: intro.battleId, turn: 0, actorId: state.player.id, targetId: state.enemies[0].id, skillId: BASIC_ATTACK_SKILL_ID }, rng);
  check("wrong phase (INTRO) → PHASE_CLOSED", !wp.ok && wp.reason === "PHASE_CLOSED");
  const hi = startBattle({ player: makePlayer(8), equipmentTable: EQUIPMENT, enemies: [{ def: defOf("g"), instanceId: "e1" }], origin: { mapId: "map.desa", x: 0, y: 0 }, seed: 22 });
  const api = playerAct(hi.state, { battleId: hi.state.battleId, turn: 0, actorId: hi.state.player.id, targetId: "e1", skillId: "skill.api-suci" }, hi.rng);
  check("unlocked skill at level 8 (api)", api.ok && api.state.player.mp === 0);
}

console.log("\n👹 Enemy action");
{
  const { state, rng } = startKorog(31);
  const a = playerAct(state, { battleId: state.battleId, turn: 0, actorId: state.player.id, targetId: "e1", skillId: BASIC_ATTACK_SKILL_ID }, rng);
  const hpBefore = a.state.player.hp;
  const b = enemyAct(a.state, { battleId: a.state.battleId, turn: a.state.turn, actorId: "e1", enemyId: "e1" }, a.rng);
  check("enemy hits back deterministically", b.ok && b.state.player.hp < hpBefore);
  const again = enemyAct(b.state, { battleId: b.state.battleId, turn: b.state.turn, actorId: "nope", enemyId: "e1" }, b.rng);
  check("wrong actor rejected", !again.ok && again.reason === "WRONG_ACTOR");
  // boss special reachability: sweep seeds, some hit must exceed non-special ceiling
  const bossAtk = 14, playerDef = 5;
  const ceiling = Math.round(Math.max(1, bossAtk - playerDef) * 1.15);
  let maxSeen = 0;
  for (let s = 0; s < 300; s++) {
    const bb = startBattle({ player: makePlayer(), equipmentTable: EQUIPMENT, enemies: [{ def: defOf("b"), instanceId: "eb" }], origin: { mapId: "map.desa", x: 0, y: 0 }, seed: s });
    const pa = playerAct(bb.state, { battleId: bb.state.battleId, turn: 0, actorId: bb.state.player.id, targetId: "eb", skillId: BASIC_ATTACK_SKILL_ID }, bb.rng);
    if (!pa.ok) continue;
    const eb = enemyAct(pa.state, { battleId: pa.state.battleId, turn: pa.state.turn, actorId: "eb", enemyId: "eb" }, pa.rng);
    if (eb.ok) maxSeen = Math.max(maxSeen, (eb.events[0] as { damage: number }).damage);
  }
  check(`boss special reachable (max ${maxSeen} > ceiling ${ceiling})`, maxSeen > ceiling);
}

console.log("\n🏃 Escape");
{
  // find success + failure seeds
  let okSeed = -1, failSeed = -1;
  for (let s = 0; s < 300 && (okSeed < 0 || failSeed < 0); s++) {
    const b = startKorog(s);
    const r = escapeBattle(b.state, { battleId: b.state.battleId, turn: 0, actorId: b.state.player.id }, b.rng);
    if (!r.ok) continue;
    if (r.state.result === "FLED" && okSeed < 0) okSeed = s;
    if (r.state.result === undefined && failSeed < 0) failSeed = s;
  }
  check("escape success seed exists (60% gate)", okSeed >= 0);
  check("escape failure seed exists", failSeed >= 0);
  if (okSeed >= 0) {
    const b = startKorog(okSeed);
    const r = escapeBattle(b.state, { battleId: b.state.battleId, turn: 0, actorId: b.state.player.id }, b.rng);
    check("success → FLED, no damage", r.ok && r.state.result === "FLED");
    check("FLED result assemblable", toBattleResult(r.state)?.outcome === "FLED");
  }
  if (failSeed >= 0) {
    const b = startKorog(failSeed);
    const r = escapeBattle(b.state, { battleId: b.state.battleId, turn: 0, actorId: b.state.player.id }, b.rng);
    check("failure → turn consumed, battle continues", r.ok && r.state.result === undefined && r.state.turn === 1);
  }
  const boss = startBattle({ player: makePlayer(), equipmentTable: EQUIPMENT, enemies: [{ def: defOf("b"), instanceId: "eb" }], origin: { mapId: "map.desa", x: 0, y: 0 }, seed: 5 });
  const noflee = escapeBattle(boss.state, { battleId: boss.state.battleId, turn: 0, actorId: boss.state.player.id }, boss.rng);
  check("boss flee rejected", !noflee.ok && noflee.reason === "FLEE_FORBIDDEN_BOSS");
}

console.log("\n🏁 Lifecycle");
{
  const f = fightToEnd(42);
  check("WIN path completes", f.state.result === "WIN" && f.state.phase === "VICTORY");
  const res = toBattleResult(f.state)!;
  check("WIN xp = 20 (Korog)", res.xp === 20);
  check("deadEnemyIds complete", res.deadEnemyIds.length === 1);
  // DEFEAT: hp 1 player vs RAJA
  const weak = makePlayer();
  weak.stats.hp = 1;
  let d = startBattle({ player: weak, equipmentTable: EQUIPMENT, enemies: [{ def: defOf("b"), instanceId: "eb" }], origin: { mapId: "map.desa", x: 41, y: 8 }, seed: 9 });
  let st = d.state, rg = d.rng;
  const pa = playerAct(st, { battleId: st.battleId, turn: st.turn, actorId: st.player.id, targetId: "eb", skillId: BASIC_ATTACK_SKILL_ID }, rg);
  st = pa.state; rg = pa.rng;
  const ea = enemyAct(st, { battleId: st.battleId, turn: st.turn, actorId: "eb", enemyId: "eb" }, rg);
  check("DEFEAT path (1 HP vs RAJA)", ea.ok && ea.state.result === "LOSE" && ea.state.phase === "DEFEAT");
  const dr = toBattleResult(ea.state)!;
  check("defeat respawn desa(11,19)", dr.respawn?.mapId === "map.desa" && dr.respawn?.x === 11 && dr.respawn?.y === 19);
  check("defeat yields no xp", dr.xp === 0);
}

console.log("\n🔁 Idempotency");
{
  const { state, rng } = startKorog(55);
  const cmd = { battleId: state.battleId, turn: 0, actorId: state.player.id, targetId: "e1", skillId: BASIC_ATTACK_SKILL_ID };
  const first = playerAct(state, cmd, rng);
  const second = playerAct(first.state, cmd, first.rng);
  check("resubmit (same battleId+turn+actor) → STALE_TURN", first.ok && !second.ok && second.reason === "STALE_TURN");
  check("rejection mutates nothing", JSON.stringify(second.state) === JSON.stringify(first.state));
}

console.log("\n🎲 Determinism ×100");
{
  const run = (seed: number) => JSON.stringify(fightToEnd(seed));
  const ref = run(99);
  let same = true;
  for (let i = 0; i < 100; i++) {
    if (run(99) !== ref) { same = false; break; }
  }
  check("100 identical replays, identical output", same);
  check("different seed may differ", run(99) !== run(100));
  // rng cursor purity
  const r0 = createBattleRng(5);
  const d1 = rngNext(r0);
  const d2 = rngNext(r0);
  check("cursor immutable (same input → same draw)", d1.value === d2.value && r0.count === 0);
  check("draws advance counter", d1.rng.count === 1 && rngNext(d1.rng).rng.count === 2);
}

console.log("\n🎁 Reward boundary");
{
  const f = fightToEnd(42);
  const res = toBattleResult(f.state)!;
  check("intent only (xp/gold, no inventory write)", res.goldIntent === 12 && res.dropIntents.length === 0);
  check("toBattleResult null mid-battle", (() => {
    const b = startKorog(1);
    return toBattleResult(b.state) === null;
  })());
}

console.log("\n👑 Boss / quest flags");
{
  // One-shot killer (level-1 stats can't fell 160 HP legitimately in-test).
  const killer = makePlayer();
  killer.stats.attack = 200;
  let { state, rng } = startBattle({
    battleId: "test-raja", player: killer, equipmentTable: EQUIPMENT,
    enemies: [{ def: defOf("b"), instanceId: "eb" }],
    origin: { mapId: "map.desa", x: 41, y: 10 }, seed: 77,
  });
  const a = playerAct(state, { battleId: state.battleId, turn: 0, actorId: state.player.id, targetId: "eb", skillId: BASIC_ATTACK_SKILL_ID }, rng);
  const res = toBattleResult(a.state);
  check("RAJA victory → bossDead intent", a.ok && res?.flagIntents.bossDead === true);
  check("NAGA ABU victory sets NO nagaDead", (() => {
    // simulate: na actor dead
    const b = startBattle({ player: makePlayer(30), equipmentTable: EQUIPMENT, enemies: [{ def: defOf("na"), instanceId: "na1" }], origin: { mapId: "map.gunung", x: 20, y: 4 }, seed: 4 });
    // force-kill via repeated max-damage loop is slow (420hp); check intent fn via finished state instead:
    const dead: typeof b.state.enemies = b.state.enemies.map((e) => ({ ...e, hp: 0 }));
    const done = { ...b.state, enemies: dead, result: "WIN" as const, phase: "VICTORY" as const };
    const r = toBattleResult(done)!;
    return !("nagaDead" in r.flagIntents) && typeof FLAG_INTENT_NAGA_NOTE === "string";
  })());
}

console.log("\n🧰 Snapshot / equipment");
{
  const p = makePlayer();
  const s = snapshotPlayer(p, EQUIPMENT);
  check("snapshot carries mp/level", s.mp === 20 && s.level === 1);
  const armed: RPGPlayerState = { ...p, equipment: { weaponId: "equip.keris-singa", armorId: "equip.baju-tenun", accessoryId: null } };
  const r = resolveCombatStats({ attack: 10, defense: 5 }, armed.equipment, EQUIPMENT);
  check("equipment resolver sums modifiers (10+4 / 5+3)", r.attack === 14 && r.defense === 8);
  const unk = resolveCombatStats({ attack: 10, defense: 5 }, { weaponId: "equip.nope", armorId: null, accessoryId: null }, EQUIPMENT);
  check("unknown ids ignored", unk.attack === 10 && unk.defense === 5);
}

console.log("\n🛡️ Regression guards");
{
  const stripComments = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
  const core = stripComments(readFileSync(join(ROOT, "src/game/rpg/combat/battle-core.ts"), "utf8"));
  const rngSrc = stripComments(readFileSync(join(ROOT, "src/game/rpg/combat/battle-rng.ts"), "utf8"));
  check("no Math.random() calls in core/rng", !/Math\.random\s*\(/.test(core) && !/Math\.random\s*\(/.test(rngSrc));
  check("no Date in core", !core.includes("Date.now"));
  const eng = readFileSync(join(ROOT, "src/game/rpg/core/game-engine.ts"), "utf8");
  check("P1.3 engine untouched by battle (no battle imports)", !eng.includes("battle-core") && !eng.includes("battle-rng"));
  const ws = readFileSync(join(ROOT, "src/game/rpg/world/world-step.ts"), "utf8");
  check("world-step untouched", !ws.includes("battle"));
  const reg = readFileSync(join(ROOT, "lib/arena/game-registry.ts"), "utf8");
  check("unpublished guard intact", reg.includes("unpublished: true"));
  const kuis = readFileSync(join(ROOT, "components/game/KuisTempurSolo.tsx"), "utf8");
  check("Kuis Tempur decoupled", !kuis.includes("battle-core") && !kuis.includes("game/rpg"));
}
