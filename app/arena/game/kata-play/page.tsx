"use client"

import KataPlayGame from "@/components/game/KataPlayGameV2"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function ArenaKataPlayPage() {
  return (
    <div className="game-env game-env-kataplay game-env-bg fixed inset-0 z-[60]">
      <Link
        href="/arena/game"
 className="fixed top-3 left-3 z-[70] game-back-btn w-9 h-9 rounded-xl backdrop-blur-md shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all arena-btn"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <KataPlayGame hideBackButton />
    </div>
  )
}
