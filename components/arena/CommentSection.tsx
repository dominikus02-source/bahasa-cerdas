"use client"

import { useState } from "react"
import { Send, Trash2, AlertTriangle, Coins } from "lucide-react"
import Link from "next/link"

interface CommentUser {
  id: string
  fullName: string
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
  const [posting, setPosting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || posting) return
    setPosting(true)
    setError("")

    const optimistic: CommentData = {
      id: `temp-${Date.now()}`,
      content: text.trim(),
      createdAt: new Date().toISOString(),
      user: { id: currentUserId, fullName: "", avatar: null },
    }

    setComments(prev => [optimistic, ...prev])
    setCount(prev => prev + 1)
    const sentText = text.trim()
    setText("")

    try {
      const res = await fetch(`/api/siswa/karya/${karyaId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: sentText }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal mengirim komentar")
      }
      const data = await res.json()
      setComments(prev => prev.map(c => c.id === optimistic.id ? data.comment : c))
    } catch (err: any) {
      setComments(prev => prev.filter(c => c.id !== optimistic.id))
      setCount(prev => prev - 1)
      setError(err.message || "Gagal mengirim komentar. Coba lagi.")
    }
    setPosting(false)
  }

  const handleDelete = async (commentId: string) => {
    if (deleting) return
    setDeleting(commentId)
    setError("")

    const prevCount = count

    setComments(prev => prev.filter(c => c.id !== commentId))
    setCount(prev => prev - 1)
    setConfirmDelete(null)

    try {
      const res = await fetch(`/api/siswa/karya/${karyaId}/comment/${commentId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Gagal menghapus")
    } catch {
      setCount(prevCount)
      setError("Gagal menghapus komentar. Coba lagi.")
    }
    setDeleting(null)
  }

  const userIdx = (uid: string) => {
    let hash = 0
    for (let i = 0; i < uid.length; i++) hash = ((hash << 5) - hash) + uid.charCodeAt(i)
    return Math.abs(hash) % COLORS.length
  }

  return (
    <div>
      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-4">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600 text-xs font-bold">Tutup</button>
        </div>
      )}

      {/* Count */}
      <h3 className="font-bold text-gray-900 text-base mb-4">Komentar ({count})</h3>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-6">
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${COLORS[userIdx(currentUserId)]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          K
        </div>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Tulis komentar... (Enter untuk kirim)"
          className="flex-1 rounded-xl bg-[#F7F6FF] border-none px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
          maxLength={500}
          disabled={posting}
        />
        <button
          type="submit"
          disabled={!text.trim() || posting}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shrink-0 hover:shadow-md"
        >
          {posting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>

      {/* Coin incentive hint */}
      {comments.length === 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 mb-4">
          <Coins size={14} className="text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">Jadi yang pertama! Dapatkan <strong>+1 Koin</strong> untuk setiap komentar</p>
        </div>
      )}

      {/* Comments */}
      {comments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Belum ada komentar</p>
      ) : (
        <div className="space-y-4">
          {comments.map(c => {
            const isOwn = c.user.id === currentUserId
            const isTemp = c.id.startsWith("temp-")
            return (
              <div key={c.id} className={`flex gap-3 group ${isTemp ? "opacity-60" : ""}`}>
                {c.user.id && !isTemp ? (
                  <Link href={`/profile/${c.user.id}`} className={`w-9 h-9 rounded-full bg-gradient-to-br ${COLORS[userIdx(c.user.id)]} flex items-center justify-center text-white font-bold text-sm shrink-0 hover:ring-2 hover:ring-violet-300 transition-all`}>
                    {c.user.avatar ? <img src={c.user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : (c.user.fullName?.charAt(0).toUpperCase() || "?")}
                  </Link>
                ) : (
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${COLORS[userIdx(c.user.id)]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {c.user.avatar ? <img src={c.user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : (c.user.fullName?.charAt(0).toUpperCase() || "?")}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {c.user.id && !isTemp ? (
                        <Link href={`/profile/${c.user.id}`} className="hover:text-violet-600 transition-colors">{c.user.fullName || "Pengguna"}</Link>
                      ) : (c.user.fullName || "Pengguna")}
                      {isOwn && <span className="text-[10px] text-violet-500 ml-1 font-medium">(kamu)</span>}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0">{waktuLalu(c.createdAt)}</span>
                    {isOwn && !isTemp && (
                      <>
                        {confirmDelete === c.id ? (
                          <div className="flex items-center gap-1 ml-auto">
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={deleting === c.id}
                              className="text-[10px] font-bold text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded bg-red-50"
                            >
                              {deleting === c.id ? "..." : "Hapus"}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-[10px] font-bold text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded bg-gray-50"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(c.id)}
                            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
