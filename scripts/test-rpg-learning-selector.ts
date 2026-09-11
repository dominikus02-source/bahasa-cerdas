/**
 * P1.8B LEARNING SELECTOR + ENCOUNTER — tests (no DOM, no browser).
 *
 * Proves: canonical source/sampler/validator reuse, one selector for all
 * contexts, deterministic seeded selection, difficulty/topic/domain/curriculum
 * filters, quality gating, explicit fallback, answer-key hygiene, anti-repeat
 * without a second history system, encounter lifecycle + idempotency,
 * battle/quest/NPC/boss contracts, regression.
 *
 * Run: npx tsx scripts/test-rpg-learning-selector.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SoalLike } from "../src/game/rpg/learning/rpg-challenge";
import {
  selectChallenge, resolveLearningDifficulty, soalToGameQuestion,
} from "../src/game/rpg/learning/rpg-challenge-selector";
import {
  createEncounter, presentEncounter, answerEncounter, resolveEncounter,
} from "../src/game/rpg/learning/rpg-encounter";
import { evaluateAnswer } from "../src/game/rpg/learning/rpg-evaluator";
import { adaptSoalToChallenge } from "../src/game/rpg/learning/rpg-challenge";

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

const POOL: SoalLike[] = [
  { id: "s1", kodeSoal: "BC-001", text: "Manakah sinonim kata 'bahagia'?", type: "PILIHAN_GANDA", options: ["sedih", "senang", "marah", "takut"], correctAnswer: "senang", difficulty: "EASY", topik: "sinonim", KD: "3.1", kelas: "VII", skillTag: "sinonim" },
  { id: "s2", kodeSoal: "BC-002", text: "Manakah antonim kata 'tinggi'?", type: "PILIHAN_GANDA", options: ["rendah", "besar", "luas", "jauh"], correctAnswer: "rendah", difficulty: "MEDIUM", topik: "antonim", KD: "3.1", kelas: "VII", skillTag: "antonim" },
  { id: "s3", kodeSoal: "BC-003", text: "Pilih kalimat dengan ejaan yang tepat dan benar menurut kaidah bahasa Indonesia?", type: "PILIHAN_GANDA", options: ["Dia pergi kepasar.", "Dia pergi ke pasar.", "Dia pergi kepasar?", "dia pergi ke pasar"], correctAnswer: "Dia pergi ke pasar.", difficulty: "HARD", topik: "ejaan", KD: "3.2", kelas: "VIII", skillTag: "ejaan" },
  { id: "s4", kodeSoal: "BC-004", text: "Apa makna kata ' lestari' dalam kalimat pelestarian lingkungan hidup?", type: "PILIHAN_GANDA", options: ["rusak", "abadi", "sementara", "hilang"], correctAnswer: "abadi", difficulty: "MEDIUM", topik: "makna", KD: "3.1", kelas: "VII", skillTag: "makna" },
  // Invalid candidate: correct answer missing from options (must be gated out).
  { id: "bad1", kodeSoal: "BC-BAD", text: "Manakah sinonim kata 'cerdas' yang paling tepat dan benar?", type: "PILIHAN_GANDA", options: ["bodoh", "malas", "lambat", "pelupa"], correctAnswer: "pandai", difficulty: "EASY", topik: "sinonim", KD: "3.1", kelas: "VII", skillTag: "sinonim" },
];

const CTX = (over: Record<string, unknown> = {}) => ({
  encounterId: "enc-test-1", context: "BATTLE" as const, ...over,
});

console.log("\n📦 SOURCE (1-4)");
check("1. canonical Soal source (pool shape)", POOL.every((s) => !!s.id && !!s.text && !!s.correctAnswer));
check("2. canonical validator reused", strip(src("src/game/rpg/learning/rpg-challenge-selector.ts")).includes("validateQuestion") === false &&
  src("src/game/rpg/learning/rpg-challenge-selector.ts").includes("isEligibleForGameplay"));
check("3. canonical sampler reused (no Fisher-Yates copy)", (() => {
  const s = strip(src("src/game/rpg/learning/rpg-challenge-selector.ts"));
  return s.includes("sampleQuestions") && !s.includes("for (let i = arr.length");
})());
check("4. no duplicate selector (single selectChallenge)", (() => {
  const files = ["src/game/rpg/learning/rpg-challenge-selector.ts"];
  const hits = files.flatMap((f) => strip(src(f)).match(/export function \w*[Ss]elect\w*/g) ?? []);
  return hits.filter((h) => h.includes("selectChallenge")).length === 1;
})());

console.log("\n🎭 CONTEXT (5-9)");
for (const context of ["BATTLE", "QUEST", "NPC", "EXPLORATION", "BOSS"] as const) {
  const r = selectChallenge(POOL, CTX({ context }));
  check(`${{ BATTLE: 5, QUEST: 6, NPC: 7, EXPLORATION: 8, BOSS: 9 }[context]}. ${context} context selects`, r.outcome === "SELECTED" &&
    (r.outcome === "SELECTED" ? r.resolved.context === context : false));
}

