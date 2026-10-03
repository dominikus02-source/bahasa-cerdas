/** All students sharing a top-three rank belong on the podium. */
export function getStudentPodium<T extends { progressRank: number }>(participants: readonly T[]): T[] {
  return [2, 1, 3].flatMap((rank) => participants.filter((participant) => participant.progressRank === rank));
}
