"use client"

import IramaKata from "@/components/game/IramaKata"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function IramaKataPage() {
  return (
    <div className="game-env game-env-irama fixed inset-0 z-[60]">
      <Link
        href="/arena/game"
        className="fixed top-3 right-3 z-[80] game-back-btn w-9 h-9 rounded-xl backdrop-blur-md shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <IramaKata />
    </div>
  )
}
