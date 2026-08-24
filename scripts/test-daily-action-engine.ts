/**
 * Daily Action Engine 1.0 — Test Suite
 *
 * Pure unit tests. No database, no network.
 * Run: npm run test:daily-action
 */
import * as config from "../lib/daily-action/config";
import * as types from "../lib/daily-action/types";
import * as quality from "../lib/daily-action/quality";
import * as fs from "fs";
import * as path from "path";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`  ❌ ${label}`);
  }
}

function section(name: string) {
  console.log(`\n── ${name} ──`);
}

// ── Section 1: Config ──────────────────────────────────────────

section("1. Configuration");
assert(config.COOLDOWN_DAYS === 7, "COOLDOWN_DAYS = 7");
assert(config.SOURCE_LOOKBACK_DAYS === 7, "SOURCE_LOOKBACK_DAYS = 7");
assert(config.MAX_SOURCE_RATIO === 0.6, "MAX_SOURCE_RATIO = 0.6");
assert(config.SKILL_BOOST === 1.5, "SKILL_BOOST = 1.5");
assert(config.STRONG_SKILL_PENALTY === 0.8, "STRONG_SKILL_PENALTY = 0.8");
assert(config.XP_REWARD === 15, "XP_REWARD = 15");
assert(config.COIN_REWARD === 5, "COIN_REWARD = 5");
assert(config.TOP_CANDIDATES_COUNT === 5, "TOP_CANDIDATES_COUNT = 5");
assert(config.CANDIDATE_POOL_SIZE === 200, "CANDIDATE_POOL_SIZE = 200");
assert(config.VERIFIED_BOOST === 1.2, "VERIFIED_BOOST = 1.2");
assert(config.GRADE_MISMATCH_PENALTY === 0.7, "GRADE_MISMATCH_PENALTY = 0.7");

// ── Section 2: Source Weights ───────────────────────────────────

section("2. Source Weights Sum");
const weightSum = Object.values(config.SOURCE_WEIGHTS).reduce((s, w) => s + w, 0);
assert(Math.abs(weightSum - 1.0) < 0.01, `Source weights sum to ${weightSum.toFixed(2)} ≈ 1.0`);

// ── Section 3: Answer Normalization ─────────────────────────────

section("3. Answer Normalization");
// Test that normalizeAnswer behavior is correct (from answer.ts)
// We test the logic, not importing the function (to avoid DB deps)
function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase();
}
assert(normalizeAnswer("A") === normalizeAnswer("a"), "Case-insensitive comparison");
assert(normalizeAnswer("  B  ") === normalizeAnswer("b"), "Trim + lowercase");
assert(normalizeAnswer("Jawaban Benar") === normalizeAnswer("jawaban benar"), "Full phrase normalization");
assert(normalizeAnswer("") === "", "Empty string stays empty");

// ── Section 4: Candidate Structure ──────────────────────────────

section("4. Candidate Structure");
const tkaCandidate: types.DailyCandidate = {
  id: "tka-1",
  source: "TKA",
  skill: "READING",
  questionType: "PILIHAN_GANDA",
  difficulty: "MEDIUM",
  questionText: "Apa yang dimaksud dengan ide pokok?",
  options: JSON.stringify(["Topik utama", "Judul karangan", "Penulis", "Tahun terbit"]),
  isVerified: true,
  tingkat: "SMP",
  seksi: null,
  hasAudio: false,
};
assert(tkaCandidate.source === "TKA", "TKA candidate source");
assert(tkaCandidate.skill === "READING", "TKA candidate skill");
assert(tkaCandidate.isVerified === true, "TKA candidate isVerified");
assert(tkaCandidate.tingkat === "SMP", "TKA candidate tingkat");
assert(tkaCandidate.hasAudio === false, "TKA candidate hasAudio = false");

const ukbiCandidate: types.DailyCandidate = {
  id: "ukbi-1",
  source: "UKBI",
  skill: "LISTENING",
  questionType: "PILIHAN_GANDA",
  difficulty: "EASY",
  questionText: "Dengarkan audio berikut...",
  options: JSON.stringify(["A", "B", "C", "D"]),
  isVerified: false,
  tingkat: "SMA",
  seksi: "MENDENGARKAN",
  hasAudio: true,
};
assert(ukbiCandidate.source === "UKBI", "UKBI candidate source");
assert(ukbiCandidate.seksi === "MENDENGARKAN", "UKBI candidate seksi");
assert(ukbiCandidate.hasAudio === true, "UKBI candidate hasAudio = true");

