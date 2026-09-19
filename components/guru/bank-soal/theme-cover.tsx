// ─── Theme Cover System (Bank Soal Discovery Hub) ────────────
// Visual cover PROSEDURAL: kombinasi token kategori (warna, icon,
// pattern) + variasi deterministik per tema (hash nama → varian
// pattern & shade). Tanpa asset gambar, tanpa canvas — CSS/SVG saja
// (§T: hemat JS per card). Warna TIDAK satu-satunya identitas
// kategori: icon + label kategori selalu ikut (§Q).
//
// Pemakaian:
//   const visual = categoryVisual(categoryKey);   // token kategori
//   const variant = themeVariant(themeName);      // variasi hash
//   <ThemeCover visual={visual} variant={variant} name={...} />

import type { LucideIcon } from "lucide-react";
import { SpellCheck, Feather, Newspaper, Megaphone, Shapes } from "lucide-react";

export type CategoryKey =
  | "Tata Bahasa"
  | "Sastra"
  | "Jenis Teks"
  | "Fungsional"
  | "Lainnya";

/** Token visual terpusat per kategori (§L) — jangan hardcode di card. */
export interface CategoryVisual {
  key: CategoryKey;
  /** Gradient cover utama (Tailwind classes). */
  coverGradient: string;
  /** Aksen kecil (chip, garis heading). */
  accentText: string;
  accentBg: string;
  accentBar: string;
  /** Chip metadata di card. */
  softBg: string;
  softText: string;
  /** Warna shape overlay (hex — untuk SVG inline). */
  shapeColor: string;
  icon: LucideIcon;
  /** Subtitle editorial singkat per kategori (§J). */
  subtitle: string;
}

export const CATEGORY_VISUALS: Record<CategoryKey, CategoryVisual> = {
  "Tata Bahasa": {
    key: "Tata Bahasa",
    coverGradient: "from-emerald-500 via-emerald-600 to-teal-700",
    accentText: "text-emerald-700",
    accentBg: "bg-emerald-100",
    accentBar: "bg-emerald-500",
    softBg: "bg-emerald-50",
    softText: "text-emerald-700",
    shapeColor: "#ffffff",
    icon: SpellCheck,
    subtitle: "Struktur, ejaan, dan makna kata.",
  },
  Sastra: {
    key: "Sastra",
    coverGradient: "from-violet-500 via-purple-600 to-fuchsia-600",
    accentText: "text-violet-700",
    accentBg: "bg-violet-100",
    accentBar: "bg-violet-500",
    softBg: "bg-violet-50",
    softText: "text-violet-700",
    shapeColor: "#ffffff",
    icon: Feather,
    subtitle: "Puisi, prosa, dan bentuk sastra Indonesia.",
  },
  "Jenis Teks": {
    key: "Jenis Teks",
    coverGradient: "from-blue-500 via-blue-600 to-cyan-600",
    accentText: "text-blue-700",
    accentBg: "bg-blue-100",
    accentBar: "bg-blue-500",
    softBg: "bg-blue-50",
    softText: "text-blue-700",
    shapeColor: "#ffffff",
    icon: Newspaper,
    subtitle: "Dari teks deskripsi hingga artikel dan resensi.",
  },
  Fungsional: {
    key: "Fungsional",
    coverGradient: "from-amber-500 via-orange-500 to-orange-600",
    accentText: "text-amber-700",
    accentBg: "bg-amber-100",
    accentBar: "bg-amber-500",
    softBg: "bg-amber-50",
    softText: "text-amber-700",
    shapeColor: "#ffffff",
    icon: Megaphone,
    subtitle: "Surat, poster, pidato — bahasa untuk dipakai.",
  },
  Lainnya: {
    key: "Lainnya",
    coverGradient: "from-indigo-500 via-indigo-600 to-slate-700",
    accentText: "text-indigo-700",
    accentBg: "bg-indigo-100",
    accentBar: "bg-indigo-500",
    softBg: "bg-indigo-50",
    softText: "text-indigo-700",
    shapeColor: "#ffffff",
    icon: Shapes,
    subtitle: "Tema di luar kategori utama.",
  },
};

export function categoryVisual(key: string): CategoryVisual {
  return CATEGORY_VISUALS[key as CategoryKey] ?? CATEGORY_VISUALS["Lainnya"];
}

// ─── Variasi deterministik per tema (§M — variasi tanpa chaos) ──

export interface ThemeVariant {
  /** Indeks pola overlay (dots/diagonal/arc). */
  pattern: 0 | 1 | 2;
  /** Offset shade gradient (0/1/2 → tetap dalam keluarga kategori). */
  shade: 0 | 1 | 2;
}

/** Hash sederhana nama tema → varian. Deterministik antar render. */
export function themeVariant(themeName: string): ThemeVariant {
  let h = 0;
  for (let i = 0; i < themeName.length; i++) {
    h = (h * 31 + themeName.charCodeAt(i)) >>> 0;
  }
  return {
    pattern: (h % 3) as 0 | 1 | 2,
    shade: (Math.floor(h / 3) % 3) as 0 | 1 | 2,
  };
}

/** Nuansa shade dalam keluarga kategori — kontras teks tetap sama. */
const SHADE_OVERLAY: Record<0 | 1 | 2, string> = {
  0: "",
  1: "bg-black/[0.04]",
  2: "bg-white/10",
};

/**
 * Cover area visual untuk ThemeCard.
 * Proporsi konsisten (h-20), kontras teks konsisten (putih di atas
 * warna), variasi hanya di pattern/shade (§M).
 */
export function ThemeCoverArt({
  visual,
  variant,
  name,
  className = "",
}: {
  visual: CategoryVisual;
  variant: ThemeVariant;
  name: string;
  className?: string;
}) {
  const Icon = visual.icon;
  const initials = name
    .split(/[\s/]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      aria-hidden
      className={`relative h-20 w-full overflow-hidden bg-gradient-to-br ${visual.coverGradient} ${SHADE_OVERLAY[variant.shade]} ${className}`}
    >
      {variant.pattern === 0 ? (
        // Titik grid halus
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.9) 1.2px, transparent 1.2px)",
            backgroundSize: "12px 12px",
          }}
        />
      ) : variant.pattern === 1 ? (
        // Pita diagonal lembut
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, rgba(255,255,255,0.9) 0 10px, transparent 10px 26px)",
          }}
        />
      ) : (
        // Busur halus (dua lingkaran besar terpangkas)
        <>
          <span className="absolute -top-8 -right-6 w-24 h-24 rounded-full border-[10px] border-white/20" />
          <span className="absolute -bottom-10 -left-8 w-28 h-28 rounded-full border-[12px] border-white/15" />
        </>
      )}

      {/* Icon kategori — identitas bukan hanya warna (§Q) */}
      <span className="absolute top-2 left-2.5 w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-[2px]">
        <Icon size={14} className="text-white" />
      </span>
      {/* Inisial besar sebagai tipografi cover */}
      <span className="absolute bottom-1 right-2.5 text-white/30 text-2xl font-extrabold tracking-wider select-none">
        {initials}
      </span>
    </div>
  );
}
