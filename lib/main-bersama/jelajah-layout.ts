import { JELAJAH_DEFAULT_TEAMS, JELAJAH_TEAM_KEYS } from '@/src/main-bersama/domain/entities/team';

export const JELAJAH_MASCOT_SIZE = 216;
export const JELAJAH_COMPACT_MASCOT_SIZE = 176;
const START_X = 220;
const TRAVEL = 740;

export function getJelajahTeams(teams: readonly { id: string; name?: string }[]) {
  const active = teams.length > 0 ? new Set(teams.map((team) => team.id)) : new Set(JELAJAH_TEAM_KEYS.slice(0, 4));
  return JELAJAH_TEAM_KEYS.filter((id) => active.has(id)).map((id) => ({
    id, name: teams.find((entry) => entry.id === id)?.name ?? JELAJAH_DEFAULT_TEAMS[id].name,
  }));
}

function clampPercent(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

/** Dynamic 2–6 parallel lanes; each team's progress only changes horizontal position. */
export function getJelajahLayout(teams: readonly { id: string }[], progress: Record<string, number>) {
  const active = getJelajahTeams(teams);
  const positions = new Map<string, { x: number; y: number; distance: number }>();
  active.forEach((team, index) => {
    // Five/six mascots use a two-column, three-row stagger so the new animals
    // remain visible rather than stacking six full-size sprites on top of each other.
    const dense = active.length > 4;
    const offsetX = dense ? (index % 2) * 170 - 60
      : active.length > 1 ? -84 + (index * 168) / (active.length - 1) : 0;
    const depthY = dense ? 252 + Math.floor(index / 2) * 105
      : active.length > 1 ? 393 + (index * 72) / (active.length - 1) : 429;
    const distance = clampPercent(progress[team.id] ?? 0) * TRAVEL / 100;
    positions.set(team.id, { x: START_X + offsetX + distance, y: depthY, distance });
  });
  return { positions, backgroundOffset: 0 };
}
