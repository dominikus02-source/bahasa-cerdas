/**
 * JUMPA — jadwal rapat (murni, tanpa DB/HTTP; dites di
 * scripts/test-jumpa-flow.ts). Semua jam yang dilihat pengguna = WIB (UTC+7).
 *
 * Model: ruang terjadwal = JumpaRoom berstatus SCHEDULED dengan scheduledAt.
 * Durasi pilihan guru disimpan di maxDurationMin (≤ batas paket), jadi
 * penegakan durasi yang sudah ada (token, sweep) tetap berlaku tanpa kolom baru.
 */
import { JUMPA_EARLY_JOIN_MIN, type JumpaKind } from "./caps";
import { effectiveRole, type JumpaActor } from "./permissions";
import { limitsFor, type JumpaTier } from "./tiers";

export const WIB_OFFSET_MIN = 7 * 60;
/** Jadwal paling cepat N menit dari sekarang (lebih cepat = "Mulai sekarang"). */
export const JUMPA_SCHEDULE_MIN_LEAD_MIN = 5;
/** Jadwal paling jauh N hari ke depan. */
export const JUMPA_SCHEDULE_MAX_AHEAD_DAYS = 60;
/** Durasi terpendek yang bisa dipilih. */
export const JUMPA_SCHEDULE_MIN_DURATION = 15;
export { JUMPA_EARLY_JOIN_MIN };
/** Pengingat dikirim N menit sebelum mulai. */
export const JUMPA_REMINDER_BEFORE_MIN = 10;
/** Pilihan durasi di formulir (dipotong sesuai batas paket). */
export const JUMPA_DURATION_CHOICES = [15, 30, 45, 60, 90, 120] as const;
/** Undangan orang tertentu per jadwal. */
export const JUMPA_SCHEDULE_MAX_USERS = 30;

export type ScheduleErrorCode =
  | "BAD_DATE"
  | "TOO_SOON"
  | "TOO_FAR"
  | "BAD_DURATION"
  | "DURATION_OVER_LIMIT"
  | "KIND_NOT_SCHEDULABLE"
  | "ROLE_NOT_ALLOWED"
  | "JUNIOR_NOT_ALLOWED"
  | "NO_AUDIENCE";

export type ScheduleCheck<T> = ({ ok: true } & T) | { ok: false; code: ScheduleErrorCode; message: string };

const no = (code: ScheduleErrorCode, message: string) => ({ ok: false, code, message }) as const;

/** "2026-10-20" + "14:30" (WIB) → Date (UTC). null bila format/tanggal tidak valid. */
export function parseWib(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const t = /^(\d{1,2})[:.](\d{2})$/.exec(time.trim());
  if (!d || !t) return null;
  const [y, mo, da, h, mi] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])];
  if (mo < 1 || mo > 12 || da < 1 || da > 31 || h > 23 || mi > 59) return null;
  const ms = Date.UTC(y, mo - 1, da, h, mi) - WIB_OFFSET_MIN * 60_000;
  const check = new Date(ms + WIB_OFFSET_MIN * 60_000);
  // Tolak 31 Februari dsb. (Date.UTC menggulung ke bulan berikutnya).
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== da) return null;
  return new Date(ms);
}

