"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

function parentFor(pathname: string): { href: string; label: string } | null {
  if (pathname === "/murid/beranda") return null;
  if (pathname === "/murid/belajar" || pathname === "/arena" || pathname === "/murid/karya") {
    return { href: "/murid/beranda", label: "Beranda" };
  }

  if (
    pathname.startsWith("/murid/belajar/") ||
    pathname.startsWith("/murid/gabung-kelas") ||
    pathname.startsWith("/murid/kelasku") ||
    pathname.startsWith("/murid/progresku") ||
    pathname.startsWith("/murid/simulasi") ||
    pathname.startsWith("/murid/dokumen-latihan") ||
    pathname.startsWith("/murid/sertifikat") ||
    pathname.startsWith("/arena/tugas")
  ) {
    return { href: "/murid/belajar", label: "Belajar" };
  }

  if (pathname.startsWith("/murid/karya/")) {
    return { href: "/murid/karya", label: "Karya" };
  }

  if (pathname.startsWith("/arena/")) {
    return { href: "/arena", label: "Arena" };
  }

  return { href: "/murid/beranda", label: "Beranda" };
}

export function MuridBackBottom() {
  const pathname = usePathname();
  const parent = parentFor(pathname);

  if (!parent) return null;

  return (
    <div className="md:hidden mt-8 px-1 pb-3" aria-label="Navigasi kembali">
      <Link
        href={parent.href}
        aria-label={`Kembali ke ${parent.label}`}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-violet-500/30 dark:hover:bg-violet-500/10 dark:hover:text-violet-200"
      >
        <ArrowLeft size={18} />
        <span>Kembali ke {parent.label}</span>
      </Link>
    </div>
  );
}
