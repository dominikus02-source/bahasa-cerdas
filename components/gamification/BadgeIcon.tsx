"use client"

import { useState } from "react";
import Image from "next/image";
import { Award } from "lucide-react";

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
 * Bila gambar gagal dimuat (404/rusak), fallback visual ikon Award dipakai —
 * path mentah TIDAK pernah tampil sebagai teks kepada pengguna.
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
  const [broken, setBroken] = useState(false);
  const isAsset = icon.startsWith("/");

  if (!isAsset) {
    return (
      <span className={className} style={{ fontSize: size * 0.55, lineHeight: 1 }} aria-hidden={!alt}>
        {icon}
      </span>
    );
  }

  if (broken) {
    return (
      <span
        className={`flex items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300 ${className}`}
        style={{ width: size, height: size }}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
      >
        <Award style={{ width: size * 0.6, height: size * 0.6 }} />
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
      onError={() => setBroken(true)}
    />
  );
}
