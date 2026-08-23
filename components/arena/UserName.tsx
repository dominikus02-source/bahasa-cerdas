import Link from "next/link";
import Image from "next/image";
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
 * Badge centang verified (Founder / BC Pro).
 * Menampilkan `Badges_centang_premium.png` di samping nama.
 */
export function VerifiedBadge({
  isFounder,
  isPremium,
  size = 16,
  className = "",
}: {
  isFounder?: boolean;
  isPremium?: boolean;
  size?: number;
  className?: string;
}) {
  if (!isFounder && !isPremium) return null;
  const tooltip = isFounder ? "Founder BahasaCerdas" : "BC Pro";
  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/badges/Badges_centang_premium.png"
        alt={tooltip}
        width={size}
        height={size}
        className="block"
        draggable={false}
      />
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
  /** Badge verified (Founder/Pro) — tampil di samping nama. */
  isFounder?: boolean;
  isPremium?: boolean;
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
  verifiedSize = 16,
}: UserNameProps) {
  const style = nameColorStyle(color, onDark);
  const badgeStyle = getBadgeStyle(badge);
  const showVerified = isFounder || isPremium;

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
      <VerifiedBadge isFounder={isFounder} isPremium={isPremium} size={verifiedSize} />
    </span>
  );
}
