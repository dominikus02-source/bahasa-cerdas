"use client";

import "@/components/game/game-env.css"; // dasbor Guru tidak memuat CSS layout Arena
import TebakKataGame from "@/components/game/TebakKata";

// TebakKataGame renders as a fixed full-screen overlay (chunky redesign) —
// the old inline p-8 header pattern would sit underneath it, unreachable.
// Same floating-exit pattern as the murid/arena wrapper, pointed at /guru/game.
export default function GuruTebakKataPage() {
  return (
    <div className="fixed inset-0 z-[60] bg-[#FFF6E0]">
      <TebakKataGame backHref="/guru/game" />
    </div>
  );
}
