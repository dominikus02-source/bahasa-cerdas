/**
 * P1.9A BATTLE LEARNING UX — tests (no DOM, no browser timing).
 *
 * Pure panel routing (battle-learning-view.ts) driven directly; component +
 * engine wiring verified by static proofs + tsc + build (engine needs DOM).
 * Every UI path asserted here names the exact mechanism.
 *
 * Run: npx tsx scripts/test-rpg-learning-ux.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveLearningPanel } from "../src/game/rpg/ui/battle-learning-view";

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

console.log("\n🖥️ PANEL ROUTING (pure)");
check("HIDDEN without battle", resolveLearningPanel({ inBattle: false, learningStatus: "PENDING", hasChallenge: true, hasFeedback: false }) === "HIDDEN");
check("A. PENDING renders challenge", resolveLearningPanel({ inBattle: true, learningStatus: "PENDING", hasChallenge: true, hasFeedback: false }) === "QUESTION");
check("A2. PENDING without challenge hides (data missing)", resolveLearningPanel({ inBattle: true, learningStatus: "PENDING", hasChallenge: false, hasFeedback: false }) === "HIDDEN");
check("E. RESOLVED+feedback → feedback", resolveLearningPanel({ inBattle: true, learningStatus: "RESOLVED", hasChallenge: false, hasFeedback: true }) === "FEEDBACK");
check("E2. RESOLVED consumed (no feedback) hides", resolveLearningPanel({ inBattle: true, learningStatus: "RESOLVED", hasChallenge: false, hasFeedback: false }) === "HIDDEN");
  check("F. feedback transition is pure (same twice)", resolveLearningPanel({ inBattle: true, learningStatus: "RESOLVED", hasChallenge: false, hasFeedback: true }) ===
    resolveLearningPanel({ inBattle: true, learningStatus: "RESOLVED", hasChallenge: false, hasFeedback: true }));

console.log("\n🔌 ENGINE WIRING (static proofs)");
{
  const e = strip(src("src/game/rpg/core/game-engine.ts"));
  check("B. submit routes SUBMIT pipeline", e.includes("submitLearningAnswer") && e.includes('type: "SUBMIT_LEARNING_ANSWER"'));
  check("C/D. evaluation server-side (pure submit pipeline, answer-only input)", e.includes("submitBattleAnswer({") && e.includes("answer: command.answer"));
  check("G. attack continuation routes ATTACK", e.includes("attackBasic") && e.includes('skillId: "basic"'));
  check("H. duplicate guarded (PENDING gate in SUBMIT)", e.includes('status !== "PENDING"'));
  check("I. terminal guarded (battle null / result checks)", e.includes("currentState.battle === null"));
  check("K. no client authority (projection only)", e.includes("toClientChallenge(") && !/command\.correct|command\.multiplier|command\.score/.test(e));
}

console.log("\n🧩 COMPONENT (static proofs)");
{
  const c = strip(src("src/game/rpg/ui/RPGBattleLearning.tsx"));
  check("buttons semantic (<button>)", (c.match(/<button/g) ?? []).length >= 2);
  check("J. touch targets ≥48px (min-h-12)", c.includes("min-h-12"));
  check("J2. no horizontal overflow (inset-x-0 + max-w-md)", c.includes("inset-x-0") && c.includes("max-w-md"));
  check("no answer key in component", !/correctAnswer|answerKey|multiplier|attemptId|challengeId/.test(c));
  check("feedback aria-live, no color-only (✓/! glyphs + text)", c.includes('aria-live="polite"') && c.includes("aria-hidden"));
  check("role=dialog + labels", c.includes('role="dialog"'));
  check("freeText input path exists", c.includes("<input") && c.includes("<form"));
  check("pure view helper used (no invented visibility)", c.includes("resolveLearningPanel"));
  check("props carry no authority (challenge/feedback/callbacks only)", !/getState|processCommand|setState/.test(c));
}

console.log("\n🎮 RPGGame INTEGRATION (static proofs)");
{
  const g = strip(src("src/game/rpg/ui/RPGGame.tsx"));
  check("polls engine snapshots (same 10Hz loop)", g.includes("getLearningChallenge()") && g.includes("getLearningFeedback()"));
  check("handlers delegate to engine", g.includes("submitLearningAnswer(") && g.includes("attackBasic("));
  check("overlay mounted over canvas", g.includes("<RPGBattleLearning"));
  check("no battle truth duplicated (no HP/XP/damage locals)", !/useState<(number|string)>/.test(g) && !/setHp|setDamage|setCorrect/.test(g));
}

console.log("\n🛡️ REGRESSION");
check("unpublished intact", src("lib/arena/game-registry.ts").includes("unpublished: true"));
{
  const kuis = src("components/game/KuisTempurSolo.tsx");
  check("Kuis Tempur untouched", !kuis.includes("RPGBattleLearning") && !kuis.includes("learning/") && !kuis.includes("game/rpg"));
}

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
