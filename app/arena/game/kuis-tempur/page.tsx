"use client"

import { useCallback } from "react"
import GameLobby from "@/components/game/GameLobby"
import { ArrowLeft } from "lucide-react"

export default function KuisTempurPage() {
  const handleBack = useCallback(() => {
    window.location.href = "/arena/game"
  }, [])

  return (
    <div className="min-h-screen relative">
      <button
        onClick={handleBack}
        className="fixed top-3 left-3 z-[70] w-9 h-9 rounded-xl bg-white/90 backdrop-blur-md border border-gray-200 shadow-md flex items-center justify-center text-gray-700 hover:bg-white active:scale-95 transition-all arena-btn"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <GameLobby isHost={false} role="MURID" />
    </div>
  )
}
