// ─── Game Round Facts ───────────────────────────────────────
// Factual projection SATU round yang sudah final (closed) dari
// Session Engine ke Game Engine. Game Engine TIDAK membaca state
// mutable Session Engine secara bebas — hanya facts ini.
//
// Sengaja TIDAK memuat: selectedOption, correctOption, explanation,
// submit speed, auth id, token, info UI — hanya fakta scoring.
//
// teamId pada eligiblePlayers adalah keanggotaan regu yang BERLAKU
// untuk round tersebut (diambil dari snapshot saat round dibuka),
// bukan assignment mutable saat ini.

import type {
  PlayerId,
  RoundId,
  SessionId,
  TeamId,
} from '../domain/types/ids';

export interface GameRoundFactsPlayer {
  playerId: PlayerId;
  /** Regu peserta utk round ini (wajib utk jelajah-kata). */
  teamId?: TeamId;
}

export interface GameRoundFactsAnswer {
  playerId: PlayerId;
  isCorrect: boolean;
}

export interface GameRoundFacts {
  sessionId: SessionId;
  roundId: RoundId;
  roundIndex: number;
  totalRounds: number;

  eligiblePlayers: GameRoundFactsPlayer[];
  answers: GameRoundFactsAnswer[];
}

// ─── Runtime Validation ─────────────────────────────────────
// Typed data saja tidak cukup di runtime boundary — engine
// memvalidasi facts sebelum dipercaya (lightweight, tanpa zod).

export type RoundFactsValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export interface RoundFactsValidationOptions {
  /** Untuk jelajah-kata: setiap eligible player wajib punya regu valid. */
  requireTeamForAll?: boolean;
  /** Regu regu yang dianggap valid (jelajah-kata). */
  validTeamIds?: readonly string[];
}

/**
 * Invariant yang divalidasi:
 * - roundIndex/totalRounds integer, totalRounds > 0, 0 <= index < totalRounds;
 * - duplicate eligible player id tidak boleh;
 * - duplicate answer player tidak boleh;
 * - answer player harus termasuk eligible;
 * - (jelajah) team wajib & termasuk valid set.
 */
export function validateRoundFacts(
  facts: GameRoundFacts,
  options: RoundFactsValidationOptions = {},
): RoundFactsValidationResult {
  if (!Number.isInteger(facts.roundIndex) || facts.roundIndex < 0) {
    return { valid: false, reason: 'roundIndex harus integer >= 0' };
  }
  if (!Number.isInteger(facts.totalRounds) || facts.totalRounds <= 0) {
    return { valid: false, reason: 'totalRounds harus integer > 0' };
  }
  if (facts.roundIndex >= facts.totalRounds) {
    return { valid: false, reason: 'roundIndex di luar totalRounds' };
  }
  if (!Array.isArray(facts.eligiblePlayers)) {
    return { valid: false, reason: 'eligiblePlayers wajib array' };
  }
  if (!Array.isArray(facts.answers)) {
    return { valid: false, reason: 'answers wajib array' };
  }

  const eligibleIds = new Set<string>();
  for (const player of facts.eligiblePlayers) {
    if (eligibleIds.has(player.playerId)) {
      return { valid: false, reason: `eligible duplikat: ${player.playerId}` };
    }
    eligibleIds.add(player.playerId);
    if (options.requireTeamForAll) {
      if (!player.teamId) {
        return { valid: false, reason: `eligible tanpa regu: ${player.playerId}` };
      }
      if (options.validTeamIds && !options.validTeamIds.includes(player.teamId)) {
        return { valid: false, reason: `regu tidak valid: ${player.teamId}` };
      }
    }
  }

  const answeredIds = new Set<string>();
  for (const answer of facts.answers) {
    if (answeredIds.has(answer.playerId)) {
      return { valid: false, reason: `answer duplikat: ${answer.playerId}` };
    }
    if (!eligibleIds.has(answer.playerId)) {
      return { valid: false, reason: `answer dari non-eligible: ${answer.playerId}` };
    }
    answeredIds.add(answer.playerId);
  }

  return { valid: true };
}
