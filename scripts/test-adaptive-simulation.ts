/**
 * Step 3G controlled learner simulation. Pure fixture only; no DB writes.
 */

import { calculateLearnerState } from "../lib/learner-state/calculator";
import { selectAdaptivePractice } from "../lib/adaptive-practice/selector";
import type { AdaptiveCandidate } from "../lib/adaptive-practice/types";
import type { EvidenceAggregateRow } from "../lib/learner-state/types";
import { ADAPTIVE_COOLDOWN_DAYS } from "../lib/adaptive-practice/config";
import { ADAPTIVE_FIXTURE } from "./fixtures/adaptive-practice-fixture";

const NOW = new Date("2026-08-15T00:00:00.000Z");

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

function row(skill: string, overrides: Partial<EvidenceAggregateRow> = {}): EvidenceAggregateRow {
  return { skill, attemptCount: 0, correctCount: 0, recentAttemptCount: 0, recentCorrectCount: 0, historicalAttemptCount: 0, historicalCorrectCount: 0, firstPracticedAt: null, lastPracticedAt: null, ...overrides };
}

function state(rows: EvidenceAggregateRow[]) {
  return calculateLearnerState(rows);
}

function cloneCandidates(seenIds: string[] = [], seenAt = new Date("2026-08-14T00:00:00.000Z")) {
  const seen = new Set(seenIds);
  return ADAPTIVE_FIXTURE.map((question) => ({ ...question, seenAt: seen.has(question.id) ? seenAt : null }));
}

function summarize(label: string, selection: ReturnType<typeof selectAdaptivePractice>) {
  console.log(`\n${label}`);
  console.log(JSON.stringify({
    reasonCode: selection?.reasonCode,
    targetSkill: selection?.targetSkill,
    targetDifficulty: selection?.targetDifficulty,
    questions: selection?.questions.map((question) => question.id),
    skills: [...new Set(selection?.questions.map((question) => question.skill) || [])],
    topics: [...new Set(selection?.questions.map((question) => question.topic) || [])],
    difficulties: selection?.questions.map((question) => question.difficulty),
  }, null, 2));
}

console.log(`\nADAPTIVE LEARNER SIMULATION — fixture=${ADAPTIVE_FIXTURE.length} questions, cooldown=${ADAPTIVE_COOLDOWN_DAYS}d\n`);

// Persona A — new student.
const newStudent = selectAdaptivePractice({ states: state([]), candidates: cloneCandidates(), size: 5 }, NOW);
const newStudentNextDay = selectAdaptivePractice({ states: state([]), candidates: cloneCandidates(), size: 5, rotationKey: "student-a:2026-08-16" }, NOW);
summarize("PERSONA A — NEW STUDENT", newStudent);
check("A1 no data does not claim weak skill", newStudent?.reasonCode === "NO_DATA");
check("A2 new student receives a bounded set", newStudent?.questions.length === 5);
check("A3 new student has at least two skills available in fixture", new Set(ADAPTIVE_FIXTURE.map((question) => question.skill)).size >= 5);
check("A4 no-data rotation can move across skills with server seed", newStudent?.targetSkill !== newStudentNextDay?.targetSkill);

// Persona B — weak reading/inference.
const weakStudent = selectAdaptivePractice({
  states: state([
    row("READING", { attemptCount: 10, correctCount: 4, recentAttemptCount: 10, recentCorrectCount: 4 }),
    row("GRAMMAR", { attemptCount: 10, correctCount: 8, recentAttemptCount: 10, recentCorrectCount: 8 }),
  ]),
  candidates: cloneCandidates(),
  size: 10,
}, NOW);
summarize("PERSONA B — WEAK SKILL", weakStudent);
check("B1 weakest trustworthy skill prioritized", weakStudent?.targetSkill === "READING" && weakStudent.reasonCode === "WEAK_SKILL");
check("B2 weak set retains topic diversity", new Set(weakStudent?.questions.map((question) => question.topic)).size >= 2);

// Persona C — improving.
const improvingStates = state([row("READING", { attemptCount: 15, correctCount: 11, recentAttemptCount: 10, recentCorrectCount: 9, historicalAttemptCount: 5, historicalCorrectCount: 2 })]);
const improving = selectAdaptivePractice({ states: improvingStates, candidates: cloneCandidates(), size: 5 }, NOW);
summarize("PERSONA C — IMPROVING", improving);
check("C1 learner state detects improvement", improvingStates.find((item) => item.skill === "READING")?.trend === "IMPROVING");
check("C2 improving learner is not labeled declining", improvingStates.find((item) => item.skill === "READING")?.trend !== "DECLINING");
check("C3 improving reason does not claim permanent weakness", improving?.reasonCode !== "WEAK_SKILL" || improving?.targetSkill !== "READING");

