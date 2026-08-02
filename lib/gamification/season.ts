/**
 * Weekly & Season Key BC Arena.
 *
 * Minggu dihitung dengan acuan WIB (Asia/Jakarta, UTC+7): minggu baru dimulai
 * Senin 00:00 WIB. Format kunci minggu: "2026-W31". Season adalah periode
 * kompetisi 4 minggu, kunci "2026-S1".."2026-S13" (52 minggu / 4).
 *
 * weeklyXP di-reset otomatis ketika kunci minggu bergeser (lazy reset pada
 * setiap pembacaan/penulisan profil) — tidak butuh cron job.
 */

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7

export function startOfWeekWIB(date: Date = new Date()): Date {
  // Geser ke WIB dulu, hitung hari-ke-Senin, lalu kembalikan ke UTC.
  const d = new Date(date.getTime() + WIB_OFFSET_MS);
  d.setHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0=Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return new Date(d.getTime() - WIB_OFFSET_MS);
}

/** Kunci minggu ISO "2026-W31". */
export function weekKey(date: Date = new Date()): string {
  const d = new Date(date.getTime() + WIB_OFFSET_MS);
  const day = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + (4 - day));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Periode season "2026-S1".."2026-S13" (4 minggu per season). */
export function seasonPeriodKey(date: Date = new Date()): string {
  const k = weekKey(date);
  const [year, w] = k.split("-W").map((p, i) => (i === 0 ? parseInt(p, 10) : parseInt(p, 10)));
  const seasonNum = Math.floor((w - 1) / 4) + 1;
  return `${year}-S${String(seasonNum).padStart(2, "0")}`;
}

/** Label minggu dalam Bahasa Indonesia. */
export function weekLabel(key: string): string {
  const [year, w] = key.split("-W");
  return `Minggu ke-${parseInt(w, 10)} ${year}`;
}

/** Label season dalam Bahasa Indonesia. */
export function seasonLabel(key: string): string {
  const [year, s] = key.split("-S");
  return `Season ${parseInt(s, 10)} ${year}`;
}

/** Nilai WIB untuk batas waktu hari ini (untuk query "hari ini" di zona WIB). */
export function startOfTodayWIB(): Date {
  const now = new Date();
  const d = new Date(now.getTime() + WIB_OFFSET_MS);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - WIB_OFFSET_MS);
}
