"use client"

import LariKataGame from "@/components/game/LariKata"

export default function ArenaLariKataPage() {
  return (
    <div className="game-env game-env-lari fixed inset-0 z-[60]">
      <LariKataGame />
    </div>
  )
}
