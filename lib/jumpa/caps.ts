/**
 * Batas default ruang JUMPA per jenis ruang (murni, tanpa I/O).
 * Lihat docs/JUMPA_TECHNICAL_PLAN.md §2.5. Ubah angka di sini saja.
 */
export type JumpaKind = "KELAS" | "GURU" | "MURID";

export interface JumpaCaps {
  maxParticipants: number;
  maxDurationMin: number;
}

export const JUMPA_CAPS: Record<JumpaKind, JumpaCaps> = {
  KELAS: { maxParticipants: 50, maxDurationMin: 120 },
  GURU: { maxParticipants: 25, maxDurationMin: 120 },
  MURID: { maxParticipants: 8, maxDurationMin: 60 },
};

/** Ruang LiveKit ditutup bila kosong selama ini (detik). */
export const LIVEKIT_EMPTY_TIMEOUT_SEC = 10 * 60;
/** Masa tenggang setelah peserta terakhir keluar (detik) — untuk reconnect. */
export const LIVEKIT_DEPARTURE_TIMEOUT_SEC = 60;
/** Umur token join. LiveKit me-refresh token peserta yang sudah tersambung. */
export const JUMPA_TOKEN_TTL_SEC = 10 * 60;

export function capsFor(kind: JumpaKind): JumpaCaps {
  return JUMPA_CAPS[kind];
}

/** true bila ruang yang sudah mulai telah melewati batas durasinya. */
export function isPastDuration(
  startedAt: Date | null,
  maxDurationMin: number,
  now: Date,
): boolean {
  if (!startedAt) return false;
  return now.getTime() > startedAt.getTime() + maxDurationMin * 60_000;
}

// ── Fase 2 ─────────────────────────────────────────────────────────────
/** Obrolan ruang dihapus permanen setelah N hari (cron sweep). */
export const JUMPA_CHAT_RETENTION_DAYS = 90;
/** Panjang maksimum satu pesan obrolan. */
export const JUMPA_CHAT_MAX_LEN = 500;
/** Kirim peringatan "waktu hampir habis" saat sisa waktu ≤ N menit. */
export const JUMPA_WARN_BEFORE_END_MIN = 10;
/** Ruang yang dibuat tapi tidak pernah dimulai diakhiri setelah N jam. */
export const JUMPA_STALE_SCHEDULED_HOURS = 24;
/** Murid hanya boleh punya satu ruang MURID aktif sekaligus. */
export const JUMPA_MURID_MAX_ACTIVE_ROOMS = 1;
/** Umur maksimum tautan undangan guru (ruang GURU). */
export const JUMPA_LINK_INVITE_TTL_HOURS = 24;

/** Waktu ruang berakhir (null bila belum mulai). */
export function roomEndsAt(startedAt: Date | null, maxDurationMin: number): Date | null {
  return startedAt ? new Date(startedAt.getTime() + maxDurationMin * 60_000) : null;
}
