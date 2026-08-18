/**
 * Question Bank Import Validation.
 *
 * Validates JSON question format for bulk import into the BahasaCerdas question
 * bank. Detects duplicates by kodeSoal and by text similarity. Normalizes
 * difficulty levels from Indonesian (MUDAH/SEDANG/SULIT) to canonical
 * (EASY/MEDIUM/HARD).
 *
 * This module is pure — no DB access. It validates input and returns a report.
 */

export type DifficultyNormalized = "EASY" | "MEDIUM" | "HARD";
export type QuestionTypeNormalized = "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT";

export interface ImportQuestion {
  /** Unique identifier, e.g. "BC-GRAMMAR-0001". Required. */
  kodeSoal: string;
  /** Question title. Optional. */
  judul?: string;
  /** Topic/theme name. Optional. */
  topik?: string;
  /** Grade level. Optional. */
  kelas?: string;
  /** Semester. Optional. */
  semester?: number;
  /** Competency code. Optional. */
  kompetensi?: string;
  /** Indicator. Optional. */
  indikator?: string;
  /** Difficulty in Indonesian or English. Required. */
  difficulty: string;
  /** Cognitive level (1-5). Optional. */
  levelBerpikir?: number;
  /** Question type. Required. */
  type: string;
  /** Question text. Required. */
  text: string;
  /** Answer options. Required for PILIHAN_GANDA. */
  options?: string[];
  /** Correct answer. Required. */
  correctAnswer: string;
  /** Explanation. Optional. */
  explanation?: string;
  /** Keywords. Optional. */
  kataKunci?: string[];
  /** Estimated time in seconds. Optional. */
  estimasiWaktu?: number;
  /** Is Higher Order Thinking Skill. Optional. */
  isHOTS?: boolean;

  // --- Metadata fields (optional — creates QuestionMetadata if present) ---
  /** Skill ID (READING, GRAMMAR, etc.). If present, creates metadata. */
  skill?: string;
  /** Subskill ID. Optional. */
  subskill?: string;
  /** Topic for metadata taxonomy. Optional. */
  topic?: string;
  /** Metadata provenance. Defaults to "IMPORT". */
  provenance?: string;
}

export interface ValidatedQuestion {
  kodeSoal: string;
  judul: string | null;
  text: string;
  type: QuestionTypeNormalized;
  difficulty: DifficultyNormalized;
  options: string[];
  correctAnswer: string;
  explanation: string | null;
  kelas: string;
  semester: number | null;
  topik: string | null;
  kompetensi: string | null;
  indikator: string | null;
  levelBerpikir: number | null;
  kataKunci: string[];
  estimasiWaktu: number | null;
  isHOTS: boolean;
  source: "IMPORT";
  // Metadata (optional)
  skill: string | null;
  subskill: string | null;
  topic: string | null;
  provenance: string;
}

export interface ImportError {
  index: number;
  kodeSoal?: string;
  field: string;
  message: string;
}

export interface ImportWarning {
  index: number;
  kodeSoal?: string;
  message: string;
}

export interface ImportValidationResult {
  valid: ValidatedQuestion[];
  errors: ImportError[];
  warnings: ImportWarning[];
  duplicates: { index: number; kodeSoal: string; reason: string }[];
  stats: {
    total: number;
    valid: number;
    errors: number;
    duplicates: number;
    warnings: number;
    byDifficulty: Record<DifficultyNormalized, number>;
    byType: Record<QuestionTypeNormalized, number>;
    withMetadata: number;
  };
}

const DIFFICULTY_MAP: Record<string, DifficultyNormalized> = {
  MUDAH: "EASY",
  EASY: "EASY",
  SEDANG: "MEDIUM",
  MEDIUM: "MEDIUM",
  SULIT: "HARD",
  HARD: "HARD",
};

