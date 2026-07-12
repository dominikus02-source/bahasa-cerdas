"use client"

import { useEffect } from "react"

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    // Register after load so it never competes with first paint.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // When a new SW is found, let it take over as soon as it's ready.
          reg.addEventListener("updatefound", () => {
            const sw = reg.installing
            if (!sw) return
            sw.addEventListener("statechange", () => {
              if (sw.state === "installed" && navigator.serviceWorker.controller) {
                reg.waiting?.postMessage("SKIP_WAITING")
              }
            })
          })
        })
        .catch(() => {
          /* SW registration is best-effort — never break the app if it fails. */
        })
    }
    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
  }, [])
  return null
}
