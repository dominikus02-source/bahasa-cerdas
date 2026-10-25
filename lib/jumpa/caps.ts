/**
 * Batas default ruang JUMPA per jenis ruang (murni, tanpa I/O).
 * Lihat docs/JUMPA_TECHNICAL_PLAN.md §2.5. Ubah angka di sini saja.
 */
import { JUMPA_MURID_FREE, JUMPA_TIERS } from "./tiers";

export type JumpaKind = "KELAS" | "GURU" | "MURID";

export interface JumpaCaps {
  maxParticipants: number;
  maxDurationMin: number;
}

/**
 * Batas PENUH per jenis ruang (= paket Premium; MURID gratis sebagai default).
 * Fase 3: angka hidup di lib/jumpa/tiers.ts — paket Gratis memakai
 * limitsFor("FREE", kind). Jangan menulis angka di sini.
 */
export const JUMPA_CAPS: Record<JumpaKind, JumpaCaps> = {
  KELAS: { ...JUMPA_TIERS.PREMIUM.rooms.KELAS },
  GURU: { ...JUMPA_TIERS.PREMIUM.rooms.GURU },
  MURID: { ...JUMPA_MURID_FREE },
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

// ── Fase 2 ───────────────────────────────────────────────────────────────
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

/** Kedaluwarsa tautan undangan: 24 jam sejak dibuat, atau sejak jam mulai bila ruang dijadwalkan lebih lambat. */
export function linkInviteExpiry(now: Date, scheduledAt?: Date | null): Date {
  const base = scheduledAt && scheduledAt.getTime() > now.getTime() ? scheduledAt : now;
  return new Date(base.getTime() + JUMPA_LINK_INVITE_TTL_HOURS * 3_600_000);
}

/** Ruang terjadwal: peserta boleh masuk N menit sebelum jam mulai (pemandu kapan saja). */
export const JUMPA_EARLY_JOIN_MIN = 10;

/** Waktu ruang berakhir (null bila belum mulai). */
export function roomEndsAt(startedAt: Date | null, maxDurationMin: number): Date | null {
  return startedAt ? new Date(startedAt.getTime() + maxDurationMin * 60_000) : null;
}
