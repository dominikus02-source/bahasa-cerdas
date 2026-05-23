"use client"

import { InstallBanner } from "@/components/InstallBanner"

export function ArenaClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InstallBanner />
      {children}
    </>
  )
}
