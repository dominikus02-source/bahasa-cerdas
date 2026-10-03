export const JELAJAH_MASCOT_SIZE = 216;
export const JELAJAH_COMPACT_MASCOT_SIZE = 176;
const DEPTH_Y = [393, 417, 441, 465];
const DEPTH_X = [-84, -28, 28, 84];
const START_X = 220;
const TRAVEL = 740;
const DEFAULT_TEAMS = [
  { id: 'elang', name: 'Elang' }, { id: 'harimau', name: 'Harimau' },
  { id: 'rusa', name: 'Rusa' }, { id: 'badak', name: 'Badak' },
];

export function getJelajahTeams(teams: readonly { id: string; name?: string }[]) {
  return DEFAULT_TEAMS.map((team) => ({ ...team, name: teams.find((entry) => entry.id === team.id)?.name ?? team.name }));
}

function clampPercent(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

/** Depth separates the regu sideways across the road; only progress moves them forward. */
export function getJelajahLayout(teams: readonly { id: string }[], progress: Record<string, number>) {
  const positions = new Map<string, { x: number; y: number; distance: number }>();
  getJelajahTeams(teams).forEach((team, index) => {
    const distance = clampPercent(progress[team.id] ?? 0) * TRAVEL / 100;
    positions.set(team.id, { x: START_X + DEPTH_X[index] + distance, y: DEPTH_Y[index], distance });
  });
  return { positions, backgroundOffset: 0 };
}
