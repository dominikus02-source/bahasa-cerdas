"use client"

import "@/components/game/game-env.css"; // dasbor Guru tidak memuat CSS layout Arena
import BermainKataGame from "@/components/game/BermainKataGame"

export default function GuruBermainKataPage() {
  return (
    <div className="game-env game-env-bermain-kata fixed inset-0 z-[60] overflow-y-auto">
      <BermainKataGame />
    </div>
  )
}
