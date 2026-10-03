import Link from "next/link";
import IdentityIcon from "@/components/account/IdentityIcon";
import type { IdentityBadge } from "@/lib/account/identity";
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

/** Icon-only identity; premium flags alone are never proof of entitlement. */
export function VerifiedBadge({ isFounder, badgeKind, size = 20, className = "" }: {
  isFounder?: boolean; isPremium?: boolean; badgeKind?: IdentityBadge | null; size?: number; className?: string;
}) {
  const kind = isFounder ? "founder" : badgeKind;
  if (!kind) return null;
  const iconSize = Math.max(20, size);
  const label = { founder: "Pendiri BahasaCerdas", teacher: "Guru berlangganan", trial: "Guru dalam masa uji coba", student: "Murid berlangganan" }[kind];
  return <span role="img" title={label} aria-label={label} tabIndex={0}
    className={`inline-flex shrink-0 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${className}`}
    style={{ width: iconSize, height: iconSize }}><IdentityIcon kind={kind} size={iconSize} /></span>;
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
  badgeKind?: IdentityBadge | null;
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
  verifiedSize = 20,
  badgeKind,
}: UserNameProps) {
  const style = nameColorStyle(color, onDark);
  const badgeStyle = getBadgeStyle(badge);
  const showVerified = isFounder || Boolean(badgeKind);

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
      <VerifiedBadge badgeKind={badgeKind} isFounder={isFounder} isPremium={isPremium} size={verifiedSize} />
    </span>
  );
}
