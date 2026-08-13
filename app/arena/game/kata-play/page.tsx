"use client"

import KataPlayGame from "@/components/game/KataPlayGame"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function ArenaKataPlayPage() {
  return (
    <div className="fixed inset-0 z-[60] bg-[#0D0A1F]">
      <Link
        href="/arena/game"
 className="fixed top-3 left-3 z-[70] w-9 h-9 rounded-xl bg-white bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-white/20 shadow-md flex items-center justify-center text-white hover:bg-white bg-white/20 active:scale-95 transition-all arena-btn"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <KataPlayGame hideBackButton />
    </div>
  )
}
