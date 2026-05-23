"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"

export function ClaimButton({ questId }: { questId: string }) {
  const [loading, setLoading] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const router = useRouter()

  const handleClaim = async () => {
    setLoading(true)
    try {
      await fetch("/api/siswa/quest/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId }),
      })
      setClaimed(true)
      router.refresh()
    } catch {}
    setLoading(false)
  }

  if (claimed) {
    return (
      <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold mt-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> Diklaim
      </div>
    )
  }

  return (
    <button
      onClick={handleClaim}
      disabled={loading}
      className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all active:scale-95 mt-1 disabled:opacity-50"
    >
      {loading ? "..." : "Klaim"}
    </button>
  )
}