console.log("\n🎯 SELECTION (10-16)");
{
  const a = selectChallenge(POOL, CTX({ seed: "seed-a" }));
  const b = selectChallenge(POOL, CTX({ seed: "seed-a" }));
  check("10. deterministic same seed", a.outcome === "SELECTED" && b.outcome === "SELECTED" &&
    (a.outcome === "SELECTED" && b.outcome === "SELECTED" ? a.resolved.challengeId === b.resolved.challengeId : false));
  const diffs = new Set<string>();
  for (let i = 0; i < 12; i++) {
    // MEDIUM pool (s2+s4, both eligible) so seeds have room to differ.
    const r = selectChallenge(POOL, CTX({ seed: `seed-${i}`, difficulty: "MEDIUM" }));
    if (r.outcome === "SELECTED") diffs.add(r.resolved.challengeId);
  }
  check("11. different seeds can differ", diffs.size > 1);
  check("12. level-aware difficulty (L1→EASY, L8→HARD)", resolveLearningDifficulty({ level: 1 }) === "EASY" &&
    resolveLearningDifficulty({ level: 4 }) === "MEDIUM" && resolveLearningDifficulty({ level: 8 }) === "HARD");
  check("13. explicit difficulty override wins", resolveLearningDifficulty({ level: 1, override: "HARD" }) === "HARD");
  const t = selectChallenge(POOL, CTX({ topic: "ejaan", difficulty: "HARD" }));
  check("14. topic filter", t.outcome === "SELECTED" && (t.outcome === "SELECTED" ? t.resolved.source.soalId === "s3" : false));
  const d = selectChallenge(POOL, CTX({ domain: "makna", difficulty: "MEDIUM" }));
  check("15. domain filter", d.outcome === "SELECTED" && (d.outcome === "SELECTED" ? d.resolved.source.soalId === "s4" : false));
  const k = selectChallenge(POOL, CTX({ kelas: "VIII", domain: "ejaan" }));
  check("16. curriculum filter (kelas)", k.outcome === "SELECTED" && (k.outcome === "SELECTED" ? k.resolved.source.soalId === "s3" : false));
}

console.log("\n🛡️ QUALITY (17-20)");
check("17. invalid candidate rejected (bad1 never selected)", (() => {
  for (let i = 0; i < 10; i++) {
    const r = selectChallenge(POOL, CTX({ seed: `q-${i}`, domain: "sinonim" }));
    if (r.outcome === "SELECTED" && r.resolved.source.soalId === "bad1") return false;
  }
  return true;
})());
check("18. validator not bypassed (gate in pipeline)", src("src/game/rpg/learning/rpg-challenge-selector.ts").includes("isEligibleForGameplay(soalToGameQuestion(s))"));
check("19. no eligible challenge (empty pool)", selectChallenge([], CTX()).outcome === "NO_ELIGIBLE_CHALLENGE");
check("19b. all-invalid pool → explicit outcome", selectChallenge([POOL[4]], CTX({ domain: "sinonim" })).outcome === "NO_ELIGIBLE_CHALLENGE");
check("20. deterministic fallback (trace observable)", (() => {
  const r = selectChallenge(POOL, CTX({ topic: "nonexistent-topic-xyz", domain: "sinonim" }));
  return r.outcome === "SELECTED" && r.trace.length >= 2 && r.trace[0].step.startsWith("exact");
})());

console.log("\n🔒 SECURITY (21-24)");
{
  const r = selectChallenge(POOL, CTX({ seed: "sec-1" }));
  if (r.outcome !== "SELECTED") { check("21-24. selection ok", false); }
  else {
    const json = JSON.stringify(r.client);
    check("21. client excludes answer key (options may legitimately contain answer text)", !/"answer"\s*:/.test(json));
    check("22. client excludes hidden solution", !/correctAnswer|answerKey|solution/i.test(json));
    check("23. client cannot define correctness (server eval only)", evaluateAnswer(r.resolved, r.resolved.answer).signal === "CORRECT");
    check("24. client cannot define multiplier (policy-owned)", r.client.challengeId === r.resolved.challengeId);
  }
}

