"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { useRouter } from "next/navigation"

export function ToggleLike({ karyaId, initialLiked, initialCount }: { karyaId: string; initialLiked: boolean; initialCount: number }) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    if (loading) return
    setLoading(true)
    setLiked(!liked)
    setCount(c => liked ? c - 1 : c + 1)
    try {
      await fetch(`/api/siswa/karya/${karyaId}/like`, { method: "POST" })
      router.refresh()
    } catch {
      setLiked(liked)
      setCount(count)
    }
    setLoading(false)
  }

  return (
    <button onClick={toggle} className="flex items-center gap-1.5 text-sm">
      <Heart className={`w-5 h-5 transition-all ${liked ? "text-rose-500 fill-rose-500" : "text-gray-400"} ${loading ? "opacity-50" : ""}`} />
      <span className={liked ? "text-rose-500 font-semibold" : "text-gray-500"}>{count}</span>
    </button>
  )
}
