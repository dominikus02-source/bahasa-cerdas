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

/**
 * Senin 00:00 WIB (dinyatakan sebagai instant UTC) dari sebuah ISO week.
 *
 * Konsisten dengan `weekKey`: kunci "2026-W31" dimiliki tepat oleh semua
 * tanggal dalam [Monday 00:00 WIB minggu itu, Monday 00:00 WIB minggu
 * berikutnya). Dipakai settlement reward & rentang kueri XP per periode.
 */
export function mondayWibOfIsoWeek(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay();
  const backToThursday = (dow - 4 + 7) % 7;
  const thursdayWeek1 = new Date(jan4.getTime() - backToThursday * 86400000);
  const thursday = new Date(thursdayWeek1.getTime() + (week - 1) * 7 * 86400000);
  const monday = new Date(thursday.getTime() - 3 * 86400000);
  return new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()) - WIB_OFFSET_MS);
}

export interface PeriodRange {
  /** Awal periode (Senin 00:00 WIB). Inklusif. */
  startsAt: Date;
  /** Akhir periode (Minggu 23:59:59.999 WIB). Inklusif. */
  endsAt: Date;
}

/** Rentang tanggal sebuah minggu ("2026-W31" → Senin 00:00 WIB s.d. Minggu 23:59:59.999 WIB). */
export function weekRange(key: string): PeriodRange {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(key);
  if (!m) throw new Error(`weekKey tidak valid: ${key}`);
  const startsAt = mondayWibOfIsoWeek(parseInt(m[1], 10), parseInt(m[2], 10));
  const endsAt = new Date(startsAt.getTime() + 7 * 86400000 - 1);
  return { startsAt, endsAt };
}

/** Rentang tanggal sebuah season ("2026-S1" → Senin W1 00:00 WIB s.d. Minggu W4 23:59:59.999 WIB). */
export function seasonRange(key: string): PeriodRange {
  const m = /^(\d{4})-S(\d{1,2})$/.exec(key);
  if (!m) throw new Error(`seasonKey tidak valid: ${key}`);
  const year = parseInt(m[1], 10);
  const s = parseInt(m[2], 10);
  const firstWeek = (s - 1) * 4 + 1;
  const startsAt = mondayWibOfIsoWeek(year, firstWeek);
  const endsAt = new Date(mondayWibOfIsoWeek(year, s * 4).getTime() + 7 * 86400000 - 1);
  return { startsAt, endsAt };
}

/** Kunci minggu SEBELUM sebuah weekKey (menyeberangi tahun dengan aman). */
export function previousWeekKey(key: string): string {
  const range = weekRange(key);
  return weekKey(new Date(range.startsAt.getTime() - 1));
}

/** Kunci season SEBELUM sebuah seasonKey (menyeberangi tahun dengan aman). */
export function previousSeasonKey(key: string): string {
  const range = seasonRange(key);
  return seasonPeriodKey(new Date(range.startsAt.getTime() - 1));
}
