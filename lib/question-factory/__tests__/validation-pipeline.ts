/**
 * Question Factory V2 — Comprehensive Test Suite (P3.5A).
 *
 * Standalone script (run with: npx tsx lib/question-factory/__tests__/validation-pipeline.ts)
 * Sections A–R covering: registry, types, structural, answer-key, security,
 * purpose-gate, duplicates, state-guard, aggregation, pipeline, TB-012,
 * MASTER_BANK negative corpus, edge cases.
 *
 * Uses assertion-based testing (no vitest dependency).
 */

// ─── Import all modules under test ───────────────────────────────────────────
import {
  // Types & constants
  D10_TRANSITIONS,
  PURPOSE_D10_MIN,
  VALID_TRANSITIONS,
  INTERNAL_FIELDS,
  // Registry
  REASON_CODES,
  getReasonCode,
  getReasonCodesForStage,
  getBlockingReasonCodes,
  isValidReasonCode,
  // Validators
  structuralValidator,
  answerKeyValidator,
  securityValidator,
  purposeGateValidator,
  duplicateDetector,
  stateGuardValidator,
  // Aggregation
  aggregateAllValidators,
  makeGateDecision,
  formatGateSummary,
  getBlockingIssues,
  getAdvisoryIssues,
  runPipeline,
  // State transition
  validateStateTransition,
} from "@/lib/question-factory";
import { DEFAULT_PIPELINE } from "@/lib/question-factory/index";
import type {
  CanonicalItem,
  ItemReviewState,
  ValidationContext,
  ValidationResult,
} from "@/lib/question-factory/types";

// ─── Test Fixtures ───────────────────────────────────────────────────────────
import {
  createTB012,
  createTB012Variant,
  MASTER_BANK_NEGATIVE_CASES,
  PASSING_ITEM,
} from "@/lib/question-factory/__fixtures__/tb-012";

// ─── Assertion Helpers ───────────────────────────────────────────────────────
let _passed = 0;
let _failed = 0;
const _failures: string[] = [];

function assert(condition: boolean, msg: string) {
  if (condition) {
    _passed++;
  } else {
    _failed++;
    _failures.push(`FAIL: ${msg}`);
    console.error(`  ✗ ${msg}`);
  }
}

function assertEqual<T>(actual: T, expected: T, msg: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function printSummary() {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`Results: ${_passed} passed, ${_failed} failed`);
  if (_failures.length > 0) {
    console.log(`\nFailures:\n${_failures.map((f) => `  ${f}`).join("\n")}`);
  }
  console.log(`${"═".repeat(60)}`);
  process.exit(_failed > 0 ? 1 : 0);
}

// ─── Base Context ────────────────────────────────────────────────────────────
function makeCtx(overrides?: Partial<ValidationContext>): ValidationContext {
  return {
    knownIds: new Set<string>(),
    knownStems: [],
    purpose: "PRACTICE",
    isNegativeCorpus: false,
    ...overrides,
  };
}

