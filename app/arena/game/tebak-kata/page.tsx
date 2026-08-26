"use client"

import TebakKataGame from "@/components/game/TebakKata"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TebakKataPage() {
  return (
    <div className="game-env game-env-tebak game-fullscreen min-h-screen bg-[#F2F2F7]">
      <Link
        href="/arena/game"
        className="fixed top-3 left-3 z-[70] game-back-btn w-9 h-9 rounded-xl backdrop-blur-md shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all arena-btn"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <TebakKataGame hideBackButton />
    </div>
  )
}
