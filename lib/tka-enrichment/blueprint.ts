/**
 * TKA / UTBK Enrichment Blueprint — Source of Truth
 *
 * This file defines the enrichment requirements for every TKA track.
 * It is the single source of truth for:
 *   - required sections per track
 *   - minimum question counts
 *   - difficulty distribution targets
 *   - grade/tingkat mapping
 *   - question type compatibility
 *   - passage targets
 *   - quality gate requirements
 *
 * Used by:
 *   - enrichment regression tests (validate post-enrichment state)
 *   - question generation prompts (generate questions per quota)
 *   - seed scripts (verify coverage after seeding)
 *
 * DO NOT MODIFY without Founder Review.
 */

// ──────────────────────────────────────────────────────────
// SECTION DEFINITIONS
// ──────────────────────────────────────────────────────────

/**
 * Valid sections within a TKA track.
 * Maps to TKAKompetensi enum values in Prisma.
 */
export type TKASection =
  | "membaca"       // LITERASI_MEMBACA — reading comprehension
  | "kebahasaan"    // TATA_BAHASA — language rules, grammar, EYD
  | "menulis"       // MENULIS — writing mechanics
  | "sastra";       // SASTRA — literary text analysis

/**
 * Maps section names to their Prisma TKAKompetensi enum values.
 */
export const SECTION_TO_KOMPETENSI: Record<TKASection, string> = {
  membaca: "LITERASI_MEMBACA",
  kebahasaan: "TATA_BAHASA",
  menulis: "MENULIS",
  sastra: "SASTRA",
};

// ──────────────────────────────────────────────────────────
// DIFFICULTY
// ──────────────────────────────────────────────────────────

/**
 * Difficulty levels as used in the JSON question bank.
 * The seed script maps numeric → enum:
 *   1 → EASY, 2 → MEDIUM, 3 → HARD, 4 → VERY_HARD
 */
export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD" | "VERY_HARD";

/**
 * Maps numeric difficulty (from JSON) to canonical enum value.
 * Same logic as seed-tka-all-tracks.ts mapDifficulty().
 */
export function mapDifficulty(diff: number): DifficultyLevel {
  if (diff <= 1) return "EASY";
  if (diff === 2) return "MEDIUM";
  if (diff === 3) return "HARD";
  return "VERY_HARD";
}

// ──────────────────────────────────────────────────────────
// TRACK BLUEPRINTS
// ──────────────────────────────────────────────────────────

export interface SectionBlueprint {
  /** Section identifier */
  section: TKASection;
  /** Minimum questions required in this section */
  minQuestions: number;
  /** Recommended questions for healthy pool (3× simulation size) */
  recommendedQuestions: number;
  /** Difficulty distribution: percentage targets */
  difficulty: {
    EASY: number;    // percentage 0-100
    MEDIUM: number;
    HARD: number;
    VERY_HARD: number;
  };
  /** Whether passage-based questions are expected */
  passageTarget: "NONE" | "LOW" | "MEDIUM" | "HIGH";
}

export interface TrackBlueprint {
  /** Track identifier (matches seed script trackKey) */
  track: string;
  /** Prisma KompetensiType enum value */
  type: string;
  /** Target audience description */
  target: string;
  /** Target tingkat for question filtering */
  tingkat: string;
  /** Simulation question count (how many shown per attempt) */
  simulationSize: number;
  /** Required sections */
  sections: SectionBlueprint[];
  /** Total minimum questions across all sections */
  totalMinimum: number;
  /** Total recommended pool */
  totalRecommended: number;
}

/**
 * TKA SD — Kelas 6 SD
 *
 * Blueprint per docs/BAHASACERDAS_UKBI_TKA_DESIGN.md:
 * - Pemahaman dasar, ide pokok, informasi tersurat/tersirat
 * - Simulation: 25 questions (currently 30)
 */
export const TKA_SD_BLUEPRINT: TrackBlueprint = {
  track: "sd",
  type: "TKA_SD",
  target: "Siswa kelas 6 SD",
  tingkat: "SD",
  simulationSize: 30,
  sections: [
    {
      section: "membaca",
      minQuestions: 40,
      recommendedQuestions: 60,
      difficulty: { EASY: 35, MEDIUM: 40, HARD: 20, VERY_HARD: 5 },
      passageTarget: "MEDIUM",
    },
    {
      section: "kebahasaan",
      minQuestions: 20,
      recommendedQuestions: 30,
      difficulty: { EASY: 40, MEDIUM: 35, HARD: 20, VERY_HARD: 5 },
      passageTarget: "LOW",
    },
  ],
  totalMinimum: 60,
  totalRecommended: 90,
};

