/**
 * Canonical question metadata taxonomy v1.0.
 *
 * Skill IDs reuse LearningSkillType terminology. Subskills are deliberately
 * small and stable; metadata is nullable until a human/content review assigns
 * it. This module contains no database access and no adaptive decisions.
 */

export const TAXONOMY_VERSION = "1.0" as const;
export const METADATA_VERSION = "1.0" as const;

export const SKILLS = {
  READING: "Membaca",
  WRITING: "Menulis",
  LISTENING: "Mendengarkan",
  SPEAKING: "Berbicara",
  GRAMMAR: "Tata Bahasa",
  VOCABULARY: "Kosakata",
  LITERATURE: "Sastra",
} as const;

export type SkillId = keyof typeof SKILLS;

export const SUBSKILLS: Record<SkillId, Record<string, string>> = {
  READING: {
    READING_IDE_POKOK: "Ide Pokok",
    READING_INFORMASI_TERSURAT: "Informasi Tersurat",
    READING_INFERENSI: "Inferensi",
    READING_MAKNA_KATA: "Makna Kata dalam Bacaan",
    READING_STRUKTUR_TEKS: "Struktur Teks",
  },
  WRITING: {
    WRITING_EJAAN: "Ejaan dalam Tulisan",
    WRITING_KALIMAT_EFEKTIF: "Kalimat Efektif dalam Tulisan",
    WRITING_ORGANISASI_GAGASAN: "Organisasi Gagasan",
    WRITING_KETEPATAN_KATA: "Ketepatan Kata",
  },
  LISTENING: {
    LISTENING_INFORMASI_TERSURAT: "Informasi Tersurat dari Simakan",
    LISTENING_INFERENSI: "Inferensi dari Simakan",
    LISTENING_GAGASAN_UTAMA: "Gagasan Utama Simakan",
  },
  SPEAKING: {
    SPEAKING_KELANCARAN: "Kelancaran Berbicara",
    SPEAKING_KETEPATAN_BAHASA: "Ketepatan Bahasa Lisan",
    SPEAKING_ORGANISASI_GAGASAN: "Organisasi Gagasan Lisan",
  },
  GRAMMAR: {
    GRAMMAR_EJAAN: "Ejaan",
    GRAMMAR_KALIMAT_EFEKTIF: "Kalimat Efektif",
    GRAMMAR_IMBUHAN: "Imbuhan",
    GRAMMAR_TANDA_BACA: "Tanda Baca",
    GRAMMAR_KATA_BAKU: "Kata Baku",
  },
  VOCABULARY: {
    VOCABULARY_MAKNA_KATA: "Makna Kata",
    VOCABULARY_SINONIM_ANTONIM: "Sinonim dan Antonim",
    VOCABULARY_KATA_BAKU: "Kata Baku",
    VOCABULARY_KONTEKS: "Kosakata dalam Konteks",
  },
  LITERATURE: {
    LITERATURE_UNSUR_CERITA: "Unsur Cerita",
    LITERATURE_GAYA_BAHASA: "Gaya Bahasa",
    LITERATURE_APRESIASI_KARYA: "Apresiasi Karya",
    LITERATURE_MAKNA_SASTRA: "Makna Sastra",
  },
};

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "VERY_HARD"] as const;
export type DifficultyId = (typeof DIFFICULTIES)[number];

export const QUESTION_TYPES = [
  "PILIHAN_GANDA",
  "BENAR_SALAH",
  "ISIAN_SINGKAT",
  "CONSTRUCTED",
] as const;
export type QuestionTypeId = (typeof QUESTION_TYPES)[number];

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const PROVENANCE = [
  "AUTHOR",
  "CURRICULUM",
  "EXISTING_DATA",
  "AI_ASSISTED",
  "HUMAN_REVIEW",
  "EMPIRICAL",
] as const;
export type MetadataProvenance = (typeof PROVENANCE)[number];

export const CONFIDENCE = ["HIGH", "MEDIUM", "LOW"] as const;
export type MetadataConfidence = (typeof CONFIDENCE)[number];

export const METADATA_STATUSES = ["DRAFT", "NEEDS_REVIEW", "APPROVED"] as const;
export type MetadataStatus = (typeof METADATA_STATUSES)[number];

/** Sources yang boleh memakai metadata eksperimen ini. UKBI/TKA sengaja tidak ada. */
export const METADATA_SOURCES = ["JALUR_CERDAS", "BANK_SOAL", "LATIHAN", "GAME"] as const;
export type MetadataSource = (typeof METADATA_SOURCES)[number];

export function hasSkill(skill: string): skill is SkillId {
  return Object.prototype.hasOwnProperty.call(SKILLS, skill);
}

export function hasSubskill(skill: SkillId, subskill: string): boolean {
  return Object.prototype.hasOwnProperty.call(SUBSKILLS[skill], subskill);
}
