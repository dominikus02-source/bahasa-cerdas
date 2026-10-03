import type { SessionRuntimeState } from '../../domain/entities/session-runtime-state';

/** A null deadline marks the independently paced Jelajah rounds. */
export function isIndependentJelajah(state: SessionRuntimeState): boolean {
  return state.session.gameMode === 'jelajah-kata' && state.rounds.length > 0 && !state.rounds[0].closesAt;
}

export function getTeamRoundIndex(state: SessionRuntimeState, teamId: string): number {
  for (const round of state.rounds) {
    const members = round.eligiblePlayerIds.filter((id) => round.eligibleTeamIds?.[id] === teamId);
    if (members.length === 0) continue;
    const answers = state.answersByRound.get(round.id);
    if (!members.every((id) => answers?.has(id))) return round.index;
  }
  return state.session.totalRounds;
}

export function getIndependentTeamProgress(state: SessionRuntimeState): Record<string, number> {
  const progress: Record<string, number> = {};
  for (const player of state.players.values()) if (player.teamId) progress[player.teamId] = 0;
  for (const round of state.rounds) {
    const teamIds = new Set(Object.values(round.eligibleTeamIds ?? {}).filter((id): id is string => !!id));
    const answers = state.answersByRound.get(round.id);
    for (const teamId of teamIds) {
      const members = round.eligiblePlayerIds.filter((id) => round.eligibleTeamIds?.[id] === teamId);
      if (members.length === 0 || !members.every((id) => answers?.has(id))) continue;
      const correct = members.filter((id) => answers?.get(id)?.isCorrect).length;
      progress[teamId] = (progress[teamId] ?? 0) + (correct / members.length) * (100 / state.session.totalRounds);
    }
  }
  for (const teamId of Object.keys(progress)) progress[teamId] = Math.min(100, progress[teamId]);
  return progress;
}

export function getIndependentTeamStatus(state: SessionRuntimeState) {
  const status: Record<string, { roundIndex: number; finished: boolean; answeredCount: number; eligibleCount: number }> = {};
  const teams = new Set([...state.players.values()].map((p) => p.teamId).filter((id): id is string => !!id));
  for (const teamId of teams) {
    const roundIndex = getTeamRoundIndex(state, teamId);
    const round = state.rounds.find((r) => r.index === roundIndex);
    const members = round?.eligiblePlayerIds.filter((id) => round.eligibleTeamIds?.[id] === teamId) ?? [];
    status[teamId] = {
      roundIndex,
      finished: roundIndex >= state.session.totalRounds,
      answeredCount: members.filter((id) => round && state.answersByRound.get(round.id)?.has(id)).length,
      eligibleCount: members.length,
    };
  }
  return status;
}

export class IndependentRosterClosedError extends Error {
  constructor() { super('Peserta baru harus bergabung sebelum permainan dimulai.'); }
}