/**
 * TKA SMP — Kelas 9 SMP
 *
 * Blueprint per docs/BAHASACERDAS_UKBI_TKA_DESIGN.md:
 * - Teks informasi, teks sastra, inferensi, struktur teks, kaidah bahasa
 * - Simulation: 30 questions
 */
export const TKA_SMP_BLUEPRINT: TrackBlueprint = {
  track: "smp",
  type: "TKA_SMP",
  target: "Siswa kelas 9 SMP",
  tingkat: "SMP",
  simulationSize: 30,
  sections: [
    {
      section: "membaca",
      minQuestions: 40,
      recommendedQuestions: 60,
      difficulty: { EASY: 25, MEDIUM: 35, HARD: 30, VERY_HARD: 10 },
      passageTarget: "MEDIUM",
    },
    {
      section: "kebahasaan",
      minQuestions: 20,
      recommendedQuestions: 30,
      difficulty: { EASY: 20, MEDIUM: 35, HARD: 35, VERY_HARD: 10 },
      passageTarget: "LOW",
    },
    {
      section: "sastra",
      minQuestions: 15,
      recommendedQuestions: 25,
      difficulty: { EASY: 20, MEDIUM: 35, HARD: 35, VERY_HARD: 10 },
      passageTarget: "HIGH",
    },
  ],
  totalMinimum: 75,
  totalRecommended: 115,
};

/**
 * TKA SMA — Kelas 12 SMA/SMK/MA
 *
 * Blueprint per docs/BAHASACERDAS_UKBI_TKA_DESIGN.md:
 * - Argumentasi, editorial, akademik, evaluasi gagasan, penalaran bahasa
 * - Simulation: 35 questions (currently 30)
 */
export const TKA_SMA_BLUEPRINT: TrackBlueprint = {
  track: "sma",
  type: "TKA_SMA",
  target: "Siswa kelas 12 SMA/SMK/MA",
  tingkat: "SMA",
  simulationSize: 30,
  sections: [
    {
      section: "membaca",
      minQuestions: 40,
      recommendedQuestions: 60,
      difficulty: { EASY: 15, MEDIUM: 30, HARD: 35, VERY_HARD: 20 },
      passageTarget: "HIGH",
    },
    {
      section: "kebahasaan",
      minQuestions: 20,
      recommendedQuestions: 30,
      difficulty: { EASY: 15, MEDIUM: 30, HARD: 35, VERY_HARD: 20 },
      passageTarget: "LOW",
    },
    {
      section: "sastra",
      minQuestions: 15,
      recommendedQuestions: 25,
      difficulty: { EASY: 15, MEDIUM: 30, HARD: 35, VERY_HARD: 20 },
      passageTarget: "HIGH",
    },
  ],
  totalMinimum: 75,
  totalRecommended: 115,
};

/**
 * TKA UTBK
 *
 * Focus: Literasi Bahasa Indonesia for UTBK
 * Simulation: 30 questions
 */
export const TKA_UTBK_BLUEPRINT: TrackBlueprint = {
  track: "utbk",
  type: "TKA_UTBK",
  target: "Peserta UTBK",
  tingkat: "SMA",
  simulationSize: 30,
  sections: [
    {
      section: "membaca",
      minQuestions: 40,
      recommendedQuestions: 60,
      difficulty: { EASY: 15, MEDIUM: 30, HARD: 35, VERY_HARD: 20 },
      passageTarget: "HIGH",
    },
    {
      section: "kebahasaan",
      minQuestions: 20,
      recommendedQuestions: 30,
      difficulty: { EASY: 15, MEDIUM: 30, HARD: 35, VERY_HARD: 20 },
      passageTarget: "LOW",
    },
  ],
  totalMinimum: 60,
  totalRecommended: 90,
};

/**
 * TKA Guru / PPG
 *
 * Blueprint per docs/BAHASACERDAS_UKBI_TKA_DESIGN.md:
 * - Pedagogik, profesional, kebahasaan
 * - Simulation: 40 questions (currently 30)
 */
