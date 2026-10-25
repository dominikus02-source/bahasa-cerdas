/**
 * Virtual background untuk video kamera JUMPA.
 * Gambar ada di public/jumpa/backgrounds/v1/ (WebP 16:9): 1920 untuk layar
 * lebar, 1280 untuk ponsel (hemat kuota), 320 untuk pratinjau pemilih.
 */
export type JumpaBackgroundId =
  | "none"
  | "kelas"
  | "pojok-baca"
  | "ruang-belajar"
  | "terang"
  | "gradien"
  | "pola-bc"
  | "custom";

export interface JumpaBackground {
  id: JumpaBackgroundId;
  label: string;
  /** Path gambar 1920×1080. Kosong = tidak ada. */
  image?: string;
  /** Path gambar 1280×720 untuk ponsel. */
  imageSmall?: string;
  /** Pratinjau 320×180 untuk pemilih latar. */
  thumb?: string;
}

const DIR = "/jumpa/backgrounds/v1";
const set = (id: JumpaBackgroundId, label: string, file: string): JumpaBackground => ({
  id,
  label,
  image: `${DIR}/${file}-1920.webp`,
  imageSmall: `${DIR}/${file}-1280.webp`,
  thumb: `${DIR}/${file}-320.webp`,
});

export const JUMPA_BACKGROUNDS: readonly JumpaBackground[] = [
  { id: "none", label: "Tanpa latar" },
  set("kelas", "Kelas", "kelas-modern"),
  set("pojok-baca", "Pojok baca", "pojok-baca"),
  set("ruang-belajar", "Ruang belajar", "ruang-belajar"),
  set("terang", "Terang", "terang"),
  set("gradien", "Gradien", "gradien"),
  set("pola-bc", "Pola BC", "pola-bc"),
  { id: "custom", label: "Buat sendiri" },
] as const;

export function backgroundById(id: string | null | undefined): JumpaBackground {
  return JUMPA_BACKGROUNDS.find((b) => b.id === id) ?? JUMPA_BACKGROUNDS[0];
}

/** Gambar yang dipakai untuk video: versi kecil di layar sempit. */
export function backgroundImageFor(bg: JumpaBackground, viewportWidth: number): string | undefined {
  return viewportWidth < 768 && bg.imageSmall ? bg.imageSmall : bg.image;
}
