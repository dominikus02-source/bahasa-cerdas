"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Tombol kembali Arena — ARENA 2.0.
 *
 * Prioritas: router history (kembali ke halaman SEBELUMNYA, bukan halaman
 * awal aplikasi). Jika tidak ada riwayat (mis. entry langsung / refresh), pakai
 * fallback LOGIS berdasarkan route:
 *   /arena/game/*            → /arena/game (Game Hub)
 *   /arena/game              → /arena
 *   /arena/player/*          → /arena/player
 *   lainnya                  → /arena
 *
 * Tidak pernah mengarahkan keluar Arena — user tidak kehilangan konteks.
 */
function fallbackFor(pathname: string): string {
  if (pathname.startsWith("/arena/game/")) return "/arena/game";
  if (pathname.startsWith("/arena/player/")) return "/arena/player";
  if (pathname === "/arena/game") return "/arena";
  return "/arena";
}

export function ArenaBackButton({ iconOnly = false, className = "" }: { iconOnly?: boolean; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const goBack = useCallback(() => {
    // Riwayat nyata? (bukan landing pertama). Heuristik standar: > 1 berarti
    // ada halaman sebelumnya yang bisa dikunjungi.
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackFor(pathname ?? ""));
  }, [pathname, router]);

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Kembali"
      title="Kembali"
      className={`inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition-colors hover:rounded-lg hover:bg-violet-50 hover:text-violet-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-violet-300 ${
        iconOnly ? "p-2" : "px-2.5 py-2"
      } ${className}`}
    >
      <ArrowLeft className="h-5 w-5 shrink-0" />
      {!iconOnly && <span className="hidden md:inline">Kembali</span>}
    </button>
  );
}