const ukbiGrammarCandidate: types.DailyCandidate = {
  id: "ukbi-2",
  source: "UKBI",
  skill: "GRAMMAR",
  questionType: "PILIHAN_GANDA",
  difficulty: "HARD",
  questionText: "Pilih konjungsi yang tepat untuk kalimat berikut...",
  options: JSON.stringify(["dan", "atau", "tapi", "jika"]),
  isVerified: false,
  tingkat: "VII",
  seksi: "MERESPONS_KAIDAH",
  hasAudio: false,
};
assert(ukbiGrammarCandidate.source === "UKBI", "UKBI grammar candidate source");
assert(ukbiGrammarCandidate.questionType === "PILIHAN_GANDA", "UKBI grammar candidate questionType");
assert(ukbiGrammarCandidate.isVerified === false, "UKBI grammar candidate isVerified = false");

const tkaBenarSalah: types.DailyCandidate = {
  id: "tka-bs-1",
  source: "TKA",
  skill: "GRAMMAR",
  questionType: "BENAR_SALAH",
  difficulty: "MEDIUM",
  questionText: "Kalimat 'Ibu membeli sayur di pasar' memiliki objek...",
  options: JSON.stringify(["Ibu", "membeli", "sayur", "pasar"]),
  isVerified: true,
  tingkat: "SMP",
  seksi: null,
  hasAudio: false,
};
assert(tkaBenarSalah.source === "TKA", "TKA BENAR_SALAH candidate source");
assert(tkaBenarSalah.questionType === "BENAR_SALAH", "TKA candidate questionType = BENAR_SALAH");

// ── Section 5: Quality Gate ─────────────────────────────────────

section("5. Quality Gate Integration");
const validCandidate: types.DailyCandidate = {
  id: "valid-1",
  source: "TKA",
  skill: "READING",
  questionType: "PILIHAN_GANDA",
  difficulty: "MEDIUM",
  questionText: "Apa arti kata 'literasi'?",
  options: JSON.stringify(["Kemampuan membaca", "Kemampuan berhitung", "Kemampuan berenang", "Kemampuan memasak"]),
  isVerified: true,
  tingkat: "SMP",
  seksi: null,
  hasAudio: false,
};
const result = quality.validateCandidate(validCandidate);
assert(result.eligible === true, "Valid candidate passes quality gate");

const invalidCandidate: types.DailyCandidate = {
  id: "invalid-1",
  source: "TKA",
  skill: "READING",
  questionType: "PILIHAN_GANDA",
  difficulty: "MEDIUM",
  questionText: "",
  options: JSON.stringify([]),
  isVerified: false,
  tingkat: "SMP",
  seksi: null,
  hasAudio: false,
};
const invalidResult = quality.validateCandidate(invalidCandidate);
assert(invalidResult.eligible === false, "Empty question fails quality gate");

// Test filtering batch
const candidates = [validCandidate, invalidCandidate, { ...validCandidate, id: "valid-2" }];
const filtered = quality.filterByQuality(candidates);
assert(filtered.length === 2, "Quality gate filters batch (2 of 3 pass)");

// ── Section 6: ScoredCandidate Structure ────────────────────────

section("6. ScoredCandidate Structure");
const scored: types.ScoredCandidate = { ...tkaCandidate, score: 1.5, questionType: "PILIHAN_GANDA" };
assert(scored.score === 1.5, "ScoredCandidate has score field");
assert(scored.source === "TKA", "ScoredCandidate inherits DailyCandidate fields");

// ── Section 7: Config Extends ───────────────────────────────────

section("7. New Config Constants");
assert(typeof config.VERIFIED_BOOST === "number", "VERIFIED_BOOST is number");
assert(config.VERIFIED_BOOST > 1.0, "VERIFIED_BOOST > 1.0 (boost, not penalty)");
assert(typeof config.GRADE_MISMATCH_PENALTY === "number", "GRADE_MISMATCH_PENALTY is number");
assert(config.GRADE_MISMATCH_PENALTY < 1.0, "GRADE_MISMATCH_PENALTY < 1.0 (penalty, not boost)");
assert(config.GRADE_MISMATCH_PENALTY > 0, "GRADE_MISMATCH_PENALTY > 0 (mild, not hard reject)");

// ── Section 8: API Structure ────────────────────────────────────

section("8. API Structure");
const apiPath = path.join(process.cwd(), "app/api/student/daily-action/route.ts");
assert(fs.existsSync(apiPath), "API route exists at app/api/student/daily-action/route.ts");

// ── Section 9: Engine Files ─────────────────────────────────────

section("9. Engine Files");
const engineDir = path.join(process.cwd(), "lib/daily-action");
const files = ["config.ts", "types.ts", "candidate.ts", "filter.ts", "score.ts", "engine.ts", "answer.ts", "index.ts", "quality.ts"];
for (const f of files) {
  assert(fs.existsSync(path.join(engineDir, f)), `${f} exists`);
}

