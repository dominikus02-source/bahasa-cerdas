"use client";

import "@/components/game/game-env.css"; // dasbor Guru tidak memuat CSS layout Arena
import LariKataGame from "@/components/game/LariKata";

// Was a standalone duplicate of the game logic (old dark theme, no sfx, no
// server-side player-level ramping). Replaced with the real shared component
// so guru preview matches exactly what students play — same fixed-overlay
// pattern as tebak-kata/susun-kata above.
export default function GuruLariKataPage() {
  return (
    <div className="fixed inset-0 z-[60] bg-[#FFF6E0]">
      <LariKataGame backHref="/guru/game" />
    </div>
  );
}
