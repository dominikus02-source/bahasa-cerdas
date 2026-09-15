"use client"

/**
 * HeartbeatProvider — Global near-real-time presence heartbeat
 *
 * Sends POST /api/presence/heartbeat every 20 seconds while:
 *  - User is authenticated (id exists in Zustand store)
 *  - Browser tab is visible
 *  - Browser is online
 *
 * Multiple tabs for the same user share the same Redis key
 * (user-level, not tab-level) — no count inflation.
 *
 * Cleanup: interval cleared on unmount.
 * No duplicate timers: single interval per provider instance.
 */
import { useEffect, useRef } from "react"
import { useUserStore } from "@/store"

const HEARTBEAT_INTERVAL_MS = 20_000 // 20 seconds
const INITIAL_DELAY_MS = 3_000 // 3 seconds after mount

export function HeartbeatProvider() {
  const userId = useUserStore((s) => s.id)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Don't start heartbeat if user is not authenticated
    if (!userId) return

    const tick = () => {
      // Respect: tab must be visible AND browser online
      if (document.visibilityState !== "visible") return
      if (!navigator.onLine) return

      fetch("/api/presence/heartbeat", { method: "POST" }).catch(() => {})
    }

    // Initial heartbeat after short delay
    const initialTimeout = setTimeout(tick, INITIAL_DELAY_MS)

    // Recurring heartbeat
    intervalRef.current = setInterval(tick, HEARTBEAT_INTERVAL_MS)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [userId])

  // No visible UI — this is a headless provider
  return null
}
