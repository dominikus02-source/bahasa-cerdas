"use client"

import { useState } from "react"
import { Send } from "lucide-react"
import { useRouter } from "next/navigation"

export function CommentForm({ karyaId }: { karyaId: string }) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/siswa/karya/${karyaId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      })
      if (res.ok) {
        setContent("")
        router.refresh()
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 bg-white sticky bottom-0">
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Tulis komentar..."
        className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 border-none"
        maxLength={500}
        disabled={loading}
      />
      <button
        type="submit"
        disabled={!content.trim() || loading}
        className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shrink-0"
      >
        <Send size={16} />
      </button>
    </form>
  )
}
