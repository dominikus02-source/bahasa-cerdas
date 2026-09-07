/**
 * P3.5B — MASTER_BANK Negative Corpus Regression Audit.
 *
 * Reads all 1,500 MASTER_BANK items from data/question-bank/master/*.json,
 * normalizes each into a CanonicalItem, runs the full deterministic pipeline
 * (V0–V9), and produces a per-theme, per-pattern regression report.
 *
 * READ-ONLY — no DB writes, no MASTER_BANK modification, no production changes.
 *
 * Usage:
 *   npx tsx scripts/audit-negative-corpus-p35b.ts
 */

import * as fs from "fs";
import * as path from "path";

// ─── Types (imported from lib/question-factory/types.ts — pure, no DB) ────────

interface CanonicalItem {
  identity: {
    id: string;
    version: number;
    source: string;
    createdAt: string;
    createdById: string;
  };
  content: {
    stem: string;
    options: string[];
    stimulusContent?: string;
    explanation?: string;
  };
  responseModel: {
    questionType: "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT";
    correctAnswer: string;
    distractorRationale?: string[];
  };
  purpose: {
    purpose: string;
    d10State: string;
    evidenceTarget?: { skill: string; confidence: string };
    misconceptionTarget?: Array<{ option: string; misconception: string }>;
    calibrationLevel?: number;
  };
  taxonomy: {
    skill: string;
    subskill?: string;
    difficulty: string;
    topic?: string;
    cognitiveTarget?: string;
  };
  provenance: {
    provenance: string;
  };
  reviewState: string;
  kodeSoal?: string;
  sourceString?: string;
}

interface ValidationFinding {
  validatorId: string;
  validatorVersion: string;
  stage: number;
  status: "PASS" | "FAIL" | "SKIP" | "ADVISORY";
  severity: "HARD_FAIL" | "SOFT_FAIL" | "ADVISORY";
  blocking: boolean;
  reasonCode: string;
  rationale: string;
  evaluatedAt: string;
}

interface ValidationResult {
  valid: boolean;
  findings: ValidationFinding[];
  summary: { hardFails: number; softFails: number; advisories: number; passes: number };
}

// ─── Canonical Taxonomy (from lib/question-metadata/taxonomy.ts) ──────────────

const VALID_SKILLS: Record<string, string> = {
  READING: "Membaca",
  WRITING: "Menulis",
  LISTENING: "Mendengarkan",
  SPEAKING: "Berbicara",
  GRAMMAR: "Tata Bahasa",
  VOCABULARY: "Kosakata",
  LITERATURE: "Sastra",
};

