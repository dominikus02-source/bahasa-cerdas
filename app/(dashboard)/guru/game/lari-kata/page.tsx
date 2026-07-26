"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LariKataGame from "@/components/game/LariKata";

// Was a standalone duplicate of the game logic (old dark theme, no sfx, no
// server-side player-level ramping). Replaced with the real shared component
// so guru preview matches exactly what students play — same fixed-overlay
// pattern as tebak-kata/susun-kata above.
export default function GuruLariKataPage() {
  return (
    <div className="fixed inset-0 z-[60] bg-[#FFF6E0]">
      <Link
        href="/guru/game"
        className="fixed top-3 left-3 z-[80] w-9 h-9 rounded-xl bg-[#161B3A]/10 backdrop-blur-md border border-[#161B3A]/20 shadow-md flex items-center justify-center text-[#161B3A] hover:bg-[#161B3A]/20 active:scale-95 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <LariKataGame hideBackButton backHref="/guru/game" />
    </div>
  );
}
