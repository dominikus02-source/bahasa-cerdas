import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen, PenLine } from "lucide-react";

/**
 * Definisi kosmetik toko koin (bingkai avatar, warna nama, badge).
 *
 * Sumber kebenaran ada di `StoreItem.icon` (lihat `scripts/seed-store.ts`).
 * Kolom `User.equippedFrame` / `equippedNameColor` / `equippedBadge` /
 * `equippedEffect` menyimpan string `icon` itu — null berarti tidak memakai
 * apa pun, dan tampilan harus persis seperti sebelum fitur ini ada.
 */

export const COSMETIC_TYPES = ["AVATAR_FRAME", "NAME_COLOR", "BADGE", "ANSWER_EFFECT", "PROFILE_BACKGROUND", "NAMEPLATE"] as const;

export type CosmeticType = (typeof COSMETIC_TYPES)[number];

export type EquippedField =
  | "equippedFrame"
  | "equippedNameColor"
  | "equippedBadge"
  | "equippedEffect"
  | "equippedBackground"
  | "equippedNameplate";

/** Tipe item toko -> kolom User yang menyimpan kosmetik yang sedang dipakai. */
export const COSMETIC_FIELD: Record<CosmeticType, EquippedField> = {
  AVATAR_FRAME: "equippedFrame",
  NAME_COLOR: "equippedNameColor",
  BADGE: "equippedBadge",
  ANSWER_EFFECT: "equippedEffect",
  PROFILE_BACKGROUND: "equippedBackground",
  NAMEPLATE: "equippedNameplate",
};

export function isCosmeticType(type: string): type is CosmeticType {
  return (COSMETIC_TYPES as readonly string[]).includes(type);
}

/** Kosmetik yang punya tampilan nyata di aplikasi (bisa dipakai/dilepas). */
export function isEquippableIcon(type: string, icon: string | null | undefined): boolean {
  if (!icon) return false;
  switch (type) {
    case "AVATAR_FRAME":
      return icon in AVATAR_FRAMES;
    case "NAME_COLOR":
      return icon in NAME_COLORS;
    case "BADGE":
      return icon in COSMETIC_BADGES;
    case "ANSWER_EFFECT":
      return icon in ANSWER_EFFECTS;
    case "PROFILE_BACKGROUND":
      return icon in PROFILE_BACKGROUNDS;
    case "NAMEPLATE":
      return icon in NAMEPLATES;
    default:
      return false;
  }
}

/**
 * Efek jawaban benar. Yang menampilkannya adalah komponen game
 * (`components/game/ConfettiBurst.tsx`) lewat `User.equippedEffect`.
 */
export const ANSWER_EFFECTS: Record<string, { label: string }> = {
  confetti: { label: "Confetti" },
};

/* ------------------------------------------------------------------ */
/* Bingkai avatar                                                      */
/* ------------------------------------------------------------------ */

export interface FrameStyle {
  label: string;
  /** Ketebalan cincin dalam px — cincin digambar DI LUAR kotak avatar. */
  width: number;
  /** Gradasi cincin. */
  background: string;
  /** Cahaya di sekeliling cincin. */
  glow?: string;
  /** Kelas animasi (didefinisikan di app/globals.css). */
  animationClass?: string;
}

export const AVATAR_FRAMES: Record<string, FrameStyle> = {
  "frame-bronze": {
    label: "Perunggu",
    width: 3,
    background: "linear-gradient(135deg,#7c2d12 0%,#d97706 40%,#fbbf24 55%,#92400e 100%)",
  },
  "frame-silver": {
    label: "Perak",
    width: 3,
    background: "linear-gradient(135deg,#64748b 0%,#e2e8f0 35%,#ffffff 50%,#cbd5e1 65%,#475569 100%)",
    glow: "0 0 6px rgba(148,163,184,0.55)",
  },
  "frame-gold": {
    label: "Emas",
    width: 4,
    background: "linear-gradient(135deg,#92400e 0%,#f59e0b 30%,#fef3c7 50%,#fbbf24 70%,#78350f 100%)",
    glow: "0 0 10px rgba(245,158,11,0.7), 0 0 22px rgba(245,158,11,0.35)",
    animationClass: "cosmetic-frame-shimmer",
  },
  "frame-neon": {
    label: "Neon",
    width: 4,
    background:
      "conic-gradient(from 0deg,#22d3ee 0%,#a855f7 25%,#ec4899 50%,#facc15 75%,#22d3ee 100%)",
    glow: "0 0 10px rgba(34,211,238,0.95), 0 0 26px rgba(168,85,247,0.7)",
    animationClass: "cosmetic-frame-neon",
  },
};

export function getFrameStyle(icon?: string | null): FrameStyle | undefined {
  return icon ? AVATAR_FRAMES[icon] : undefined;
}

/* ------------------------------------------------------------------ */
/* Warna nama                                                          */
/* ------------------------------------------------------------------ */

export interface NameColorStyle {
  label: string;
  /** Dipakai di atas latar terang (kartu putih). */
  light: CSSProperties;
  /** Dipakai di atas latar gelap (hero profil) supaya tetap terbaca. */
  dark: CSSProperties;
  /** Contoh warna untuk pratinjau di toko. */
  swatch: string;
}

const gradientText = (gradient: string): CSSProperties => ({
  backgroundImage: gradient,
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
});

