"use client"

import ZelbyDash from "@/components/game/ZelbyDash"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PetualanganKataPage() {
  return (
    <div className="fixed inset-0 z-[60]">
      <Link
        href="/arena/game"
        className="fixed top-3 right-3 z-[80] w-9 h-9 rounded-xl bg-[#161B3A]/10 backdrop-blur-md border border-[#161B3A]/20 shadow-md flex items-center justify-center text-[#161B3A] hover:bg-[#161B3A]/20 active:scale-95 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <ZelbyDash />
    </div>
  )
}
