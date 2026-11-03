/**
 * Format unduhan naskah AKU SASTRAWAN (.txt, PDF, Word). Modul murni & ringan
 * — aman untuk klien (menu unduh) dan server (rute ekspor).
 */

export type FormatEkspor = "txt" | "pdf" | "docx";

export const FORMAT_EKSPOR: readonly { format: FormatEkspor; label: string; ket: string }[] = [
  { format: "pdf", label: "Unduh PDF", ket: "Siap dibaca & dicetak" },
  { format: "docx", label: "Unduh Word (.docx)", ket: "Bisa disunting lagi" },
  { format: "txt", label: "Unduh .txt", ket: "Teks polos" },
];

/** Nilai ?format= → format yang dikenal; kosong = .txt (perilaku lama); lainnya = null. */
export function bacaFormatEkspor(nilai: string | null | undefined): FormatEkspor | null {
  const v = (nilai ?? "").trim().toLowerCase();
  if (!v || v === "txt") return "txt";
  if (v === "pdf" || v === "docx") return v;
  return null;
}

/** Tautan unduhan milik pemilik karya (sesi login wajib; diperiksa di server). */
export function tautanEkspor(projectId: string, format: FormatEkspor): string {
  const dasar = `/api/aku-sastrawan/projects/${encodeURIComponent(projectId)}/export`;
  return format === "txt" ? dasar : `${dasar}?format=${format}`;
}
