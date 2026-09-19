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
