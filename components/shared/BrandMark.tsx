import Link from "next/link";
import Image from "next/image";
import { BRAND_ICON, BRAND_ICON_DARK } from "@/lib/brand";

/**
 * Merek bersama navbar atas semua dasbor (Umum, Guru, Murid): ikon + nama + tagline.
 * Tautan menuju beranda dasbor yang sedang aktif. Teks memotong (truncate) di layar sempit.
 */
export function BrandMark({ href, className = "" }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`flex min-h-11 min-w-0 items-center gap-2.5 rounded-bc-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bc-focus ${className}`}
      aria-label="Beranda dasbor BahasaCerdas"
    >
      <Image
        src={BRAND_ICON_DARK}
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 object-contain dark:hidden"
      />
      <Image
        src={BRAND_ICON}
        alt=""
        width={40}
        height={40}
        className="hidden h-10 w-10 shrink-0 object-contain dark:inline"
      />
      <span className="min-w-0">
        <span className="block truncate text-[17px] font-extrabold leading-tight tracking-tight text-bc-text">
          BahasaCerdas
        </span>
        <span className="block truncate text-xs text-bc-text-3">
          Dunia Bahasa Indonesia
        </span>
      </span>
    </Link>
  );
}

