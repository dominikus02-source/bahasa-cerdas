"use client"

import { useState } from "react"
import { Send, Trash2, AlertTriangle, Coins } from "lucide-react"
import Link from "next/link"

interface CommentUser {
  id: string
  fullName: string
  displayName?: string
  avatar: string | null
}

interface CommentData {
  id: string
  content: string
  createdAt: string
  user: CommentUser
}

interface CommentSectionProps {
  karyaId: string
  initialComments: CommentData[]
  initialCount: number
  currentUserId: string
}

const COLORS = [
  "from-violet-500 to-purple-600",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-blue-600",
]

function waktuLalu(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "baru saja"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}j`
  if (h < 168) return `${Math.floor(h / 24)}h`
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
}

export default function CommentSection({ karyaId, initialComments, initialCount, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>(initialComments)
  const [count, setCount] = useState(initialCount)
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameOf = (u: CommentUser) => u.displayName || u.fullName

  const handleSubmit = async () => {
    const content = text.trim()
    if (!content || submitting) return
    setSubmitting(true)
    setError(null)

    const optimistic: CommentData = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      user: { id: currentUserId, fullName: "", displayName: "", avatar: null },
    }
    setComments(prev => [optimistic, ...prev])
    setCount(prev => prev + 1)
    setText("")

    try {
      const res = await fetch(`/api/siswa/karya/${karyaId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error("Gagal")
      const data = await res.json()
      setComments(prev => prev.map(c => c.id === optimistic.id ? data.comment : c))
    } catch {
      setComments(prev => prev.filter(c => c.id !== optimistic.id))
      setCount(prev => prev - 1)
      setText(content)
      setError("Gagal mengirim komentar")
    }
    setSubmitting(false)
  }

  const handleDelete = async (commentId: string) => {
    const res = await fetch(`/api/siswa/karya/${karyaId}/comment/${commentId}`, { method: "DELETE" })
    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== commentId))
      setCount(prev => prev - 1)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-sm">Komentar ({count})</h3>
      </div>

      {/* Input */}
      <div className="flex gap-2 mb-5">
        <input
          value={text} onChange={e => setText(e.target.value)}
          placeholder="Tulis komentar..."
          className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
          onKeyDown={e => { if (e.key === "Enter") handleSubmit() }}
        />
        <button onClick={handleSubmit} disabled={submitting || !text.trim()}
          className="px-4 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all"
        >
          {submitting ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Send size={16} />}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-xl">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* List */}
      {comments.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-6">Belum ada komentar.</p>
      ) : (
        <div className="space-y-3">
          {comments.map(c => {
            const colorIdx = c.user.id ? c.user.id.charCodeAt(0) % COLORS.length : 0
            const isOwner = c.user.id === currentUserId
            return (
              <div key={c.id} className="flex gap-2.5">
                <Link href={`/profile/${c.user.id}`} className={`w-8 h-8 rounded-full bg-gradient-to-br ${COLORS[colorIdx]} flex items-center justify-center text-white text-xs font-bold shrink-0 hover:ring-2 hover:ring-violet-300 transition-all overflow-hidden`}>
                  {c.user.avatar ? <img src={c.user.avatar} alt="" className="w-full h-full object-cover" /> : nameOf(c.user).charAt(0).toUpperCase()}
                </Link>
                <div className="flex-1 bg-white rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link href={`/profile/${c.user.id}`} className="text-xs font-bold text-gray-900 hover:text-violet-600">{nameOf(c.user)}</Link>
                    <span className="text-[10px] text-gray-400">{waktuLalu(c.createdAt)}</span>
                    {isOwner && (
                      <button onClick={() => handleDelete(c.id)} className="ml-auto text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{c.content}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
