/**
 * Sampul buatan (tanpa gambar) untuk artikel & karya: dipakai bila sampul
 * kosong, URL-nya mati (Supabase Cloud lama), atau gambar gagal dimuat.
 * Murni & deterministik: judul yang sama selalu menghasilkan sampul yang sama,
 * tanpa panggilan jaringan.
 */

export type CoverVariant = "puisi" | "sastra" | "prosa" | "opini" | "artikel" | "karya";

export const COVER_VARIANTS: readonly CoverVariant[] = ["puisi", "sastra", "prosa", "opini", "artikel", "karya"];

interface JenisInfo {
  variant: CoverVariant;
  label: string;
}

// Kunci = articleType (Artikel) atau StudentKaryaType, huruf besar.
const JENIS: Record<string, JenisInfo> = {
  PUISI: { variant: "puisi", label: "Karya Puisi" },
  SAJAK: { variant: "puisi", label: "Karya Puisi" },
  PANTUN: { variant: "sastra", label: "Pantun" },
  SYAIR: { variant: "sastra", label: "Syair" },
  GURINDAM: { variant: "sastra", label: "Gurindam" },
  CERPEN: { variant: "prosa", label: "Cerpen" },
  ANEKDOT: { variant: "prosa", label: "Anekdot" },
  OPINI: { variant: "opini", label: "Opini" },
  SLOGAN: { variant: "opini", label: "Slogan" },
  ARTIKEL: { variant: "artikel", label: "Artikel" },
  KARYA_BEBAS: { variant: "karya", label: "Karya Bebas" },
};

// Urutan penting: yang lebih spesifik dulu.
const TAG_RULES: Array<[RegExp, string]> = [
  [/\b(puisi|sajak)\b/i, "PUISI"],
  [/\bpantun\b/i, "PANTUN"],
  [/\bsyair\b/i, "SYAIR"],
  [/\bgurindam\b/i, "GURINDAM"],
  [/\b(cerpen|cerita pendek)\b/i, "CERPEN"],
  [/\banekdot\b/i, "ANEKDOT"],
  [/\bopini\b/i, "OPINI"],
];

export interface CoverJenisInput {
  /** Artikel.articleType atau StudentKarya.type. */
  type?: string | null;
  tags?: readonly (string | null | undefined)[] | null;
  /** Default bila type & tags tidak dikenali. */
  fallback?: "artikel" | "karya";
}

export function coverJenis({ type, tags, fallback = "artikel" }: CoverJenisInput): JenisInfo {
  const key = (type || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (key && JENIS[key] && key !== "ARTIKEL") return JENIS[key];

  for (const tag of tags || []) {
    if (!tag) continue;
    for (const [re, jenis] of TAG_RULES) {
      if (re.test(tag)) return JENIS[jenis];
    }
  }

  if (key && JENIS[key]) return JENIS[key];
  return fallback === "karya" ? JENIS.KARYA_BEBAS : JENIS.ARTIKEL;
}

/** FNV-1a 32-bit — cukup untuk memilih variasi motif secara stabil. */
export function coverSeed(text: string | null | undefined): number {
  let h = 0x811c9dc5;
  const s = text || "";
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function coverTitle(title: string | null | undefined): string {
  const t = (title || "").replace(/\s+/g, " ").trim();
  return t || "Tanpa Judul";
}
