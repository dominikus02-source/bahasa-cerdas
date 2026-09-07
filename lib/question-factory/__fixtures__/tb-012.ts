/**
 * Question Factory V2 — TB-012 Golden Fixture + MASTER_BANK Negative Corpus.
 *
 * TB-012 is a reusable adversarial test fixture. Per P3.5A governance:
 *   - TB-012 MAY be used as a GOLDEN/ADVERSARIAL TEST FIXTURE
 *   - TB-012 MUST NOT become a hardcoded production exception
 *   - No validator may contain `if itemId === "TB-012"` or equivalent special-case logic
 *   - The fixture must be reusable with another synthetic item carrying the same characteristics
 *
 * TB-012 Characteristics:
 *   - TEMPLATE stem pattern ("Berikut ini yang termasuk contoh...")
 *   - ANSWER_KEY = text, not index
 *   - Option D duplicates Option A text
 *   - Key embedded in stem (KEY_IN_STEM)
 *   - Missing explanation
 *   - All structural violations documented in DNA skeleton
 */

import type { CanonicalItem, D10State, ItemPurpose, ItemReviewState } from "../types";

/** Create a TB-012-shaped item for testing. */
export function createTB012(overrides?: Partial<{
  id: string;
  stem: string;
  correctAnswer: string;
  options: string[];
  purpose: ItemPurpose;
  d10State: D10State;
  reviewState: ItemReviewState;
}>): CanonicalItem {
  return {
    identity: {
      id: overrides?.id ?? "TB-012",
      version: 1,
      source: "V2_PILOT",
      createdAt: new Date().toISOString(),
      createdById: "test-user-001",
    },
    content: {
      stem: overrides?.stem ?? "Berikut ini yang termasuk contoh teks berita adalah?",
      options: overrides?.options ?? [
        "Koran Kompas edisi 3 Januari 2024",
        "Teks eksposisi tentang polusi udara",
        "Cerpen berjudul \"Surat Kecil untuk Tuhan\"",
        "Koran Kompas edisi 3 Januari 2024",  // Duplicate of A
      ],
      explanation: "",  // Missing explanation
    },
    responseModel: {
      questionType: "PILIHAN_GANDA",
      correctAnswer: overrides?.correctAnswer ?? "0",  // Text, not index
      distractorRationale: [],
    },
    purpose: {
      purpose: overrides?.purpose ?? "PRACTICE",
      d10State: overrides?.d10State ?? "NOT_APPLICABLE",
    },
    taxonomy: {
      skill: "READING",
      subskill: "READING_INFORMASI_TERSURAT",
      difficulty: "EASY",
    },
    provenance: {
      provenance: "EXISTING_DATA",
    },
    reviewState: overrides?.reviewState ?? "NOT_REVIEWED",
  };
}

/**
 * Create a TB-012-shaped item with a variant ID.
 * The fixture characteristics (template stem, text answer, duplicate options,
 * key in stem, missing explanation) remain identical — only the ID changes.
 * This ensures the fixture is reusable and not hardcoded.
 */
export function createTB012Variant(variantId: string): CanonicalItem {
  return createTB012({ id: variantId });
}

/**
 * MASTER_BANK negative corpus test items.
 *
 * These items carry known structural defects that the pipeline MUST reject.
 * They represent the "negative" cases from P3.1 forensic audit.
 */
export const MASTER_BANK_NEGATIVE_CASES = {
  /** Template stem (P3.1: 'contoh' family). */
  templateStem: createTB012({
    id: "NEG-001-TEMPLATE",
    stem: "Berikut ini yang termasuk contoh kalimat efektif adalah?",
  }),

  /** Empty stem. */
  emptyStem: createTB012({
    id: "NEG-002-EMPTY-STEM",
    stem: "",
  }),

  /** Answer key out of range. */
  answerOutOfRange: createTB012({
    id: "NEG-003-OUT-OF-RANGE",
    correctAnswer: "99",
    options: ["A", "B", "C", "D"],
  }),

  /** Answer key is text (not integer index). */
  textAnswerKey: createTB012({
    id: "NEG-004-TEXT-KEY",
    correctAnswer: "Koran Kompas",
  }),

  /** Duplicate options (A = B). */
  duplicateOptions: createTB012({
    id: "NEG-005-DUPLICATE-OPTS",
    options: ["Kalimat efektif", "Kalimat efektif", "Kalimat tidak efektif", "Tidak ada yang benar"],
  }),

  /** Minimal options (PG with 3 options). */
  wrongOptionCount: createTB012({
    id: "NEG-006-WRONG-COUNT",
    options: ["A", "B", "C"],
  }),

  /** Answer key in stem. */
  keyInStem: createTB012({
    id: "NEG-007-KEY-IN-STEM",
    stem: "Kalimat efektif adalah kalimat yang jelas dan padat. Kalimat efektif adalah jawaban yang benar.",
    correctAnswer: "0",
    options: ["Kalimat efektif", "Kalimat pasif", "Kalimat tidak efektif", "Kalimat aktif"],
  }),

  /** ISIAN_SINGKAT with options (wrong shape). */
  isianWithOptions: {
    ...createTB012({
      id: "NEG-008-ISIAN-OPTS",
      correctAnswer: "efektif",
      options: ["efektif", "tidak efektif", "pasif", "aktif"],
    }),
    responseModel: {
      questionType: "ISIAN_SINGKAT",
      correctAnswer: "efektif",
    },
  },

  /** Purpose D10 mismatch: DIAGNOSTIC needs D10 ≥ REVIEWED. */
  purposeMismatch: createTB012({
    id: "NEG-009-PURPOSE",
    purpose: "DIAGNOSTIC",
    d10State: "HYPOTHESIS",
  }),

  /** ADAPTIVE_MISCONCEPTION needs D10 = EMPIRICALLY_SUPPORTED. */
  adaptiveMisconceptionMismatch: createTB012({
    id: "NEG-010-ADAPTIVE",
    purpose: "ADAPTIVE_MISCONCEPTION",
    d10State: "REVIEWED",
  }),
} as const;

/**
 * A passing item — should pass all validators.
 */
export const PASSING_ITEM: CanonicalItem = {
  ...createTB012({
    id: "PASS-001",
    stem: "Manakah kalimat berikut yang merupakan kalimat aktif?",
    options: [
      "Buku itu dibaca oleh anak-anak.",
      "Anak-anak membaca buku itu.",
      "Buku itu akan dibaca.",
      "Buku sedang dibaca.",
    ],
    correctAnswer: "1",
    purpose: "PRACTICE",
    d10State: "HYPOTHESIS",
  }),
  taxonomy: {
    skill: "GRAMMAR",
    subskill: "GRAMMAR_KALIMAT_EFEKTIF",
    difficulty: "MEDIUM",
  },
};
