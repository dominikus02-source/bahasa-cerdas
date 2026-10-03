import Link from "next/link";
import { getBadgeStyle, nameColorStyle } from "@/lib/cosmetics";

/** Badge kosmetik kecil yang tampil di samping nama murid. */
export function CosmeticBadge({
  badge,
  size = 14,
  className = "",
}: {
  badge?: string | null;
  size?: number;
  className?: string;
}) {
  const style = getBadgeStyle(badge);
  if (!style) return null;
  const Icon = style.Icon;
  return (
    <span
      title={style.label}
      aria-label={style.label}
      className={`inline-flex items-center justify-center rounded-full shrink-0 bg-gradient-to-br ${style.gradient} text-white shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.max(8, Math.round(size * 0.6))} strokeWidth={2.5} />
    </span>
  );
}

/**
 * Badge status premium/terverifikasi.
 * Dibedakan secara visual agar status Founder, Guru Pro, Guru Pro Trial,
 * dan Murid Premium langsung terbaca tanpa teks tambahan.
 */
export function VerifiedBadge({
  isFounder,
  isPremium,
  isTrial,
  verifiedType,
  size = 16,
  className = "",
}: {
  isFounder?: boolean;
  isPremium?: boolean;
  isTrial?: boolean;
  verifiedType?: "FOUNDER" | "GURU_PRO" | "GURU_TRIAL" | "MURID_PREMIUM";
  size?: number;
  className?: string;
}) {
  if (!isFounder && !isPremium && !isTrial && !verifiedType) return null;

  const type =
    verifiedType ??
    (isFounder
      ? "FOUNDER"
      : isTrial
        ? "GURU_TRIAL"
        : "MURID_PREMIUM");

  const meta = {
    FOUNDER: { label: "Pendiri BahasaCerdas", from: "#6D28D9", to: "#F59E0B" },
    GURU_PRO: { label: "Guru Pro", from: "#2563EB", to: "#7C3AED" },
    GURU_TRIAL: { label: "Guru Pro Percobaan", from: "#F97316", to: "#F59E0B" },
    MURID_PREMIUM: { label: "Murid Premium", from: "#06B6D4", to: "#FACC15" },
  }[type];

  const id = `verified-${type.toLowerCase()}-${size}`;

  return (
    <span title={meta.label} aria-label={meta.label} className={`inline-flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className="block">
        <defs>
          <linearGradient id={`${id}-bg`} x1="8" y1="8" x2="56" y2="56">
            <stop stopColor={meta.from} />
            <stop offset="1" stopColor={meta.to} />
          </linearGradient>
          <linearGradient id={`${id}-rim`} x1="12" y1="8" x2="52" y2="58">
            <stop stopColor="#FFFFFF" stopOpacity=".95" />
            <stop offset=".5" stopColor="#FFFFFF" stopOpacity=".35" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity=".08" />
          </linearGradient>
          <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={meta.to} floodOpacity=".38" />
          </filter>
        </defs>
        <g filter={`url(#${id}-shadow)`}>
          {type === "MURID_PREMIUM" ? (
            <path d="M32 4 39.2 20.8 58 22.7 43.9 35 48.2 53.3 32 43.8 15.8 53.3 20.1 35 6 22.7 24.8 20.8Z" fill={`url(#${id}-bg)`} stroke={`url(#${id}-rim)`} strokeWidth="2" strokeLinejoin="round" />
          ) : type === "FOUNDER" ? (
            <>
              <path d="M32 4 39 11 49 10 50 20 58 26 53 35 55 47 44 49 32 59 20 49 9 47 11 35 6 26 14 20 15 10 25 11Z" fill={`url(#${id}-bg)`} stroke={`url(#${id}-rim)`} strokeWidth="2" strokeLinejoin="round" />
              <path d="M18 25 22 16 28 21 32 13 36 21 42 16 46 25 43 31Q32 37 21 31Z" fill="#FDE68A" stroke="#FFFFFF" strokeOpacity=".8" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="32" cy="40" r="11" fill="#4C1D95" fillOpacity=".9" stroke="#FDE68A" strokeWidth="1.5" />
              <text x="32" y="44.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#FFFFFF" fontFamily="Arial, sans-serif">BC</text>
            </>
          ) : (
            <path d="M8 20 32 8 56 20 32 32Z M14 23V38Q32 51 50 38V23L32 34Z" fill={`url(#${id}-bg)`} stroke={`url(#${id}-rim)`} strokeWidth="2" strokeLinejoin="round" />
          )}
          <circle cx="32" cy="32" r="15" fill={type === "GURU_TRIAL" ? "#EA580C" : "#111827"} fillOpacity=".42" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="2" />
          <path d="m24 32 5 5 11-12" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </span>
  );
}
interface UserNameProps {
  name: string;
  /** `User.equippedNameColor` — null/undefined berarti warna bawaan. */
  color?: string | null;
  /** `User.equippedBadge` — null/undefined berarti tanpa badge. */
  badge?: string | null;
  /** Kalau diisi, nama dibungkus Link ke profil. */
  href?: string;
  /** True bila nama tampil di atas latar gelap (hero profil). */
  onDark?: boolean;
  /** Kelas untuk teks nama (dipertahankan apa adanya). */
  className?: string;
  /** Kelas untuk pembungkus (nama + badge). */
  wrapperClassName?: string;
  badgeSize?: number;
  /** Status badge premium/terverifikasi untuk menentukan ikon dan warna. */
  verifiedType?: "FOUNDER" | "GURU_PRO" | "GURU_TRIAL" | "MURID_PREMIUM";
  isFounder?: boolean;
  isPremium?: boolean;
  isTrial?: boolean;
  verifiedSize?: number;
}

/**
 * Nama murid dengan warna nama + badge kosmetik + badge verified.
 *
 * Tanpa kosmetik yang dipakai, hasilnya sama persis dengan `<span>`/`<Link>`
 * biasa berisi nama — tidak ada style tambahan yang disuntikkan.
 */
export default function UserName({
  name,
  color,
  badge,
  href,
  onDark = false,
  className = "",
  wrapperClassName = "",
  badgeSize = 14,
  isFounder = false,
  isPremium = false,
  isTrial = false,
  verifiedType,
  verifiedSize = 16,
}: UserNameProps) {
  const style = nameColorStyle(color, onDark);
  const badgeStyle = getBadgeStyle(badge);
  const showVerified = isFounder || isPremium || isTrial || !!verifiedType;

  const text = href ? (
    <Link href={href} className={className} style={style}>
      {name}
    </Link>
  ) : (
    <span className={className} style={style}>
      {name}
    </span>
  );

  const nameAndBadge = badgeStyle ? (
    <span className="inline-flex items-center gap-1 min-w-0">
      {text}
      <CosmeticBadge badge={badge} size={badgeSize} />
    </span>
  ) : text;

  if (!showVerified) return nameAndBadge;

  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${wrapperClassName}`}>
      {nameAndBadge}
      <VerifiedBadge
        isFounder={isFounder}
        isPremium={isPremium}
        isTrial={isTrial}
        verifiedType={verifiedType}
        size={verifiedSize}
      />
    </span>
  );
}
