/**
 * JUMPA — siklus hidup ruang & kehadiran (murni; dipakai cron sweep dan
 * webhook LiveKit). Dites di scripts/test-jumpa-host-actions.ts.
 */
import { JUMPA_STALE_SCHEDULED_HOURS, JUMPA_WARN_BEFORE_END_MIN, roomEndsAt } from "./caps";

export type SweepAction = "END_TIME_LIMIT" | "WARN" | "END_STALE" | null;

export interface SweepRoom {
  status: "SCHEDULED" | "LIVE" | "ENDED";
  startedAt: Date | null;
  createdAt: Date;
  maxDurationMin: number;
  warnedAt: Date | null;
}

export function sweepActionFor(room: SweepRoom, now: Date): SweepAction {
  if (room.status === "ENDED") return null;
  if (room.status === "SCHEDULED") {
    const staleMs = JUMPA_STALE_SCHEDULED_HOURS * 3_600_000;
    return now.getTime() - room.createdAt.getTime() > staleMs ? "END_STALE" : null;
  }
  const endsAt = roomEndsAt(room.startedAt, room.maxDurationMin);
  if (!endsAt) return null;
  if (now.getTime() >= endsAt.getTime()) return "END_TIME_LIMIT";
  const remainingMs = endsAt.getTime() - now.getTime();
  if (!room.warnedAt && remainingMs <= JUMPA_WARN_BEFORE_END_MIN * 60_000) return "WARN";
  return null;
}

export interface AttendanceState {
  lastJoinedAt: Date | null;
  lastLeftAt: Date | null;
  totalSeconds: number;
  joinCount: number;
}

/** Sedang tersambung = join terakhir lebih baru dari leave terakhir. */
export function isAttending(s: AttendanceState): boolean {
  return Boolean(s.lastJoinedAt && (!s.lastLeftAt || s.lastLeftAt < s.lastJoinedAt));
}

export function attendanceOnJoin(s: AttendanceState, at: Date): AttendanceState {
  // Join ganda tanpa leave (event hilang) — tutup sesi sebelumnya dulu.
  // lastLeftAt digeser 1 ms supaya sesi baru (join = at) tetap "hadir".
  const closed = isAttending(s) ? { ...attendanceOnLeave(s, at), lastLeftAt: new Date(at.getTime() - 1) } : s;
  return { ...closed, lastJoinedAt: at, joinCount: closed.joinCount + 1 };
}

export function attendanceOnLeave(s: AttendanceState, at: Date): AttendanceState {
  if (!isAttending(s) || !s.lastJoinedAt) return s; // leave ganda: idempoten
  const add = Math.max(0, Math.round((at.getTime() - s.lastJoinedAt.getTime()) / 1000));
  // Batas wajar satu sesi (ruang maks 2 jam + margin) — cegah angka liar.
  return { ...s, lastLeftAt: at, totalSeconds: s.totalSeconds + Math.min(add, 6 * 3600) };
}

/** Kunci idempotensi webhook: LiveKit bisa mengirim ulang event yang sama. */
export function webhookDedupeKey(eventId: string | undefined, event: string, roomName: string, identity: string, createdAtSec: number): string {
  return eventId ? `wh:${eventId}` : `wh:${event}:${roomName}:${identity}:${createdAtSec}`;
}
