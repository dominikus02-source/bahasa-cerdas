/**
 * Virtual background untuk video kamera JUMPA.
 * Gambar di public/jumpa/backgrounds/ muncul di belakang orang di video.
 */
export type JumpaBackgroundId = "none" | "kelas" | "kantor" | "ekosistem" | "logo-light" | "logo-dark" | "custom";

export interface JumpaBackground {
  id: JumpaBackgroundId;
  label: string;
  /** Path gambar virtual background. Kosong = tidak ada. */
  image?: string;
}

export const JUMPA_BACKGROUNDS: readonly JumpaBackground[] = [
  { id: "none", label: "Tanpa latar" },
  { id: "kelas", label: "Ruang kelas", image: "/jumpa/backgrounds/kelas.jpg" },
  { id: "kantor", label: "Kantor", image: "/jumpa/backgrounds/323707.jpg" },
  { id: "ekosistem", label: "Ekosistem", image: "/jumpa/backgrounds/323707.jpg" },
  { id: "logo-light", label: "Logo terang", image: "/jumpa/backgrounds/286031.jpg" },
  { id: "logo-dark", label: "Logo gelap", image: "/jumpa/backgrounds/286030.jpg" },
  { id: "custom", label: "Buat sendiri" },
] as const;

export function backgroundById(id: string | null | undefined): JumpaBackground {
  return JUMPA_BACKGROUNDS.find((b) => b.id === id) ?? JUMPA_BACKGROUNDS[0];
}
