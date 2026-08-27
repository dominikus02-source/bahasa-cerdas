/**
 * Phase 4 Step 12 — Pipeline B (latihan) Hardening Verification
 *
 * Structural tests verifying that the POST /api/guru/latihan route
 * has been hardened against C4 root causes. No live provider calls.
 */
import { readFileSync } from "fs";
import { join } from "path";

const ROUTE_PATH = join(process.cwd(), "app/api/guru/latihan/route.ts");
const OUTPUT_VALIDATOR_PATH = join(process.cwd(), "src/ai/core/output-validator.ts");

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

function section(title: string) {
  console.log(`\n━━━ ${title} ━━━`);
}

// ── Load source files ──
const routeSrc = readFileSync(ROUTE_PATH, "utf-8");
const validatorSrc = readFileSync(OUTPUT_VALIDATOR_PATH, "utf-8");

// ════════════════════════════════════════════════════════════
// SECTION A: Import canonical validator (Step 3)
// ════════════════════════════════════════════════════════════
section("A: Import canonical validator (Step 3)");

assert(
  routeSrc.includes('import { validateAgentOutput, cleanJSONOutput } from "@/src/ai/core/output-validator"'),
  "Route imports validateAgentOutput and cleanJSONOutput from output-validator"
);

assert(
  !routeSrc.includes('cleaned.replace(/```json\\n?/g'),
  "Old manual markdown stripping removed (now handled by cleanJSONOutput)"
);

assert(
  !routeSrc.includes('cleaned.replace(/```\\n?/g'),
  "Old manual ``` stripping removed"
);

// ════════════════════════════════════════════════════════════
// SECTION B: Validation boundary (Step 4)
// ════════════════════════════════════════════════════════════
section("B: Validation boundary (Step 4)");

assert(
  routeSrc.includes('validateAgentOutput("soal", normalizedForValidation)'),
  "Calls validateAgentOutput('soal', ...) with normalized output"
);

assert(
  routeSrc.includes('validation.status === "invalid"'),
  "Gates on validation.status === 'invalid' → 422"
);

assert(
  routeSrc.includes('"Output AI tidak memenuhi standar kualitas"'),
  "Returns safe error message on invalid output"
);

assert(
  routeSrc.includes("issues: validation?.issues") || routeSrc.includes("issues: validation.issues"),
  "Includes validation issues in error response"
);

// ════════════════════════════════════════════════════════════
// SECTION C: No more "0" default (Step 5)
// ════════════════════════════════════════════════════════════
section("C: No more '0' default for correctAnswer (Step 5)");

assert(
  !routeSrc.includes('correctAnswer: String(s.correctAnswer || "0")'),
  "Old '0' default removed from soalData mapping"
);

assert(
  routeSrc.includes('answer: String(s.correctAnswer ?? "")'),
  "New mapping uses ?? '' (nullish coalescing, no fallback to '0')"
);

// ════════════════════════════════════════════════════════════
// SECTION D: Question type validation (Step 6)
// ════════════════════════════════════════════════════════════
section("D: Question type validation (Step 6)");

assert(
  routeSrc.includes('type: "pilihan_ganda"'),
  "Questions use lowercase 'pilihan_ganda' (matches SUPPORTED_QUESTION_TYPES)"
);

assert(
  routeSrc.includes("options.length >= 2"),
  "Filter requires at least 2 options per question"
);

// ════════════════════════════════════════════════════════════
// SECTION E: Count & empty handling (Step 7)
// ════════════════════════════════════════════════════════════
section("E: Count & empty handling (Step 7)");

assert(
  routeSrc.includes("rawArray.length === 0"),
  "Rejects empty AI output with 422"
);

assert(
  routeSrc.includes('"AI tidak menghasilkan soal apapun"'),
  "Returns safe error on empty output"
);

assert(
  routeSrc.includes("q.question.trim().length > 0"),
  "Filters out questions with empty text"
);

assert(
  routeSrc.includes("q.answer.trim().length > 0"),
  "Filters out questions with empty answer"
);

