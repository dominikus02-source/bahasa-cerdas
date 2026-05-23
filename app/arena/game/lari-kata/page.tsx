"use client"

import LariKataGame from "@/components/game/LariKata"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function ArenaLariKataPage() {
  return (
    <div className="fixed inset-0 z-[60] bg-[#0F172A]">
      <Link
        href="/arena/game"
        className="fixed top-3 left-3 z-[70] w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-md flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all arena-btn"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <LariKataGame hideBackButton />
    </div>
  )
}
