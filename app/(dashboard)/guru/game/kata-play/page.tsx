"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import KataPlayGame from "@/components/game/KataPlayGame";

// KataPlayGame's own screens are `relative min-h-screen` (not self-fixed) —
// it expects a fixed-position full-viewport parent, unlike the chunky-redesigned
// games. Keep that wrapper div, matching the arena wrapper exactly.
export default function GuruKataPlayPage() {
  return (
    <div className="fixed inset-0 z-[60] bg-[#0D0A1F]">
      <Link
        href="/guru/game"
        className="fixed top-3 left-3 z-[70] w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-md flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <KataPlayGame hideBackButton />
    </div>
  );
}
