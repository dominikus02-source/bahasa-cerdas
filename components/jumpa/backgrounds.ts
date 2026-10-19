/**
 * 6 pilihan latar ruang JUMPA bergaya BahasaCerdas.
 * CSS murni (tanpa gambar) agar ringan di HP.
 */
export type JumpaBackgroundId = "none" | "hijau" | "batik" | "langit" | "hutan" | "senja" | "malam";

export interface JumpaBackground {
  id: JumpaBackgroundId;
  label: string;
  /** CSS background value untuk diterapkan di ruang. */
  css: string;
  /** Preview kecil (gradient) untuk tombol pilihan. */
  preview: string;
}

export const JUMPA_BACKGROUNDS: readonly JumpaBackground[] = [
  { id: "none", label: "Polos", css: "transparent", preview: "linear-gradient(135deg,#1a1d24,#0f1117)" },
  { id: "hijau", label: "Hijau BC", css: "linear-gradient(160deg,#064e3b 0%,#059669 60%,#34d399 100%)", preview: "linear-gradient(135deg,#064e3b,#34d399)" },
  { id: "batik", label: "Batik", css: "radial-gradient(circle at 20% 30%,#065f46 0%,transparent 50%), radial-gradient(circle at 80% 70%,#047857 0%,transparent 40%), linear-gradient(180deg,#022c22,#064e3b)", preview: "radial-gradient(circle at 30% 40%,#065f46,#022c22)" },
  { id: "langit", label: "Langit", css: "linear-gradient(180deg,#0c4a6e 0%,#0369a1 40%,#059669 100%)", preview: "linear-gradient(135deg,#0c4a6e,#059669)" },
  { id: "hutan", label: "Hutan", css: "linear-gradient(145deg,#14532d 0%,#166534 50%,#15803d 100%)", preview: "linear-gradient(135deg,#14532d,#15803d)" },
  { id: "senja", label: "Senja", css: "linear-gradient(135deg,#7c2d12 0%,#c2410c 40%,#059669 100%)", preview: "linear-gradient(135deg,#7c2d12,#059669)" },
  { id: "malam", label: "Malam", css: "linear-gradient(180deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)", preview: "linear-gradient(135deg,#0f172a,#1e293b)" },
] as const;

export function backgroundById(id: string | null | undefined): JumpaBackground {
  return JUMPA_BACKGROUNDS.find((b) => b.id === id) ?? JUMPA_BACKGROUNDS[0];
}
