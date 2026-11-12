"use client"

import "@/components/game/game-env.css"; // dasbor Guru tidak memuat CSS layout Arena
import TekaTekiSilang from "@/components/game/TTSpage"

export default function GuruTekaTekiSilangPage() {
  return (
    <div className="fixed inset-0 z-[60]">
      <TekaTekiSilang backHref="/guru/game" />
    </div>
  )
}
