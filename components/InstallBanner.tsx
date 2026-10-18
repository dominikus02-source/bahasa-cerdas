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
      <div className="fixed top-0 left-0 right-0 z-50 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top,0px))] bg-bc-murid text-bc-on-brand shadow-bc-2 md:hidden" role="region" aria-label="Pasang aplikasi">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-[200px] flex-1 items-center gap-3 pr-7">
            <Smartphone className="w-7 h-7 shrink-0 opacity-90" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">Pasang di HP-mu</p>
              <p className="mt-0.5 text-xs leading-snug opacity-85">Buka lebih cepat dari layar utama.</p>
            </div>
          </div>
          <div className="ml-auto flex gap-2 shrink-0">
            <button type="button" onClick={() => setGuideOpen(true)} className="min-h-9 px-3 rounded-full bg-bc-on-brand/15 text-xs font-semibold flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" /> Panduan
            </button>
            <button type="button" onClick={handleInstall} className="min-h-9 px-4 rounded-full bg-bc-surface text-bc-violet text-xs font-bold">
              Pasang
            </button>
          </div>
        </div>
        <button type="button" aria-label="Tutup" onClick={() => { setShow(false); localStorage.setItem("install-banner-shown", "true") }} className="absolute right-1.5 top-[calc(4px+env(safe-area-inset-top,0px))] grid h-8 w-8 place-items-center rounded-full opacity-75 hover:opacity-100">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {guideOpen && <InstallGuide onClose={() => setGuideOpen(false)} />}
    </>
  )
}
