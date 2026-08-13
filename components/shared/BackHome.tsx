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
 className={`inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors dark:text-slate-400 :text-violet-300 dark:hover:bg-slate-800 ${
        iconOnly ? "p-2" : "px-2.5 py-2"
      } ${className}`}
    >
      <ArrowLeft className="w-5 h-5 shrink-0" />
      {!iconOnly && <span className="hidden md:inline">Beranda</span>}
    </Link>
  );
}