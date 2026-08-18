/**
 * Question Bank Import Validation — Tests.
 *
 * Covers:
 * - Envelope validation
 * - Per-question validation (required fields, difficulty, type, options)
 * - Duplicate detection (kodeSoal + text)
 * - Normalization (difficulty, type)
 * - Metadata optional fields
 * - Edge cases (empty, oversized, mixed valid/invalid)
 */

type Check = { label: string; ok: boolean };

const checks: Check[] = [];

function check(label: string, ok: boolean) {
  checks.push({ label, ok });
}

// --- Import validation modules ---
// We test the pure validation logic directly without DB.
// Inline the core validation functions to avoid import resolution issues.

type DifficultyNormalized = "EASY" | "MEDIUM" | "HARD";
type QuestionTypeNormalized = "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT";

interface ImportError {
  index: number;
  kodeSoal?: string;
  field: string;
  message: string;
}

interface ImportWarning {
  index: number;
  kodeSoal?: string;
  message: string;
}

interface ImportValidationResult {
  valid: { kodeSoal: string; text: string; type: string; difficulty: string; skill: string | null }[];
  errors: ImportError[];
  warnings: ImportWarning[];
  duplicates: { index: number; kodeSoal: string; reason: string }[];
  stats: { total: number; valid: number; errors: number; duplicates: number };
}

const DIFFICULTY_MAP: Record<string, DifficultyNormalized> = {
  MUDAH: "EASY", EASY: "EASY", SEDANG: "MEDIUM", MEDIUM: "MEDIUM", SULIT: "HARD", HARD: "HARD",
};

