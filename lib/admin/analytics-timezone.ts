// ════════════════════════════════════════════════════════════════════
// ANALYTICS TIMEZONE — Single source of truth for date boundaries
//
// All founder-facing analytics (DAU, WAU, MAU, retention cohorts,
// cash collected period boundaries) use Asia/Jakarta (WIB, UTC+7).
//
// Database timestamps remain UTC. Only reporting period boundaries
// are converted to WIB.
// ════════════════════════════════════════════════════════════════════

export const ANALYTICS_TIMEZONE = "Asia/Jakarta" as const;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7 in milliseconds

/**
 * Get the start of today in WIB (00:00:00 WIB).
 * Returns a UTC Date object representing midnight WIB.
 *
 * Example: If it's 2026-09-02 14:00 UTC (= 2026-09-02 21:00 WIB),
 * returns 2026-09-02 00:00 UTC (= 2026-09-02 07:00 WIB).
 * But the semantic meaning is "start of Sep 2 in WIB".
 */
export function wibTodayStart(now: Date = new Date()): Date {
  const utcMs = now.getTime();
  const wibMs = utcMs + WIB_OFFSET_MS;
  const wibDate = new Date(wibMs);
  // Start of day in WIB
  const wibDayStart = new Date(
    Date.UTC(wibDate.getUTCFullYear(), wibDate.getUTCMonth(), wibDate.getUTCDate())
  );
  // Convert back to UTC representation: subtract WIB offset
  return new Date(wibDayStart.getTime() - WIB_OFFSET_MS);
}

/**
 * Get a date N days ago in WIB.
 * Uses WIB calendar days, not raw 24h subtraction.
 */
export function wibDaysAgo(days: number, now: Date = new Date()): Date {
  const utcMs = now.getTime();
  const wibMs = utcMs + WIB_OFFSET_MS;
  const wibDate = new Date(wibMs);
  const targetDay = new Date(
    Date.UTC(wibDate.getUTCFullYear(), wibDate.getUTCMonth(), wibDate.getUTCDate() - days)
  );
  return new Date(targetDay.getTime() - WIB_OFFSET_MS);
}

/**
 * Convert a UTC timestamp to its WIB calendar date components.
 */
export function utcToWibDate(utcDate: Date): { year: number; month: number; day: number } {
  const wibMs = utcDate.getTime() + WIB_OFFSET_MS;
  const wibDate = new Date(wibMs);
  return {
    year: wibDate.getUTCFullYear(),
    month: wibDate.getUTCMonth(),
    day: wibDate.getUTCDate(),
  };
}

/**
 * Check if a UTC timestamp falls on the same WIB calendar day as a reference date.
 */
export function isSameWibDay(utcTimestamp: Date, wibReferenceDay: Date): boolean {
  const ts = utcToWibDate(utcTimestamp);
  const ref = utcToWibDate(wibReferenceDay);
  return ts.year === ref.year && ts.month === ref.month && ts.day === ref.day;
}

/**
 * Get the UTC range [start, end) for a specific WIB calendar day.
 * Useful for querying DB records that fall on a particular WIB day.
 */
export function wibDayToUtcRange(wibDay: Date): { start: Date; end: Date } {
  const wib = utcToWibDate(wibDay);
  const startWib = Date.UTC(wib.year, wib.month, wib.day);
  const endWib = Date.UTC(wib.year, wib.month, wib.day + 1);
  return {
    start: new Date(startWib - WIB_OFFSET_MS),
    end: new Date(endWib - WIB_OFFSET_MS),
  };
}

/**
 * Get the UTC range [start, end) for a WIB calendar day offset by N days from a reference.
 */
export function wibDayOffsetToUtcRange(offsetDays: number, referenceWibDay: Date): { start: Date; end: Date } {
  const ref = utcToWibDate(referenceWibDay);
  const target = new Date(Date.UTC(ref.year, ref.month, ref.day + offsetDays));
  return wibDayToUtcRange(target);
}
