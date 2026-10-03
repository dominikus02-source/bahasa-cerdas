/** Kota remains a shared mission. Award equal ranks for equal contributions. */
export function getKotaPodium<T extends { correctAnswers: number; displayName: string }>(participants: readonly T[]): Array<T & { rank: number }> {
  const sorted = [...participants].sort((a, b) => b.correctAnswers - a.correctAnswers || a.displayName.localeCompare(b.displayName, 'id'));
  let previousScore: number | undefined;
  let rank = 0;
  return sorted.map((participant, index) => {
    if (participant.correctAnswers !== previousScore) rank = index + 1;
    previousScore = participant.correctAnswers;
    return { ...participant, rank };
  }).filter((participant) => participant.rank <= 3);
}
