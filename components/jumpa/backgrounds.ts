/**
 * Virtual background untuk video kamera JUMPA.
 * Gambar di public/jumpa/backgrounds/ muncul di belakang orang di video.
 */
export type JumpaBackgroundId = "none" | "kelas" | "kelas-bc" | "kelas-biru" | "kantor" | "logo-wall" | "ekosistem" | "custom";

export interface JumpaBackground {
  id: JumpaBackgroundId;
  label: string;
  /** Path gambar virtual background. Kosong = tidak ada. */
  image?: string;
}

export const JUMPA_BACKGROUNDS: readonly JumpaBackground[] = [
  { id: "none", label: "Tanpa latar" },
  { id: "kelas", label: "Kelas", image: "/jumpa/backgrounds/kelas.jpg" },
  { id: "kelas-bc", label: "Kelas BC", image: "/jumpa/backgrounds/kelas-bc.png" },
  { id: "kelas-biru", label: "Kelas biru", image: "/jumpa/backgrounds/kelas-biru.png" },
  { id: "kantor", label: "Kantor", image: "/jumpa/backgrounds/328084.png" },
  { id: "logo-wall", label: "Logo dinding", image: "/jumpa/backgrounds/logo-wall.png" },
  { id: "ekosistem", label: "Ekosistem", image: "/jumpa/backgrounds/ekosistem-dark.jpg" },
  { id: "custom", label: "Buat sendiri" },
] as const;

export function backgroundById(id: string | null | undefined): JumpaBackground {
  return JUMPA_BACKGROUNDS.find((b) => b.id === id) ?? JUMPA_BACKGROUNDS[0];
}
