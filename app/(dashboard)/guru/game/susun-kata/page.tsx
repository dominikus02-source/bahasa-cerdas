"use client";

import "@/components/game/game-env.css"; // dasbor Guru tidak memuat CSS layout Arena
import SusunKataGame from "@/components/game/SusunKata";

// SusunKataGame renders as a fixed full-screen overlay (chunky redesign) —
// the old inline p-8 header pattern would sit underneath it, unreachable.
export default function GuruSusunKataPage() {
  return (
    <div className="fixed inset-0 z-[60] bg-[#FFF6E0]">
      <SusunKataGame backHref="/guru/game" />
    </div>
  );
}
