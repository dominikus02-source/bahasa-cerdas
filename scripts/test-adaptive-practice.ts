/** Deterministic Personalized Practice v1 tests; no DB/LLM writes. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ADAPTIVE_ALLOWED_SIZES, ADAPTIVE_SELECTION_VERSION, ADAPTIVE_SUPPORTED_SOURCES } from "../lib/adaptive-practice/config";
import { selectAdaptivePractice } from "../lib/adaptive-practice/selector";
import type { AdaptiveCandidate } from "../lib/adaptive-practice/types";
import type { LearnerSkillState } from "../lib/learner-state/types";

const ROOT = join(__dirname, "..");
const read = (file: string) => readFileSync(join(ROOT, file), "utf8");
const now = new Date("2026-08-15T00:00:00.000Z");

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

function state(skill: string, overrides: Partial<LearnerSkillState> = {}): LearnerSkillState {
  return {
    skill,
    label: skill,
    attemptCount: 0,
    correctCount: 0,
    accuracy: null,
    recentAttemptCount: 0,
    recentCorrectCount: 0,
    recentAccuracy: null,
    lastPracticedAt: null,
    firstPracticedAt: null,
    trend: "INSUFFICIENT_DATA",
    confidence: "NO_DATA",
    masteryState: "NO_DATA",
    ...overrides,
  };
}

function candidate(id: string, over: Partial<AdaptiveCandidate> = {}): AdaptiveCandidate {
  return {
    id,
    text: `Pertanyaan ${id}`,
    options: ["A", "B", "C", "D"],
    questionType: "PILIHAN_GANDA",
    skill: "READING",
    subskill: "READING_INFERENSI",
    difficulty: "MEDIUM",
    topic: "Teks",
    seenAt: null,
    ...over,
  };
}

const api = read("app/api/player/adaptive-practice/route.ts");
const selector = read("lib/adaptive-practice/selector.ts");

// Authentication/ownership and API boundary.
check("1. API requires authentication", api.includes("getUser()") && api.includes("401"));
check("2. API uses authenticated user for state/session", api.includes("startSession(user.id") && api.includes("where: { id: sessionId, userId }"));
check("3. API does not accept client userId", !api.includes("body.userId"));
check("4. client cannot override skill", !api.includes("body.skill") && !api.includes("targetSkill: body"));
check("5. client cannot override difficulty", !api.includes("body.difficulty") && !api.includes("targetDifficulty: body"));
check("6. client cannot inject question IDs at start", !api.includes("body.questionIds") && api.includes("questionIds: selection.questions.map"));

// Target skill.
const weakSelection = selectAdaptivePractice({
  states: [
    state("READING", { attemptCount: 10, correctCount: 4, accuracy: 0.4, confidence: "HIGH" }),
    state("GRAMMAR", { attemptCount: 10, correctCount: 8, accuracy: 0.8, confidence: "HIGH" }),
  ],
  candidates: [candidate("r1", { skill: "READING" }), candidate("g1", { skill: "GRAMMAR" })],
  size: 1,
}, now);
check("7. weakest sufficiently evidenced skill selected", weakSelection?.targetSkill === "READING" && weakSelection.reasonCode === "WEAK_SKILL");

const noDataSelection = selectAdaptivePractice({
  states: [state("READING"), state("GRAMMAR")],
  candidates: [candidate("r1", { skill: "READING" }), candidate("g1", { skill: "GRAMMAR" })],
  size: 1,
}, now);
check("8. no learner data uses balanced deterministic fallback", noDataSelection?.reasonCode === "NO_DATA" && noDataSelection.targetSkill === "GRAMMAR");

// Eligibility/metadata boundary.
check("9. only BANK_SOAL is enabled in v1", ADAPTIVE_SUPPORTED_SOURCES.length === 1 && ADAPTIVE_SUPPORTED_SOURCES[0] === "BANK_SOAL");
check("10. API queries APPROVED metadata with skill", api.includes('status: "APPROVED"') && api.includes("skill: { not: null }"));
check("11. NEEDS_REVIEW metadata excluded", api.includes("validated.value?.status !== \"APPROVED\"") && api.includes("metadata.status !== \"APPROVED\"") );
check("12. UKBI/TKA are not eligible sources", !api.includes('source: "UKBI"') && !api.includes('source: "TKA"') && !selector.includes("UKBI"));
check("13. unsupported/malformed questions excluded", api.includes("normalizeSoalType(question.type)") && api.includes("!question.text.trim()"));

// Difficulty and anti-repeat.
const developing = selectAdaptivePractice({
  states: [state("READING", { attemptCount: 5, correctCount: 3, accuracy: 0.6, confidence: "MEDIUM", masteryState: "DEVELOPING" })],
  candidates: [candidate("easy", { difficulty: "EASY" }), candidate("medium", { difficulty: "MEDIUM" }), candidate("hard", { difficulty: "HARD" })],
  size: 1,
}, now);
check("14. developing state targets MEDIUM", developing?.targetDifficulty === "MEDIUM" && developing.questions[0]?.difficulty === "MEDIUM");

const unseenPreferred = selectAdaptivePractice({
  states: [state("READING")],
  candidates: [candidate("recent", { seenAt: new Date("2026-08-14T00:00:00.000Z") }), candidate("unseen")],
  size: 1,
}, now);
check("15. unseen preferred over recent", unseenPreferred?.questions[0]?.id === "unseen");

const oldPreferred = selectAdaptivePractice({
  states: [state("READING")],
  candidates: [candidate("recent", { seenAt: new Date("2026-08-14T00:00:00.000Z") }), candidate("old", { seenAt: new Date("2026-07-01T00:00:00.000Z") })],
  size: 1,
}, now);
check("16. old seen preferred over cooldown recent", oldPreferred?.questions[0]?.id === "old");

const diverse = selectAdaptivePractice({
  states: [state("READING")],
  candidates: [
    candidate("a1", { topic: "A" }), candidate("a2", { topic: "A" }), candidate("a3", { topic: "A" }),
    candidate("a4", { topic: "A" }), candidate("b1", { topic: "B" }),
  ],
  size: 5,
}, now);
check("17. diversity prefers an alternative topic when available", new Set(diverse?.questions.map((q) => q.topic)).size >= 2);

// Determinism, bounds, explanation, no answer leak, evidence reuse.
const deterministicInput = { states: [state("READING")], candidates: [candidate("b"), candidate("a"), candidate("c")], size: 3 };
const first = selectAdaptivePractice(deterministicInput, now);
const second = selectAdaptivePractice(deterministicInput, now);
check("18. same input produces same selection", JSON.stringify(first) === JSON.stringify(second));
check("19. selection explanation exists", Boolean(first?.reasonCode && first?.reasonText));
check("20. session size is bounded server-side", ADAPTIVE_ALLOWED_SIZES.join(",") === "5,10,15" && api.includes("ADAPTIVE_ALLOWED_SIZES.includes"));
check("21. invalid session size rejected", api.includes("Ukuran sesi harus 5, 10, atau 15"));
check("22. answer-key fields are not selected/returned", !api.includes("select: { kodeSoal: true, text: true, options: true, type: true, correctAnswer: true") && !api.includes("correctAnswer: question.correctAnswer"));
check("23. answer submission reuses LearningEvidence", api.includes("upsertLearningEvidence") && api.includes('source: session.source'));
check("24. insufficient metadata has truthful fallback", api.includes("Belum cukup data untuk latihan personal") && api.includes("/arena/jalur-cerdas"));
check("25. selection version is explicit", ADAPTIVE_SELECTION_VERSION === "1.0" && api.includes("selectionVersion"));

console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exit(1);
