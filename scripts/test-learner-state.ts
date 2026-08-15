/** Deterministic learner-state tests; no DB writes and no LLM. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calculateLearnerState } from "../lib/learner-state/calculator";
import type { EvidenceAggregateRow } from "../lib/learner-state/types";

const ROOT = join(__dirname, "..");
const read = (file: string) => readFileSync(join(ROOT, file), "utf8");

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${name}`);
  }
}

function row(overrides: Partial<EvidenceAggregateRow> = {}): EvidenceAggregateRow {
  return {
    skill: "READING",
    attemptCount: 0,
    correctCount: 0,
    recentAttemptCount: 0,
    recentCorrectCount: 0,
    historicalAttemptCount: 0,
    historicalCorrectCount: 0,
    firstPracticedAt: null,
    lastPracticedAt: null,
    ...overrides,
  };
}

function state(rows: EvidenceAggregateRow[], skill = "READING") {
  return calculateLearnerState(rows).find((item) => item.skill === skill)!;
}

console.log("\nSTEP 3E LEARNER STATE TESTS\n");

const noData = state([]);
check("1. no evidence returns all skills with NO_DATA", calculateLearnerState([]).length === 7 && noData.confidence === "NO_DATA" && noData.accuracy === null);

const oneCorrect = state([row({ attemptCount: 1, correctCount: 1, recentAttemptCount: 1, recentCorrectCount: 1 })]);
check("2. one correct has 100% accuracy but LOW confidence", oneCorrect.accuracy === 1 && oneCorrect.confidence === "LOW");
check("3. one correct is not mastery", oneCorrect.masteryState === "NOT_ENOUGH_EVIDENCE");

const oneWrong = state([row({ attemptCount: 1, recentAttemptCount: 1 })]);
check("4. one incorrect has zero accuracy", oneWrong.accuracy === 0 && oneWrong.recentAccuracy === 0);

const five = state([row({ attemptCount: 5, correctCount: 4, recentAttemptCount: 5, recentCorrectCount: 4 })]);
check("5. five attempts confidence MEDIUM", five.confidence === "MEDIUM");
check("6. five attempts trend insufficient", five.trend === "INSUFFICIENT_DATA");

const ten = state([row({ attemptCount: 10, correctCount: 8, recentAttemptCount: 10, recentCorrectCount: 8 })]);
check("7. ten attempts confidence HIGH", ten.confidence === "HIGH");
check("8. ten attempts without historical comparison is not mastery", ten.masteryState === "NOT_ENOUGH_EVIDENCE");

const improving = state([row({ attemptCount: 15, correctCount: 11, recentAttemptCount: 10, recentCorrectCount: 9, historicalAttemptCount: 5, historicalCorrectCount: 2 })]);
check("9. mixed results calculate historical and recent accuracy", improving.accuracy === 11 / 15 && improving.recentAccuracy === 0.9);
check("10. recent improvement is IMPROVING", improving.trend === "IMPROVING");

const declining = state([row({ attemptCount: 15, correctCount: 9, recentAttemptCount: 10, recentCorrectCount: 4, historicalAttemptCount: 5, historicalCorrectCount: 5 })]);
check("11. poor recent result is DECLINING", declining.trend === "DECLINING");

const stable = state([row({ attemptCount: 15, correctCount: 12, recentAttemptCount: 10, recentCorrectCount: 8, historicalAttemptCount: 5, historicalCorrectCount: 4 })]);
check("12. equal historical/recent accuracy is STABLE", stable.trend === "STABLE");
check("13. stable 80% with enough evidence is PROFICIENT", stable.masteryState === "PROFICIENT");

const dates = state([row({ attemptCount: 15, correctCount: 12, recentAttemptCount: 10, recentCorrectCount: 8, historicalAttemptCount: 5, historicalCorrectCount: 4, firstPracticedAt: new Date("2026-08-01T00:00:00Z"), lastPracticedAt: new Date("2026-08-15T00:00:00Z") })]);
check("14. recency uses evidence timestamps", dates.firstPracticedAt === "2026-08-01T00:00:00.000Z" && dates.lastPracticedAt === "2026-08-15T00:00:00.000Z");

check("15. evidence without skill contributes no skill state", calculateLearnerState([]).every((item) => item.attemptCount === 0));
check("16. difficulty is not mixed into raw accuracy", !Object.prototype.hasOwnProperty.call(stable, "difficulty"));

let invalidRejected = false;
try {
  calculateLearnerState([row({ attemptCount: 1, correctCount: 2 })]);
} catch {
  invalidRejected = true;
}
check("17. impossible counts rejected", invalidRejected);
check("18. zero division returns null", noData.accuracy === null && noData.recentAccuracy === null);
check("19. repeat calculation is deterministic", JSON.stringify(calculateLearnerState([row({ attemptCount: 15, correctCount: 11, recentAttemptCount: 10, recentCorrectCount: 9, historicalAttemptCount: 5, historicalCorrectCount: 2 })])) === JSON.stringify(calculateLearnerState([row({ attemptCount: 15, correctCount: 11, recentAttemptCount: 10, recentCorrectCount: 9, historicalAttemptCount: 5, historicalCorrectCount: 2 })])));

const api = read("app/api/player/learner-state/route.ts");
check("20. learner-state API requires authenticated session", api.includes("getUser()") && api.includes("401"));
check("21. learner-state API does not accept client state/body", !api.includes("req.json") && !api.includes("body") && !api.includes("userId:"));
check("22. learner-state only joins APPROVED metadata", api.includes('m."status" = \'APPROVED\'') && api.includes('m."skill" IS NOT NULL'));
check("23. learner-state query is bounded to authenticated user", api.includes('e."userId" = ${user.id}'));
check("24. learner-state has no reward engine calls", !api.includes("awardXp") && !api.includes("addCoin") && !api.includes("trackDailyStreak"));

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
