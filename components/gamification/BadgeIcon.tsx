import Image from "next/image";

/**
 * BadgeIcon — menampilkan ikon badge/pencapaian.
 *
 * Kolom `Badge.icon` / `Achievement.icon` menyimpan DUA bentuk:
 *   - path aset, mis. "/badges/xp-1000.webp"  → dirender sebagai gambar
 *   - emoji, mis. "🏆"                        → dirender sebagai teks
 *
 * Badge sudah memakai aset resmi; pencapaian masih emoji. Komponen ini
 * menangani keduanya supaya keduanya bisa dipindah bertahap tanpa memecah
 * tampilan — tanpa ini, path akan tampil sebagai tulisan "/badges/....webp".
 */
export function BadgeIcon({
  icon,
  size = 48,
  className = "",
  alt = "",
}: {
  icon: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const isAsset = icon.startsWith("/");

  if (!isAsset) {
    return (
      <span className={className} style={{ fontSize: size * 0.55, lineHeight: 1 }} aria-hidden={!alt}>
        {icon}
      </span>
    );
  }

  return (
    <Image
      src={icon}
      alt={alt}
      width={256}
      height={256}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
      sizes={`${size}px`}
    />
  );
}
