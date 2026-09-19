// ─── Answer Rules ───────────────────────────────────────────
// Aturan penerimaan jawaban (murni, tanpa I/O):
// - business uniqueness: session + round + player = SATU jawaban final;
// - request idempotency: submissionId mengidentifikasi attempt;
// - deadline authoritative dari server clock.
//
// Semantik deadline (dikunci dan diuji): jawaban diterima iff
//   submittedAt <= closesAt   (boundary inclusive — detik terakhir sah)
// UI siswa yang telat 1 detik TETAP ditolak server: yang dipakai
// adalah submittedAt dari server clock, bukan waktu client.

import type { PlayerId, RoundId, SubmissionId } from '../types/ids';
import type {
  SessionEngineErrorCode,
  SessionEngineResult,
} from '../types/engine-result';
import type { AttemptRecord, SessionRuntimeState, StoredAnswer } from '../entities/session-runtime-state';
import type { MainQuestionSnapshot } from '../entities/question';

/** Data yang dibutuhkan untuk mengevaluasi sebuah submission. */
export interface AnswerSubmissionContext {
  round: {
    id: RoundId;
    index: number;
    question: MainQuestionSnapshot;
    closesAt: Date;
  };
  now: Date;
  playerId: PlayerId;
  submissionId: SubmissionId;
  selectedOptionId: string;
  /** Jawaban final player utk round ini (null bila belum ada). */
  existingAnswer: StoredAnswer | null;
  /** Attempt tercatat dengan submissionId ini (null bila belum ada). */
  existingAttempt: AttemptRecord | null;
  /** Apakah player ada di snapshot eligible round. */
  isEligible: boolean;
}

export type AnswerRuleResult =
  | {
      ok: true;
      /** True bila ini attempt pertama yang diterima; false = retry identik. */
      isNewAnswer: boolean;
      isCorrect: boolean;
    }
  | { ok: false; code: SessionEngineErrorCode };

/** Pilihan valid iff option id ada di snapshot soal. */
export function isValidOption(
  question: MainQuestionSnapshot,
  selectedOptionId: string,
): boolean {
  return question.options.some((option) => option.id === selectedOptionId);
}

/** Correctness dihitung server-side dari snapshot answer key. */
export function computeCorrectness(
  question: MainQuestionSnapshot,
  selectedOptionId: string,
): boolean {
  return question.correctOptionId === selectedOptionId;
}

/** Deadline inclusive: submittedAt <= closesAt. */
export function isBeforeDeadline(now: Date, closesAt: Date): boolean {
  return now.getTime() <= closesAt.getTime();
}

/**
 * Evaluasi submission terhadap seluruh aturan bisnis.
 * Urutan cek penting dan deterministik:
 * 1. validitas opsi → 2. idempotency attempt → 3. business duplicate
 * → 4. eligibility → 5. deadline.
 */
export function evaluateAnswerSubmission(
  ctx: AnswerSubmissionContext,
): AnswerRuleResult {
  // 1. Option harus anggota snapshot soal.
  if (!isValidOption(ctx.round.question, ctx.selectedOptionId)) {
    return { ok: false, code: 'INVALID_OPTION' };
  }

  // 2. Request idempotency per submissionId.
  if (ctx.existingAttempt) {
    if (ctx.existingAttempt.playerId !== ctx.playerId) {
      // submissionId bentrok lintas player — konflik, jangan diam-diam terima.
      return { ok: false, code: 'SUBMISSION_ID_CONFLICT' };
    }
    if (ctx.existingAttempt.selectedOptionId !== ctx.selectedOptionId) {
      // Kasus B: ID sama, payload berubah → konflik, jangan overwrite.
      return { ok: false, code: 'SUBMISSION_ID_CONFLICT' };
    }
    if (ctx.existingAttempt.accepted) {
      // Kasus A: retry identik → already-saved (ditandai isNewAnswer=false).
      return {
        ok: true,
        isNewAnswer: false,
        isCorrect: ctx.existingAnswer ? computeCorrectness(ctx.round.question, ctx.existingAttempt.selectedOptionId) : false,
      };
    }
    // Attempt sebelumnya ditolak — evaluasi ulang penuh di bawah.
  }

  // 3. Business duplicate: session+round+player sudah punya jawaban final.
  if (ctx.existingAnswer) {
    return { ok: false, code: 'ANSWER_ALREADY_EXISTS' };
  }

  // 4. Eligibility snapshot round.
  if (!ctx.isEligible) {
    return { ok: false, code: 'PLAYER_NOT_ELIGIBLE' };
  }

  // 5. Deadline server (inclusive).
  if (!isBeforeDeadline(ctx.now, ctx.round.closesAt)) {
    return { ok: false, code: 'DEADLINE_PASSED' };
  }

  return {
    ok: true,
    isNewAnswer: true,
    isCorrect: computeCorrectness(ctx.round.question, ctx.selectedOptionId),
  };
}

export type { SessionEngineResult };
