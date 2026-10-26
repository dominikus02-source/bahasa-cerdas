// ─── Shared Transport Types ─────────────────────────────────
// Timestamp pada view/event memakai string ISO-8601 (UTC),
// bukan Date — entity domain tetap memakai Date.

import type { SessionId, TeamId } from '../../domain/types/ids';

export type IsoTimestamp = string;

export interface ViewMeta {
  sessionId: SessionId;
  /** ISO-8601 UTC — kapan state ini dibangun server. */
  serverTime: IsoTimestamp;
  /** Versi state, naik setiap perubahan yang layak disinkronkan. */
  revision: number;
}

/** Identitas regu yang aman dikirim ke client mana pun. */
export interface TeamPublicInfo {
  id: TeamId;
  name: string;
  symbol: string;
}

/** Final-only award data. No auth/player identifiers or individual answers. */
export interface KotaPodiumEntry {
  displayName: string;
  avatarUrl?: string;
  correctAnswers: number;
  rank: number;
}

/**
 * Jam permainan (durasi total pilihan guru). Server-authoritative:
 * client menghitung sisa waktu dari `endsAt` + offset `serverTime`.
 */
export interface GameClockView {
  /** Total durasi pilihan guru (ms). */
  durationMs: number;
  /** Batas waktu ISO-8601 UTC; null sebelum permainan dimulai. */
  endsAt: IsoTimestamp | null;
  /** True saat sesi dijeda — tampilkan `pausedRemainingMs` beku. */
  paused: boolean;
  /** Sisa waktu beku saat jeda (ms); null bila tidak dijeda. */
  pausedRemainingMs: number | null;
}
