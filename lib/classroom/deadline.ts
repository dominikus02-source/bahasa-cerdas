/**
 * STEP 6.2 — deadline manusiawi (server-side pure, WIB-naive pakai waktu lokal
 * server). Dipakai guru & murid. Murni — tanpa DB.
 */

export type DeadlineKind = "hari-ini" | "besok" | "n-hari" | "terlambat" | "tanggal" | "tanpa";

export interface DeadlineInfo {
  label: string;
  kind: DeadlineKind;
  /** true bila deadline sudah lewat. */
  overdue: boolean;
}

/**
 * Format deadline manusiawi:
 *  - tanpa deadline  → "Tanpa batas waktu"
 *  - hari ini        → "Hari ini"
 *  - besok           → "Besok"
 *  - N hari lagi     → "2 hari lagi"
 *  - sudah lewat     → "Terlambat 1 hari"
 *  - jauh            → tanggal lokal (id-ID)
 */
export function humanDeadline(due: string | Date | null | undefined, now: Date = new Date()): DeadlineInfo {
  if (!due) return { label: "Tanpa batas waktu", kind: "tanpa", overdue: false };

  const dueDate = typeof due === "string" ? new Date(due) : due;
  if (Number.isNaN(dueDate.getTime())) return { label: "Tanpa batas waktu", kind: "tanpa", overdue: false };

  // Bandingkan per hari kalender (awal hari).
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const target = startOfDay(dueDate);
  const diffDays = Math.round((target - today) / 86400000);

  if (diffDays < 0) {
    const late = Math.abs(diffDays);
    return { label: late === 1 ? "Terlambat 1 hari" : `Terlambat ${late} hari`, kind: "terlambat", overdue: true };
  }
  if (diffDays === 0) return { label: "Hari ini", kind: "hari-ini", overdue: false };
  if (diffDays === 1) return { label: "Besok", kind: "besok", overdue: false };
  if (diffDays <= 7) return { label: `${diffDays} hari lagi`, kind: "n-hari", overdue: false };

  return {
    label: dueDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    kind: "tanggal",
    overdue: false,
  };
}
