"use client";

import "@/components/game/game-env.css"; // dasbor Guru tidak memuat CSS layout Arena
import BenarSalah from "@/components/game/BenarSalah";

export default function GuruBenarSalahPage() {
  return (
    <div className="fixed inset-0 z-[60]">
      <BenarSalah backHref="/guru/game" />
    </div>
  );
}
