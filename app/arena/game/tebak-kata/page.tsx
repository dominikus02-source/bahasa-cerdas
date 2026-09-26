"use client"

import TebakKataGame from "@/components/game/TebakKata"

export default function TebakKataPage() {
  return (
    <div className="game-env game-env-tebak game-fullscreen min-h-screen bg-[#F2F2F7]">
      <TebakKataGame />
    </div>
  )
}