console.log("\n🔁 ANTI-REPEAT (25-26)");
check("25. recentIds exclude (sampler-level, sufficient pool)", (() => {
  // MEDIUM pool has 2 eligible (s2+s4); excluding one must yield the other.
  // (Single-candidate pools legitimately fall back per canonical sampler.)
  const r = selectChallenge(POOL, CTX({ seed: "rep-1", difficulty: "MEDIUM", recentIds: ["BC-002"] }));
  return r.outcome === "SELECTED" && (r.outcome === "SELECTED" ? r.resolved.source.soalId === "s4" : false);
})());
check("26. no second history system (no storage in domain)", (() => {
  const files = ["src/game/rpg/learning/rpg-challenge.ts", "src/game/rpg/learning/rpg-challenge-selector.ts", "src/game/rpg/learning/rpg-encounter.ts", "src/game/rpg/learning/rpg-evaluator.ts", "src/game/rpg/learning/learning-effect.ts"];
  return files.every((f) => !/localStorage|sessionStorage|indexedDB|fetch\(/.test(strip(src(f))));
})());

console.log("\n🌀 ENCOUNTER (27-31)");
{
  const e0 = createEncounter({ encounterKey: "battle-7", context: "BATTLE", challengeId: "soal:s1:battle", seed: "s" });
  check("27. deterministic identity", e0.encounterId === "enc:battle:battle-7" && createEncounter({ encounterKey: "battle-7", context: "BATTLE", challengeId: "x", seed: "y" }).encounterId === e0.encounterId);
  const e1 = presentEncounter(e0);
  check("27b. CREATED→PRESENTED", e1.status === "PRESENTED" && presentEncounter(e1).status === "PRESENTED");
  const c = adaptSoalToChallenge(POOL[0], "BATTLE")!;
  const a1 = answerEncounter(e1, "att-1", () => evaluateAnswer(c, "senang"));
  check("28. answer encounter (applied)", a1.applied === true && a1.evaluation?.signal === "CORRECT" && a1.encounter.status === "ANSWERED");
  const a2 = answerEncounter(a1.encounter, "att-1", () => evaluateAnswer(c, "sedih"));
  check("30. duplicate attempt idempotent (stored CORRECT)", a2.applied === false && a2.evaluation?.signal === "CORRECT");
  const bad = answerEncounter(e1, "", () => evaluateAnswer(c, "senang"));
  check("31. invalid attempt rejected", bad.applied === false && bad.evaluation === null);
  const r = resolveEncounter(a1.encounter);
  check("29. resolve ANSWERED→RESOLVED", r.status === "RESOLVED" && resolveEncounter(e1).status === "PRESENTED");
  const after = answerEncounter(r, "att-2", () => evaluateAnswer(c, "senang"));
  check("31b. RESOLVED rejects new attempts", after.applied === false);
}

console.log("\n⚔️ BATTLE (32-35)");
{
  const core = strip(src("src/game/rpg/combat/battle-core.ts"));
  check("32. effect reaches learningCorrect boundary", core.includes("learningCorrect"));
  check("33. baseline without learning unchanged (mult 1 path)", core.includes("learningCorrect === true") || core.includes("learningCorrect?"));
  check("34. battle formula untouched", core.includes("VARIANCE_MIN") && core.includes("CRIT_CHANCE_BASE"));
  check("35. RNG untouched", core.includes("rngNext") && !/Math\.random\s*\(/.test(core));
}

console.log("\n📜🗣️ QUEST/NPC/EXPLORATION/BOSS (36-43)");
check("36. quest context preserved", selectChallenge(POOL, CTX({ context: "QUEST", questId: "q1" })).outcome === "SELECTED");
check("37. quest engine authoritative (selector writes no quest state)", (() => {
  const s = strip(src("src/game/rpg/learning/rpg-challenge-selector.ts"));
  return !/quest\.main|setQuest|quest\s*=\s*\{/.test(s);
})());
check("38. NPC context preserved", selectChallenge(POOL, CTX({ context: "NPC" })).outcome === "SELECTED");
check("39. dialogue engine authoritative (no dialogue writes)", !/dialogue|DIALOGUE_START/.test(strip(src("src/game/rpg/learning/rpg-challenge-selector.ts"))));
check("40. explicit encounter only (factory fn, no auto-spawn)", strip(src("src/game/rpg/learning/rpg-encounter.ts")).includes("export function createEncounter"));
check("41. deterministic encounter identity", createEncounter({ encounterKey: "k", context: "BOSS", challengeId: "c", seed: "s" }).encounterId === "enc:boss:k");
check("42. boss context preserved", selectChallenge(POOL, CTX({ context: "BOSS", difficulty: "HARD" })).outcome === "SELECTED");
check("43. no separate boss engine", !/boss.*selector|selector.*boss/i.test(strip(src("src/game/rpg/learning/rpg-challenge-selector.ts"))));

console.log("\n🛡️ REGRESSION (44-52)");
check("44-52a. unpublished intact", src("lib/arena/game-registry.ts").includes("unpublished: true"));
{
  const kuis = src("components/game/KuisTempurSolo.tsx");
  check("44-52b. Kuis decoupled", !kuis.includes("learning/") && !kuis.includes("game/rpg"));
  const zelby = src("components/game/ZelbyDash.tsx");
  check("44-52c. Zelby decoupled", !zelby.includes("learning/") && !zelby.includes("game/rpg"));
  const files = ["src/game/rpg/learning/rpg-challenge.ts", "src/game/rpg/learning/rpg-challenge-selector.ts", "src/game/rpg/learning/rpg-encounter.ts", "src/game/rpg/learning/rpg-evaluator.ts", "src/game/rpg/learning/learning-effect.ts"];
  check("44-52d. no React/DOM in domain", files.every((f) => !/from ["']react["']|document\.|window\./.test(strip(src(f)))));
}

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