// ─── Base Item ───────────────────────────────────────────────────────────────
function makeItem(overrides?: Partial<CanonicalItem>): CanonicalItem {
  return {
    identity: {
      id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      version: 1,
      source: "MANUAL",
      createdAt: new Date().toISOString(),
      createdById: "test-user",
    },
    content: {
      stem: "Manakah kalimat berikut yang merupakan kalimat aktif?",
      options: [
        "Buku itu dibaca oleh anak-anak.",
        "Anak-anak membaca buku itu.",
        "Buku itu akan dibaca.",
        "Buku sedang dibaca.",
      ],
      explanation: "Kalimat aktif memiliki subjek yang melakukan aksi.",
    },
    responseModel: {
      questionType: "PILIHAN_GANDA",
      correctAnswer: "1",
    },
    purpose: {
      purpose: "PRACTICE",
      d10State: "HYPOTHESIS",
    },
    taxonomy: {
      skill: "GRAMMAR",
      subskill: "GRAMMAR_KALIMAT_EFEKTIF",
      difficulty: "MEDIUM",
    },
    provenance: {
      provenance: "AUTHOR",
    },
    reviewState: "NOT_REVIEWED",
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// §A — Registry Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§A — Reason-Code Registry");

assert(REASON_CODES.length > 0, "A.1 — Registry is non-empty");

for (const entry of REASON_CODES) {
  assert(/^[A-Z][A-Z0-9_]*$/.test(entry.code), `A.2 — Code '${entry.code}' is UPPER_SNAKE_CASE`);
}

const codes = REASON_CODES.map((e) => e.code);
assert(new Set(codes).size === codes.length, "A.3 — All codes are unique");

const entry = getReasonCode("STRUCTURE_EMPTY_STEM");
assert(entry !== undefined, "A.4 — getReasonCode returns correct entry");
assert(entry!.stage === 0, "A.4 — stage is 0");
assert(entry!.severity === "HARD_FAIL", "A.4 — severity is HARD_FAIL");
assert(entry!.blocking === true, "A.4 — blocking is true");

assert(getReasonCode("NONEXISTENT_CODE") === undefined, "A.5 — getReasonCode returns undefined for unknown");

assert(isValidReasonCode("ANSWER_KEY_MISSING") === true, "A.6 — isValidReasonCode validates correctly");
assert(isValidReasonCode("INVALID_CODE") === false, "A.6 — isValidReasonCode rejects invalid");

const stage0 = getReasonCodesForStage(0);
assert(stage0.length > 0, "A.7 — getReasonCodesForStage filters correctly");
for (const e of stage0) {
  assert(e.stage === 0, "A.7 — stage is 0");
}

const blocking = getBlockingReasonCodes();
assert(blocking.length > 0, "A.8 — getBlockingReasonCodes returns only blocking");
for (const e of blocking) {
  assert(e.blocking === true, "A.8 — blocking is true");
}

for (const e of REASON_CODES) {
  assert(e.stage >= -1 && e.stage <= 14, `A.9 — Stage ${e.stage} is valid`);
}
console.log("  §A complete");

// ═════════════════════════════════════════════════════════════════════════════
// §B — Types & Constants Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§B — Types & Constants");

assertEqual(D10_TRANSITIONS.NOT_APPLICABLE, ["HYPOTHESIS"], "B.1 — D10 NOT_APPLICABLE → HYPOTHESIS");
assertEqual(D10_TRANSITIONS.HYPOTHESIS, ["REVIEWED"], "B.1 — D10 HYPOTHESIS → REVIEWED");
assertEqual(D10_TRANSITIONS.REVIEWED, ["EMPIRICALLY_SUPPORTED"], "B.1 — D10 REVIEWED → EMPIRICALLY_SUPPORTED");
assertEqual(D10_TRANSITIONS.EMPIRICALLY_SUPPORTED, [], "B.1 — D10 EMPIRICALLY_SUPPORTED → (none)");

assertEqual(PURPOSE_D10_MIN.PRACTICE, "HYPOTHESIS", "B.2 — PRACTICE min HYPOTHESIS");
assertEqual(PURPOSE_D10_MIN.DIAGNOSTIC, "REVIEWED", "B.2 — DIAGNOSTIC min REVIEWED");
assertEqual(PURPOSE_D10_MIN.ADAPTIVE_MISCONCEPTION, "EMPIRICALLY_SUPPORTED", "B.2 — ADAPTIVE_MISCONCEPTION min EMPIRICALLY_SUPPORTED");
assertEqual(PURPOSE_D10_MIN.CALIBRATION, "NOT_APPLICABLE", "B.2 — CALIBRATION min NOT_APPLICABLE");

const states: ItemReviewState[] = [
  "NOT_REVIEWED", "PENDING", "IN_REVIEW",
  "APPROVED", "REJECTED", "REVISION", "RE_SUBMITTED", "PUBLISHED"
];
for (const state of states) {
  assert(VALID_TRANSITIONS[state] !== undefined, `B.3 — VALID_TRANSITIONS has '${state}'`);
  assert(Array.isArray(VALID_TRANSITIONS[state]), `B.3 — '${state}' is array`);
}

assertEqual(VALID_TRANSITIONS.PUBLISHED, [], "B.4 — PUBLISHED has no outgoing transitions");
assert(INTERNAL_FIELDS.length > 0, "B.5 — INTERNAL_FIELDS is non-empty");
assert(INTERNAL_FIELDS.includes("correctAnswer"), "B.5 — INTERNAL_FIELDS includes correctAnswer");
console.log("  §B complete");

// ═════════════════════════════════════════════════════════════════════════════
// §C — Structural Validator Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§C — Structural Validator");

const ctx = makeCtx();

const c1 = structuralValidator.validate(makeItem(), ctx);
assert(c1.filter((f) => f.status === "FAIL").length === 0, "C.1 — Valid item passes");

const c2Item = makeItem();
c2Item.identity.id = "";
const c2 = structuralValidator.validate(c2Item, ctx);
assert(c2.some((f) => f.reasonCode === "STRUCTURE_INVALID_IDENTITY"), "C.2 — Missing ID → STRUCTURE_INVALID_IDENTITY");

const c3Item = makeItem();
(c3Item.identity as any).source = "UNKNOWN_SOURCE";
const c3 = structuralValidator.validate(c3Item, ctx);
assert(c3.some((f) => f.reasonCode === "STRUCTURE_INVALID_SOURCE"), "C.3 — Invalid source → STRUCTURE_INVALID_SOURCE");

const c4Item = makeItem();
c4Item.content.stem = "";
const c4 = structuralValidator.validate(c4Item, ctx);
assert(c4.some((f) => f.reasonCode === "STRUCTURE_EMPTY_STEM"), "C.4 — Empty stem → STRUCTURE_EMPTY_STEM");

const c5Item = makeItem();
c5Item.content.stem = "Apa?";
const c5 = structuralValidator.validate(c5Item, ctx);
assert(c5.some((f) => f.reasonCode === "CONTENT_STEM_TOO_SHORT"), "C.5 — Short stem → CONTENT_STEM_TOO_SHORT");

const c6Item = makeItem();
(c6Item.responseModel as any).questionType = "ESSAY";
const c6 = structuralValidator.validate(c6Item, ctx);
assert(c6.some((f) => f.reasonCode === "STRUCTURE_UNSUPPORTED_TYPE"), "C.6 — Unsupported type → STRUCTURE_UNSUPPORTED_TYPE");

const c7Item = makeItem();
c7Item.content.options = ["A", "B", "C"];
const c7 = structuralValidator.validate(c7Item, ctx);
assert(c7.some((f) => f.reasonCode === "STRUCTURE_INVALID_OPTION_COUNT"), "C.7 — PG with 3 options → STRUCTURE_INVALID_OPTION_COUNT");

const c8Item = makeItem();
c8Item.content.options = ["A", "B", "C", "D", "E"];
const c8 = structuralValidator.validate(c8Item, ctx);
assert(c8.some((f) => f.reasonCode === "STRUCTURE_INVALID_OPTION_COUNT"), "C.8 — PG with 5 options → STRUCTURE_INVALID_OPTION_COUNT");

const c9Item = makeItem();
c9Item.content.options = ["A", "", "C", "D"];
const c9 = structuralValidator.validate(c9Item, ctx);
assert(c9.some((f) => f.reasonCode === "STRUCTURE_EMPTY_OPTION"), "C.9 — Empty option → STRUCTURE_EMPTY_OPTION");

const c10Item = makeItem();
c10Item.responseModel.questionType = "BENAR_SALAH";
c10Item.content.options = ["Salah", "Benar"];
const c10 = structuralValidator.validate(c10Item, ctx);
assert(c10.some((f) => f.reasonCode === "STRUCTURE_BS_SHAPE_INVALID"), "C.10 — BENAR_SALAH wrong shape → STRUCTURE_BS_SHAPE_INVALID");

const c11Item = makeItem();
c11Item.responseModel.questionType = "BENAR_SALAH";
c11Item.content.options = ["Benar", "Salah"];
c11Item.responseModel.correctAnswer = "0";
const c11 = structuralValidator.validate(c11Item, ctx);
assert(!c11.some((f) => f.reasonCode === "STRUCTURE_BS_SHAPE_INVALID"), "C.11 — BENAR_SALAH correct shape passes");

const c12Item = makeItem();
c12Item.responseModel.questionType = "ISIAN_SINGKAT";
c12Item.content.options = ["efektif", "tidak efektif"];
c12Item.responseModel.correctAnswer = "efektif";
const c12 = structuralValidator.validate(c12Item, ctx);
assert(c12.some((f) => f.reasonCode === "STRUCTURE_ISIAN_HAS_OPTIONS"), "C.12 — ISIAN_SINGKAT with options → STRUCTURE_ISIAN_HAS_OPTIONS");

const c13Item = makeItem();
c13Item.taxonomy.skill = "NonExistentSkill";
const c13 = structuralValidator.validate(c13Item, ctx);
assert(c13.some((f) => f.reasonCode === "STRUCTURE_INVALID_TAXONOMY"), "C.13 — Invalid skill → STRUCTURE_INVALID_TAXONOMY");

const c14Item = makeItem();
c14Item.content.stem = "Berikut ini yang termasuk contoh kalimat efektif adalah?";
const c14 = structuralValidator.validate(c14Item, ctx);
assert(c14.some((f) => f.reasonCode === "TEMPLATE_STEM_DETECTED"), "C.14 — Template stem → TEMPLATE_STEM_DETECTED");

const c15Item = makeItem();
c15Item.content.explanation = "";
const c15 = structuralValidator.validate(c15Item, ctx);
assert(c15.some((f) => f.reasonCode === "CONTENT_EXPLANATION_MISSING"), "C.15 — Missing explanation → CONTENT_EXPLANATION_MISSING");
console.log("  §C complete");

// ═════════════════════════════════════════════════════════════════════════════
// §D — Answer-Key Validator Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§D — Answer-Key Validator");

const d1 = answerKeyValidator.validate(makeItem(), ctx);
assert(d1.filter((f) => f.status === "FAIL").length === 0, "D.1 — Valid PG passes");

const d2Item = makeItem();
d2Item.responseModel.correctAnswer = "";
const d2 = answerKeyValidator.validate(d2Item, ctx);
assert(d2.some((f) => f.reasonCode === "ANSWER_KEY_MISSING"), "D.2 — Empty correctAnswer → ANSWER_KEY_MISSING");

const d3Item = makeItem();
d3Item.responseModel.correctAnswer = "99";
const d3 = answerKeyValidator.validate(d3Item, ctx);
assert(d3.some((f) => f.reasonCode === "ANSWER_KEY_INVALID_INDEX"), "D.3 — Out-of-range index → ANSWER_KEY_INVALID_INDEX");

const d4Item = makeItem();
d4Item.responseModel.correctAnswer = "Koran Kompas";
const d4 = answerKeyValidator.validate(d4Item, ctx);
assert(d4.some((f) => f.reasonCode === "ANSWER_KEY_INVALID_INDEX"), "D.4 — Text answer key → ANSWER_KEY_INVALID_INDEX");

const d5Item = makeItem();
d5Item.content.options = ["Kalimat efektif", "Kalimat efektif", "Pasif", "Aktif"];
const d5 = answerKeyValidator.validate(d5Item, ctx);
assert(d5.some((f) => f.reasonCode === "MULTIPLE_DEFENSIBLE_ANSWERS"), "D.5 — Duplicate options → MULTIPLE_DEFENSIBLE_ANSWERS");

const d6Item = makeItem();
d6Item.responseModel.questionType = "ISIAN_SINGKAT";
d6Item.content.options = [];
d6Item.responseModel.correctAnswer = "";
const d6 = answerKeyValidator.validate(d6Item, ctx);
assert(d6.some((f) => f.reasonCode === "ANSWER_KEY_MISSING"), "D.6 — ISIAN_SINGKAT with empty answer → ANSWER_KEY_MISSING");

const d7Item = makeItem();
d7Item.responseModel.questionType = "ISIAN_SINGKAT";
d7Item.content.options = [];
d7Item.responseModel.correctAnswer = "efektif";
const d7 = answerKeyValidator.validate(d7Item, ctx);
assert(d7.filter((f) => f.status === "FAIL").length === 0, "D.7 — ISIAN_SINGKAT with valid answer passes");

const d8Item = makeItem();
d8Item.responseModel.correctAnswer = "-1";
const d8 = answerKeyValidator.validate(d8Item, ctx);
assert(d8.some((f) => f.reasonCode === "ANSWER_KEY_INVALID_INDEX"), "D.8 — Negative index → ANSWER_KEY_INVALID_INDEX");
console.log("  §D complete");

// ═════════════════════════════════════════════════════════════════════════════
// §E — Security / Leakage Validator Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§E — Security / Leakage Validator");

const e1 = securityValidator.validate(makeItem(), ctx);
assert(e1.filter((f) => f.status === "FAIL").length === 0, "E.1 — Clean item passes");

const e2Item = makeItem();
e2Item.content.stem = "Anak-anak membaca buku itu dengan seksama. Ini kalimat aktif.";
e2Item.content.options = ["Anak-anak membaca buku itu", "Buku dibaca oleh anak-anak", "Buku sedang dibaca", "Anak-anak akan membaca"];
e2Item.responseModel.correctAnswer = "0";
const e2 = securityValidator.validate(e2Item, ctx);
assert(e2.some((f) => f.reasonCode === "KEY_IN_STEM"), "E.2 — KEY_IN_STEM detection");

const e3Item = makeItem();
e3Item.content.stem = "Soal ini memiliki d10 state: hypothesis. Manakah yang benar?";
const e3 = securityValidator.validate(e3Item, ctx);
assert(e3.some((f) => f.reasonCode === "SECURITY_LEAK_METADATA"), "E.3 — D10 state in stem → SECURITY_LEAK_METADATA");

const e4Item = makeItem();
e4Item.content.stem = "Soal ini dibuat oleh ai_provider: gemini. Manakah jawabannya?";
const e4 = securityValidator.validate(e4Item, ctx);
assert(e4.some((f) => f.reasonCode === "SECURITY_LEAK_METADATA"), "E.4 — Provenance info in stem → SECURITY_LEAK_METADATA");

const e5 = securityValidator.validate(makeItem(), ctx);
assert(!e5.some((f) => f.reasonCode === "KEY_IN_STEM"), "E.5 — No false positive for normal stem (KEY_IN_STEM)");
assert(!e5.some((f) => f.reasonCode === "SECURITY_LEAK_METADATA"), "E.5 — No false positive for normal stem (METADATA)");

const e6 = securityValidator.validate(PASSING_ITEM, ctx);
assert(e6.filter((f) => f.status === "FAIL").length === 0, "E.6 — PASSING_ITEM passes security");
console.log("  §E complete");

// ═════════════════════════════════════════════════════════════════════════════
// §F — Purpose Gate Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§F — Purpose Gate");

const f1 = purposeGateValidator.validate(makeItem({ purpose: { purpose: "PRACTICE", d10State: "HYPOTHESIS" } }), ctx);
assert(f1.filter((f) => f.status === "FAIL").length === 0, "F.1 — PRACTICE + HYPOTHESIS passes");

const f2 = purposeGateValidator.validate(makeItem({ purpose: { purpose: "DIAGNOSTIC", d10State: "NOT_APPLICABLE" } }), ctx);
assert(f2.some((f) => f.reasonCode === "PURPOSE_GATE_FAILED"), "F.2 — DIAGNOSTIC + NOT_APPLICABLE → PURPOSE_GATE_FAILED");

const f3 = purposeGateValidator.validate(makeItem({ purpose: { purpose: "ADAPTIVE_MISCONCEPTION", d10State: "REVIEWED" } }), ctx);
assert(f3.some((f) => f.reasonCode === "PURPOSE_GATE_FAILED"), "F.3 — ADAPTIVE_MISCONCEPTION + REVIEWED → PURPOSE_GATE_FAILED");

const f4 = purposeGateValidator.validate(makeItem({ purpose: { purpose: "ADAPTIVE_MISCONCEPTION", d10State: "EMPIRICALLY_SUPPORTED" } }), ctx);
assert(f4.filter((f) => f.status === "FAIL").length === 0, "F.4 — ADAPTIVE_MISCONCEPTION + EMPIRICALLY_SUPPORTED passes");

const f5 = purposeGateValidator.validate(makeItem({ purpose: { purpose: "CALIBRATION", d10State: "NOT_APPLICABLE" } }), ctx);
assert(f5.filter((f) => f.status === "FAIL").length === 0, "F.5 — CALIBRATION + NOT_APPLICABLE passes");

const f6 = purposeGateValidator.validate(makeItem({ purpose: { purpose: "CALIBRATION", d10State: "HYPOTHESIS" } }), ctx);
assert(f6.some((f) => f.reasonCode === "PURPOSE_GATE_FAILED"), "F.6 — CALIBRATION + HYPOTHESIS → PURPOSE_GATE_FAILED");
console.log("  §F complete");

// ═════════════════════════════════════════════════════════════════════════════
// §G — Duplicate Detection Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§G — Duplicate Detection");

const g1 = duplicateDetector.validate(
  makeItem({ identity: { ...makeItem().identity, id: "NEW-001" } }),
  makeCtx({ knownIds: new Set(["OTHER-001"]), knownStems: ["Apa itu kalimat aktif?"] })
);
assert(g1.filter((f) => f.status === "FAIL").length === 0, "G.1 — Unique item passes");

const g2 = duplicateDetector.validate(
  makeItem({ identity: { ...makeItem().identity, id: "DUP-001" } }),
  makeCtx({ knownIds: new Set(["DUP-001"]) })
);
assert(g2.some((f) => f.reasonCode === "DUPLICATE_ID"), "G.2 — Duplicate ID → DUPLICATE_ID");

const g3 = duplicateDetector.validate(
  makeItem(),
  makeCtx({ knownStems: ["Manakah kalimat berikut yang merupakan kalimat aktif?"] })
);
assert(g3.some((f) => f.reasonCode === "DUPLICATE_EXACT"), "G.3 — Exact stem match → DUPLICATE_EXACT");

const g4Item = makeItem();
g4Item.content.stem = "Kalimat aktif.";
const g4 = duplicateDetector.validate(
  g4Item,
  makeCtx({ knownStems: ["Kalimat aktif dalam bahasa Indonesia sangat penting dipelajari oleh siswa karena merupakan bagian dari kurikulum nasional."] })
);
assert(g4.some((f) => f.reasonCode === "DUPLICATE_NORMALIZED"), "G.4 — Similar stem → DUPLICATE_NORMALIZED");

const g5Item = makeItem();
g5Item.content.stem = "";
const g5 = duplicateDetector.validate(
  g5Item,
  makeCtx({ knownStems: ["Some other stem"] })
);
assert(!g5.some((f) => f.reasonCode === "DUPLICATE_EXACT"), "G.5 — Empty stem does not cause false positive");
console.log("  §G complete");

// ═════════════════════════════════════════════════════════════════════════════
// §H — State-Transition Guard Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§H — State-Transition Guard");

const h1 = validateStateTransition(makeItem({ reviewState: "NOT_REVIEWED" }), "PENDING", false, "user-1");
assert(!h1.some((f) => f.status === "FAIL"), "H.1 — NOT_REVIEWED → PENDING is allowed");

const h2 = validateStateTransition(makeItem({ reviewState: "NOT_REVIEWED" }), "APPROVED", false, "user-1");
assert(h2.some((f) => f.reasonCode === "STATE_TRANSITION_INVALID"), "H.2 — NOT_REVIEWED → APPROVED is blocked");

const h3 = validateStateTransition(makeItem({ reviewState: "IN_REVIEW" }), "APPROVED", true, "ai-agent-001");
assert(h3.some((f) => f.reasonCode === "AI_SELF_APPROVAL"), "H.3 — AI self-approval → AI_SELF_APPROVAL");

const h4 = validateStateTransition(makeItem({ reviewState: "APPROVED" }), "PUBLISHED", true, "ai-agent-001");
assert(h4.some((f) => f.reasonCode === "AI_SELF_APPROVAL"), "H.4 — AI publish attempt → AI_SELF_APPROVAL");

const h5 = validateStateTransition(makeItem({ reviewState: "REJECTED" }), "APPROVED", false, "user-1");
assert(h5.some((f) => f.reasonCode === "STATE_TRANSITION_INVALID"), "H.5 — REJECTED → APPROVED blocked");

const h6 = validateStateTransition(makeItem({ reviewState: "REJECTED" }), "REVISION", false, "user-1");
assert(!h6.some((f) => f.status === "FAIL"), "H.6 — REJECTED → REVISION allowed");

const h7 = validateStateTransition(makeItem({ reviewState: "PUBLISHED" }), "APPROVED", false, "user-1");
assert(h7.some((f) => f.reasonCode === "STATE_TRANSITION_INVALID"), "H.7 — PUBLISHED → anything is blocked");

const h8 = validateStateTransition(makeItem({ reviewState: "NOT_REVIEWED" }), null, false, "user-1");
assert(!h8.some((f) => f.status === "FAIL"), "H.8 — null target = no state change");
console.log("  §H complete");

// ═════════════════════════════════════════════════════════════════════════════
// §I — Aggregation Engine Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§I — Aggregation Engine");

const i1 = aggregateAllValidators([...DEFAULT_PIPELINE], makeItem(), ctx);
// V14 HARD_FAIL (no HUMAN_REVIEW) makes passed=false and blocked=true
assert(i1.passed === false, "I.1 — blocked by V14 (no HUMAN_REVIEW)");
assert(i1.publishEligible === false, "I.1 — publishEligible is false (V14 requires HUMAN_REVIEW)");
assert(i1.blocked === true, "I.1 — blocked is true (V14 finding)");

const i2Item = makeItem();
i2Item.identity.id = "";
const i2 = aggregateAllValidators([...DEFAULT_PIPELINE], i2Item, ctx);
assert(i2.passed === false, "I.2 — Hard fail blocks item");
assert(i2.blocked === true, "I.2 — blocked is true");
assert(i2.publishEligible === false, "I.2 — publishEligible is false");
assert(i2.blockers.length > 0, "I.2 — blockers non-empty");

const i3Item = makeItem();
i3Item.content.explanation = "";
const i3 = aggregateAllValidators([...DEFAULT_PIPELINE], i3Item, ctx);
// V14 blocks (no HUMAN_REVIEW), passed=false
assert(i3.passed === false, "I.3 — blocked by V14 (no HUMAN_REVIEW)");
assert(i3.publishEligible === false, "I.3 — publishEligible false (V14 requires HUMAN_REVIEW)");

const i4 = aggregateAllValidators([...DEFAULT_PIPELINE], makeItem(), ctx);
const gateSummary = formatGateSummary(i4);
assert(typeof gateSummary === "string", "I.4 — formatGateSummary returns string");
assert(gateSummary.includes("Gate Decision"), "I.4 — summary contains 'Gate Decision'");

const i5Item = makeItem();
i5Item.identity.id = "";
const i5 = aggregateAllValidators([...DEFAULT_PIPELINE], i5Item, ctx);
const issues = getBlockingIssues(i5);
assert(issues.length > 0, "I.5 — getBlockingIssues filters correctly");
for (const issue of issues) {
  assert(issue.severity === "HARD_FAIL", "I.5 — blocking issue is HARD_FAIL");
}

const i6Item = makeItem();
i6Item.content.explanation = "";
const i6 = aggregateAllValidators([...DEFAULT_PIPELINE], i6Item, ctx);
const advisories = getAdvisoryIssues(i6);
assert(advisories.length > 0, "I.6 — getAdvisoryIssues filters correctly");
console.log("  §I complete");

// ═════════════════════════════════════════════════════════════════════════════
// §J — Pipeline Integration Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§J — Pipeline Integration");

const j1 = runPipeline([...DEFAULT_PIPELINE], makeItem(), ctx);
assert(typeof j1.valid === "boolean", "J.1 — valid is boolean");
assert(Array.isArray(j1.findings), "J.1 — findings is array");
assert(typeof j1.summary === "object", "J.1 — summary is object");

const j2 = runPipeline([...DEFAULT_PIPELINE], PASSING_ITEM, ctx);
// V14 blocks valid=false (no HUMAN_REVIEW provenance)
assert(j2.valid === false, "J.2 — PASSING_ITEM fails V14 (no HUMAN_REVIEW)");
assert(j2.summary.hardFails > 0, "J.2 — PASSING_ITEM has V14 hard fail");

const j3 = runPipeline([...DEFAULT_PIPELINE], createTB012(), ctx);
assert(j3.valid === false, "J.3 — TB-012 is rejected by full pipeline");
assert(j3.summary.hardFails > 0, "J.3 — TB-012 has hard fails");

for (const validator of DEFAULT_PIPELINE) {
  const findings = validator.validate(makeItem(), ctx);
  for (const f of findings) {
    assert(f.stage === validator.stage, `J.4 — Stage ${f.stage} matches validator ${validator.id}`);
    assert(f.validatorId === validator.id, `J.4 — Validator ID ${f.validatorId} matches`);
  }
}
console.log("  §J complete");

// ═════════════════════════════════════════════════════════════════════════════
// §K — TB-012 Fixture Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§K — TB-012 Golden Fixture");

const k1 = createTB012();
assert(k1.identity.id === "TB-012", "K.1 — TB-012 has correct ID");
assert(k1.responseModel.correctAnswer === "0", "K.1 — correctAnswer is '0'");
assert(k1.content.options.length === 4, "K.1 — has 4 options");
assert(k1.content.options[0] === k1.content.options[3], "K.1 — duplicate options A=D");
assert(k1.content.stem.includes("contoh"), "K.1 — template stem");

const k2 = createTB012Variant("TB-012-V2");
assert(k2.identity.id === "TB-012-V2", "K.2 — variant has different ID");
assert(k2.responseModel.correctAnswer === "0", "K.2 — same characteristics");

const k3 = structuralValidator.validate(createTB012(), makeCtx());
assert(k3.some((f) => f.status === "FAIL"), "K.3 — TB-012 fails structural");

const k4 = answerKeyValidator.validate(createTB012(), makeCtx());
assert(k4.some((f) => f.status === "FAIL"), "K.4 — TB-012 fails answer-key");

const origFindings = structuralValidator.validate(createTB012(), makeCtx());
const varFindings = structuralValidator.validate(createTB012Variant("TB-012-TEST"), makeCtx());
const origFailCodes = origFindings.filter((f) => f.status === "FAIL").map((f) => f.reasonCode).sort();
const varFailCodes = varFindings.filter((f) => f.status === "FAIL").map((f) => f.reasonCode).sort();
assertEqual(origFailCodes, varFailCodes, "K.5 — TB-012 and variant produce identical failure patterns");
console.log("  §K complete");

// ═════════════════════════════════════════════════════════════════════════════
// §L — MASTER_BANK Negative Corpus Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§L — MASTER_BANK Negative Corpus");

const negativeCases: [string, CanonicalItem, string][] = [
  ["NEG-001-TEMPLATE", MASTER_BANK_NEGATIVE_CASES.templateStem, "TEMPLATE_STEM_DETECTED"],
  ["NEG-002-EMPTY-STEM", MASTER_BANK_NEGATIVE_CASES.emptyStem, "STRUCTURE_EMPTY_STEM"],
  ["NEG-003-OUT-OF-RANGE", MASTER_BANK_NEGATIVE_CASES.answerOutOfRange, "ANSWER_KEY_INVALID_INDEX"],
  ["NEG-004-TEXT-KEY", MASTER_BANK_NEGATIVE_CASES.textAnswerKey, "ANSWER_KEY_INVALID_INDEX"],
  ["NEG-005-DUPLICATE-OPTS", MASTER_BANK_NEGATIVE_CASES.duplicateOptions, "MULTIPLE_DEFENSIBLE_ANSWERS"],
  ["NEG-006-WRONG-COUNT", MASTER_BANK_NEGATIVE_CASES.wrongOptionCount, "STRUCTURE_INVALID_OPTION_COUNT"],
  ["NEG-007-KEY-IN-STEM", MASTER_BANK_NEGATIVE_CASES.keyInStem, "KEY_IN_STEM"],
  ["NEG-008-ISIAN-OPTS", MASTER_BANK_NEGATIVE_CASES.isianWithOptions, "STRUCTURE_ISIAN_HAS_OPTIONS"],
  ["NEG-009-PURPOSE", MASTER_BANK_NEGATIVE_CASES.purposeMismatch, "PURPOSE_GATE_FAILED"],
  ["NEG-010-ADAPTIVE", MASTER_BANK_NEGATIVE_CASES.adaptiveMisconceptionMismatch, "PURPOSE_GATE_FAILED"],
];

for (const [caseId, item, expectedCode] of negativeCases) {
  const result = runPipeline([...DEFAULT_PIPELINE], item, makeCtx());
  assert(result.valid === false, `L.${caseId} — rejected`);
  assert(
    result.findings.some((f) => f.reasonCode === expectedCode && f.status === "FAIL"),
    `L.${caseId} — has expected code ${expectedCode}`
  );
}
console.log("  §L complete");

// ═════════════════════════════════════════════════════════════════════════════
// §M — Edge Cases
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§M — Edge Cases");

const m1Item = makeItem();
m1Item.responseModel.questionType = "ISIAN_SINGKAT";
m1Item.content.options = [];
m1Item.responseModel.correctAnswer = "kalimat aktif";
const m1 = runPipeline([...DEFAULT_PIPELINE], m1Item, makeCtx());
// V14 blocks valid=false (no HUMAN_REVIEW)
assert(m1.valid === false, "M.1 — ISIAN_SINGKAT fails V14 (no HUMAN_REVIEW)");
assert(m1.summary.hardFails > 0, "M.1 — ISIAN_SINGKAT has V14 hard fail");

const m2Item = makeItem();
m2Item.responseModel.questionType = "BENAR_SALAH";
m2Item.content.options = ["Benar", "Salah"];
m2Item.responseModel.correctAnswer = "0";
const m2Findings = structuralValidator.validate(m2Item, makeCtx());
assert(
  !m2Findings.some((f) => f.status === "FAIL" && f.reasonCode !== "CONTENT_EXPLANATION_MISSING"),
  "M.2 — BENAR_SALAH with correct shape passes structural"
);

const m3Item = makeItem();
m3Item.content.stem = "A".repeat(5000);
const m3 = runPipeline([...DEFAULT_PIPELINE], m3Item, makeCtx());
// V14 blocks valid=false (no HUMAN_REVIEW)
assert(m3.valid === false, "M.3 — Very long stem fails V14 (no HUMAN_REVIEW)");
assert(m3.summary.hardFails > 0, "M.3 — has V14 hard fail");

const m4Item = makeItem();
m4Item.content.stem = "Kalimat berikut mengandung imbuhan yang benar adalah?";
m4Item.content.options = ["berlari", "melepaskan", "menulis", "berjalan"];
m4Item.responseModel.correctAnswer = "0";
const m4 = runPipeline([...DEFAULT_PIPELINE], m4Item, makeCtx());
// V14 blocks valid=false (no HUMAN_REVIEW)
assert(m4.valid === false, "M.4 — Unicode fails V14 (no HUMAN_REVIEW)");
assert(m4.summary.hardFails > 0, "M.4 — has V14 hard fail");
console.log("  §M complete");

// ═════════════════════════════════════════════════════════════════════════════
// §N — Validation Finding Shape Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§N — Validation Finding Shape");

for (const validator of DEFAULT_PIPELINE) {
  const findings = validator.validate(makeItem(), makeCtx());
  for (const f of findings) {
    assert(typeof f.validatorId === "string" && f.validatorId.length > 0, `N.1 — validatorId is non-empty string (${validator.id})`);
    assert(typeof f.validatorVersion === "string", `N.1 — validatorVersion is string (${validator.id})`);
    assert(typeof f.stage === "number", `N.1 — stage is number (${validator.id})`);
    assert(["PASS", "FAIL", "SKIP", "ADVISORY"].includes(f.status), `N.1 — status is valid (${validator.id})`);
    assert(["HARD_FAIL", "SOFT_FAIL", "ADVISORY"].includes(f.severity), `N.1 — severity is valid (${validator.id})`);
    assert(typeof f.blocking === "boolean", `N.1 — blocking is boolean (${validator.id})`);
    assert(typeof f.retryable === "boolean", `N.1 — retryable is boolean (${validator.id})`);
    assert(typeof f.reasonCode === "string", `N.1 — reasonCode is string (${validator.id})`);
    assert(typeof f.rationale === "string", `N.1 — rationale is string (${validator.id})`);
    assert(typeof f.evaluatedAt === "string", `N.1 — evaluatedAt is string (${validator.id})`);
  }
}
console.log("  §N complete");

// ═════════════════════════════════════════════════════════════════════════════
// §O — No Hardcoded TB-012 Special Cases
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§O — No Hardcoded TB-012 Special Cases");

const o1Result1 = runPipeline([...DEFAULT_PIPELINE], createTB012(), makeCtx());
const o1Result2 = runPipeline([...DEFAULT_PIPELINE], createTB012Variant("TB-012-V2"), makeCtx());
const o1Codes1 = o1Result1.findings.filter((f) => f.status === "FAIL").map((f) => f.reasonCode).sort();
const o1Codes2 = o1Result2.findings.filter((f) => f.status === "FAIL").map((f) => f.reasonCode).sort();
assertEqual(o1Codes1, o1Codes2, "O.1 — TB-012 and TB-012-V2 produce identical failure patterns");
console.log("  §O complete");

// ═════════════════════════════════════════════════════════════════════════════
// §P — Gate Decision Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§P — Gate Decision");

const p1Result: ValidationResult = {
  valid: true,
  findings: [
    { status: "PASS", severity: "ADVISORY", blocking: false, reasonCode: "PASS", rationale: "ok", validatorId: "test", validatorVersion: "1.0.0", stage: 0, retryable: false, evaluatedAt: new Date().toISOString() },
  ],
  summary: { hardFails: 0, softFails: 0, advisories: 0, passes: 1 },
};
const p1 = makeGateDecision(p1Result);
assert(p1.passed === true, "P.1 — makeGateDecision with no blockers passes");
assert(p1.publishEligible === true, "P.1 — publishEligible is true");
assert(p1.blockers.length === 0, "P.1 — no blockers");

const p2Result: ValidationResult = {
  valid: false,
  findings: [
    { status: "FAIL", severity: "HARD_FAIL", blocking: true, reasonCode: "STRUCTURE_EMPTY_STEM", rationale: "empty", validatorId: "test", validatorVersion: "1.0.0", stage: 0, retryable: false, evaluatedAt: new Date().toISOString() },
  ],
  summary: { hardFails: 1, softFails: 0, advisories: 0, passes: 0 },
};
const p2 = makeGateDecision(p2Result);
assert(p2.passed === false, "P.2 — makeGateDecision with blockers fails");
assert(p2.blocked === true, "P.2 — blocked is true");
assert(p2.publishEligible === false, "P.2 — publishEligible is false");
assert(p2.blockers.includes("STRUCTURE_EMPTY_STEM"), "P.2 — blockers contain STRUCTURE_EMPTY_STEM");
console.log("  §P complete");

// ═════════════════════════════════════════════════════════════════════════════
// §Q — D10 Monotonic Model Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§Q — D10 Monotonic Model");

assertEqual(D10_TRANSITIONS.NOT_APPLICABLE, ["HYPOTHESIS"], "Q.1 — NOT_APPLICABLE can only go to HYPOTHESIS");
assertEqual(D10_TRANSITIONS.EMPIRICALLY_SUPPORTED, [], "Q.2 — EMPIRICALLY_SUPPORTED cannot regress");
for (const [state, targets] of Object.entries(D10_TRANSITIONS)) {
  assert(!targets.includes(state as any), `Q.3 — No state can reach itself (${state})`);
}
console.log("  §Q complete");

// ═════════════════════════════════════════════════════════════════════════════
// §R — Registry Integrity Tests
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n§R — Registry Integrity");

const rItem = makeItem();
rItem.identity.id = "";
rItem.content.stem = "";
for (const validator of DEFAULT_PIPELINE) {
  const findings = validator.validate(rItem, makeCtx());
  for (const f of findings) {
    if (f.status === "FAIL" || f.status === "ADVISORY") {
      assert(isValidReasonCode(f.reasonCode), `R.1 — Reason code '${f.reasonCode}' is registered`);
    }
  }
}
assert(REASON_CODES.length > 10, "R.2 — Registry is non-trivially sized");
console.log("  §R complete");

// ═════════════════════════════════════════════════════════════════════════════
// Summary
// ═════════════════════════════════════════════════════════════════════════════
printSummary();
