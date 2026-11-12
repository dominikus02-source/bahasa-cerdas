"use client";

import "@/components/game/game-env.css"; // dasbor Guru tidak memuat CSS layout Arena
import MenaraCerdas from "@/components/game/MenaraCerdas";

export default function GuruMenaraCerdasPage() {
  return (
    <div className="fixed inset-0 z-[60] bg-[#FFF6E0]">
      <MenaraCerdas backHref="/guru/game" />
    </div>
  );
}
