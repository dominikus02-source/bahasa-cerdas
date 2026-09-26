"use client"

import KataPlayGame from "@/components/game/KataPlayGameV2"

export default function ArenaKataPlayPage() {
  return (
    <div className="game-env game-env-kataplay game-env-bg fixed inset-0 z-[60]">
      <KataPlayGame />
    </div>
  )
}
