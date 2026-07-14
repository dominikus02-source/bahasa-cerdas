"use client"

import { useState } from "react"
import { Heart } from "lucide-react"

export function ToggleLike({ karyaId, initialLiked, initialCount }: { karyaId: string; initialLiked: boolean; initialCount: number }) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (loading) return
    const wasLiked = liked
    const prevCount = count
    // optimistic (no full refresh — reconcile from the server response)
    setLoading(true)
    setLiked(!wasLiked)
    setCount(Math.max(0, wasLiked ? prevCount - 1 : prevCount + 1))
    try {
      const res = await fetch(`/api/siswa/karya/${karyaId}/like`, { method: "POST" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (typeof data.liked === "boolean") setLiked(data.liked)
      if (typeof data.likeCount === "number") setCount(data.likeCount)
    } catch {
      setLiked(wasLiked)
      setCount(prevCount)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-pressed={liked}
      aria-label={liked ? "Batal menyukai karya" : "Sukai karya"}
      className="flex items-center gap-1.5 text-sm disabled:opacity-70"
    >
      <Heart className={`w-5 h-5 transition-all ${liked ? "text-rose-500 fill-rose-500" : "text-gray-400"} ${loading ? "opacity-50" : ""}`} />
      <span className={liked ? "text-rose-500 font-semibold" : "text-gray-500"}>{count}</span>
    </button>
  )
}
