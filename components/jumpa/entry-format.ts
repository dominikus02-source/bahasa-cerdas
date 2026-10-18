/** Format kecil untuk titik masuk JUMPA (murni, aman di klien). */
import { formatWib } from "@/lib/jumpa/schedule";

/** "32 mnt" / "1 jam 5 mnt". */
export function minutesLabel(totalMin: number): string {
  const m = Math.max(0, Math.round(totalMin));
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} jam ${r} mnt` : `${h} jam`;
}

export function whenLabel(iso: string | null | undefined, now = new Date()): string {
  return iso ? formatWib(new Date(iso), now) : "";
}

/** Tempat (kelas/komunitas) hanya bila belum tertulis di judul — hindari "JUMPA Kelas 7A · Kelas 7A". */
export function placeLabel(title: string, place: string | null | undefined): string | null {
  if (!place) return null;
  return title.toLowerCase().includes(place.toLowerCase()) ? null : place;
}
