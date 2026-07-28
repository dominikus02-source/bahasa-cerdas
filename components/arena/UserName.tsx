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
}

/**
 * Nama murid dengan warna nama + badge kosmetik.
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
}: UserNameProps) {
  const style = nameColorStyle(color, onDark);
  const badgeStyle = getBadgeStyle(badge);

  const text = href ? (
    <Link href={href} className={className} style={style}>
      {name}
    </Link>
  ) : (
    <span className={className} style={style}>
      {name}
    </span>
  );

  if (!badgeStyle) return text;

  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${wrapperClassName}`}>
      {text}
      <CosmeticBadge badge={badge} size={badgeSize} />
    </span>
  );
}
