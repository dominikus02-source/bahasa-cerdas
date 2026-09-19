// ─── Runtime Type Guards ────────────────────────────────────
// Validasi kontrak minimal yang benar-benar diperlukan: payload
// dari sumber eksternal (client, transport, atau hasil JSON dari
// storage) diperiksa sebelum dipercaya. Tanpa dependency.

import type { AnswerSource, GameMode, RoundPhase, SessionPhase } from '../types/session';
import type {
  ConnectionStatus,
  ParticipantRole,
  ParticipationStatus,
} from '../types/participant';
import type { MainGameState } from '../types/game-state';
import type { AnswerSubmitResult } from '../types/answers';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isGameMode(value: unknown): value is GameMode {
  return value === 'jelajah-kata' || value === 'kota-cahaya';
}

export function isSessionPhase(value: unknown): value is SessionPhase {
  return (
    value === 'preparing' ||
    value === 'lobby' ||
    value === 'question' ||
    value === 'closed' ||
    value === 'discussion' ||
    value === 'paused' ||
    value === 'summary' ||
    value === 'ended'
  );
}

export function isParticipantRole(value: unknown): value is ParticipantRole {
  return value === 'teacher' || value === 'student' || value === 'projector';
}

export function isConnectionStatus(value: unknown): value is ConnectionStatus {
  return value === 'connected' || value === 'disconnected' || value === 'left';
}

export function isParticipationStatus(
  value: unknown,
): value is ParticipationStatus {
  return value === 'active' || value === 'inactive';
}

export function isRoundPhase(value: unknown): value is RoundPhase {
  return value === 'pending' || value === 'open' || value === 'review' || value === 'closed';
}

export function isAnswerSource(value: unknown): value is AnswerSource {
  return value === 'individual' || value === 'team-consensus';
}

/** Type guard untuk `MainGameState` (union per game mode). */
export function isMainGameState(value: unknown): value is MainGameState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;

  if (candidate.gameMode === 'jelajah-kata') {
    const state = candidate.jelajahKata;
    if (typeof state !== 'object' || state === null) return false;
    const progress = (state as Record<string, unknown>).teamProgress;
    if (typeof progress !== 'object' || progress === null) return false;
    return Object.values(progress).every((v) => typeof v === 'number');
  }

  if (candidate.gameMode === 'kota-cahaya') {
    const state = candidate.kotaCahaya;
    if (typeof state !== 'object' || state === null) return false;
    const s = state as Record<string, unknown>;
    return (
      typeof s.correctContribution === 'number' &&
      typeof s.target === 'number' &&
      typeof s.progressPercent === 'number' &&
      isStringArray(s.unlockedMilestones)
    );
  }

  return false;
}

/**
 * Type guard untuk hasil submit jawaban (payload event `answer:ack`).
 * Menolak payload yang membawa field kebenaran jawaban (`correct`,
 * `isCorrect`, `answerKey`) — ACK tidak boleh membocorkan jawaban.
 */
export function isAnswerSubmitResult(value: unknown): value is AnswerSubmitResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Record<string, unknown>;

  if (
    'correct' in result ||
    'isCorrect' in result ||
    'answerKey' in result ||
    'correctOptionId' in result
  ) {
    return false;
  }

  if (result.ok === true) {
    return (
      (result.status === 'saved' || result.status === 'already-saved') &&
      typeof result.submissionId === 'string'
    );
  }

  if (result.ok === false) {
    const codes = [
      'SESSION_NOT_FOUND',
      'ROUND_NOT_OPEN',
      'PLAYER_NOT_ELIGIBLE',
      'INVALID_OPTION',
      'ANSWER_ALREADY_EXISTS',
      'SUBMISSION_ID_CONFLICT',
      'UNAUTHORIZED',
    ];
    return codes.includes(result.code as string);
  }

  return false;
}
