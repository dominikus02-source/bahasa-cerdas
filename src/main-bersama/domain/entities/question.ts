// ─── Question Snapshot ──────────────────────────────────────
// Snapshot soal menyimpan isi secara MANDIRI (bukan hanya referensi
// Bank Soal) karena Bank Soal bisa berubah setelah sesi dimainkan.
// Persistence snapshot bukan bagian tahap ini — hanya kontraknya.

import type { QuestionId, SourceQuestionId } from '../types/ids';

export type MainQuestionType =
  | 'single-choice'
  | 'true-false'
  | 'passage-single-choice';

export interface MainQuestionOption {
  id: string;
  text: string;
}

export interface MainQuestionPassage {
  title?: string;
  content: string;
}

/**
 * Salinan soal yang mengunci isi untuk satu sesi.
 * `correctOptionId` dan `explanation` TIDAK BOLEH mengalir ke view
 * siswa sebelum fase discussion (lihat contracts/views).
 */
export interface MainQuestionSnapshot {
  id: QuestionId;
  /** Referensi asal di Bank Soal (jika ada) — bukan pengganti isi. */
  sourceQuestionId: SourceQuestionId;
  type: MainQuestionType;
  prompt: string;
  options: MainQuestionOption[];
  correctOptionId: string;
  explanation?: string;
  passage?: MainQuestionPassage;
}

/** Bentuk soal yang aman untuk peserta sebelum reveal (tanpa answer key). */
export interface PublicQuestionView {
  id: QuestionId;
  type: MainQuestionType;
  prompt: string;
  options: MainQuestionOption[];
  passage?: MainQuestionPassage;
}
