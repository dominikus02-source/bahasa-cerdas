/**
 * Pilihan latar ruang JUMPA bergaya BahasaCerdas + logo BC.
 * Termasuk opsi custom (upload gambar sendiri).
 */
export type JumpaBackgroundId = "none" | "hijau" | "batik" | "langit" | "hutan" | "senja" | "malam" | "custom";

export interface JumpaBackground {
  id: JumpaBackgroundId;
  label: string;
  /** CSS background value (gradient). Untuk custom, kosong. */
  css: string;
  /** Preview kecil. */
  preview: string;
  /** Tampilkan logo BC sebagai watermark. */
  showLogo: boolean;
}

export const JUMPA_BACKGROUNDS: readonly JumpaBackground[] = [
  { id: "none", label: "Polos", css: "transparent", preview: "linear-gradient(135deg,#1a1d24,#0f1117)", showLogo: false },
  { id: "hijau", label: "Hijau BC", css: "linear-gradient(160deg,#064e3b 0%,#059669 60%,#34d399 100%)", preview: "linear-gradient(135deg,#064e3b,#34d399)", showLogo: true },
  { id: "batik", label: "Batik", css: "radial-gradient(circle at 20% 30%,#065f46 0%,transparent 50%), radial-gradient(circle at 80% 70%,#047857 0%,transparent 40%), linear-gradient(180deg,#022c22,#064e3b)", preview: "radial-gradient(circle at 30% 40%,#065f46,#022c22)", showLogo: true },
  { id: "langit", label: "Langit", css: "linear-gradient(180deg,#0c4a6e 0%,#0369a1 40%,#059669 100%)", preview: "linear-gradient(135deg,#0c4a6e,#059669)", showLogo: true },
  { id: "hutan", label: "Hutan", css: "linear-gradient(145deg,#14532d 0%,#166534 50%,#15803d 100%)", preview: "linear-gradient(135deg,#14532d,#15803d)", showLogo: true },
  { id: "senja", label: "Senja", css: "linear-gradient(135deg,#7c2d12 0%,#c2410c 40%,#059669 100%)", preview: "linear-gradient(135deg,#7c2d12,#059669)", showLogo: true },
  { id: "malam", label: "Malam", css: "linear-gradient(180deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)", preview: "linear-gradient(135deg,#0f172a,#1e293b)", showLogo: true },
  { id: "custom", label: "Buat sendiri", css: "", preview: "linear-gradient(135deg,#334155,#64748b)", showLogo: false },
] as const;

export function backgroundById(id: string | null | undefined): JumpaBackground {
  return JUMPA_BACKGROUNDS.find((b) => b.id === id) ?? JUMPA_BACKGROUNDS[0];
}

/** Path logo BC untuk watermark latar. */
export const BC_LOGO_WATERMARK = "/brand/bc2026-icon.png";