// ════════════════════════════════════════════════════════════
// SECTION F: Persistence ordering (Step 8)
// ════════════════════════════════════════════════════════════
section("F: Persistence ordering (Step 8)");

const validateIdx = routeSrc.indexOf('validateAgentOutput("soal"');
const persistIdx = routeSrc.indexOf("db.soal.createManyAndReturn");
const filterIdx = routeSrc.indexOf("soalData = normalizedForValidation");

assert(
  validateIdx > 0 && persistIdx > 0 && validateIdx < persistIdx,
  "validateAgentOutput runs BEFORE db.soal.createManyAndReturn"
);

assert(
  filterIdx > validateIdx && filterIdx < persistIdx,
  "soalData filter runs BETWEEN validation and persistence"
);

// ════════════════════════════════════════════════════════════
// SECTION G: Credit safety (Step 9)
// ════════════════════════════════════════════════════════════
section("G: Credit safety (Step 9)");

const creditIdx = routeSrc.indexOf("recordAIUsage(dbUser.id");
const quizCreateIdx = routeSrc.indexOf("db.quiz.create");

assert(
  creditIdx > 0 && quizCreateIdx > 0 && creditIdx > quizCreateIdx,
  "recordAIUsage runs AFTER db.quiz.create (credit logged only on success)"
);

assert(
  routeSrc.includes("Credit logging deferred to after successful persist"),
  "Comment documents deferred credit strategy"
);

// ════════════════════════════════════════════════════════════
// SECTION H: Error exposure (Step 11)
// ════════════════════════════════════════════════════════════
section("H: Error exposure (Step 11)");

assert(
  !routeSrc.includes("cleaned.slice(0, 300)"),
  "Raw provider output no longer exposed in error response"
);

assert(
  !routeSrc.includes("raw: cleaned"),
  "No 'raw' field in error response"
);

assert(
  routeSrc.includes('"Gagal memproses output AI — format tidak valid"'),
  "Parse error returns safe generic message"
);

// ════════════════════════════════════════════════════════════
// SECTION I: Normalization layer (Step 3)
// ════════════════════════════════════════════════════════════
section("I: Normalization layer (Step 3)");

assert(
  routeSrc.includes("const { cleaned } = cleanJSONOutput(content)"),
  "Uses cleanJSONOutput for normalization"
);

assert(
  routeSrc.includes("normalizedForValidation"),
  "Normalizes raw output to validateSoalOutput shape"
);

assert(
  routeSrc.includes("editableText: rawArray.map"),
  "Generates editableText for validation compatibility"
);

// ════════════════════════════════════════════════════════════
// SECTION J: validateSoalOutput canonical checks available
// ════════════════════════════════════════════════════════════
section("J: validateSoalOutput canonical checks available");

assert(
  validatorSrc.includes("function validateSoalOutput"),
  "validateSoalOutput exists in output-validator.ts"
);

assert(
  validatorSrc.includes("SUPPORTED_QUESTION_TYPES"),
  "SUPPORTED_QUESTION_TYPES defined for type checking"
);

assert(
  validatorSrc.includes("invalidCount > questions.length / 2"),
  "Classification logic: >50% invalid = INVALID"
);

// ════════════════════════════════════════════════════════════
// SECTION K: Prompt still requests MCQ (architectural note)
// ════════════════════════════════════════════════════════════
section("K: Prompt integrity");

assert(
  routeSrc.includes('correctAnswer adalah index string'),
  "Prompt still instructs index-string format for correctAnswer"
);

assert(
  routeSrc.includes('soal pilihan ganda'),
  "Prompt requests pilihan ganda (MCQ) questions"
);

// ════════════════════════════════════════════════════════════
// RESULTS
// ════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`);
console.log(`📊 Phase 4 Pipeline B Hardening: ${passed}/${passed + failed} passed`);
if (failed > 0) {
  console.log(`   ❌ ${failed} test(s) FAILED`);
  process.exit(1);
} else {
  console.log(`   ✅ ALL PASSED`);
}
console.log(`${"═".repeat(60)}`);