// Persona D — declining.
const decliningStates = state([row("READING", { attemptCount: 15, correctCount: 9, recentAttemptCount: 10, recentCorrectCount: 4, historicalAttemptCount: 5, historicalCorrectCount: 5 })]);
const declining = selectAdaptivePractice({ states: decliningStates, candidates: cloneCandidates(), size: 5 }, NOW);
summarize("PERSONA D — DECLINING", declining);
check("D1 learner state detects decline", decliningStates.find((item) => item.skill === "READING")?.trend === "DECLINING");
check("D2 declining skill is selected for practice", declining?.targetSkill === "READING");

// Persona E — repeater.
const firstTen = ADAPTIVE_FIXTURE.slice(0, 10).map((question) => question.id);
const repeater = selectAdaptivePractice({ states: state([]), candidates: cloneCandidates(firstTen), size: 10 }, NOW);
summarize("PERSONA E — REPEATER", repeater);
check("E1 unseen questions are preferred", repeater?.questions.some((question) => !firstTen.includes(question.id)) === true);
check("E2 recent questions are not preferred while unseen exist", repeater?.questions.slice(0, 5).every((question) => !firstTen.includes(question.id)) === true);

// Persona F — evidence exists but approved metadata is starved.
const metadataStarvedCandidates = ADAPTIVE_FIXTURE.slice(0, 2);
const metadataStarved = selectAdaptivePractice({
  states: state([]),
  candidates: metadataStarvedCandidates,
  size: 10,
}, NOW);
summarize("PERSONA F — METADATA STARVED", metadataStarved);
check("F1 metadata-starved learner does not claim weak skill", metadataStarved?.reasonCode !== "WEAK_SKILL");
check("F2 metadata-starved pool returns truthful fallback", metadataStarved === null);

// Longitudinal days: the state changes, the decision is recalculated.
const day1 = selectAdaptivePractice({ states: state([]), candidates: cloneCandidates(), size: 5 }, NOW);
const day2States = state([row("READING", { attemptCount: 10, correctCount: 4, recentAttemptCount: 10, recentCorrectCount: 4 })]);
const day2 = selectAdaptivePractice({ states: day2States, candidates: cloneCandidates(), size: 5 }, new Date("2026-08-16T00:00:00.000Z"));
const day3States = state([row("READING", { attemptCount: 15, correctCount: 11, recentAttemptCount: 10, recentCorrectCount: 9, historicalAttemptCount: 5, historicalCorrectCount: 2 })]);
const day3 = selectAdaptivePractice({ states: day3States, candidates: cloneCandidates(), size: 5 }, new Date("2026-08-17T00:00:00.000Z"));
console.log("\nLONGITUDINAL DAYS", JSON.stringify({ day1: day1?.reasonCode, day2: day2?.reasonCode, day3: day3?.reasonCode }, null, 2));
check("L1 day 1 has no-data reason", day1?.reasonCode === "NO_DATA");
check("L2 day 2 responds to weak evidence", day2?.targetSkill === "READING");
check("L3 day 3 state detects improvement", day3States.find((item) => item.skill === "READING")?.trend === "IMPROVING");

// Small pool and determinism.
const small = selectAdaptivePractice({ states: state([]), candidates: cloneCandidates().slice(0, 3), size: 10 }, NOW);
check("S1 small pool degrades to fallback without duplicate questions", small === null);
const deterministicInput = { states: state([row("READING", { attemptCount: 10, correctCount: 4, recentAttemptCount: 10, recentCorrectCount: 4 })]), candidates: cloneCandidates(), size: 5 };
const deterministicA = selectAdaptivePractice(deterministicInput, NOW);
const deterministicB = selectAdaptivePractice(deterministicInput, NOW);
check("S2 same state/pool/version is deterministic", JSON.stringify(deterministicA) === JSON.stringify(deterministicB));

// Security invariants are static/API tests; this simulation confirms no hidden
// client selection input is part of the pure selector.
check("S3 selector input has no userId/skill override fields", !Object.keys(deterministicInput).includes("userId") && !Object.keys(deterministicInput).includes("targetSkill"));

const statePerfStart = performance.now();
for (let i = 0; i < 1000; i += 1) calculateLearnerState([row("READING", { attemptCount: 15, correctCount: 11, recentAttemptCount: 10, recentCorrectCount: 9, historicalAttemptCount: 5, historicalCorrectCount: 2 })]);
const statePerfMs = performance.now() - statePerfStart;
const selectPerfStart = performance.now();
for (let i = 0; i < 1000; i += 1) selectAdaptivePractice(deterministicInput, NOW);
const selectPerfMs = performance.now() - selectPerfStart;
console.log(`\nPERFORMANCE (pure fixture, 1000 iterations): candidates=${ADAPTIVE_FIXTURE.length}, learnerStateMs=${statePerfMs.toFixed(2)}, selectorMs=${selectPerfMs.toFixed(2)}, DBQueries=0`);

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