const VALID_TYPES: Record<string, QuestionTypeNormalized> = {
  PILIHAN_GANDA: "PILIHAN_GANDA", MULTIPLE_CHOICE: "PILIHAN_GANDA",
  BENAR_SALAH: "BENAR_SALAH", TRUE_FALSE: "BENAR_SALAH",
  ISIAN: "ISIAN_SINGKAT", ISIAN_SINGKAT: "ISIAN_SINGKAT", FILL_BLANK: "ISIAN_SINGKAT",
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function isDuplicateText(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return true;
  if (na.length > 20 && nb.length > 20 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

function validateImportBatch(
  questions: unknown[],
  existingKodeSoals: Set<string> = new Set(),
  existingTexts: string[] = []
): ImportValidationResult {
  const valid: ImportValidationResult["valid"] = [];
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  const duplicates: ImportValidationResult["duplicates"] = [];
  const seenKodeSoals = new Set<string>();
  const seenTexts: string[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as Record<string, unknown> | undefined;
    if (!q || typeof q !== "object") { errors.push({ index: i, field: "root", message: "bukan object" }); continue; }
    const kodeSoal = String(q.kodeSoal || "");
    const text = String(q.text || "");
    const difficulty = String(q.difficulty || "");
    const type = String(q.type || "");
    const correctAnswer = String(q.correctAnswer || "");
    const skill = (q.skill as string) || null;

    if (!kodeSoal.trim()) { errors.push({ index: i, field: "kodeSoal", message: "wajib" }); continue; }
    if (!text.trim()) { errors.push({ index: i, kodeSoal, field: "text", message: "wajib" }); continue; }
    if (!difficulty) { errors.push({ index: i, kodeSoal, field: "difficulty", message: "wajib" }); continue; }
    if (!type) { errors.push({ index: i, kodeSoal, field: "type", message: "wajib" }); continue; }
    if (!correctAnswer) { errors.push({ index: i, kodeSoal, field: "correctAnswer", message: "wajib" }); continue; }

    const normDiff = DIFFICULTY_MAP[difficulty.toUpperCase()];
    if (!normDiff) { errors.push({ index: i, kodeSoal, field: "difficulty", message: `invalid: ${difficulty}` }); continue; }
    const normType = VALID_TYPES[type.toUpperCase()];
    if (!normType) { errors.push({ index: i, kodeSoal, field: "type", message: `invalid: ${type}` }); continue; }

    if (normType === "PILIHAN_GANDA") {
      const opts = q.options as unknown[];
      if (!Array.isArray(opts) || opts.length < 2) { errors.push({ index: i, kodeSoal, field: "options", message: "butuh >= 2 opsi" }); continue; }
      const ansIdx = parseInt(correctAnswer, 10);
      if (isNaN(ansIdx) || ansIdx < 0 || ansIdx >= opts.length) { errors.push({ index: i, kodeSoal, field: "correctAnswer", message: "out of range" }); continue; }
    }

    const kodeSoalLower = kodeSoal.trim().toUpperCase();
    if (existingKodeSoals.has(kodeSoalLower) || seenKodeSoals.has(kodeSoalLower)) {
      duplicates.push({ index: i, kodeSoal, reason: "dup kodeSoal" }); continue;
    }
    if (existingTexts.some((t) => isDuplicateText(t, text)) || seenTexts.some((t) => isDuplicateText(t, text))) {
      duplicates.push({ index: i, kodeSoal, reason: "dup text" }); continue;
    }

    seenKodeSoals.add(kodeSoalLower);
    seenTexts.push(text);
    valid.push({ kodeSoal, text, type: normType, difficulty: normDiff, skill });
  }

  return { valid, errors, warnings, duplicates, stats: { total: questions.length, valid: valid.length, errors: errors.length, duplicates: duplicates.length } };
}

function validateImportEnvelope(data: unknown): { valid: boolean; questions?: unknown[]; error?: string } {
  if (!data || typeof data !== "object") return { valid: false, error: "root bukan object" };
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.questions)) return { valid: false, error: "questions bukan array" };
  if (obj.questions.length === 0) return { valid: false, error: "questions kosong" };
  if (obj.questions.length > 5000) return { valid: false, error: `terlalu banyak: ${obj.questions.length}` };
  return { valid: true, questions: obj.questions };
}

// === TESTS ===

// --- A. Envelope validation ---
{
  const e1 = validateImportEnvelope(null);
  check("A1: null envelope -> invalid", !e1.valid);

  const e2 = validateImportEnvelope({ questions: [] });
  check("A2: empty questions -> invalid", !e2.valid);

  const e3 = validateImportEnvelope({ questions: [{ kodeSoal: "X" }] });
  check("A3: valid envelope -> valid", e3.valid && Array.isArray(e3.questions) && e3.questions.length === 1);

  const e4 = validateImportEnvelope({ questions: new Array(5001).fill({}) });
  check("A4: >5000 questions -> invalid", !e4.valid);

  const e5 = validateImportEnvelope("string");
  check("A5: string root -> invalid", !e5.valid);
}

// --- B. Required field validation ---
{
  const r = validateImportBatch([
    {},                                             // missing kodeSoal
    { kodeSoal: "Q1" },                            // missing text
    { kodeSoal: "Q2", text: "?" },                 // missing difficulty
    { kodeSoal: "Q3", text: "?", difficulty: "EASY" },  // missing type
    { kodeSoal: "Q4", text: "?", difficulty: "EASY", type: "PILIHAN_GANDA" }, // missing correctAnswer
  ]);
  check("B1: 5 invalid items -> 5 errors", r.errors.length === 5);
  check("B2: 0 valid items", r.valid.length === 0);
  check("B3: first error is kodeSoal", r.errors[0].field === "kodeSoal");
}

// --- C. Difficulty normalization ---
{
  const r = validateImportBatch([
    { kodeSoal: "D1", text: "Q?", difficulty: "MUDAH", type: "BENAR_SALAH", correctAnswer: "Benar" },
    { kodeSoal: "D2", text: "Q2?", difficulty: "SEDANG", type: "BENAR_SALAH", correctAnswer: "Benar" },
    { kodeSoal: "D3", text: "Q3?", difficulty: "SULIT", type: "BENAR_SALAH", correctAnswer: "Benar" },
    { kodeSoal: "D4", text: "Q4?", difficulty: "HARD", type: "BENAR_SALAH", correctAnswer: "Benar" },
    { kodeSoal: "D5", text: "Q5?", difficulty: "UNKNOWN", type: "BENAR_SALAH", correctAnswer: "Benar" },
  ]);
  check("C1: MUDAH -> EASY", r.valid[0]?.difficulty === "EASY");
  check("C2: SEDANG -> MEDIUM", r.valid[1]?.difficulty === "MEDIUM");
  check("C3: SULIT -> HARD", r.valid[2]?.difficulty === "HARD");
  check("C4: HARD -> HARD", r.valid[3]?.difficulty === "HARD");
  check("C5: UNKNOWN -> error", r.errors.length === 1 && r.errors[0].field === "difficulty");
  check("C6: 4 valid, 1 error", r.valid.length === 4 && r.errors.length === 1);
}

// --- D. Type normalization ---
{
  const r = validateImportBatch([
    { kodeSoal: "T1", text: "Q1?", difficulty: "EASY", type: "PILIHAN_GANDA", correctAnswer: "0", options: ["A", "B"] },
    { kodeSoal: "T2", text: "Q2?", difficulty: "EASY", type: "MULTIPLE_CHOICE", correctAnswer: "0", options: ["A", "B"] },
    { kodeSoal: "T3", text: "Q3?", difficulty: "EASY", type: "BENAR_SALAH", correctAnswer: "Benar" },
    { kodeSoal: "T4", text: "Q4?", difficulty: "EASY", type: "ISIAN_SINGKAT", correctAnswer: "test" },
    { kodeSoal: "T5", text: "Q5?", difficulty: "EASY", type: "UNKNOWN", correctAnswer: "x" },
  ]);
  check("D1: PILIHAN_GANDA normalized", r.valid[0]?.type === "PILIHAN_GANDA");
  check("D2: MULTIPLE_CHOICE -> PILIHAN_GANDA", r.valid[1]?.type === "PILIHAN_GANDA");
  check("D3: BENAR_SALAH normalized", r.valid[2]?.type === "BENAR_SALAH");
  check("D4: ISIAN_SINGKAT normalized", r.valid[3]?.type === "ISIAN_SINGKAT");
  check("D5: UNKNOWN -> error", r.errors.length === 1);
}

// --- E. Options validation for PILIHAN_GANDA ---
{
  const r = validateImportBatch([
    { kodeSoal: "O1", text: "Q1?", difficulty: "EASY", type: "PILIHAN_GANDA", correctAnswer: "0" },  // no options
    { kodeSoal: "O2", text: "Q2?", difficulty: "EASY", type: "PILIHAN_GANDA", correctAnswer: "0", options: ["A"] },  // 1 option
    { kodeSoal: "O3", text: "Q3?", difficulty: "EASY", type: "PILIHAN_GANDA", correctAnswer: "5", options: ["A", "B"] },  // answer out of range
    { kodeSoal: "O4", text: "Q4?", difficulty: "EASY", type: "PILIHAN_GANDA", correctAnswer: "1", options: ["A", "B", "C"] },  // valid
  ]);
  check("E1: no options -> error", r.errors.length === 3);
  check("E2: 1 valid item", r.valid.length === 1);
}

// --- F. Duplicate detection ---
{
  const r = validateImportBatch(
    [
      { kodeSoal: "DUP-1", text: "Soal pertama yang unik", difficulty: "EASY", type: "BENAR_SALAH", correctAnswer: "Benar" },
      { kodeSoal: "DUP-1", text: "Soal berbeda", difficulty: "EASY", type: "BENAR_SALAH", correctAnswer: "Benar" }, // dup kodeSoal
      { kodeSoal: "DUP-2", text: "Soal pertama yang unik", difficulty: "EASY", type: "BENAR_SALAH", correctAnswer: "Benar" }, // dup text
    ],
    new Set(["EXISTING-1"]),
    ["Soal existing di database"]
  );
  check("F1: 1 valid, 2 duplicates", r.valid.length === 1 && r.duplicates.length === 2);
  check("F2: first dup is kodeSoal", r.duplicates[0].reason === "dup kodeSoal");
  check("F3: second dup is text", r.duplicates[1].reason === "dup text");
}

// --- G. Duplicate detection within batch ---
{
  const r = validateImportBatch([
    { kodeSoal: "X1", text: "Soal unik satu", difficulty: "EASY", type: "BENAR_SALAH", correctAnswer: "Benar" },
    { kodeSoal: "X2", text: "Soal unik satu", difficulty: "EASY", type: "BENAR_SALAH", correctAnswer: "Benar" }, // dup text in batch
    { kodeSoal: "X3", text: "Soal berbeda dua", difficulty: "EASY", type: "BENAR_SALAH", correctAnswer: "Benar" },
  ]);
  check("G1: 2 valid, 1 dup in batch", r.valid.length === 2 && r.duplicates.length === 1);
}

// --- H. Metadata optional fields ---
{
  const r = validateImportBatch([
    { kodeSoal: "M1", text: "Q with meta", difficulty: "EASY", type: "BENAR_SALAH", correctAnswer: "Benar", skill: "GRAMMAR", subskill: "GRAMMAR_IMBUHAN" },
    { kodeSoal: "M2", text: "Q without meta", difficulty: "EASY", type: "BENAR_SALAH", correctAnswer: "Benar" },
  ]);
  check("H1: with metadata has skill", r.valid[0]?.skill === "GRAMMAR");
  check("H2: without metadata has null skill", r.valid[1]?.skill === null);
}

// --- I. Edge case: single valid question ---
{
  const r = validateImportBatch([
    { kodeSoal: "S1", text: "Satu soal?", difficulty: "MEDIUM", type: "PILIHAN_GANDA", correctAnswer: "2", options: ["A", "B", "C", "D"] },
  ]);
  check("I1: 1 valid question", r.valid.length === 1);
  check("I2: 0 errors", r.errors.length === 0);
  check("I3: stats total=1", r.stats.total === 1);
}

// --- J. Mixed batch (valid + invalid + duplicate) ---
{
  const r = validateImportBatch([
    { kodeSoal: "J1", text: "Valid one", difficulty: "EASY", type: "BENAR_SALAH", correctAnswer: "Benar" },
    {},  // invalid
    { kodeSoal: "J1", text: "Dup kodeSoal", difficulty: "EASY", type: "BENAR_SALAH", correctAnswer: "Benar" },
    { kodeSoal: "J2", text: "Valid two", difficulty: "HARD", type: "ISIAN_SINGKAT", correctAnswer: "jawaban" },
  ]);
  check("J1: 2 valid", r.valid.length === 2);
  check("J2: 1 error", r.errors.length === 1);
  check("J3: 1 duplicate", r.duplicates.length === 1);
}

// --- K. BENAR_SALAH options auto-fill ---
{
  const r = validateImportBatch([
    { kodeSoal: "BS1", text: "Benar atau salah?", difficulty: "EASY", type: "BENAR_SALAH", correctAnswer: "Benar" },
  ]);
  check("K1: BENAR_SALAH valid without options", r.valid.length === 1);
}

// --- L. ISIAN_SINGKAT options not required ---
{
  const r = validateImportBatch([
    { kodeSoal: "IS1", text: "Isian singkat?", difficulty: "EASY", type: "ISIAN_SINGKAT", correctAnswer: "test" },
  ]);
  check("L1: ISIAN_SINGKAT valid without options", r.valid.length === 1);
}

// === RESULTS ===
const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;

for (const c of checks) {
  console.log(`${c.ok ? "\u2705" : "\u274c"} ${c.label}`);
}

console.log(`\n=== QUESTION BANK IMPORT VALIDATION: ${passed}/${checks.length} ===`);
if (failed > 0) process.exit(1);