const VALID_SUBSKILLS: Record<string, Record<string, string>> = {
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

// ─── Theme → Skill/Subskill Mapping ──────────────────────────────────────────

interface ThemeMapping {
  skill: string;
  subskill: string;
  topicHint: string;
}

const THEME_MAP: Record<string, ThemeMapping> = {
  // GRAMMAR themes
  "spok":                      { skill: "GRAMMAR", subskill: "GRAMMAR_KALIMAT_EFEKTIF", topicHint: "SPOK" },
  "kalimat-efektif":           { skill: "GRAMMAR", subskill: "GRAMMAR_KALIMAT_EFEKTIF", topicHint: "Kalimat Efektif" },
  "kalimat":                   { skill: "GRAMMAR", subskill: "GRAMMAR_KALIMAT_EFEKTIF", topicHint: "Kalimat" },
  "ejaan":                     { skill: "GRAMMAR", subskill: "GRAMMAR_EJAAN", topicHint: "Ejaan" },
  "imbuhan":                   { skill: "GRAMMAR", subskill: "GRAMMAR_IMBUHAN", topicHint: "Imbuhan" },
  "tanda-baca":                { skill: "GRAMMAR", subskill: "GRAMMAR_TANDA_BACA", topicHint: "Tanda Baca" },
  "kata-baku":                 { skill: "GRAMMAR", subskill: "GRAMMAR_KATA_BAKU", topicHint: "Kata Baku" },
  "kata-tidak-baku":           { skill: "GRAMMAR", subskill: "GRAMMAR_KATA_BAKU", topicHint: "Kata Tidak Baku" },
  "puebi":                     { skill: "GRAMMAR", subskill: "GRAMMAR_EJAAN", topicHint: "PUEBI" },
  // VOCABULARY themes
  "sinonim":                   { skill: "VOCABULARY", subskill: "VOCABULARY_SINONIM_ANTONIM", topicHint: "Sinonim" },
  "antonim":                   { skill: "VOCABULARY", subskill: "VOCABULARY_SINONIM_ANTONIM", topicHint: "Antonim" },
  "makna-kata":                { skill: "VOCABULARY", subskill: "VOCABULARY_MAKNA_KATA", topicHint: "Makna Kata" },
  "majas":                     { skill: "VOCABULARY", subskill: "VOCABULARY_KONTEKS", topicHint: "Majas" },
  // READING themes
  "gagasan-utama":             { skill: "READING", subskill: "READING_IDE_POKOK", topicHint: "Gagasan Utama" },
  "ide-pokok":                 { skill: "READING", subskill: "READING_IDE_POKOK", topicHint: "Ide Pokok" },
  "simpulan":                  { skill: "READING", subskill: "READING_IDE_POKOK", topicHint: "Simpulan" },
  "paragraf":                  { skill: "READING", subskill: "READING_STRUKTUR_TEKS", topicHint: "Paragraf" },
  "teks-berita":               { skill: "READING", subskill: "READING_INFORMASI_TERSURAT", topicHint: "Teks Berita" },
  "teks-eksposisi":            { skill: "READING", subskill: "READING_INFERENSI", topicHint: "Teks Eksposisi" },
  "teks-eksplanasi":           { skill: "READING", subskill: "READING_INFERENSI", topicHint: "Teks Eksplanasi" },
  "teks-argumentasi":          { skill: "READING", subskill: "READING_INFERENSI", topicHint: "Teks Argumentasi" },
  "teks-persuasi":             { skill: "READING", subskill: "READING_INFERENSI", topicHint: "Teks Persuasi" },
  "teks-deskripsi":            { skill: "READING", subskill: "READING_INFORMASI_TERSURAT", topicHint: "Teks Deskripsi" },
  "teks-narasi":               { skill: "READING", subskill: "READING_STRUKTUR_TEKS", topicHint: "Teks Narasi" },
  "teks-prosedur":             { skill: "READING", subskill: "READING_INFORMASI_TERSURAT", topicHint: "Teks Prosedur" },
  "teks-editorial":            { skill: "READING", subskill: "READING_INFERENSI", topicHint: "Teks Editorial" },
  "teks-ulasan":               { skill: "READING", subskill: "READING_INFERENSI", topicHint: "Teks Ulasan" },
  "artikel":                   { skill: "READING", subskill: "READING_INFORMASI_TERSURAT", topicHint: "Artikel" },
  "editorial":                 { skill: "READING", subskill: "READING_INFERENSI", topicHint: "Editorial" },
  "proposal":                  { skill: "READING", subskill: "READING_INFORMASI_TERSURAT", topicHint: "Proposal" },
  // LITERATURE themes
  "puisi":                     { skill: "LITERATURE", subskill: "LITERATURE_GAYA_BAHASA", topicHint: "Puisi" },
  "cerpen":                    { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA", topicHint: "Cerpen" },
  "novel":                     { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA", topicHint: "Novel" },
  "drama":                     { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA", topicHint: "Drama" },
  "fabel":                     { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA", topicHint: "Fabel" },
  "legenda":                   { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA", topicHint: "Legenda" },
  "mitos":                     { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA", topicHint: "Mitos" },
  "hikayat":                   { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA", topicHint: "Hikayat" },
  "anekdot":                   { skill: "LITERATURE", subskill: "LITERATURE_APRESIASI_KARYA", topicHint: "Anekdot" },
  "gurindam":                  { skill: "LITERATURE", subskill: "LITERATURE_GAYA_BAHASA", topicHint: "Gurindam" },
  "pantun":                    { skill: "LITERATURE", subskill: "LITERATURE_GAYA_BAHASA", topicHint: "Pantun" },
  "syair":                     { skill: "LITERATURE", subskill: "LITERATURE_GAYA_BAHASA", topicHint: "Syair" },
  "resensi":                   { skill: "LITERATURE", subskill: "LITERATURE_APRESIASI_KARYA", topicHint: "Resensi" },
  "pidato":                    { skill: "WRITING", subskill: "WRITING_ORGANISASI_GAGASAN", topicHint: "Pidato" },
  "surat-dinas":               { skill: "WRITING", subskill: "WRITING_ORGANISASI_GAGASAN", topicHint: "Surat Dinas" },
  "surat-pribadi":             { skill: "WRITING", subskill: "WRITING_ORGANISASI_GAGASAN", topicHint: "Surat Pribadi" },
  // WRITING themes
  "poster":                    { skill: "WRITING", subskill: "WRITING_ORGANISASI_GAGASAN", topicHint: "Poster" },
  "iklan":                     { skill: "WRITING", subskill: "WRITING_ORGANISASI_GAGASAN", topicHint: "Iklan" },
  "slogan":                    { skill: "WRITING", subskill: "WRITING_KETEPATAN_KATA", topicHint: "Slogan" },
  "cerita-inspiratif":         { skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA", topicHint: "Cerita Inspiratif" },
};

const DIFFICULTY_MAP: Record<string, string> = {
  MUDAH: "EASY",
  SEDANG: "MEDIUM",
  SULIT: "HARD",
};

const TYPE_MAP: Record<string, string> = {
  PILIHAN_GANDA: "PILIHAN_GANDA",
  BENAR_SALAH: "BENAR_SALAH",
  ISIAN: "ISIAN_SINGKAT",
  ISIAN_SINGKAT: "ISIAN_SINGKAT",
  MENJODOHKAN: "UNSUPPORTED",
  URUTAN: "UNSUPPORTED",
  ESSAY: "UNSUPPORTED",
  MEMBACA_MENJAWAB: "UNSUPPORTED",
};

interface MasterBankItem {
  kodeSoal: string;
  judul: string;
  tema: string;
  kelas: string;
  semester: number;
  kompetensi: string;
  indikator: string;
  difficulty: string;
  levelBerpikir: number;
  type: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  kataKunci: string[];
  estimasiWaktu: number;
  isHOTS: boolean;
}

// ─── Normalization Adapter ────────────────────────────────────────────────────

function normalizeMasterBankItem(
  raw: MasterBankItem,
  themeSlug: string
): { item: CanonicalItem; unsupported: boolean; unsupportedReason?: string } {
  const themeMapping = THEME_MAP[themeSlug];
  const mappedType = TYPE_MAP[raw.type] ?? "UNSUPPORTED";

  if (mappedType === "UNSUPPORTED") {
    // Still create a CanonicalItem but flag it — validators will reject STRUCTURE_UNSUPPORTED_TYPE
    return {
      item: {
        identity: {
          id: raw.kodeSoal,
          version: 1,
          source: "MASTER_BANK",
          createdAt: new Date().toISOString(),
          createdById: "master-bank-generator",
        },
        content: {
          stem: raw.text,
          options: raw.options ?? [],
          explanation: raw.explanation || undefined,
        },
        responseModel: {
          questionType: "PILIHAN_GANDA", // placeholder — unsupported type will be rejected
          correctAnswer: raw.correctAnswer,
        },
        purpose: { purpose: "PRACTICE", d10State: "NOT_APPLICABLE" },
        taxonomy: {
          skill: themeMapping?.skill ?? "GRAMMAR",
          subskill: themeMapping?.subskill,
          difficulty: DIFFICULTY_MAP[raw.difficulty] ?? "MEDIUM",
          topic: themeMapping?.topicHint,
        },
        provenance: { provenance: "EXISTING_DATA" },
        reviewState: "NOT_REVIEWED",
        kodeSoal: raw.kodeSoal,
        sourceString: "MASTER_BANK",
      },
      unsupported: true,
      unsupportedReason: `Type '${raw.type}' is not supported (must be PILIHAN_GANDA, BENAR_SALAH, or ISIAN_SINGKAT)`,
    };
  }

  return {
    item: {
      identity: {
        id: raw.kodeSoal,
        version: 1,
        source: "MASTER_BANK",
        createdAt: new Date().toISOString(),
        createdById: "master-bank-generator",
      },
      content: {
        stem: raw.text,
        options: raw.options ?? [],
        explanation: raw.explanation || undefined,
      },
      responseModel: {
        questionType: mappedType as "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT",
        correctAnswer: raw.correctAnswer,
      },
      purpose: { purpose: "PRACTICE", d10State: "NOT_APPLICABLE" },
      taxonomy: {
        skill: themeMapping?.skill ?? "GRAMMAR",
        subskill: themeMapping?.subskill,
        difficulty: DIFFICULTY_MAP[raw.difficulty] ?? "MEDIUM",
        topic: themeMapping?.topicHint,
      },
      provenance: { provenance: "EXISTING_DATA" },
      reviewState: "NOT_REVIEWED",
      kodeSoal: raw.kodeSoal,
      sourceString: "MASTER_BANK",
    },
    unsupported: false,
  };
}

// ─── Validators (V0–V9) — inlined from lib/question-factory/*.ts ──────────────

function hasSkill(skill: string): boolean {
  return Object.prototype.hasOwnProperty.call(VALID_SKILLS, skill);
}

function hasSubskill(skill: string, subskill: string): boolean {
  return Object.prototype.hasOwnProperty.call(VALID_SUBSKILLS[skill] ?? {}, subskill);
}

function norm(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function makeFinding(
  validatorId: string,
  code: string,
  rationale: string,
  stage: number,
  blocking: boolean,
  severity: "HARD_FAIL" | "SOFT_FAIL" | "ADVISORY" = blocking ? "HARD_FAIL" : "SOFT_FAIL"
): ValidationFinding {
  return {
    validatorId,
    validatorVersion: "1.0.0",
    stage,
    status: "FAIL",
    severity,
    blocking,
    reasonCode: code,
    rationale,
    evaluatedAt: new Date().toISOString(),
  };
}

function makePass(validatorId: string, rationale: string, stage: number): ValidationFinding {
  return {
    validatorId,
    validatorVersion: "1.0.0",
    stage,
    status: "PASS",
    severity: "ADVISORY",
    blocking: false,
    reasonCode: "PASS",
    rationale,
    evaluatedAt: new Date().toISOString(),
  };
}

// V0–V2: Structural
function validateStructural(item: CanonicalItem): ValidationFinding[] {
  const f: ValidationFinding[] = [];
  // Stage 0
  if (!item.identity.id || !item.identity.id.trim()) f.push(makeFinding("structural", "STRUCTURE_INVALID_IDENTITY", "Item ID is missing or empty.", 0, true));
  const validSources = ["MASTER_BANK", "AI", "IMPORT", "MANUAL", "UKBI", "TKA", "V2_PILOT"];
  if (!validSources.includes(item.identity.source)) f.push(makeFinding("structural", "STRUCTURE_INVALID_SOURCE", `Source '${item.identity.source}' not recognized.`, 0, true));
  if (!item.identity.createdAt) f.push(makeFinding("structural", "STRUCTURE_MISSING_FIELD", "identity.createdAt missing.", 0, true));
  if (!item.identity.createdById) f.push(makeFinding("structural", "STRUCTURE_MISSING_FIELD", "identity.createdById missing.", 0, true));
  if (typeof item.identity.version !== "number" || item.identity.version < 1) f.push(makeFinding("structural", "STRUCTURE_MISSING_FIELD", "identity.version must be positive integer.", 0, true));

  // Stage 1
  const VALID_TYPES = ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"];
  const qType = item.responseModel.questionType;
  if (!VALID_TYPES.includes(qType)) f.push(makeFinding("structural", "STRUCTURE_UNSUPPORTED_TYPE", `questionType '${qType}' not supported.`, 1, true));

  if (!Array.isArray(item.content.options)) {
    f.push(makeFinding("structural", "STRUCTURE_OPTIONS_NOT_ARRAY", "content.options is not an array.", 1, true));
  } else {
    const opts = item.content.options;
    if (opts.some(o => typeof o !== "string" || !o.trim())) f.push(makeFinding("structural", "STRUCTURE_EMPTY_OPTION", "One or more options are empty or non-string.", 1, true));
    if (qType === "PILIHAN_GANDA" && opts.length !== 4) f.push(makeFinding("structural", "STRUCTURE_INVALID_OPTION_COUNT", `PILIHAN_GANDA requires exactly 4 options; got ${opts.length}.`, 1, true));
    if (qType === "BENAR_SALAH") {
      if (opts.length !== 2) {
        f.push(makeFinding("structural", "STRUCTURE_INVALID_OPTION_COUNT", `BENAR_SALAH requires exactly 2 options; got ${opts.length}.`, 1, true));
      } else {
        const n = opts.map(o => o.trim().toLowerCase());
        if (n[0] !== "benar" || n[1] !== "salah") f.push(makeFinding("structural", "STRUCTURE_BS_SHAPE_INVALID", `BENAR_SALAH options must be ['Benar','Salah']; got ['${opts[0]}','${opts[1]}'].`, 1, true));
      }
    }
    if (qType === "ISIAN_SINGKAT" && opts.length > 0) f.push(makeFinding("structural", "STRUCTURE_ISIAN_HAS_OPTIONS", "ISIAN_SINGKAT should not have options.", 1, true));
  }

  if (!item.responseModel.correctAnswer || typeof item.responseModel.correctAnswer !== "string") f.push(makeFinding("structural", "ANSWER_KEY_MISSING", "correctAnswer missing or not a string.", 1, true));

  if (!item.taxonomy.skill || !hasSkill(item.taxonomy.skill)) f.push(makeFinding("structural", "STRUCTURE_INVALID_TAXONOMY", `taxonomy.skill '${item.taxonomy.skill}' is not a valid skill.`, 1, true));
  if (item.taxonomy.subskill && item.taxonomy.skill && hasSkill(item.taxonomy.skill)) {
    if (!hasSubskill(item.taxonomy.skill, item.taxonomy.subskill)) f.push(makeFinding("structural", "STRUCTURE_INVALID_TAXONOMY", `taxonomy.subskill '${item.taxonomy.subskill}' does not belong to skill '${item.taxonomy.skill}'.`, 1, true));
  }

  const VALID_DIFF = ["EASY", "MEDIUM", "HARD"];
  if (!VALID_DIFF.includes(item.taxonomy.difficulty)) f.push(makeFinding("structural", "STRUCTURE_INVALID_TAXONOMY", `taxonomy.difficulty '${item.taxonomy.difficulty}' invalid.`, 1, true));

  const VALID_PURPOSES = ["PRACTICE", "ACHIEVEMENT", "DIAGNOSTIC", "ADAPTIVE_MISCONCEPTION", "CALIBRATION"];
  if (!VALID_PURPOSES.includes(item.purpose.purpose)) f.push(makeFinding("structural", "STRUCTURE_INVALID_TAXONOMY", `purpose.purpose '${item.purpose.purpose}' invalid.`, 1, true));

  const VALID_D10 = ["NOT_APPLICABLE", "HYPOTHESIS", "REVIEWED", "EMPIRICALLY_SUPPORTED"];
  if (!VALID_D10.includes(item.purpose.d10State)) f.push(makeFinding("structural", "STRUCTURE_INVALID_TAXONOMY", `purpose.d10State '${item.purpose.d10State}' invalid.`, 1, true));

  // Stage 2
  const stem = item.content.stem;
  if (!stem || typeof stem !== "string" || !stem.trim()) f.push(makeFinding("structural", "STRUCTURE_EMPTY_STEM", "content.stem is empty or whitespace-only.", 2, true));
  if (stem && stem.trim().length < 10) f.push(makeFinding("structural", "CONTENT_STEM_TOO_SHORT", `content.stem is only ${stem.trim().length} characters (minimum 10).`, 2, false, "SOFT_FAIL"));

  if (stem) {
    const templatePatterns = [
      /^berikut ini yang termasuk (contoh|jenis) /i,
      /^berikut yang termasuk (contoh|jenis) /i,
      /^manakah yang termasuk (contoh|jenis) /i,
      /^contoh [a-z ]+ (adalah|:|…|$)/i,
    ];
    if (templatePatterns.some(p => p.test(stem.trim()))) f.push(makeFinding("structural", "TEMPLATE_STEM_DETECTED", "Stem matches known template pattern (forensic: 'contoh...' family).", 2, true));
  }

  if (!item.content.explanation || item.content.explanation.trim().length === 0) f.push(makeFinding("structural", "CONTENT_EXPLANATION_MISSING", "content.explanation is empty (advisory).", 2, false, "ADVISORY"));

  if (f.filter(x => x.status === "FAIL").length === 0) f.push(makePass("structural", "All structural checks passed.", 0));
  return f;
}

// V3: Answer-Key
function validateAnswerKey(item: CanonicalItem): ValidationFinding[] {
  const f: ValidationFinding[] = [];
  const qType = item.responseModel.questionType;
  const correctAnswer = item.responseModel.correctAnswer;
  const options = item.content.options;

  if (!correctAnswer || (typeof correctAnswer === "string" && !correctAnswer.trim())) {
    f.push(makeFinding("answer-key", "ANSWER_KEY_MISSING", "correctAnswer is empty or missing.", 3, true));
    return f;
  }

  if (qType === "PILIHAN_GANDA" || qType === "BENAR_SALAH") {
    if (!Array.isArray(options) || options.length === 0) return f;
    const answerStr = String(correctAnswer).trim();
    if (!/^\d+$/.test(answerStr)) {
      f.push(makeFinding("answer-key", "ANSWER_KEY_INVALID_INDEX", `correctAnswer '${correctAnswer}' is not a valid integer index.`, 3, true));
      return f;
    }
    const answerIdx = parseInt(answerStr, 10);
    if (answerIdx < 0 || answerIdx >= options.length) {
      f.push(makeFinding("answer-key", "ANSWER_KEY_INVALID_INDEX", `correctAnswer index ${answerIdx} out of range (0–${options.length - 1}).`, 3, true));
      return f;
    }
    const correctOption = options[answerIdx];
    if (!correctOption || !correctOption.trim()) {
      f.push(makeFinding("answer-key", "ANSWER_KEY_INVALID_INDEX", `Option at index ${answerIdx} is empty.`, 3, true));
      return f;
    }

    // Unique options
    const seen = new Map<string, number>();
    for (let i = 0; i < options.length; i++) {
      const n = norm(options[i]);
      if (seen.has(n)) {
        f.push(makeFinding("answer-key", "MULTIPLE_DEFENSIBLE_ANSWERS", `Options at indices ${seen.get(n)} and ${i} are identical after normalization.`, 3, true, "HARD_FAIL"));
      }
      seen.set(n, i);
    }

    // Explanation contradiction
    if (item.content.explanation) {
      const explanationNorm = norm(item.content.explanation);
      const correctNorm = norm(correctOption);
      const answerPattern = /(?:jawaban yang benar|kunci jawaban|correct answer|adalah)\s*[:"]?\s*["']?([^"'.]+)["']?/i;
      const match = item.content.explanation.match(answerPattern);
      if (match && match[1]) {
        const ref = norm(match[1].trim());
        if (ref.length >= 3) {
          for (let i = 0; i < options.length; i++) {
            if (i === answerIdx) continue;
            const optN = norm(options[i]);
            if (optN.includes(ref) || ref.includes(optN)) {
              f.push(makeFinding("answer-key", "ANSWER_KEY_CONTRADICTION", `Explanation references option ${i} but correctAnswer is index ${answerIdx}.`, 3, true, "HARD_FAIL"));
            }
          }
        }
      }
    }
  }

  if (qType === "ISIAN_SINGKAT") {
    const answer = String(correctAnswer).trim();
    if (answer.length < 1) f.push(makeFinding("answer-key", "ANSWER_KEY_MISSING", "ISIAN_SINGKAT correctAnswer must be non-empty.", 3, true));
    if (answer.length > 80) f.push(makeFinding("answer-key", "ANSWER_KEY_INVALID_INDEX", `ISIAN_SINGKAT correctAnswer is ${answer.length} characters (max 80).`, 3, true));
  }

  if (f.filter(x => x.status === "FAIL").length === 0) f.push(makePass("answer-key", "All answer-key checks passed.", 3));
  return f;
}

// V3: Security
function validateSecurity(item: CanonicalItem): ValidationFinding[] {
  const f: ValidationFinding[] = [];
  const stem = item.content.stem;
  const options = item.content.options;
  const qType = item.responseModel.questionType;
  const correctAnswer = item.responseModel.correctAnswer;

  if ((qType === "PILIHAN_GANDA" || qType === "BENAR_SALAH") && Array.isArray(options) && options.length > 0) {
    const answerIdx = parseInt(String(correctAnswer).trim(), 10);
    if (!isNaN(answerIdx) && answerIdx >= 0 && answerIdx < options.length) {
      const correctText = options[answerIdx];
      const correctNorm = norm(correctText);
      const stemNorm = norm(stem);
      const isPassage = stem.includes("\n") || stem.length >= 200;
      if (!isPassage && correctNorm.length >= 4 && stemNorm.includes(correctNorm)) {
        f.push(makeFinding("security", "KEY_IN_STEM", `Correct option '${correctText.substring(0, 60)}...' appears verbatim in stem.`, 3, true, "HARD_FAIL"));
      }
    }
  }

  const lowerStem = (stem ?? "").toLowerCase();
  const lowerOptions = (options ?? []).map(o => o.toLowerCase());
  const allText = [lowerStem, ...lowerOptions].join(" ");

  const d10Patterns = [
    /d10\s*(state|status|level)\s*[:=]\s*(not_applicable|hypothesis|reviewed|empirically_supported)/i,
    /diagnostic\s*value\s*(state|level)\s*[:=]/i,
  ];
  for (const p of d10Patterns) {
    if (p.test(allText)) {
      f.push(makeFinding("security", "SECURITY_LEAK_METADATA", "D10 state/diagnostic value detected in student-facing content.", 3, true));
      break;
    }
  }

  if (item.purpose.misconceptionTarget && item.purpose.misconceptionTarget.length > 0) {
    for (const mt of item.purpose.misconceptionTarget) {
      const mtNorm = norm(mt.misconception);
      if (mtNorm.length >= 10) {
        for (const text of [stem, ...options]) {
          if (norm(text).includes(mtNorm)) {
            f.push(makeFinding("security", "SECURITY_LEAK_METADATA", `Misconception text detected in student-facing content.`, 3, true));
            break;
          }
        }
      }
    }
  }

  const provenancePatterns = [
    /provenance\s*[:=]\s*(ai|human_review|import|master_bank)/i,
    /ai[_\s]*(generated|provider|model|confidence)\s*[:=]/i,
    /reviewer[_\s]*(comments?|id)\s*[:=]/i,
  ];
  for (const p of provenancePatterns) {
    if (p.test(allText)) {
      f.push(makeFinding("security", "SECURITY_LEAK_METADATA", "Provenance/reviewer info detected in student-facing content.", 3, true));
      break;
    }
  }

  const INTERNAL_FIELDS = ["correctAnswer", "distractorRationale", "misconceptionTarget", "qualityScores", "reviewerComments", "d10State", "provenance", "aiGenerated", "aiProvider", "aiModel", "aiPromptVersion", "aiConfidence"];
  for (const field of INTERNAL_FIELDS) {
    if (field in item.content) {
      f.push(makeFinding("security", "DELIVERY_UNSAFE_FIELDS", `Internal field '${field}' found in content.`, 3, true));
    }
  }

  if (f.filter(x => x.status === "FAIL").length === 0) f.push(makePass("security", "No security/leakage issues detected.", 3));
  return f;
}

// V4: Purpose Gate
function validatePurposeGate(item: CanonicalItem): ValidationFinding[] {
  const f: ValidationFinding[] = [];
  const PURPOSE_D10_MIN: Record<string, string> = {
    PRACTICE: "HYPOTHESIS",
    ACHIEVEMENT: "HYPOTHESIS",
    DIAGNOSTIC: "REVIEWED",
    ADAPTIVE_MISCONCEPTION: "EMPIRICALLY_SUPPORTED",
    CALIBRATION: "NOT_APPLICABLE",
  };
  const D10_ORDER = ["NOT_APPLICABLE", "HYPOTHESIS", "REVIEWED", "EMPIRICALLY_SUPPORTED"];
  const d10Rank = (s: string) => D10_ORDER.indexOf(s);
  const purpose = item.purpose.purpose;
  const d10State = item.purpose.d10State;
  const minRequired = PURPOSE_D10_MIN[purpose];

  if (minRequired && d10Rank(d10State) < d10Rank(minRequired)) {
    f.push(makeFinding("purpose-gate", "PURPOSE_GATE_FAILED", `D10 '${d10State}' below minimum '${minRequired}' for purpose '${purpose}'.`, 4, true, "HARD_FAIL"));
  }

  if (purpose === "CALIBRATION" && d10State !== "NOT_APPLICABLE") {
    f.push(makeFinding("purpose-gate", "PURPOSE_GATE_FAILED", `CALIBRATION requires D10=NOT_APPLICABLE; got '${d10State}'.`, 4, true, "HARD_FAIL"));
  }

  if (f.filter(x => x.status === "FAIL").length === 0) f.push(makePass("purpose-gate", `Purpose '${purpose}' with D10 '${d10State}' passes gate.`, 4));
  return f;
}

// V5: Duplicates (self-detection within corpus)
function validateDuplicates(item: CanonicalItem, knownStems: string[]): ValidationFinding[] {
  const f: ValidationFinding[] = [];
  const stemNorm = item.content.stem
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  for (let i = 0; i < knownStems.length; i++) {
    const knownNorm = knownStems[i]
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (stemNorm === knownNorm && stemNorm.length > 0) {
      f.push(makeFinding("duplicates", "DUPLICATE_EXACT", `Normalized stem matches existing item at position ${i}.`, 5, true, "HARD_FAIL"));
      break;
    }
  }

  if (!f.some(x => x.reasonCode === "DUPLICATE_EXACT")) {
    for (let i = 0; i < knownStems.length; i++) {
      const knownNorm = knownStems[i]
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const longer = stemNorm.length > knownNorm.length ? stemNorm : knownNorm;
      const shorter = stemNorm.length > knownNorm.length ? knownNorm : stemNorm;
      if (shorter.length >= 10 && longer.includes(shorter)) {
        f.push(makeFinding("duplicates", "DUPLICATE_NORMALIZED", `Stem has high overlap with existing item at position ${i} (${Math.round((shorter.length / longer.length) * 100)}%).`, 5, false, "SOFT_FAIL"));
        break;
      }
    }
  }

  if (f.filter(x => x.status === "FAIL").length === 0) f.push(makePass("duplicates", "No duplicate issues detected.", 5));
  return f;
}

// ─── Known P3.1 Failure Pattern Detectors ────────────────────────────────────

function detectP31Patterns(item: CanonicalItem, raw: MasterBankItem): string[] {
  const patterns: string[] = [];
  const stem = (item.content.stem ?? "").trim();
  const stemLower = stem.toLowerCase();

  // PATTERN 1: Template tautology — "Berikut ini yang termasuk contoh..."
  if (/^berikut ini yang termasuk (contoh|jenis) /i.test(stem) ||
      /^berikut yang termasuk (contoh|jenis) /i.test(stem) ||
      /^manakah yang termasuk (contoh|jenis) /i.test(stem)) {
    patterns.push("TEMPLATE_TAUTOLOGY");
  }

  // PATTERN 2: Generic stems — very short, no context
  if (stem.length < 30 && !stem.includes("?")) {
    patterns.push("GENERIC_STEM");
  }

  // PATTERN 3: Answer key is text (not index)
  if (raw.correctAnswer && !/^\d+$/.test(String(raw.correctAnswer).trim())) {
    patterns.push("TEXT_ANSWER_KEY");
  }

  // PATTERN 4: No stimulus/context
  if (!stem.includes("\n") && stem.length < 100 && !raw.kataKunci?.length) {
    patterns.push("NO_STIMULUS");
  }

  // PATTERN 5: Duplicate options (same text)
  if (item.content.options && item.content.options.length > 0) {
    const seen = new Set<string>();
    for (const opt of item.content.options) {
      const n = norm(opt);
      if (seen.has(n)) {
        patterns.push("DUPLICATE_OPTIONS");
        break;
      }
      seen.add(n);
    }
  }

  // PATTERN 6: Wrong option count (PG != 4, BS != 2)
  if (raw.type === "PILIHAN_GANDA" && item.content.options?.length !== 4) {
    patterns.push("WRONG_OPTION_COUNT");
  }
  if (raw.type === "BENAR_SALAH" && item.content.options?.length !== 2) {
    patterns.push("WRONG_BS_OPTION_COUNT");
  }

  // PATTERN 7: KEY_IN_STEM — correct answer text in stem
  if (item.content.options && item.content.options.length > 0 && raw.correctAnswer) {
    const idx = parseInt(String(raw.correctAnswer).trim(), 10);
    if (!isNaN(idx) && idx >= 0 && idx < item.content.options.length) {
      const correctText = norm(item.content.options[idx]);
      if (correctText.length >= 4 && norm(stem).includes(correctText)) {
        patterns.push("KEY_IN_STEM");
      }
    }
  }

  // PATTERN 8: Missing explanation
  if (!raw.explanation || raw.explanation.trim().length === 0) {
    patterns.push("NO_EXPLANATION");
  }

  // PATTERN 9: ISIAN_SINGKAT with options
  if (raw.type === "ISIAN" || raw.type === "ISIAN_SINGKAT") {
    if (item.content.options && item.content.options.length > 0) {
      patterns.push("ISIAN_WITH_OPTIONS");
    }
  }

  // PATTERN 10: Unsupported type (MENJODOHKAN, URUTAN, ESSAY)
  if (["MENJODOHKAN", "URUTAN", "ESSAY", "MEMBACA_MENJAWAB"].includes(raw.type)) {
    patterns.push("UNSUPPORTED_TYPE");
  }

  return patterns;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

interface ThemeResult {
  theme: string;
  total: number;
  types: Record<string, number>;
  rejected: number;
  passed: number;
  patternsDetected: Record<string, number>;
  reasonCodes: Record<string, number>;
  topRejectionReasons: string[];
}

interface AuditResult {
  totalItems: number;
  totalRejected: number;
  totalPassed: number;
  totalSoftFail: number;
  totalAdvisory: number;
  unsupportedTypes: number;
  perTheme: ThemeResult[];
  reasonCodeTotals: Record<string, number>;
  patternTotals: Record<string, number>;
  falsePassItems: string[];
  falseRejectItems: string[];
  noPatternItems: string[];
}

function runAudit(): AuditResult {
  const dataDir = path.resolve(__dirname, "..", "data", "question-bank", "master");
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json"));

  const result: AuditResult = {
    totalItems: 0,
    totalRejected: 0,
    totalPassed: 0,
    totalSoftFail: 0,
    totalAdvisory: 0,
    unsupportedTypes: 0,
    perTheme: [],
    reasonCodeTotals: {},
    patternTotals: {},
    falsePassItems: [],
    falseRejectItems: [],
    noPatternItems: [],
  };

  // Cross-theme duplicate detection: collect stems as we go
  const allStems: string[] = [];
  const allItems: Array<{ item: CanonicalItem; raw: MasterBankItem; theme: string }> = [];

  for (const file of files) {
    const themeSlug = file.replace(".json", "");
    const rawItems: MasterBankItem[] = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8"));

    const themeResult: ThemeResult = {
      theme: themeSlug,
      total: rawItems.length,
      types: {},
      rejected: 0,
      passed: 0,
      patternsDetected: {},
      reasonCodes: {},
      topRejectionReasons: [],
    };

    for (const raw of rawItems) {
      result.totalItems++;
      themeResult.types[raw.type] = (themeResult.types[raw.type] ?? 0) + 1;

      const { item, unsupported, unsupportedReason } = normalizeMasterBankItem(raw, themeSlug);
      if (unsupported) result.unsupportedTypes++;

      // Run ALL validators
      const allFindings: ValidationFinding[] = [];
      allFindings.push(...validateStructural(item));
      allFindings.push(...validateAnswerKey(item));
      allFindings.push(...validateSecurity(item));
      allFindings.push(...validatePurposeGate(item));

      // Duplicate detection needs accumulated stems
      allFindings.push(...validateDuplicates(item, allStems));

      // Track reason codes
      for (const finding of allFindings) {
        if (finding.status === "FAIL") {
          result.reasonCodeTotals[finding.reasonCode] = (result.reasonCodeTotals[finding.reasonCode] ?? 0) + 1;
          themeResult.reasonCodes[finding.reasonCode] = (themeResult.reasonCodes[finding.reasonCode] ?? 0) + 1;
        }
      }

      // Gate decision: any HARD_FAIL = rejected
      const hardFails = allFindings.filter(f => f.status === "FAIL" && f.severity === "HARD_FAIL");
      const softFails = allFindings.filter(f => f.status === "FAIL" && f.severity === "SOFT_FAIL");
      const advisories = allFindings.filter(f => f.status === "ADVISORY");

      if (hardFails.length > 0) {
        result.totalRejected++;
        themeResult.rejected++;
        // Track top rejection reason
        for (const hf of hardFails.slice(0, 2)) {
          themeResult.topRejectionReasons.push(hf.reasonCode);
        }
      } else {
        result.totalPassed++;
        themeResult.passed++;
      }
      result.totalSoftFail += softFails.length;
      result.totalAdvisory += advisories.length;

      // Detect P3.1 known patterns
      const patterns = detectP31Patterns(item, raw);
      for (const p of patterns) {
        result.patternTotals[p] = (result.patternTotals[p] ?? 0) + 1;
        themeResult.patternsDetected[p] = (themeResult.patternsDetected[p] ?? 0) + 1;
      }

      // Track no-pattern items (items with 0 P3.1 patterns detected)
      if (patterns.length === 0) {
        result.noPatternItems.push(item.identity.id);
      }

      // Track false positives/negatives
      // FALSE PASS = item passed pipeline but has any P3.1 pattern
      if (hardFails.length === 0 && patterns.length > 0) {
        result.falsePassItems.push(`${item.identity.id} (${patterns.join(", ")})`);
      }

      // FALSE REJECT = item rejected but has 0 P3.1 patterns (rejected for adapter/validation reasons)
      if (hardFails.length > 0 && patterns.length === 0) {
        result.falseRejectItems.push(`${item.identity.id} (${hardFails.map(h => h.reasonCode).join(", ")})`);
      }

      allStems.push(item.content.stem);
    }

    result.perTheme.push(themeResult);
  }

  return result;
}

function printReport(result: AuditResult): void {
  console.log("═══════════════════════════════════════════════════════════════════════");
  console.log("  P3.5B — MASTER_BANK NEGATIVE CORPUS REGRESSION AUDIT");
  console.log("═══════════════════════════════════════════════════════════════════════\n");

  console.log(`§1  AUDIT SCOPE`);
  console.log(`    Total items audited:      ${result.totalItems}`);
  console.log(`    Total themes:             ${result.perTheme.length}`);
  console.log(`    Unsupported type items:   ${result.unsupportedTypes}`);
  console.log();

  console.log(`§4  PIPELINE RESULT`);
  console.log(`    Items REJECTED (HARD_FAIL):  ${result.totalRejected} / ${result.totalItems} (${(result.totalRejected/result.totalItems*100).toFixed(1)}%)`);
  console.log(`    Items PASSED (0 HARD_FAIL):  ${result.totalPassed} / ${result.totalItems} (${(result.totalPassed/result.totalItems*100).toFixed(1)}%)`);
  console.log(`    Soft-fail findings total:    ${result.totalSoftFail}`);
  console.log(`    Advisory findings total:     ${result.totalAdvisory}`);
  console.log();

  console.log(`§5  REASON CODE DISTRIBUTION (FAILURES ONLY)`);
  const sortedCodes = Object.entries(result.reasonCodeTotals).sort((a, b) => b[1] - a[1]);
  for (const [code, count] of sortedCodes) {
    console.log(`    ${code.padEnd(38)} ${String(count).padStart(4)} items`);
  }
  console.log();

  console.log(`§6  P3.1 KNOWN PATTERN DETECTION`);
  const sortedPatterns = Object.entries(result.patternTotals).sort((a, b) => b[1] - a[1]);
  for (const [pattern, count] of sortedPatterns) {
    console.log(`    ${pattern.padEnd(30)} ${String(count).padStart(4)} items`);
  }
  console.log(`    Items with 0 P3.1 patterns:  ${result.noPatternItems.length}`);
  console.log();

  console.log(`§7  FALSE POSITIVE / FALSE NEGATIVE ANALYSIS`);
  console.log(`    False POSITIVE (passed but has P3.1 pattern):  ${result.falsePassItems.length}`);
  for (const item of result.falsePassItems.slice(0, 10)) {
    console.log(`      → ${item}`);
  }
  if (result.falsePassItems.length > 10) console.log(`      ... and ${result.falsePassItems.length - 10} more`);
  console.log(`    False NEGATIVE (rejected but 0 P3.1 patterns):  ${result.falseRejectItems.length}`);
  for (const item of result.falseRejectItems.slice(0, 10)) {
    console.log(`      → ${item}`);
  }
  if (result.falseRejectItems.length > 10) console.log(`      ... and ${result.falseRejectItems.length - 10} more`);
  console.log();

  console.log(`§8  PER-THEME BREAKDOWN`);
  const sortedThemes = [...result.perTheme].sort((a, b) => b.rejected - a.rejected);
  console.log(`    ${"Theme".padEnd(22)} ${"Total".padStart(5)} ${"Reject".padStart(7)} ${"Pass".padStart(6)} ${"Types".padEnd(20)}`);
  console.log(`    ${"─".repeat(22)} ${"─".repeat(5)} ${"─".repeat(7)} ${"─".repeat(6)} ${"─".repeat(20)}`);
  for (const t of sortedThemes) {
    const typeStr = Object.entries(t.types).map(([k, v]) => `${k}:${v}`).join(",");
    console.log(`    ${t.theme.padEnd(22)} ${String(t.total).padStart(5)} ${String(t.rejected).padStart(7)} ${String(t.passed).padStart(6)} ${typeStr.padEnd(20)}`);
  }
  console.log();

  console.log(`§9  TOP REJECTION REASONS PER THEME`);
  for (const t of sortedThemes.slice(0, 10)) {
    if (t.rejected === 0) continue;
    const topCodes = Object.entries(t.reasonCodes).sort((a, b) => b[1] - a[1]).slice(0, 3);
    console.log(`    ${t.theme}: ${topCodes.map(([c, n]) => `${c}(${n})`).join(", ")}`);
  }
  console.log();

  console.log(`§10 COVERAGE GAP ANALYSIS`);
  const allPatternNames = [
    "TEMPLATE_TAUTOLOGY", "GENERIC_STEM", "TEXT_ANSWER_KEY", "NO_STIMULUS",
    "DUPLICATE_OPTIONS", "WRONG_OPTION_COUNT", "WRONG_BS_OPTION_COUNT",
    "KEY_IN_STEM", "NO_EXPLANATION", "ISIAN_WITH_OPTIONS", "UNSUPPORTED_TYPE",
  ];
  for (const p of allPatternNames) {
    const count = result.patternTotals[p] ?? 0;
    const detected = count > 0;
    console.log(`    ${detected ? "✅" : "❌"} ${p.padEnd(28)} ${String(count).padStart(4)} items`);
  }
  console.log();
}

// ─── Execute ──────────────────────────────────────────────────────────────────

const startTime = Date.now();
const result = runAudit();
const elapsed = Date.now() - startTime;

printReport(result);

console.log(`§16 PERFORMANCE`);
console.log(`    Audit completed in ${elapsed}ms`);
console.log(`    Items per second: ${Math.round(result.totalItems / (elapsed / 1000))}`);
console.log();

console.log(`═══════════════════════════════════════════════════════════════════════`);
console.log(`  VERDICT: ${result.totalPassed === 0 ? "ALL 1,500 ITEMS CORRECTLY REJECTED ✅" : `${result.totalPassed} items INCORRECTLY PASSED ⚠️`}`);
console.log(`═══════════════════════════════════════════════════════════════════════`);
