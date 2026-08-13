"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"

export function ClaimButton({ questId, alreadyClaimed }: { questId: string; alreadyClaimed: boolean }) {
  const [loading, setLoading] = useState(false)
  // Status awal datang dari server (ledger CoinTransaction). Sebelumnya status
  // ini murni state lokal, jadi begitu halaman dimuat ulang tombol "Klaim"
  // muncul lagi untuk misi yang hadiahnya sudah cair — ditekan pun tidak
  // terjadi apa-apa karena server menolaknya, tanpa penjelasan apa pun.
  const [claimed, setClaimed] = useState(alreadyClaimed)
  const [error, setError] = useState(false)
  const router = useRouter()

  const handleClaim = async () => {
    if (claimed || loading) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch("/api/siswa/quest/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId }),
      })
      // Dulu `claimed` diset true tanpa memeriksa res.ok, jadi klaim yang gagal
      // pun tetap tampil sebagai "Diklaim" padahal koinnya tidak pernah masuk.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // Sudah pernah diklaim di tab/perangkat lain — perlakukan sebagai selesai.
        if (res.status === 409 || /sudah diambil/i.test(data?.error || "")) {
          setClaimed(true)
        } else {
          setError(true)
        }
      } else {
        setClaimed(true)
      }
      router.refresh()
    } catch {
      setError(true)
    }
    setLoading(false)
  }

  if (claimed) {
    return (
      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mt-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> Diklaim
      </div>
    )
  }

  return (
    <>
      <button
        onClick={handleClaim}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all active:scale-95 mt-1 disabled:opacity-50"
      >
        {loading ? "..." : "Klaim"}
      </button>
      {error && <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">Gagal, coba lagi</p>}
    </>
  )
}
