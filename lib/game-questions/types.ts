/**
 * GAME QUESTION QUALITY — tipe kanonik.
 *
 * Satu kontrak internal untuk soal yang dipakai SEMUA game BC. Bank existing
 * (lib/game/question-bank, kataplay-content, harvest Jalur Cerdas) dinormalisasi
 * ke bentuk ini oleh normalizer.ts — format asli game TIDAK diubah.
 *
 * Model jawaban kanonik: `correctAnswer` = TEKS option yang benar (bukan
 * index) untuk soal opsi; untuk tipe bebas (isi_blank/susun kata) = string
 * kunci jawaban. Index asli dikonversi normalizer.
 */

export type QuestionDifficulty = "EASY" | "MEDIUM" | "HARD";

export type QuestionStatus = "ACTIVE" | "REVIEW" | "QUARANTINED";

export type QuarantineReason =
  | "NO_CORRECT_ANSWER"
  | "MULTIPLE_CORRECT"
  | "INVALID_OPTIONS"
  | "DUPLICATE"
  | "MALFORMED"
  | "LOW_QUALITY"
  | "UNKNOWN";

/** Masalah terdeteksi validator — error = wajib karantina, warning = review. */
export interface QuestionIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
}

export interface GameQuestion {
  /** Wajib unik di dalam bank. */
  id: string;
  /** Teks pertanyaan/instruksi — wajib non-empty. */
  question: string;
  /** Opsi jawaban (MCQ). Untuk tipe bebas boleh string jawaban tunggal. */
  options: string[];
  /** TEKS opsi yang benar (model kanonik) ATAU kunci teks untuk tipe bebas. */
  correctAnswer: string;
  explanation?: string;
  difficulty?: QuestionDifficulty;
  topic?: string;
  skill?: string;
  source?: string;
  /** true bila model jawaban bukan MCQ (isi_blank/susun kata/match). */
  freeText?: boolean;
}

export interface ValidationResult {
  id: string;
  status: QuestionStatus;
  issues: QuestionIssue[];
  qualityScore: number;
  quarantineReason?: QuarantineReason;
}
