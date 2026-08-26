"use client"

import BenarSalah from "@/components/game/BenarSalah"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function BenarSalahPage() {
  return (
    <div className="game-env game-env-benar fixed inset-0 z-[60]">
      <Link
        href="/arena/game"
 className="fixed top-3 left-3 z-[80] game-back-btn w-9 h-9 rounded-xl backdrop-blur-md shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all arena-btn"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <BenarSalah />
    </div>
  )
}