export const TKA_GURU_BLUEPRINT: TrackBlueprint = {
  track: "guru",
  type: "TKA_GURU",
  target: "Guru & profesional",
  tingkat: "GURU",
  simulationSize: 30,
  sections: [
    {
      section: "membaca",
      minQuestions: 30,
      recommendedQuestions: 45,
      difficulty: { EASY: 15, MEDIUM: 30, HARD: 35, VERY_HARD: 20 },
      passageTarget: "HIGH",
    },
    {
      section: "kebahasaan",
      minQuestions: 20,
      recommendedQuestions: 30,
      difficulty: { EASY: 15, MEDIUM: 30, HARD: 35, VERY_HARD: 20 },
      passageTarget: "LOW",
    },
  ],
  totalMinimum: 50,
  totalRecommended: 75,
};

// ──────────────────────────────────────────────────────────
// ALL TRACKS REGISTRY
// ──────────────────────────────────────────────────────────

export const ALL_TRACK_BLUEPRINTS: Record<string, TrackBlueprint> = {
  sd: TKA_SD_BLUEPRINT,
  smp: TKA_SMP_BLUEPRINT,
  sma: TKA_SMA_BLUEPRINT,
  utbk: TKA_UTBK_BLUEPRINT,
  guru: TKA_GURU_BLUEPRINT,
};

// ──────────────────────────────────────────────────────────
// QUALITY GATE
// ──────────────────────────────────────────────────────────

/**
 * Required fields for every TKA question in the JSON bank.
 * Any question missing these fields fails the quality gate.
 */
export const REQUIRED_QUESTION_FIELDS = [
  "id",
  "stem",
  "options",
  "correctAnswer",
  "explanation",
  "difficulty",
  "section",
  "source",
  "status",
  "cognitive",
  "domain",
] as const;

/**
 * Required option structure for MCQ questions.
 */
export const MCQ_MIN_OPTIONS = 4;
export const MCQ_OPTION_IDS = ["A", "B", "C", "D"];

/**
 * Valid question types supported by the assessment engine.
 */
export const SUPPORTED_QUESTION_TYPES = [
  "pilihan_ganda",
  "PILIHAN_GANDA",
] as const;

/**
 * Valid cognitive dimensions (from existing question bank).
 */
export const VALID_COGNITIVE = [
  "MENGINGAT",
  "PEMAHAMAN",
  "PENERAPAN",
  "ANALISIS",
  "EVALUASI",
  "KREASI",
  "PENALARAN",
] as const;

/**
 * Valid domain values (from existing question bank).
 */
export const VALID_DOMAIN = [
  "FUNGSIONAL",
  "SOSIAL",
  "AKADEMIK",
  "SAINTIFIK",
  "INFORMASI",
  "VOKASIONAL",
  "SINTAS",
  "SASTRA",
  "PEDAGOGIK",
  "PROFESIONAL",
] as const;

/**
 * Valid bands (from existing question bank).
 */
export const VALID_BANDS = [
  "RENDAH",
  "SEDANG",
  "TINGGI",
  "TERBATAS",
  "SEMENJAK",
  "MADYA",
  "UNGGUL",
  "MARGINAL",
] as const;

// ──────────────────────────────────────────────────────────
// VERIFICATION PIPELINE
// ──────────────────────────────────────────────────────────

/**
 * Future verification pipeline stages.
 * Only the HUMAN_REVIEW stage may set isVerified = true.
 */
export const VERIFICATION_STAGES = [
  "AI_GENERATION",           // AI generates draft question
  "SCHEMA_VALIDATION",       // Required fields present
  "ANSWER_INTEGRITY",        // correctAnswer matches option
  "DUPLICATE_CHECK",         // No exact stem duplicate
  "METADATA_VALIDATION",     // cognitive, domain, difficulty valid
  "CONTENT_REVIEW",          // Human reviews quality
  "HUMAN_APPROVAL",          // Human marks isVerified = true
] as const;

// ──────────────────────────────────────────────────────────
// HELPER: SIMULATION SIZE
// ──────────────────────────────────────────────────────────

/**
 * Current simulation size per track (from seed script).
 * This is the number of questions shown per attempt.
 */
export const SIMULATION_SIZES: Record<string, number> = {
  sd: 30,
  smp: 30,
  sma: 30,
  utbk: 30,
  guru: 30,
};