export const NAME_COLORS: Record<string, NameColorStyle> = {
  "color-purple": {
    label: "Ungu",
    light: { color: "#7C3AED" },
    dark: { color: "#C4B5FD" },
    swatch: "linear-gradient(135deg,#7C3AED,#C084FC)",
  },
  "color-gold": {
    label: "Emas",
    light: gradientText("linear-gradient(90deg,#92400E,#D97706 40%,#F59E0B 70%,#B45309)"),
    dark: gradientText("linear-gradient(90deg,#FDE68A,#FCD34D 45%,#F59E0B)"),
    swatch: "linear-gradient(135deg,#B45309,#FCD34D)",
  },
  "color-royal": {
    label: "Royal",
    light: gradientText("linear-gradient(90deg,#1E3A5F,#2563EB 40%,#60A5FA 70%,#1E40AF)"),
    dark: gradientText("linear-gradient(90deg,#93C5FD,#60A5FA 45%,#3B82F6)"),
    swatch: "linear-gradient(135deg,#1E40AF,#60A5FA)",
  },
  "color-aurora": {
    label: "Aurora",
    light: gradientText("linear-gradient(90deg,#059669,#10B981 30%,#34D399 60%,#6EE7B7)"),
    dark: gradientText("linear-gradient(90deg,#6EE7B7,#34D399 45%,#10B981)"),
    swatch: "linear-gradient(135deg,#059669,#6EE7B7)",
  },
};

export function nameColorStyle(
  icon?: string | null,
  onDark = false,
): CSSProperties | undefined {
  if (!icon) return undefined;
  const color = NAME_COLORS[icon];
  if (!color) return undefined;
  return onDark ? color.dark : color.light;
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

export interface CosmeticBadgeStyle {
  label: string;
  Icon: LucideIcon;
  /** Kelas gradasi Tailwind (ditulis utuh supaya tidak kena purge). */
  gradient: string;
}

export const COSMETIC_BADGES: Record<string, CosmeticBadgeStyle> = {
  "badge-write": {
    label: "Rajin Menulis",
    Icon: PenLine,
    gradient: "from-emerald-400 to-teal-600",
  },
  "badge-book": {
    label: "Kutu Buku",
    Icon: BookOpen,
    gradient: "from-sky-400 to-indigo-600",
  },
};

export function getBadgeStyle(icon?: string | null): CosmeticBadgeStyle | undefined {
  return icon ? COSMETIC_BADGES[icon] : undefined;
}

/* ------------------------------------------------------------------ */
/* Profile Background                                                   */
/* ------------------------------------------------------------------ */

export interface ProfileBackgroundStyle {
  label: string;
  /** CSS background for the profile card. */
  background: string;
  /** Text color override for readability on this background. */
  textColor?: string;
}

export const PROFILE_BACKGROUNDS: Record<string, ProfileBackgroundStyle> = {
  "bg-sunset": {
    label: "Langit Senja",
    background: "linear-gradient(135deg,#FDE68A 0%,#F97316 40%,#DC2626 70%,#7C2D12 100%)",
    textColor: "#7C2D12",
  },
  "bg-forest": {
    label: "Hutan Ceria",
    background: "linear-gradient(135deg,#D1FAE5 0%,#34D399 40%,#059669 70%,#065F46 100%)",
    textColor: "#065F46",
  },
  "bg-ocean": {
    label: "Laut Biru",
    background: "linear-gradient(135deg,#DBEAFE 0%,#60A5FA 40%,#2563EB 70%,#1E3A5F 100%)",
    textColor: "#1E3A5F",
  },
  "bg-library": {
    label: "Perpustakaan",
    background: "linear-gradient(135deg,#FEF3C7 0%,#D97706 30%,#92400E 60%,#451A03 100%)",
    textColor: "#451A03",
  },
  "bg-galaxy": {
    label: "Galaksi Kata",
    background: "linear-gradient(135deg,#EDE9FE 0%,#8B5CF6 30%,#6D28D9 60%,#1E1B4B 100%)",
    textColor: "#EDE9FE",
  },
};

export function getBackgroundStyle(icon?: string | null): ProfileBackgroundStyle | undefined {
  return icon ? PROFILE_BACKGROUNDS[icon] : undefined;
}

/* ------------------------------------------------------------------ */
/* Nameplate                                                            */
/* ------------------------------------------------------------------ */

export interface NameplateStyle {
  label: string;
  /** CSS style for the nameplate text. */
  style: CSSProperties;
}

export const NAMEPLATES: Record<string, NameplateStyle> = {
  "np-explorer": {
    label: "Penjelajah Kata",
    style: {
      backgroundImage: "linear-gradient(90deg,#059669,#10B981 40%,#34D399 70%,#6EE7B7)",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      fontWeight: 700,
    },
  },
  "np-hunter": {
    label: "Pemburu Ilmu",
    style: {
      backgroundImage: "linear-gradient(90deg,#DC2626,#F97316 40%,#FCD34D 70%,#FDE68A)",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      fontWeight: 700,
    },
  },
  "np-master": {
    label: "Master Bahasa",
    style: {
      backgroundImage: "linear-gradient(90deg,#7C3AED,#A855F7 30%,#E879F9 60%,#F0ABFC)",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      fontWeight: 700,
    },
  },
};

export function getNameplateStyle(icon?: string | null): NameplateStyle | undefined {
  return icon ? NAMEPLATES[icon] : undefined;
}

/* ------------------------------------------------------------------ */
/* Bentuk data bersama                                                 */
/* ------------------------------------------------------------------ */

/** Field kosmetik yang perlu ikut di-`select` saat mengambil user. */
export interface UserCosmetics {
  equippedFrame?: string | null;
  equippedNameColor?: string | null;
  equippedBadge?: string | null;
  equippedEffect?: string | null;
  equippedBackground?: string | null;
  equippedNameplate?: string | null;
}

/** Dipakai di `select` Prisma: `{ ...COSMETIC_SELECT }`. */
export const COSMETIC_SELECT = {
  equippedFrame: true,
  equippedNameColor: true,
  equippedBadge: true,
  equippedEffect: true,
  equippedBackground: true,
  equippedNameplate: true,
} as const;
