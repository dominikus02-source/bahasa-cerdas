import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackHomeProps {
  iconOnly?: boolean;
  className?: string;
  href?: string;
}

/**
 * Navigasi GLOBAL deterministik Student Shell — "← Beranda".
 * BUKAN router.back(): target selalu /murid/beranda (canonical student home),
 * sehingga tidak pernah membawa user ke halaman tak relevan, ke login,
 * atau ke Dashboard Guru (itu role-based destination, bukan back).
 * Tunggal: arena, chat, kary, profile, settings — semua pakai komponen ini.
 * Guru/Admin boleh override href (default tetap /murid/beranda).
 */
export function BackHome({ iconOnly = false, className = "", href = "/murid/beranda" }: BackHomeProps) {
  return (
    <Link
      href={href}
      aria-label="Kembali ke Beranda"
      title="Kembali ke Beranda"
      className={`inline-flex items-center gap-1.5 text-sm font-semibold text-bc-text-2 hover:text-bc-violet hover:bg-bc-violet-soft rounded-bc-sm transition-colors ${
        iconOnly ? "p-2" : "px-2.5 py-2"
      } ${className}`}
    >
      <ArrowLeft className="w-5 h-5 shrink-0" />
      {!iconOnly && <span className="hidden md:inline">Beranda</span>}
    </Link>
  );
}