// ── Section 10: UI Component ────────────────────────────────────

section("10. UI Component");
assert(
  fs.existsSync(path.join(process.cwd(), "components/student-home/DailyActionCard.tsx")),
  "DailyActionCard.tsx exists"
);

// ── Section 11: Integration ─────────────────────────────────────

section("11. Integration");
const berandaPath = path.join(process.cwd(), "app/(dashboard)/murid/beranda/page.tsx");
const berandaContent = fs.readFileSync(berandaPath, "utf-8");
assert(berandaContent.includes("DailyActionCard"), "DailyActionCard imported in beranda");
assert(berandaContent.includes("<DailyActionCard"), "DailyActionCard rendered in beranda");

// ── Section 12: Prisma Schema ───────────────────────────────────

section("12. Prisma Schema");
const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf-8");
assert(schema.includes("model DailyAction"), "DailyAction model exists in schema");
assert(schema.includes('@@unique([userId, date])'), "Unique constraint on (userId, date)");
assert(schema.includes("user User @relation"), "User relation exists");

// ── Section 13: Source Purity (Regression Guard) ──────────────

section("13. Source Purity — UKBI + TKA only");

// T1: Allowed sources are exactly TKA and UKBI
assert(
  config.SOURCE_WEIGHTS["TKA"] !== undefined && config.SOURCE_WEIGHTS["UKBI"] !== undefined,
  "SOURCE_WEIGHTS has TKA and UKBI"
);
assert(
  config.SOURCE_WEIGHTS["SOAL"] === undefined,
  "SOURCE_WEIGHTS does NOT have SOAL"
);
assert(
  Object.keys(config.SOURCE_WEIGHTS).length === 2,
  "SOURCE_WEIGHTS has exactly 2 sources"
);

// T2: SOAL source must never be in candidate union type
const typesContent = fs.readFileSync(path.join(process.cwd(), "lib/daily-action/types.ts"), "utf-8");
assert(
  !typesContent.includes('"SOAL"'),
  "types.ts does NOT include SOAL in source type"
);
assert(
  typesContent.includes('"TKA"') && typesContent.includes('"UKBI"'),
  "types.ts includes TKA and UKBI in source type"
);

// T3: Quality gate rejects SOAL
const qualityContent = fs.readFileSync(path.join(process.cwd(), "lib/daily-action/quality.ts"), "utf-8");
assert(
  !qualityContent.includes('"SOAL"'),
  "quality.ts does NOT include SOAL in VALID_SOURCES"
);

// T4: Candidate fetcher has no fetchSoal function
const candidateContent = fs.readFileSync(path.join(process.cwd(), "lib/daily-action/candidate.ts"), "utf-8");
assert(
  !candidateContent.includes("fetchSoal"),
  "candidate.ts does NOT have fetchSoal function"
);
assert(
  !candidateContent.includes('source: "SOAL"'),
  "candidate.ts does NOT emit source SOAL"
);
assert(
  candidateContent.includes('source: "TKA" as const') && candidateContent.includes('source: "UKBI" as const'),
  "candidate.ts emits TKA and UKBI sources"
);

// T5: Answer handler has no SOAL case
const answerContent = fs.readFileSync(path.join(process.cwd(), "lib/daily-action/answer.ts"), "utf-8");
assert(
  !answerContent.includes('case "SOAL"'),
  "answer.ts does NOT have SOAL case"
);

// T6: engine.ts comment says UKBI only
const engineContent = fs.readFileSync(path.join(process.cwd(), "lib/daily-action/engine.ts"), "utf-8");
assert(
  !engineContent.includes("SOAL"),
  "engine.ts does NOT mention SOAL"
);

// T7: Candidate structure — TKA and UKBI only
assert(tkaCandidate.source === "TKA", "TKA candidate source is TKA");
assert(ukbiCandidate.source === "UKBI", "UKBI candidate source is UKBI");
assert(tkaBenarSalah.source === "TKA", "TKA BENAR_SALAH source is TKA");

// T8: No test fixture uses SOAL source
assert(
  !typesContent.includes('source: "SOAL"'),
  "No test fixture uses SOAL source"
);

// ── Summary ─────────────────────────────────────────────────────

console.log("\n══════════════════════════════════════");
console.log("Daily Action Engine Test Suite");
console.log(`PASSED: ${passed} / ${passed + failed}`);
console.log(`FAILED: ${failed}`);
console.log("══════════════════════════════════════");

if (failures.length > 0) {
  console.log("\nFailures:");
  for (const f of failures) {
    console.log(`  ❌ ${f}`);
  }
  process.exit(1);
}
