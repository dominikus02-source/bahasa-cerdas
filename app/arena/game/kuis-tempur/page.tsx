"use client"

import { useCallback } from "react"
import GameLobby from "@/components/game/GameLobby"
import { gameSocket } from "@/lib/game/socket"
import GameBackButton from "@/components/game/GameBackButton"
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
  if (!MULTIPLAYER_ENABLED) return <div className="game-env game-env-kuis"><KuisTempurSolo /></div>

  return (
    <div className="game-env game-env-kuis game-fullscreen relative">
      <GameBackButton
        onClick={handleBack}
        label="Kembali ke Arena"
        title="Kembali ke Arena"
        className="fixed top-3 left-3 z-[70]"
      />
      <GameLobby isHost={false} role="MURID" />
    </div>
  )
}
