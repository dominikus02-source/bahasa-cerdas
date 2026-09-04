/**
 * BANK GATE — Content safety gate (canonical) untuk butir bank Tes Awal.
 *
 * P0.5 containment: butir bank yang rusak tidak boleh sampai ke murid lewat
 * jalur fallback AI-adaptif maupun sesi bank. Audit menemukan satu keluarga
 * template rusak di pool live — "Berikut ini yang termasuk contoh {topik}
 * adalah…" dengan kunci = kata topik itu sendiri dan distraktor lintas-topik
 * yang sama — plus isian-singkat ber-opsi palsu, opsi duplikat, dan kunci di
 * luar jangkauan.
 *
 * Gate MURNI (deterministik, tanpa DB/LLM/side-effect). SENG AJA tidak memakai
 * heuristik semantik fuzzy: hanya aturan struktural/template yang terbukti.
 * Tidak pernah mengekspos `reasons` ke murid.
 *
 * Dipakai di dua titik (defense in depth):
 *   A. buildDiagnosticCandidates()  — konstruksi pool
 *   B. bankFallbackFor()            — penyerahan butir fallback (re-check)
 */
import { normalizeText } from "./validator";
import type { AiQuestionType } from "./types";

export type DiagnosticSafeReason =
  | "TYPE_UNSUPPORTED" // tipe bukan PILIHAN_GANDA/BENAR_SALAH/ISIAN_SINGKAT
  | "OPTIONS_SHAPE" // options bukan array string / ada elemen non-string
  | "TEXT_MISSING" // prompt kosong
  | "TEXT_TOO_SHORT" // prompt < 10 karakter
  | "TEMPLATE_STEM" // keluarga template "contoh {topik}" yang teraudit rusak
  | "FILLER_DISTRACTORS" // distraktor isian lintas-topik yang teraudit
  | "OPTIONS_TOO_FEW" // PG/BENAR_SALAH dengan < 2 opsi
  | "EMPTY_OPTION" // ada opsi kosong
  | "DUPLICATE_OPTION" // teks opsi duplikat (dinormalisasi)
  | "BS_SHAPE" // BENAR_SALAH bukan persis ["Benar","Salah"]
  | "ISIAN_HAS_OPTIONS" // ISIAN_SINGKAT menyimpan opsi
  | "KEY_MISSING" // kunci jawaban kosong
  | "KEY_NOT_INDEX" // kunci PG/BS bukan indeks opsi
  | "KEY_OUT_OF_RANGE" // indeks kunci di luar opsi
  | "KEY_IN_STEM" // kebocoran kunci: teks opsi kunci tertulis di prompt
  | "STEM_DUPLICATE"; // stem sama dengan butir yang sudah dipakai sesi ini

export interface DiagnosticSafeIssue {
  code: DiagnosticSafeReason;
  detail: string;
}

export interface DiagnosticSafeResult {
  safe: boolean;
  reasons: string[];
}

export interface DiagnosticSafeInput {
  /** kodeSoal / id butir (hanya untuk pesan dan log). */
  id?: string;
  text: string;
  options: unknown;
  /** Tipe soal (mentah pun diterima; yang tak dikenal ditolak). */
  questionType: string;
  /** Kunci tersimpan: indeks (PG/BS) atau teks (isian). */
  correctAnswer: unknown;
  /** Stem yang sudah dipakai sesi ini (anti konten sama dua kali). */
  avoidStems?: string[];
}

const QUESTION_TYPES: AiQuestionType[] = ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"];
const KEY_INDEX = /^\d+$/;

/** Prefix keluarga template artefak teraudit. */
const TEMPLATE_PREFIXES = [
  /^berikut ini yang termasuk (contoh|jenis) /,
  /^berikut yang termasuk (contoh|jenis) /,
  /^manakah yang termasuk (contoh|jenis) /,
  /^contoh [a-z ]+ (adalah|:|…|$)/,
];

/** Distraktor isian lintas-topik yang teraudit (keluarga template rusak). */
const KNOWN_FILLER_DISTRACTORS = [
  "menulis cerita pendek",
  "membaca puisi",
  "menyusun laporan",
];

function isTemplateStem(text: string): boolean {
  const stem = normalizeText(text);
  if (!stem) return false;
  return TEMPLATE_PREFIXES.some((pattern) => pattern.test(stem));
}

function collectIssues(input: DiagnosticSafeInput): { issues: DiagnosticSafeIssue[]; text: string; options: string[]; type: AiQuestionType | null } {
  const issues: DiagnosticSafeIssue[] = [];
  const label = input.id ? `[${input.id}] ` : "";
  const text = input.text.trim();
  const stem = normalizeText(text);

  const questionType = String(input.questionType ?? "").toUpperCase();
  const type: AiQuestionType | null = QUESTION_TYPES.includes(questionType as AiQuestionType) ? (questionType as AiQuestionType) : null;
  if (!type) issues.push({ code: "TYPE_UNSUPPORTED", detail: `${label}tipe soal "${input.questionType}" tidak didukung diagnostik` });

  if (!Array.isArray(input.options)) {
    issues.push({ code: "OPTIONS_SHAPE", detail: `${label}options bukan array` });
    return { issues, text, options: [], type };
  }
  const hasNonString = input.options.some((option) => typeof option !== "string");
  const options = input.options.filter((option): option is string => typeof option === "string").map((option) => option.trim());
  if (hasNonString) issues.push({ code: "OPTIONS_SHAPE", detail: `${label}options mengandung elemen non-string` });

  if (!text) issues.push({ code: "TEXT_MISSING", detail: `${label}teks soal kosong` });
  else if (text.length < 10) issues.push({ code: "TEXT_TOO_SHORT", detail: `${label}teks hanya ${text.length} karakter` });

  return { issues, text, options, type };
}

