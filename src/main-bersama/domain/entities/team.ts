// ─── Team ───────────────────────────────────────────────────
// Jelajah Kata mendukung 2–6 regu. Identitas regu adalah
// nama + simbol (stabil), bukan warna — warna adalah metadata
// presentation yang boleh ditambahkan nanti.

import type { TeamId } from '../types/ids';

export type JelajahTeamKey = 'elang' | 'harimau' | 'rusa' | 'badak' | 'gajah' | 'beruang';

export interface MainTeam {
  id: TeamId;
  name: string;
  symbol: string;
}

/**
 * Semua regu Jelajah Kata, dipetakan dari `JelajahTeamKey`.
 * Konstanta murni — tanpa I/O, aman server maupun client.
 */
export const JELAJAH_DEFAULT_TEAMS: Record<JelajahTeamKey, MainTeam> = {
  elang: { id: 'elang', name: 'Elang', symbol: '🦅' },
  harimau: { id: 'harimau', name: 'Harimau', symbol: '🐯' },
  rusa: { id: 'rusa', name: 'Rusa', symbol: '🦌' },
  badak: { id: 'badak', name: 'Badak', symbol: '🦏' },
  gajah: { id: 'gajah', name: 'Gajah', symbol: '🐘' },
  beruang: { id: 'beruang', name: 'Beruang', symbol: '🐻' },
};

export const JELAJAH_TEAM_KEYS: readonly JelajahTeamKey[] = [
  'elang',
  'harimau',
  'rusa',
  'badak',
  'gajah',
  'beruang',
] as const;

/** Team count is locked per session; keep existing sessions at the original four. */
export const DEFAULT_TEAM_COUNT = 4;
export const MIN_TEAM_COUNT = 2;
export const MAX_TEAM_COUNT = 6;
export function activeJelajahTeamKeys(count: number = DEFAULT_TEAM_COUNT): readonly JelajahTeamKey[] {
  return JELAJAH_TEAM_KEYS.slice(0, count);
}
