"use client"

import TebakKataGame from "@/components/game/TebakKata"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TebakKataPage() {
  return (
    <div className="game-fullscreen min-h-screen bg-[#F2F2F7]">
      <Link
        href="/arena/game"
        className="fixed top-3 left-3 z-[70] w-9 h-9 rounded-xl bg-white/90 backdrop-blur-md border border-gray-200 shadow-md flex items-center justify-center text-gray-700 hover:bg-white active:scale-95 transition-all arena-btn"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <TebakKataGame />
    </div>
  )
}
