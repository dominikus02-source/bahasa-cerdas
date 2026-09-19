// ─── Round Facts Projection ─────────────────────────────────
// Mapper kecil: SessionEngine → GameRoundFacts untuk round yang
// sudah final. Sengaja dipisah agar session-engine.ts tidak
// membengkak dan game engine tidak menyentuh state mutable.
//
// teamId diambil dari runtime player SAAT ROUND DIBUKA — round
// sudah final saat projection dipanggil, dan team assignment
// tidak diubah sejak snapshot eligible dibuat.

import type { RoundId } from '../../domain/types/ids';
import type {
  GameRoundFacts,
  GameRoundFactsAnswer,
  GameRoundFactsPlayer,
} from '../../contracts/GameRoundFacts';
import type { SessionEngine } from './session-engine';

/**
 * Bangun GameRoundFacts untuk round tertentu. Null bila roundId
 * bukan milik sesi engine ini (isolation) atau belum ada.
 */
export function buildRoundFacts(
  engine: SessionEngine,
  roundId: RoundId,
): GameRoundFacts | null {
  const round = engine.state.rounds.find((r) => r.id === roundId);
  if (!round) return null;

  const eligiblePlayers: GameRoundFactsPlayer[] = [];
  for (const playerId of round.eligiblePlayerIds) {
    // Snapshot regu yang berlaku saat round dibuka (round.eligibleTeamIds),
    // bukan assignment mutable di runtime player. Fallback ke runtime hanya
    // untuk runtime state lama yang dibuat sebelum snapshot ada.
    const snapshotTeamId = round.eligibleTeamIds?.[playerId];
    const teamId =
      snapshotTeamId ?? engine.state.players.get(playerId)?.teamId;
    eligiblePlayers.push({
      playerId,
      teamId,
    });
  }

  const answers: GameRoundFactsAnswer[] = engine
    .getRoundAnswers(roundId)
    .map((answer) => ({
      playerId: answer.playerId,
      isCorrect: answer.isCorrect,
    }));

  return {
    sessionId: engine.sessionId,
    roundId: round.id,
    roundIndex: round.index,
    totalRounds: engine.state.session.totalRounds,
    eligiblePlayers,
    answers,
  };
}
