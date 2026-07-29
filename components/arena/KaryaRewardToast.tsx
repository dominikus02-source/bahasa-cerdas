"use client"

import { useEffect, useState } from "react"
import { Trophy, X } from "lucide-react"

/**
 * Menampilkan notifikasi hadiah koin sesudah murid menerbitkan karya yang
 * menjawab tantangan minggu ini. Pesannya dititipkan halaman tulis lewat
 * sessionStorage karena navigasinya lintas halaman (client -> server component).
 */
export default function KaryaRewardToast() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem("karya-reward")
    if (!stored) return
    sessionStorage.removeItem("karya-reward")
    setMessage(stored)
    const t = setTimeout(() => setMessage(null), 6000)
    return () => clearTimeout(t)
  }, [])

  if (!message) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-slide-up">
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-white shadow-xl shadow-violet-500/30">
        <div className="w-9 h-9 rounded-xl bg-yellow-400 flex items-center justify-center shrink-0">
          <Trophy size={18} className="text-yellow-950" />
        </div>
        <p className="flex-1 text-sm font-bold leading-snug">{message}</p>
        <button
          type="button"
          onClick={() => setMessage(null)}
          aria-label="Tutup"
          className="text-white/70 hover:text-white shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
