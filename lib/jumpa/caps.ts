/**
 * Batas default ruang JUMPA per jenis ruang (murni, tanpa I/O).
 * Lihat docs/JUMPA_TECHNICAL_PLAN.md §2.5. Ubah angka di sini saja.
 */
import { JUMPA_MURID_FREE, JUMPA_TIERS, JUMPA_UMUM_TIERS } from "./tiers";

/** UMUM = ruang akun umum (mahasiswa/dosen/masyarakat), terpisah dari sekolah. */
export type JumpaKind = "KELAS" | "GURU" | "MURID" | "UMUM";

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
  UMUM: { ...JUMPA_UMUM_TIERS.UMUM_FREE.room },
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
/** Akun UMUM hanya boleh punya satu ruang UMUM aktif sekaligus. */
export const JUMPA_UMUM_MAX_ACTIVE_ROOMS_PER_USER = 1;
/** Default batas global ruang UMUM aktif bersamaan (env JUMPA_UMUM_MAX_CONCURRENT_ROOMS). */
export const JUMPA_UMUM_DEFAULT_CONCURRENT_ROOMS = 50;

/**
 * Batas global ruang UMUM aktif bersamaan (pagar biaya LiveKit). Dibaca dari
 * env JUMPA_UMUM_MAX_CONCURRENT_ROOMS; nilai kosong/tidak valid → default 50.
 * 0 = ruang UMUM baru ditutup sementara.
 */
export function umumConcurrentCap(raw: string | undefined): number {
  const v = raw?.trim();
  if (!v || !/^\d+$/.test(v)) return JUMPA_UMUM_DEFAULT_CONCURRENT_ROOMS;
  return Math.min(Number(v), 10_000);
}

export type UmumCreateGuard =
  | { ok: true }
  | { ok: false; status: 409 | 429; code: "TOO_MANY_ROOMS" | "UMUM_CAPACITY_FULL"; message: string };

/** Pagar pembuatan ruang UMUM: satu ruang aktif per akun + batas global. */
export function checkUmumCreateGuards(input: { myActiveRooms: number; globalActiveRooms: number; globalCap: number }): UmumCreateGuard {
  if (input.myActiveRooms >= JUMPA_UMUM_MAX_ACTIVE_ROOMS_PER_USER) {
    return { ok: false, status: 409, code: "TOO_MANY_ROOMS", message: "Kamu masih punya ruang yang aktif. Akhiri ruang itu dulu sebelum membuat yang baru." };
  }
  if (input.globalActiveRooms >= input.globalCap) {
    return { ok: false, status: 429, code: "UMUM_CAPACITY_FULL", message: "JUMPA sedang ramai sekali. Semua ruang umum sedang terpakai, coba lagi beberapa menit lagi ya." };
  }
  return { ok: true };
}
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