/** Implementasi aturan (ekspor untuk tes; pakai isDiagnosticSafeItem). */
export function diagnosticSafeIssues(input: DiagnosticSafeInput): DiagnosticSafeIssue[] {
  const label = input.id ? `[${input.id}] ` : "";
  const { issues, text, options, type } = collectIssues(input);
  const stem = normalizeText(text);
  const correctAnswer = input.correctAnswer === null || input.correctAnswer === undefined ? "" : String(input.correctAnswer).trim();

  // Keluarga template yang terbukti rusak — tolak utuh (semua varian kesulitan).
  if (stem && isTemplateStem(text)) {
    issues.push({ code: "TEMPLATE_STEM", detail: `${label}stem template "contoh …" (keluarga rusak teraudit)` });
  }

  // Struktur distraktor isian lintas-topik yang teraudit (pertahanan kedua).
  if (stem && stem.includes("contoh")) {
    const fillerHits = options.filter((option) => KNOWN_FILLER_DISTRACTORS.includes(normalizeText(option)));
    if (fillerHits.length >= 2) {
      issues.push({ code: "FILLER_DISTRACTORS", detail: `${label}distraktor isian lintas-topik teraudit: ${fillerHits.map((o) => `"${o}"`).join(", ")}` });
    }
  }

  if (type) {
    if (type === "ISIAN_SINGKAT") {
      if (options.length > 0) {
        issues.push({ code: "ISIAN_HAS_OPTIONS", detail: `${label}isian singkat menyimpan ${options.length} opsi palsu` });
      }
      if (!correctAnswer) issues.push({ code: "KEY_MISSING", detail: `${label}kunci jawaban isian kosong` });
    } else {
      if (options.length < 2) issues.push({ code: "OPTIONS_TOO_FEW", detail: `${label}${type}: hanya ${options.length} opsi` });
      if (options.some((option) => option.length === 0)) issues.push({ code: "EMPTY_OPTION", detail: `${label}ada opsi kosong` });
      const seen = new Map<string, number>();
      options.forEach((option, index) => {
        const key = normalizeText(option);
        if (!key) return;
        if (seen.has(key)) issues.push({ code: "DUPLICATE_OPTION", detail: `${label}opsi "${option}" duplikat dengan indeks ${seen.get(key)}` });
        else seen.set(key, index);
      });
      if (type === "BENAR_SALAH") {
        const shape = options.map(normalizeText);
        if (shape.length === 2 && (shape[0] !== "benar" || shape[1] !== "salah")) {
          issues.push({ code: "BS_SHAPE", detail: `${label}benar-salah tidak persis ["Benar","Salah"]` });
        }
      }
      if (!correctAnswer) {
        issues.push({ code: "KEY_MISSING", detail: `${label}kunci jawaban kosong` });
      } else if (!KEY_INDEX.test(correctAnswer)) {
        issues.push({ code: "KEY_NOT_INDEX", detail: `${label}kunci "${correctAnswer}" bukan indeks opsi` });
      } else if (options.length > 0 && Number(correctAnswer) >= options.length) {
        issues.push({ code: "KEY_OUT_OF_RANGE", detail: `${label}indeks kunci ${correctAnswer} di luar ${options.length} opsi` });
      } else {
        // Kebocoran kunci deterministik: prompt satu-baris pendek (< 200 krk,
        // bukan bacaan) memuat teks opsi kunci secara verbatim.
        const keyedOption = options[Number(correctAnswer)];
        const keyedNorm = normalizeText(keyedOption);
        const isPassage = text.includes("\n") || text.length >= 200;
        if (keyedNorm && keyedNorm.length >= 4 && !isPassage && stem.includes(keyedNorm) && stem.length < 200) {
          issues.push({ code: "KEY_IN_STEM", detail: `${label}opsi kunci "${keyedOption}" tertulis di prompt` });
        }
      }
    }
  }

  if (stem && input.avoidStems && input.avoidStems.length > 0) {
    for (const used of input.avoidStems) {
      if (normalizeText(used) === stem) {
        issues.push({ code: "STEM_DUPLICATE", detail: `${label}stem sama dengan butir yang sudah dipakai sesi ini` });
        break;
      }
    }
  }

  return issues;
}

/** Gate kanonik: { safe, reasons }. `reasons` TIDAK pernah dikirim ke murid. */
export function isDiagnosticSafeItem(input: DiagnosticSafeInput): DiagnosticSafeResult {
  const issues = diagnosticSafeIssues(input);
  return { safe: issues.length === 0, reasons: issues.map((issue) => issue.code) };
}

/** True bila butir bank layak dikirim ke murid (tanpa isu gate). */
export function isBankEligible(input: DiagnosticSafeInput): boolean {
  return isDiagnosticSafeItem(input).safe;
}

/** Alias lama yang dipakai route: daftar isu terstruktur. */
export function bankGateIssues(input: DiagnosticSafeInput): DiagnosticSafeIssue[] {
  return diagnosticSafeIssues(input);
}
