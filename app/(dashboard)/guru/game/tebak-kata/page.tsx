"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TebakKataGame from "@/components/game/TebakKata";

// TebakKataGame renders as a fixed full-screen overlay (chunky redesign) —
// the old inline p-8 header pattern would sit underneath it, unreachable.
// Same floating-exit pattern as the murid/arena wrapper, pointed at /guru/game.
export default function GuruTebakKataPage() {
  return (
    <div className="fixed inset-0 z-[60] bg-[#FFF6E0]">
      <Link
        href="/guru/game"
        className="fixed top-3 left-3 z-[80] w-9 h-9 rounded-xl bg-[#161B3A]/10 backdrop-blur-md border border-[#161B3A]/20 shadow-md flex items-center justify-center text-[#161B3A] hover:bg-[#161B3A]/20 active:scale-95 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <TebakKataGame hideBackButton backHref="/guru/game" />
    </div>
  );
}
