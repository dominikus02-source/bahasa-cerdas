/**
 * P1.8A LEARNING INTEGRATION CONTRACT — tests (no DOM, no browser).
 *
 * Proves: canonical source identified, adapter deterministic, no duplicate
 * schema/validator, challenge/evaluation/effect contracts, battle boundary
 * intact, curriculum mapping, security shape, persistence posture.
 *
 * Run: npx tsx scripts/test-rpg-learning-contract.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  adaptSoalToChallenge, toClientChallenge, domainForSkillTag, difficultyFor,
  challengeIdFor, gameQuestionToSoalLike,
} from "../src/game/rpg/learning/rpg-challenge";
import { evaluateAnswer, normalizeAnswer } from "../src/game/rpg/learning/rpg-evaluator";
import {
  resolveLearningEffect, applySubmission, DEFAULT_LEARNING_POLICY,
} from "../src/game/rpg/learning/learning-effect";
import { validateQuestion } from "../lib/game-questions/validator";
import { defaultLearningEffectMapper } from "../src/game/rpg/combat/battle-engine";

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
  id: "soal-001", kodeSoal: "BC-SINONIM-0001", text: "Manakah sinonim kata 'bahagia'?",
  type: "PILIHAN_GANDA", options: ["sedih", "senang", "marah", "takut"],
  correctAnswer: "senang", explanation: "Bahagia bersinonim senang.",
  difficulty: "MEDIUM", topik: "sinonim", kompetensi: "Memahami makna kata",
  KD: "3.1", kelas: "VII", skillTag: "sinonim",
};

console.log("\n🏛️ ARCHITECTURE (1-4)");
check("1. canonical source = Prisma Soal + GameQuestion contract", (() => {
  const schema = src("prisma/schema.prisma");
  const gq = src("lib/game-questions/types.ts");
  return schema.includes("model Soal {") && schema.includes("correctAnswer") &&
    gq.includes("interface GameQuestion");
})());
check("2. adapter deterministic (same twice)", JSON.stringify(adaptSoalToChallenge(SOAL, "BATTLE")) ===
  JSON.stringify(adaptSoalToChallenge(SOAL, "BATTLE")));
check("3. no duplicate question schema in RPG", (() => {
  const s = strip(src("src/game/rpg/learning/rpg-challenge.ts"));
  return !/interface\s+(Soal|Question)\s*\{/.test(s);
})());
check("4. no duplicate validator (reuses canonical)", (() => {
  const files = ["src/game/rpg/learning/rpg-challenge.ts", "src/game/rpg/learning/rpg-evaluator.ts", "src/game/rpg/learning/learning-effect.ts"];
  return files.every((f) => !/function validateQuestion/.test(strip(src(f))));
})());

console.log("\n🧩 CHALLENGE (5-8)");
{
  const c = adaptSoalToChallenge(SOAL, "BATTLE")!;
  check("5. valid challenge (identity/domain/prompt)", c.challengeId === "soal:soal-001:battle" && c.domain === "KOSAKATA" && c.prompt.length > 0);
  check("6. invalid content → undefined", adaptSoalToChallenge({ ...SOAL, text: "  " }, "BATTLE") === undefined &&
    adaptSoalToChallenge({ ...SOAL, correctAnswer: "" }, "BATTLE") === undefined);
  check("7. stable identity per context", challengeIdFor("x", "BATTLE") !== challengeIdFor("x", "QUEST") &&
    challengeIdFor("x", "BATTLE") === challengeIdFor("x", "BATTLE"));
  check("8. context preserved", adaptSoalToChallenge(SOAL, "BOSS")!.context === "BOSS");
  check("8b. answer stripped client-side", !("answer" in toClientChallenge(c)));
  check("8c. GameQuestion bridge works", gameQuestionToSoalLike({ id: "g1", question: "Apa sinonim bahagia?", options: ["sedih", "senang"], correctAnswer: "senang" }).id === "g1");
}

console.log("\n⚖️ EVALUATION (9-13)");
{
  const c = adaptSoalToChallenge(SOAL, "BATTLE")!;
  check("9. correct (case/space tolerant)", evaluateAnswer(c, "  SENANG ").signal === "CORRECT");
  check("10. incorrect", evaluateAnswer(c, "sedih").signal === "INCORRECT");
  check("11. deterministic", JSON.stringify(evaluateAnswer(c, "senang")) === JSON.stringify(evaluateAnswer(c, "senang")));
  check("12. invalid answer rejected", evaluateAnswer(c, "   ").invalid === true && evaluateAnswer(c, null).score === 0);
  check("13. no RPG mutation (pure check)", (() => {
    const before = JSON.stringify(c);
    evaluateAnswer(c, "senang");
    return JSON.stringify(c) === before;
  })());
  check("13b. canonical validator still gates content", validateQuestion({ id: "g1", question: SOAL.text, options: SOAL.options, correctAnswer: SOAL.correctAnswer }).status === "ACTIVE");
}

console.log("\n✨ EFFECT (14-17)");
{
  const c = adaptSoalToChallenge(SOAL, "BATTLE")!;
  const good = evaluateAnswer(c, "senang");
  const bad = evaluateAnswer(c, "sedih");
  const e1 = resolveLearningEffect(good);
  const e2 = resolveLearningEffect(bad);
  check("14. correct signal → bonus", e1.kind === "BONUS_DAMAGE" && e1.multiplier === 1.5);
  check("15. incorrect → normal, non-punitive", e2.kind === "NORMAL_DAMAGE" && e2.multiplier === 1);
  check("15b. policy equivalence with canonical mapper",
    defaultLearningEffectMapper({ challengeId: "x", playerId: "p", correct: true, timeMs: 0 }).multiplier === DEFAULT_LEARNING_POLICY.correctMultiplier &&
    defaultLearningEffectMapper({ challengeId: "x", playerId: "p", correct: false, timeMs: 0 }).multiplier === DEFAULT_LEARNING_POLICY.incorrectMultiplier);
  check("16. absent effect preserves baseline (mult 1)", resolveLearningEffect(bad).multiplier === 1);
  check("17. no constants outside policy", !/1\.5/.test(strip(src("src/game/rpg/learning/learning-effect.ts")).replace("correctMultiplier: 1.5", "").replace("incorrectMultiplier: 1", "")));
}

console.log("\n⚔️ BATTLE (18-21)");
{
  const core = strip(src("src/game/rpg/combat/battle-core.ts"));
  check("18. effect reaches existing boundary (learningCorrect param)", core.includes("learningCorrect"));
  check("19. battle formula untouched", core.includes("VARIANCE_MIN") && core.includes("CRIT_CHANCE_BASE"));
  check("20. RNG untouched", core.includes("rngNext"));
  const c = adaptSoalToChallenge(SOAL, "BATTLE")!;
  const rec: Record<string, ReturnType<typeof evaluateAnswer>> = {};
  const sub = { challengeId: c.challengeId, attemptId: "a1", answer: "senang" };
  const r1 = applySubmission(rec, sub, () => evaluateAnswer(c, sub.answer));
  const r2 = applySubmission(r1.record, sub, () => evaluateAnswer(c, "sedih"));
  check("21. duplicate submission: stored eval, applied:false", r1.outcome.applied === true && r2.outcome.applied === false &&
    r2.outcome.evaluation.signal === "CORRECT");
}

console.log("\n📚 CURRICULUM (22-24)");
check("22. domain mapping (skillTag→domain)", domainForSkillTag("sinonim") === "KOSAKATA" && domainForSkillTag("ejaan") === "EJAAN" &&
  domainForSkillTag("tata-bahasa") === "STRUKTUR_KALIMAT" && domainForSkillTag("pemahaman") === "PEMAHAMAN_TEKS");
check("22b. unknown tags preserved raw", JSON.stringify(domainForSkillTag("pantun")) === JSON.stringify({ other: "pantun" }));
check("23. difficulty mapping (VERY_HARD→HARD)", difficultyFor("VERY_HARD") === "HARD" && difficultyFor("MUDAH") === "EASY" && difficultyFor("xyz") === "MEDIUM");
check("24. curriculum metadata preserved", (() => {
  const c = adaptSoalToChallenge(SOAL, "QUEST")!;
  return c.curriculum.topik === "sinonim" && c.curriculum.kd === "3.1" && c.curriculum.kelas === "VII";
})());

console.log("\n🔒 SECURITY (25-27)");
check("25. client cannot author correctness (no answer client-side)", (() => {
  const c = adaptSoalToChallenge(SOAL, "BATTLE")!;
  const client = toClientChallenge(c);
  return !("answer" in client) && evaluateAnswer(c, "senang").signal === "CORRECT";
})());
check("26. challenge identity required", (() => {
  try { applySubmission({}, { challengeId: "", attemptId: "a", answer: "x" }, () => { throw new Error("must not evaluate"); }); return false; }
  catch { return true; }
})());
check("27. attempt identity required", (() => {
  try { applySubmission({}, { challengeId: "c", attemptId: "", answer: "x" }, () => { throw new Error("must not evaluate"); }); return false; }
  catch { return true; }
})());

console.log("\n💾 PERSISTENCE (28-29)");
check("28. learning attempts transient by design (no save fields)", !/attemptId|LearningEvaluation/.test(strip(src("src/game/rpg/core/persistence.ts"))));
check("29. transient UI not persisted (no challenge in save)", !/challengeId/.test(strip(src("src/game/rpg/core/persistence.ts"))));

console.log("\n🛡️ REGRESSION (30-37)");
check("30-37a. unpublished mechanism intact", src("lib/arena/game-registry.ts").includes("unpublished?: boolean"));
{
  const kuis = src("components/game/KuisTempurSolo.tsx");
  check("30-37b. Kuis decoupled", !kuis.includes("learning/") && !kuis.includes("game/rpg"));
  const zelby = src("components/game/ZelbyDash.tsx");
  check("30-37c. Zelby decoupled", !zelby.includes("learning/") && !zelby.includes("game/rpg"));
  const files = ["src/game/rpg/learning/rpg-challenge.ts", "src/game/rpg/learning/rpg-evaluator.ts", "src/game/rpg/learning/learning-effect.ts"];
  check("30-37d. no React/DOM/storage/network/renderer", files.every((f) => {
    const s = strip(src(f));
    return !/from ["']react["']|document\.|window\.|localStorage|fetch\(|WebSocket|canvas/i.test(s);
  }));
}

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
