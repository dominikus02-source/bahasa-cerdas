"use client"

import { InstallBanner } from "@/components/InstallBanner"
import { PlayerProvider } from "@/components/arena/player/player-context"
import { PlayerOverlay } from "@/components/arena/player/player-overlay"

export function ArenaClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <PlayerOverlay />
      <InstallBanner />
      {children}
    </PlayerProvider>
  )
}
