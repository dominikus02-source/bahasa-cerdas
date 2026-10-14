import { JELAJAH_DEFAULT_TEAMS, JELAJAH_TEAM_KEYS } from '@/src/main-bersama/domain/entities/team';

export const JELAJAH_MASCOT_SIZE = 104;
export const JELAJAH_COMPACT_MASCOT_SIZE = 88;
export const JELAJAH_LANE_HEIGHT = 110;
const START_X = 262;
export const JELAJAH_TRAVEL = 780;

export function getJelajahTeams(teams: readonly { id: string; name?: string }[]) {
  const active = teams.length > 0 ? new Set(teams.map((team) => team.id)) : new Set(JELAJAH_TEAM_KEYS.slice(0, 4));
  return JELAJAH_TEAM_KEYS.filter((id) => active.has(id)).map((id) => ({
    id, name: teams.find((entry) => entry.id === id)?.name ?? JELAJAH_DEFAULT_TEAMS[id].name,
  }));
}

function clampPercent(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

/** Presentation only: one fixed lane per team, with the same start and finish. */
export function getJelajahLayout(teams: readonly { id: string }[], progress: Record<string, number>) {
  const active = getJelajahTeams(teams);
  const positions = new Map<string, { x: number; y: number; distance: number }>();
  active.forEach((team, index) => {
    // Canonical team order never changes with leaderboard rank or API ordering.
    // Separate lanes prevent mascots from covering each other at tied progress.
    const depthY = 170 + index * JELAJAH_LANE_HEIGHT;
    const distance = clampPercent(progress[team.id] ?? 0) * JELAJAH_TRAVEL / 100;
    positions.set(team.id, { x: START_X + distance, y: depthY, distance });
  });
  return { positions, backgroundOffset: 0, height: 230 + (active.length - 1) * JELAJAH_LANE_HEIGHT };
}