/** Date → { date: "YYYY-MM-DD", time: "HH:MM" } dalam WIB (untuk isi ulang formulir). */
export function toWibParts(at: Date): { date: string; time: string } {
  const w = new Date(at.getTime() + WIB_OFFSET_MIN * 60_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return { date: `${w.getUTCFullYear()}-${p(w.getUTCMonth() + 1)}-${p(w.getUTCDate())}`, time: `${p(w.getUTCHours())}:${p(w.getUTCMinutes())}` };
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "Senin, 20 Okt · 14.30 WIB" (atau "Hari ini · 14.30 WIB" / "Besok · …"). */
export function formatWib(at: Date, now?: Date): string {
  const w = new Date(at.getTime() + WIB_OFFSET_MIN * 60_000);
  const jam = `${String(w.getUTCHours()).padStart(2, "0")}.${String(w.getUTCMinutes()).padStart(2, "0")} WIB`;
  if (now) {
    const dayIndex = (d: Date) => Math.floor((d.getTime() + WIB_OFFSET_MIN * 60_000) / 86_400_000);
    const diff = dayIndex(at) - dayIndex(now);
    if (diff === 0) return `Hari ini · ${jam}`;
    if (diff === 1) return `Besok · ${jam}`;
  }
  return `${HARI[w.getUTCDay()]}, ${w.getUTCDate()} ${BULAN[w.getUTCMonth()]} · ${jam}`;
}

/** "14.30 WIB" saja. */
export function formatWibTime(at: Date): string {
  const w = new Date(at.getTime() + WIB_OFFSET_MIN * 60_000);
  return `${String(w.getUTCHours()).padStart(2, "0")}.${String(w.getUTCMinutes()).padStart(2, "0")} WIB`;
}

/** Durasi yang bisa dipilih untuk paket & jenis ruang ini. */
export function durationChoices(tier: JumpaTier, kind: Exclude<JumpaKind, "MURID">): number[] {
  const max = limitsFor(tier, kind).maxDurationMin;
  const list: number[] = JUMPA_DURATION_CHOICES.filter((m) => m <= max);
  if (!list.includes(max)) list.push(max);
  return list;
}

/** Siapa boleh menjadwalkan: hanya guru, untuk ruang KELAS/GURU. Murid & Junior tidak. */
export function canSchedule(actor: JumpaActor, kind: JumpaKind): ScheduleCheck<Record<never, never>> {
  const role = effectiveRole(actor);
  if (!role) return no("ROLE_NOT_ALLOWED", "Akun ini belum bisa memakai JUMPA.");
  if (kind === "MURID") return no("KIND_NOT_SCHEDULABLE", "Ruang belajar bareng tidak bisa dijadwalkan.");
  if (actor.isJunior) return no("JUNIOR_NOT_ALLOWED", "Akun Junior belum bisa menjadwalkan.");
  if (role !== "GURU") return no("ROLE_NOT_ALLOWED", "Hanya guru yang bisa menjadwalkan JUMPA.");
  return { ok: true };
}

export interface ScheduleInput {
  date: string;
  time: string;
  durationMin: number;
  tier: JumpaTier;
  kind: Exclude<JumpaKind, "MURID">;
  /** Ada kelas / komunitas / orang yang diundang. */
  hasAudience: boolean;
  now: Date;
}

/** Validasi jadwal: tanggal WIB valid, ≥ 5 menit lagi, ≤ 60 hari, durasi dalam batas paket. */
export function validateSchedule(input: ScheduleInput): ScheduleCheck<{ startsAt: Date; durationMin: number }> {
  const startsAt = parseWib(input.date, input.time);
  if (!startsAt) return no("BAD_DATE", "Tanggal atau jam tidak valid.");
  const lead = startsAt.getTime() - input.now.getTime();
  if (lead < JUMPA_SCHEDULE_MIN_LEAD_MIN * 60_000) return no("TOO_SOON", "Pilih jam minimal 5 menit dari sekarang.");
  if (lead > JUMPA_SCHEDULE_MAX_AHEAD_DAYS * 86_400_000) return no("TOO_FAR", "Jadwal maksimal 60 hari ke depan.");
  const d = Math.round(input.durationMin);
  if (!Number.isFinite(d) || d < JUMPA_SCHEDULE_MIN_DURATION || d % 5 !== 0) return no("BAD_DURATION", "Durasi tidak valid.");
  const max = limitsFor(input.tier, input.kind).maxDurationMin;
  if (d > max) return no("DURATION_OVER_LIMIT", `Durasi paketmu maksimal ${max} menit.`);
  if (!input.hasAudience) return no("NO_AUDIENCE", "Pilih kelas, komunitas, atau orang yang diundang.");
  return { ok: true, startsAt, durationMin: d };
}

/** Pembatalan / ubah jadwal: hanya pembuat, sebelum ruang dimulai. */
export function canManageSchedule(input: { actorId: string; createdById: string; status: "SCHEDULED" | "LIVE" | "ENDED" }): ScheduleCheck<Record<never, never>> {
  if (input.actorId !== input.createdById) return no("ROLE_NOT_ALLOWED", "Hanya pembuat jadwal yang bisa mengubahnya.");
  if (input.status !== "SCHEDULED") return no("KIND_NOT_SCHEDULABLE", "JUMPA ini sudah dimulai atau selesai.");
  return { ok: true };
}

/**
 * Gerbang masuk ruang terjadwal: peserta (bukan pemandu) baru bisa masuk
 * N menit sebelum jam mulai, atau begitu pemandu sudah memulai (LIVE).
 */
export function scheduledGate(input: { status: "SCHEDULED" | "LIVE" | "ENDED"; scheduledAt: Date | null; isHost: boolean; now: Date }): { open: true } | { open: false; opensAt: Date } {
  if (input.isHost || input.status !== "SCHEDULED" || !input.scheduledAt) return { open: true };
  const opensAt = new Date(input.scheduledAt.getTime() - JUMPA_EARLY_JOIN_MIN * 60_000);
  return input.now >= opensAt ? { open: true } : { open: false, opensAt };
}

/** Pengingat jatuh tempo: dalam 10 menit sebelum mulai (tidak dikirim setelah lewat jam mulai). */
export function reminderDue(scheduledAt: Date, now: Date): boolean {
  const t = scheduledAt.getTime() - now.getTime();
  return t > 0 && t <= JUMPA_REMINDER_BEFORE_MIN * 60_000;
}
