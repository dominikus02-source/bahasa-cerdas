"use client"

/**
 * HeartbeatProvider — Global near-real-time presence heartbeat
 *
 * Sends POST /api/presence/heartbeat with the current pathname:
 *  - immediately after login / route change
 *  - every 20 seconds while the authenticated tab is visible and online
 *  - immediately when a hidden tab becomes visible or connectivity returns
 *
 * Multiple tabs for the same user share the same Redis key
 * (user-level, not tab-level) — no count inflation.
 *
 * Cleanup: interval cleared on unmount.
 * No duplicate timers: single interval per provider instance.
 */
import { useCallback, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useUserStore } from "@/store"

const HEARTBEAT_INTERVAL_MS = 20_000 // 20 seconds
const INITIAL_DELAY_MS = 350 // fast first paint / route-change presence

export function HeartbeatProvider() {
  const userId = useUserStore((s) => s.id)
  const pathname = usePathname()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const sendHeartbeat = useCallback(() => {
    if (!userId) return
    if (document.visibilityState !== "visible") return
    if (!navigator.onLine) return

    fetch("/api/presence/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pathname }),
    }).catch(() => {})
  }, [pathname, userId])

  useEffect(() => {
    if (!userId) return

    // Route changes should appear in Live Pulse quickly rather than waiting
    // for the next 20-second heartbeat.
    const initialTimeout = setTimeout(sendHeartbeat, INITIAL_DELAY_MS)
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") sendHeartbeat()
    }
    const onOnline = () => sendHeartbeat()

    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("online", onOnline)

    return () => {
      clearTimeout(initialTimeout)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("online", onOnline)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [sendHeartbeat, userId])

  return null
}
