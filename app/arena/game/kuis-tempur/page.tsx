"use client"

import { useCallback } from "react"
import GameLobby from "@/components/game/GameLobby"
import { gameSocket } from "@/lib/game/socket"
import { ArrowLeft } from "lucide-react"
import { MULTIPLAYER_ENABLED } from "@/lib/features"
import KuisTempurSolo from "@/components/game/KuisTempurSolo"

export default function KuisTempurPage() {
  const handleBack = useCallback(() => {
    gameSocket.disconnect()
    window.location.href = "/arena/game"
  }, [])

  // Tanpa server pertandingan, slot ini dulu hanya menampilkan "Segera Hadir" —
  // kartu berlabel "Terpopuler" yang tidak bisa dimainkan sama sekali. Mode solo
  // melawan bot mengisi tempat itu: murid selalu mendapat Kuis Tempur yang jalan,
  // dan begitu NEXT_PUBLIC_MULTIPLAYER_ENABLED dinyalakan lagi, versi lawan-teman
  // kembali tanpa satu baris pun diubah.
  if (!MULTIPLAYER_ENABLED) return <KuisTempurSolo />

  return (
    <div className="game-fullscreen relative">
      <button
        onClick={handleBack}
        className="fixed top-3 left-3 z-[70] w-9 h-9 rounded-xl bg-white bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-md flex items-center justify-center text-gray-700 dark:text-slate-300 hover:bg-white dark:bg-slate-800/90 active:scale-95 transition-all arena-btn"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <GameLobby isHost={false} role="MURID" />
    </div>
  )
}
