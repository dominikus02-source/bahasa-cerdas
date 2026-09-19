// ─── Team ───────────────────────────────────────────────────
// Jelajah Kata memakai empat regu tetap. Identitas regu adalah
// nama + simbol (stabil), bukan warna — warna adalah metadata
// presentation yang boleh ditambahkan nanti.

import type { TeamId } from '../types/ids';

export type JelajahTeamKey = 'elang' | 'harimau' | 'rusa' | 'badak';

export interface MainTeam {
  id: TeamId;
  name: string;
  symbol: string;
}

/**
 * Empat regu default Jelajah Kata, dipetakan dari `JelajahTeamKey`.
 * Konstanta murni — tanpa I/O, aman server maupun client.
 */
export const JELAJAH_DEFAULT_TEAMS: Record<JelajahTeamKey, MainTeam> = {
  elang: { id: 'elang', name: 'Elang', symbol: '🦅' },
  harimau: { id: 'harimau', name: 'Harimau', symbol: '🐯' },
  rusa: { id: 'rusa', name: 'Rusa', symbol: '🦌' },
  badak: { id: 'badak', name: 'Badak', symbol: '🦏' },
};

export const JELAJAH_TEAM_KEYS: readonly JelajahTeamKey[] = [
  'elang',
  'harimau',
  'rusa',
  'badak',
] as const;
