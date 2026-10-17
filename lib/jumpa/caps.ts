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