const VALID_TYPES: Record<string, QuestionTypeNormalized> = {
  PILIHAN_GANDA: "PILIHAN_GANDA",
  MULTIPLE_CHOICE: "PILIHAN_GANDA",
  BENAR_SALAH: "BENAR_SALAH",
  TRUE_FALSE: "BENAR_SALAH",
  ISIAN: "ISIAN_SINGKAT",
  ISIAN_SINGKAT: "ISIAN_SINGKAT",
  FILL_BLANK: "ISIAN_SINGKAT",
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isDuplicateText(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return true;
  // Simple containment check for very similar texts
  if (na.length > 20 && nb.length > 20) {
    if (na.includes(nb) || nb.includes(na)) return true;
  }
  return false;
}

/**
 * Validate a batch of import questions. Pure function — no DB access.
 */
export function validateImportBatch(
  questions: unknown[],
  existingKodeSoals: Set<string> = new Set(),
  existingTexts: string[] = []
): ImportValidationResult {
  const valid: ValidatedQuestion[] = [];
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  const duplicates: { index: number; kodeSoal: string; reason: string }[] = [];
  const seenKodeSoals = new Set<string>();
  const seenTexts: string[] = [];
  const byDifficulty: Record<DifficultyNormalized, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const byType: Record<QuestionTypeNormalized, number> = {
    PILIHAN_GANDA: 0,
    BENAR_SALAH: 0,
    ISIAN_SINGKAT: 0,
  };
  let withMetadata = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as ImportQuestion | undefined;
    const idx = i;

    if (!q || typeof q !== "object") {
      errors.push({ index: idx, field: "root", message: "Item bukan object" });
      continue;
    }

    // Required fields
    if (!q.kodeSoal || typeof q.kodeSoal !== "string" || !q.kodeSoal.trim()) {
      errors.push({ index: idx, field: "kodeSoal", message: "kodeSoal wajib diisi" });
      continue;
    }
    if (!q.text || typeof q.text !== "string" || !q.text.trim()) {
      errors.push({ index: idx, kodeSoal: q.kodeSoal, field: "text", message: "text wajib diisi" });
      continue;
    }
    if (!q.difficulty || typeof q.difficulty !== "string") {
      errors.push({ index: idx, kodeSoal: q.kodeSoal, field: "difficulty", message: "difficulty wajib diisi" });
      continue;
    }
    if (!q.type || typeof q.type !== "string") {
      errors.push({ index: idx, kodeSoal: q.kodeSoal, field: "type", message: "type wajib diisi" });
      continue;
    }
    if (!q.correctAnswer || typeof q.correctAnswer !== "string") {
      errors.push({ index: idx, kodeSoal: q.kodeSoal, field: "correctAnswer", message: "correctAnswer wajib diisi" });
      continue;
    }

    // Normalize difficulty
    const difficulty = DIFFICULTY_MAP[q.difficulty.toUpperCase()];
    if (!difficulty) {
      errors.push({
        index: idx,
        kodeSoal: q.kodeSoal,
        field: "difficulty",
        message: `difficulty '${q.difficulty}' tidak valid. Gunakan: MUDAH/EASY, SEDANG/MEDIUM, SULIT/HARD`,
      });
      continue;
    }

    // Normalize type
    const type = VALID_TYPES[q.type.toUpperCase()];
    if (!type) {
      errors.push({
        index: idx,
        kodeSoal: q.kodeSoal,
        field: "type",
        message: `type '${q.type}' tidak valid. Gunakan: PILIHAN_GANDA, BENAR_SALAH, ISIAN_SINGKAT`,
      });
      continue;
    }

    // Validate options for PILIHAN_GANDA
    if (type === "PILIHAN_GANDA") {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push({
          index: idx,
          kodeSoal: q.kodeSoal,
          field: "options",
          message: "PILIHAN_GANDA membutuhkan minimal 2 opsi",
        });
        continue;
      }
      // Validate correctAnswer is a valid option index
      const answerIdx = parseInt(q.correctAnswer, 10);
      if (isNaN(answerIdx) || answerIdx < 0 || answerIdx >= q.options.length) {
        errors.push({
          index: idx,
          kodeSoal: q.kodeSoal,
          field: "correctAnswer",
          message: `correctAnswer '${q.correctAnswer}' di luar range opsi (0-${q.options.length - 1})`,
        });
        continue;
      }
    }

    // Check duplicate kodeSoal
    const kodeSoalLower = q.kodeSoal.trim().toUpperCase();
    if (existingKodeSoals.has(kodeSoalLower) || seenKodeSoals.has(kodeSoalLower)) {
      duplicates.push({ index: idx, kodeSoal: q.kodeSoal, reason: `kodeSoal '${q.kodeSoal}' sudah ada` });
      continue;
    }

    // Check duplicate text
    const isDup = existingTexts.some((t) => isDuplicateText(t, q.text)) ||
      seenTexts.some((t) => isDuplicateText(t, q.text));
    if (isDup) {
      duplicates.push({ index: idx, kodeSoal: q.kodeSoal, reason: `text mirip dengan soal yang sudah ada` });
      continue;
    }

    // Warnings
    if (!q.options || q.options.length === 0) {
      if (type === "BENAR_SALAH") {
        warnings.push({ index: idx, kodeSoal: q.kodeSoal, message: "BENAR_SALAH tanpa opsi — menggunakan default [Benar, Salah]" });
      } else if (type === "ISIAN_SINGKAT") {
        // OK — fill blank doesn't need options
      } else {
        warnings.push({ index: idx, kodeSoal: q.kodeSoal, message: "PILIHAN_GANDA tanpa opsi" });
      }
    }

    const hasMeta = Boolean(q.skill || q.subskill || q.topic);
    if (hasMeta) withMetadata++;

    seenKodeSoals.add(kodeSoalLower);
    seenTexts.push(q.text);
    byDifficulty[difficulty]++;
    byType[type]++;

    valid.push({
      kodeSoal: q.kodeSoal.trim(),
      judul: q.judul || null,
      text: q.text.trim(),
      type,
      difficulty,
      options: type === "PILIHAN_GANDA"
        ? (q.options ?? [])
        : type === "BENAR_SALAH"
          ? ["Benar", "Salah"]
          : [],
      correctAnswer: q.correctAnswer.trim(),
      explanation: q.explanation || null,
      kelas: q.kelas || "7",
      semester: q.semester ?? null,
      topik: q.topik || null,
      kompetensi: q.kompetensi || null,
      indikator: q.indikator || null,
      levelBerpikir: q.levelBerpikir ?? null,
      kataKunci: Array.isArray(q.kataKunci) ? q.kataKunci : [],
      estimasiWaktu: q.estimasiWaktu ?? null,
      isHOTS: q.isHOTS ?? false,
      source: "IMPORT",
      skill: q.skill || null,
      subskill: q.subskill || null,
      topic: q.topic || null,
      provenance: q.provenance || "IMPORT",
    });
  }

  return {
    valid,
    errors,
    warnings,
    duplicates,
    stats: {
      total: questions.length,
      valid: valid.length,
      errors: errors.length,
      duplicates: duplicates.length,
      warnings: warnings.length,
      byDifficulty,
      byType,
      withMetadata,
    },
  };
}

/**
 * Validate the JSON import envelope (version, questions array).
 */
export function validateImportEnvelope(data: unknown): {
  valid: boolean;
  questions?: unknown[];
  error?: string;
} {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Root harus object" };
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.questions)) {
    return { valid: false, error: "Field 'questions' harus array" };
  }
  if (obj.questions.length === 0) {
    return { valid: false, error: "questions kosong" };
  }
  if (obj.questions.length > 5000) {
    return { valid: false, error: `Terlalu banyak soal (${obj.questions.length}). Maksimal 5000.` };
  }
  return { valid: true, questions: obj.questions };
}
