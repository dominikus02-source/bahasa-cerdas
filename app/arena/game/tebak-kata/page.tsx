"use client"

import TebakKataGame from "@/components/game/TebakKata"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TebakKataPage() {
  return (
    <div className="game-fullscreen min-h-screen bg-[#F2F2F7]">
      <Link
        href="/arena/game"
        className="fixed top-3 left-3 z-[70] w-9 h-9 rounded-xl bg-white bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-md flex items-center justify-center text-gray-700 dark:text-slate-300 hover:bg-white dark:bg-slate-800/90 active:scale-95 transition-all arena-btn"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <TebakKataGame hideBackButton />
    </div>
  )
}
