/**
 * BC Premium Economy — period key (bisnis WIB, Asia/Jakarta UTC+7).
 *
 * Jangan pakai UTC mentah: pergantian kuota harus terjadi jam 00:00 WIB,
 * bukan 00:00 UTC. Dipakai oleh engine usage & status API.
 */

export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export type PeriodType = "MONTH" | "DAY";

/**
 * Period key untuk tanggal tertentu (default sekarang).
 *  - MONTH → "YYYY-MM" (2026-08)
 *  - DAY   → "YYYY-MM-DD" (2026-08-11)
 */
export function getPeriodKey(period: PeriodType, date: Date = new Date()): string {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const d = String(wib.getUTCDate()).padStart(2, "0");
  return period === "MONTH" ? `${y}-${m}` : `${y}-${m}-${d}`;
}

/** Awal bulan berjalan (UTC timestamp) dalam zona WIB. */
export function startOfMonthWIB(): Date {
  const period = getPeriodKey("MONTH");
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1) - WIB_OFFSET_MS);
}

/** Awal hari ini (UTC timestamp) dalam zona WIB. */
export function startOfDayWIB(date: Date = new Date()): Date {
  const period = getPeriodKey("DAY", date);
  const [y, m, d] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - WIB_OFFSET_MS);
}
