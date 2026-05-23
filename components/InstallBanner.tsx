"use client"

import { useEffect, useState } from "react"
import { X, Smartphone, BookOpen } from "lucide-react"
import { InstallGuide } from "./InstallGuide"

let deferredPrompt: any = null

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    deferredPrompt = e
  })
}

export function InstallBanner() {
  const [show, setShow] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const isStandalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches

  useEffect(() => {
    if (!deferredPrompt && !isStandalone) {
      const shown = localStorage.getItem("install-banner-shown")
      if (!shown) setShow(true)
    }
  }, [isStandalone])

  if (isStandalone || !show) return null

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === "accepted") {
        localStorage.setItem("install-banner-shown", "true")
        setShow(false)
      }
    }
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 p-4 pt-6 bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg md:hidden">
        <button onClick={() => { setShow(false); localStorage.setItem("install-banner-shown", "true") }} className="absolute top-2 right-2 text-white/70">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <Smartphone className="w-8 h-8 text-violet-200 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Install Arena di HP-mu</p>
            <p className="text-xs text-violet-200 truncate">Main kapan aja, di mana aja!</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setGuideOpen(true)} className="px-3 py-2 rounded-xl bg-white/15 text-white text-xs font-medium flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Panduan
            </button>
            <button onClick={handleInstall} className="px-4 py-2 rounded-xl bg-white text-violet-700 text-xs font-bold">
              Install
            </button>
          </div>
        </div>
      </div>

      {guideOpen && <InstallGuide onClose={() => setGuideOpen(false)} />}
    </>
  )
}
