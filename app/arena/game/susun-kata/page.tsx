"use client"

import SusunKataGame from "@/components/game/SusunKata"

export default function SusunKataPage() {
  return (
    <div className="game-env game-env-susun game-fullscreen min-h-screen bg-[#F2F2F7]">
      <SusunKataGame />
    </div>
  )
}
