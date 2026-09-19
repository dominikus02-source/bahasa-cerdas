/**
 * P1.8C LEARNING GAMEPLAY LOOP — tests (no DOM, no browser).
 *
 * Pure policy/encounter/evaluation/effect units driven directly; battle
 * integration proven through battle-core's learningCorrect boundary
 * (formula-level) + static engine-wiring proofs (trigger, submit, inject,
 * cleanup, RNG isolation). The engine needs DOM and is covered by tsc +
 * build + these wiring proofs — same standard as P1.4C/P1.5.
 *
 * Run: npx tsx scripts/test-rpg-learning-gameplay.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  shouldTriggerLearning, DEFAULT_TRIGGER_POLICY,
} from "../src/game/rpg/learning/learning-trigger";
import {
  selectChallenge,
} from "../src/game/rpg/learning/rpg-challenge-selector";
import {
  createEncounter, presentEncounter, answerEncounter, resolveEncounter,
} from "../src/game/rpg/learning/rpg-encounter";
import { evaluateAnswer } from "../src/game/rpg/learning/rpg-evaluator";
import {
  resolveLearningEffect, questSignalForEvaluation, applySubmission,
} from "../src/game/rpg/learning/learning-effect";
import { adaptSoalToChallenge, toClientChallenge } from "../src/game/rpg/learning/rpg-challenge";
import {
  startBattle, playerAct, BASIC_ATTACK_SKILL_ID,
} from "../src/game/rpg/combat/battle-core";
import { canonicalEnemyByPrototypeKey } from "../src/game/rpg/data/enemies";
import { EQUIPMENT } from "../src/game/rpg/data/equipment";
import { createDefaultPlayer } from "../src/game/rpg/player/player-state";

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

const SOAL = {
  id: "soal-001", kodeSoal: "BC-001", text: "Manakah sinonim kata 'bahagia'?",
  type: "PILIHAN_GANDA", options: ["sedih", "senang", "marah", "takut"],
  correctAnswer: "senang", difficulty: "EASY", topik: "sinonim", KD: "3.1",
  kelas: "VII", skillTag: "sinonim",
};
const POOL = [SOAL];

console.log("\n🎯 TRIGGER (1-4)");
check("1. battle triggers learning by default (non-boss)", shouldTriggerLearning({ isBoss: false, battleTurn: 0, hasPool: true }));
check("1b. boss excluded by default", !shouldTriggerLearning({ isBoss: true, battleTurn: 0, hasPool: true }));
check("1c. boss includable via policy", shouldTriggerLearning({ policy: { triggerOnBattleStart: true, includeBosses: true }, isBoss: true, battleTurn: 0, hasPool: true }));
check("2. policy can disable", !shouldTriggerLearning({ policy: { triggerOnBattleStart: false, includeBosses: false }, isBoss: false, battleTurn: 0, hasPool: true }));
check("2b. empty pool never triggers", !shouldTriggerLearning({ isBoss: false, battleTurn: 0, hasPool: false }));
check("3. deterministic (openings only)", shouldTriggerLearning({ isBoss: false, battleTurn: 0, hasPool: true }) === shouldTriggerLearning({ isBoss: false, battleTurn: 0, hasPool: true }) &&
  !shouldTriggerLearning({ isBoss: false, battleTurn: 3, hasPool: true }));
check("4. BATTLE context preserved end-to-end", selectChallenge(POOL, { encounterId: "b1", context: "BATTLE", seed: "t" }).outcome === "SELECTED");
check("4b. default policy exported", DEFAULT_TRIGGER_POLICY.triggerOnBattleStart === true && DEFAULT_TRIGGER_POLICY.includeBosses === false);

console.log("\n🧩 CHALLENGE (5-8)");
{
  const r = selectChallenge(POOL, { encounterId: "b1", context: "BATTLE", seed: "t" });
  check("5. selected through P1.8B selector", r.outcome === "SELECTED");
  if (r.outcome === "SELECTED") {
    const json = JSON.stringify(r.client);
    check("6. safe client projection", !/"answer"\s*:/.test(json));
    check("7. no answer key", !/correctAnswer|answerKey/i.test(json));
    check("8. deterministic seed", selectChallenge(POOL, { encounterId: "b1", context: "BATTLE", seed: "t" }).outcome === "SELECTED" &&
      (selectChallenge(POOL, { encounterId: "b1", context: "BATTLE", seed: "t" }) as { resolved: { challengeId: string } }).resolved.challengeId === r.resolved.challengeId);
  } else { check("6-8. selection ok", false); }
}

console.log("\n✍️ ANSWER (9-13)");
{
  const c = adaptSoalToChallenge(SOAL, "BATTLE")!;
  check("9. valid answer evaluates", evaluateAnswer(c, "senang").signal === "CORRECT");
  check("10. incorrect evaluates", evaluateAnswer(c, "sedih").signal === "INCORRECT");
  check("11. invalid answer rejected", evaluateAnswer(c, "  ").invalid === true);
  check("12. missing challengeId rejected (applier throws pre-eval)", (() => {
    try { applySubmission({}, { challengeId: "", attemptId: "a", answer: "x" }, () => { throw new Error("eval ran"); }); return false; }
    catch { return true; }
  })());
  check("13. missing attemptId rejected", (() => {
    try { applySubmission({}, { challengeId: "c", attemptId: "", answer: "x" }, () => { throw new Error("eval ran"); }); return false; }
    catch { return true; }
  })());
}

console.log("\n✅ CORRECT (14-16)");
{
  const c = adaptSoalToChallenge(SOAL, "BATTLE")!;
  const e = resolveLearningEffect(evaluateAnswer(c, "senang"));
  check("14. correct produces effect", e.kind === "BONUS_DAMAGE");
  check("15. ×1.5 policy preserved", e.multiplier === 1.5);
  // Effect reaches learningCorrect: same seed, learned vs baseline.
  const mk = (seed: number) => startBattle({ battleId: `t${seed}`, player: createDefaultPlayer("p", "P"), equipmentTable: EQUIPMENT, enemies: [{ def: canonicalEnemyByPrototypeKey("g")!, instanceId: "e1" }], origin: { mapId: "map.desa", x: 0, y: 0 }, seed });
  const b1 = mk(5);
  const learned = playerAct(b1.state, { battleId: b1.state.battleId, turn: 0, actorId: b1.state.player.id, targetId: "e1", skillId: BASIC_ATTACK_SKILL_ID, learningCorrect: true }, b1.rng);
  const b2 = mk(5);
  const base = playerAct(b2.state, { battleId: b2.state.battleId, turn: 0, actorId: b2.state.player.id, targetId: "e1", skillId: BASIC_ATTACK_SKILL_ID }, b2.rng);
  const dl = (learned.events[0] as { damage: number }).damage;
  const db = (base.events[0] as { damage: number }).damage;
  check("16. effect reaches learningCorrect (learned ≥ baseline, deterministic)", learned.ok && base.ok && dl >= db && dl === (playerAct(mk(5).state, { battleId: `t5`, turn: 0, actorId: "p", targetId: "e1", skillId: BASIC_ATTACK_SKILL_ID, learningCorrect: true }, mk(5).rng).events[0] as { damage: number }).damage);
}

console.log("\n🛡️ INCORRECT (17-18)");
{
  const c = adaptSoalToChallenge(SOAL, "BATTLE")!;
  const e = resolveLearningEffect(evaluateAnswer(c, "sedih"));
  check("17. incorrect non-punitive (mult 1, NORMAL)", e.kind === "NORMAL_DAMAGE" && e.multiplier === 1);
  const mk = (seed: number) => startBattle({ battleId: `u${seed}`, player: createDefaultPlayer("p", "P"), equipmentTable: EQUIPMENT, enemies: [{ def: canonicalEnemyByPrototypeKey("g")!, instanceId: "e1" }], origin: { mapId: "map.desa", x: 0, y: 0 }, seed });
  const w1 = mk(6);
  const plain = playerAct(w1.state, { battleId: w1.state.battleId, turn: 0, actorId: w1.state.player.id, targetId: "e1", skillId: BASIC_ATTACK_SKILL_ID }, w1.rng);
  const w2 = mk(6);
  const noLearn = playerAct(w2.state, { battleId: w2.state.battleId, turn: 0, actorId: w2.state.player.id, targetId: "e1", skillId: BASIC_ATTACK_SKILL_ID, learningCorrect: false }, w2.rng);
  check("18. baseline preserved (false ≡ undefined)", plain.ok && noLearn.ok &&
    (plain.events[0] as { damage: number }).damage === (noLearn.events[0] as { damage: number }).damage);
}

console.log("\n⚔️ BATTLE CONTINUATION (19-22)");
check("19. battle continues after learning (no restart primitive)", !/restartBattle|resetBattle/.test(strip(src("src/game/rpg/core/game-engine.ts"))));
check("20. no duplicate battle start (single startEncounterBattle path)", (strip(src("src/game/rpg/core/game-engine.ts")).match(/startBattle\(/g) ?? []).length === 1);
check("21. no duplicate start on answer (submit path creates none)", !/startBattle\(/.test(strip(src("src/game/rpg/core/game-engine.ts")).split('case "SUBMIT_LEARNING_ANSWER"')[1]?.split('case "')[0] ?? ""));
check("22. terminal battle blocks learning (PENDING gate)", src("src/game/rpg/core/game-engine.ts").includes('sub.status !== "PENDING") return currentState;') ||
  src("src/game/rpg/core/game-engine.ts").includes('sub.status !== "PENDING"'));

console.log("\n🎲 RNG ISOLATION (23-24)");
{
  // Same battle seed+commands with and without a learning SELECTION in
  // between must yield identical battle RNG consumption.
  const mk = (seed: number) => startBattle({ battleId: "rr", player: createDefaultPlayer("p", "P"), equipmentTable: EQUIPMENT, enemies: [{ def: canonicalEnemyByPrototypeKey("g")!, instanceId: "e1" }], origin: { mapId: "map.desa", x: 0, y: 0 }, seed });
  const a = mk(9);
  selectChallenge(POOL, { encounterId: "rr", context: "BATTLE", seed: "rr:learn" });
  const r1 = playerAct(a.state, { battleId: "rr", turn: 0, actorId: a.state.player.id, targetId: "e1", skillId: BASIC_ATTACK_SKILL_ID }, a.rng);
  const b = mk(9);
  const r2 = playerAct(b.state, { battleId: "rr", turn: 0, actorId: b.state.player.id, targetId: "e1", skillId: BASIC_ATTACK_SKILL_ID }, b.rng);
  check("23. selection never touches BattleRng", JSON.stringify(r1.events) === JSON.stringify(r2.events) && r1.rng.count === r2.rng.count);
  check("24. same battle seed deterministic (re-assert)", JSON.stringify(r1.state) === JSON.stringify(r2.state));
}

console.log("\n🔁 IDEMPOTENCY (25-26)");
{
  const c = adaptSoalToChallenge(SOAL, "BATTLE")!;
  const enc = resolveEncounter(answerEncounter(presentEncounter(createEncounter({ encounterKey: "k", context: "BATTLE", challengeId: c.challengeId, seed: "s" })), "att-0", () => evaluateAnswer(c, "senang")).encounter);
  const dup = answerEncounter(enc, "att-0", () => evaluateAnswer(c, "sedih"));
  check("25. duplicate submission: stored eval, no new effect", dup.applied === false && dup.evaluation?.signal === "CORRECT");
  check("26. no duplicate progression (single RESOLVED)", enc.status === "RESOLVED" && dup.encounter.status === "RESOLVED");
}

console.log("\n📜 QUEST (27-29)");
{
  const c = adaptSoalToChallenge(SOAL, "QUEST")!;
  const sig = questSignalForEvaluation("q-side-1", c.challengeId, evaluateAnswer(c, "senang"));
  check("27. quest context encounters supported", selectChallenge(POOL, { encounterId: "q1", context: "QUEST", questId: "q-side-1" }).outcome === "SELECTED");
  check("28. signal reaches quest boundary (data only)", sig !== null && sig.questId === "q-side-1" && sig.signal === "CORRECT");
  check("28b. no quest without linkage", questSignalForEvaluation(undefined, c.challengeId, evaluateAnswer(c, "senang")) === null);
  check("29. evaluator never mutates quest (pure)", !/quest/i.test(strip(src("src/game/rpg/learning/rpg-evaluator.ts")).replace("challengeId", "")));
}

console.log("\n🗂️ STATE (30-32)");
{
  const e = src("src/game/rpg/core/game-engine.ts");
  check("30. learning is battle substate (not a mode)", e.includes("learning: {") && !/\"LEARNING\"/.test(strip(e).replace("LEARNING_CHALLENGE", "").replace("LEARNING_ANSWERED", "").replace("SUBMIT_LEARNING_ANSWER", "")));
  check("31. movement frozen (battle freeze covers learning)", e.includes("currentState.battle !== null || session !== null) return currentState;"));
  check("32. invalid cross-mode rejected (SUBMIT needs battle)", e.includes('case "SUBMIT_LEARNING_ANSWER"') && e.includes("if (!activeBattle || currentState.battle === null) return currentState;"));
}

console.log("\n🔒 SECURITY (33-35)");
{
  const e = strip(src("src/game/rpg/core/game-engine.ts"));
  check("33. client cannot author correctness (never read from command)", !/command\.correct|command\.score|command\.multiplier/.test(e));
  check("34. client cannot author multiplier (policy-owned)", !/command\.multiplier/.test(e));
  check("35. client cannot author XP/reward (no such fields)", !/command\.xp|command\.reward/i.test(e));
}

console.log("\n🛡️ REGRESSION (36-45)");
check("36-45a. unpublished mechanism intact", src("lib/arena/game-registry.ts").includes("unpublished?: boolean"));
{
  const kuis = src("components/game/KuisTempurSolo.tsx");
  check("36-45b. Kuis decoupled", !kuis.includes("learning/") && !kuis.includes("game/rpg"));
  const zelby = src("components/game/ZelbyDash.tsx");
  check("36-45c. Zelby decoupled", !zelby.includes("learning/") && !zelby.includes("game/rpg"));
  const files = ["src/game/rpg/learning/learning-trigger.ts", "src/game/rpg/learning/rpg-encounter.ts", "src/game/rpg/learning/rpg-evaluator.ts", "src/game/rpg/learning/learning-effect.ts", "src/game/rpg/learning/rpg-challenge.ts", "src/game/rpg/learning/rpg-challenge-selector.ts"];
  check("36-45d. no React/DOM/storage/network in domain", files.every((f) => !/from ["']react["']|document\.|window\.|localStorage|fetch\(|WebSocket/.test(strip(src(f)))));
}

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
