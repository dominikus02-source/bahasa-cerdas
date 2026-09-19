// ─── Question Snapshot Validation ───────────────────────────
// Validasi struktur snapshot soal (bukan kualitas konten).
// Dipakai saat menyusun snapshot dari Bank Soal pada tahap
// application nanti; murni fungsi tanpa side-effect.

import type {
  MainQuestionOption,
  MainQuestionSnapshot,
  PublicQuestionView,
} from '../entities/question';

export interface QuestionSnapshotValidationIssue {
  field: string;
  message: string;
}

export interface QuestionSnapshotValidationResult {
  valid: boolean;
  issues: QuestionSnapshotValidationIssue[];
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** Validasi satu opsi: id + text wajib string tidak kosong. */
export function isValidQuestionOption(value: unknown): value is MainQuestionOption {
  if (typeof value !== 'object' || value === null) return false;
  const option = value as Record<string, unknown>;
  return (
    isString(option.id) && option.id.trim().length > 0 &&
    isString(option.text) && option.text.trim().length > 0
  );
}

/**
 * Validasi snapshot soal:
 * - prompt & isi passage wajib string;
 * - minimal 2 opsi unik (id dan teks);
 * - correctOptionId wajib salah satu option.id;
 * - penjelasan opsional wajib string bila ada.
 */
export function validateQuestionSnapshot(
  value: unknown,
): QuestionSnapshotValidationResult {
  const issues: QuestionSnapshotValidationIssue[] = [];

  if (typeof value !== 'object' || value === null) {
    return { valid: false, issues: [{ field: '', message: 'Snapshot bukan objek' }] };
  }
  const snapshot = value as Record<string, unknown>;

  if (!isString(snapshot.prompt) || snapshot.prompt.trim().length === 0) {
    issues.push({ field: 'prompt', message: 'Prompt wajib string tidak kosong' });
  }

  const validTypes = ['single-choice', 'true-false', 'passage-single-choice'];
  if (!validTypes.includes(snapshot.type as string)) {
    issues.push({ field: 'type', message: 'Tipe soal tidak dikenal' });
  }

  if (!isString(snapshot.sourceQuestionId) || snapshot.sourceQuestionId.length === 0) {
    issues.push({
      field: 'sourceQuestionId',
      message: 'Referensi Bank Soal wajib ada untuk jejak asal',
    });
  }

  if (!Array.isArray(snapshot.options) || snapshot.options.length < 2) {
    issues.push({ field: 'options', message: 'Minimal 2 opsi' });
  } else {
    if (!snapshot.options.every((option) => isValidQuestionOption(option))) {
      issues.push({ field: 'options', message: 'Ada opsi dengan id/text kosong' });
    }
    const ids = snapshot.options.map((option) => (option as MainQuestionOption).id);
    const texts = snapshot.options.map((option) => (option as MainQuestionOption).text);
    if (new Set(ids).size !== ids.length) {
      issues.push({ field: 'options', message: 'Ada option id duplikat' });
    }
    if (new Set(texts).size !== texts.length) {
      issues.push({ field: 'options', message: 'Ada option text duplikat' });
    }
  }

  if (
    !isString(snapshot.correctOptionId) ||
    !Array.isArray(snapshot.options) ||
    !snapshot.options.some(
      (option) => (option as MainQuestionOption).id === snapshot.correctOptionId,
    )
  ) {
    issues.push({
      field: 'correctOptionId',
      message: 'correctOptionId wajib salah satu option.id',
    });
  }

  if (snapshot.explanation !== undefined && !isString(snapshot.explanation)) {
    issues.push({ field: 'explanation', message: 'Explanation wajib string bila ada' });
  }

  if (snapshot.passage !== undefined) {
    if (typeof snapshot.passage !== 'object' || snapshot.passage === null) {
      issues.push({ field: 'passage', message: 'Passage wajib objek bila ada' });
    } else {
      const passage = snapshot.passage as Record<string, unknown>;
      if (!isString(passage.content) || passage.content.trim().length === 0) {
        issues.push({
          field: 'passage.content',
          message: 'Passage content wajib string tidak kosong',
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

/** Strip kunci jawaban dari snapshot — bentuk publik yang aman untuk peserta. */
export function toPublicQuestionView(
  snapshot: MainQuestionSnapshot,
): PublicQuestionView {
  const view: PublicQuestionView = {
    id: snapshot.id,
    type: snapshot.type,
    prompt: snapshot.prompt,
    options: snapshot.options,
  };
  if (snapshot.passage) view.passage = snapshot.passage;
  return view;
}
