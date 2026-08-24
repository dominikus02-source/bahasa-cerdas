/**
 * Pure formatting utilities — no DB, no side effects.
 *
 * Extracted from lib/premium.ts (Phase 0A cleanup).
 * These are stateless helpers safe for any consumer.
 */

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const GELAR_BANDS: { min: number; label: string }[] = [
  { min: 16, label: "Legenda BahasaCerdas" },
  { min: 13, label: "Pujangga Muda" },
  { min: 10, label: "Maestro Kata" },
  { min: 7, label: "Juru Bahasa" },
  { min: 5, label: "Pencerita Andal" },
  { min: 3, label: "Perangkai Kata" },
  { min: 1, label: "Penulis Pemula" },
];

export function getGelarFromLevel(level: number): string {
  return (GELAR_BANDS.find((b) => level >= b.min) || GELAR_BANDS[GELAR_BANDS.length - 1]).label;
}
