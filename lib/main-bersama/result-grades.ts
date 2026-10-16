export type ResultPlayer = { id: string; userId: string | null };
export type ResultMember = { user: { id: string; supabaseId: string } };
export type ResultRound = { id: string; eligible: { playerId: string }[] };
export type ResultAnswer = {
  playerId: string;
  roundId: string;
  isCorrect: boolean;
};

export function buildClassGradePlan(
  players: ResultPlayer[],
  members: ResultMember[],
  rounds: ResultRound[],
  answers: ResultAnswer[],
) {
  const memberIds = new Map<string, string>();
  for (const { user } of members) {
    memberIds.set(user.id, user.id);
    memberIds.set(user.supabaseId, user.id);
  }
  const userByPlayer = new Map<string, string>();
  const skipped = { guests: 0, outsideClass: 0, noQuestions: 0 };
  for (const player of players) {
    if (!player.userId) {
      skipped.guests++;
      continue;
    }
    const userId = memberIds.get(player.userId);
    if (!userId) {
      skipped.outsideClass++;
      continue;
    }
    userByPlayer.set(player.id, userId);
  }
  const opportunities = new Map<string, Set<string>>();
  const eligibleKeys = new Set<string>();
  for (const round of rounds)
    for (const { playerId } of round.eligible) {
      const userId = userByPlayer.get(playerId);
      if (!userId) continue;
      eligibleKeys.add(`${round.id}:${playerId}`);
      const entries = opportunities.get(userId) ?? new Set<string>();
      entries.add(round.id);
      opportunities.set(userId, entries);
    }
  const correct = new Map<string, Set<string>>();
  for (const answer of answers) {
    const userId = userByPlayer.get(answer.playerId);
    if (
      !userId ||
      !answer.isCorrect ||
      !eligibleKeys.has(`${answer.roundId}:${answer.playerId}`)
    )
      continue;
    const entries = correct.get(userId) ?? new Set<string>();
    entries.add(answer.roundId);
    correct.set(userId, entries);
  }
  const entries = [...new Set(userByPlayer.values())].flatMap((userId) => {
    const eligible = opportunities.get(userId)?.size ?? 0;
    if (!eligible) {
      skipped.noQuestions++;
      return [];
    }
    const correctCount = correct.get(userId)?.size ?? 0;
    return [
      {
        userId,
        eligible,
        correct: correctCount,
        score: Math.round((correctCount / eligible) * 100),
      },
    ];
  });
  return { entries, skipped };
}
