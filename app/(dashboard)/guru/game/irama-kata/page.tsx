"use client";

import "@/components/game/game-env.css"; // dasbor Guru tidak memuat CSS layout Arena
import IramaKata from "@/components/game/IramaKata";

export default function GuruIramaKataPage() {
  return (
    <div className="fixed inset-0 z-[60]">
      <IramaKata backHref="/guru/game" />
    </div>
  );
}
