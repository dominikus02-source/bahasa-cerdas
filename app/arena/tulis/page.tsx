"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PenLine, Send, Image, Sparkles, BookOpen, FileText, Smile, Music, MessageSquare } from "lucide-react"
import { getWeeklyChallenge } from "@/lib/weekly-challenge"

const karyaTypes = [
  { value: "PUISI", label: "Puisi", icon: <Sparkles className="w-6 h-6" />, color: "from-fuchsia-500 to-pink-600" },
  { value: "CERPEN", label: "Cerpen", icon: <BookOpen className="w-6 h-6" />, color: "from-blue-500 to-indigo-600" },
  { value: "ARTIKEL", label: "Artikel", icon: <FileText className="w-6 h-6" />, color: "from-emerald-500 to-teal-600" },
  { value: "ANEKDOT", label: "Anekdot", icon: <Smile className="w-6 h-6" />, color: "from-amber-500 to-orange-600" },
  { value: "PANTUN", label: "Pantun", icon: <Music className="w-6 h-6" />, color: "from-violet-500 to-purple-600" },
  { value: "OPINI", label: "Opini", icon: <MessageSquare className="w-6 h-6" />, color: "from-rose-500 to-red-600" },
]

export default function ArenaTulisPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [type, setType] = useState("PUISI")

  useEffect(() => {
    const t = searchParams.get("type")
    if (t && karyaTypes.some(kt => kt.value === t)) {
      setType(t)
    }
  }, [searchParams])
  const challenge = getWeeklyChallenge()
  const isChallengeType = type === challenge.type
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [coverUrl, setCoverUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/siswa/karya", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          content: content.trim(),
          coverUrl: coverUrl || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan")
      router.push(`/arena/feed/${data.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="px-4 py-5 arena-page">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-gray-900">Tulis Karya</h1>
        <p className="text-sm text-gray-500 mt-1">Bagikan karyamu ke seluruh Indonesia!</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type picker */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 block">Jenis Karya</label>
          <div className="grid grid-cols-3 gap-2">
            {karyaTypes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  type === t.value
                    ? `bg-gradient-to-br ${t.color} text-white border-transparent shadow-md`
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <div className={type === t.value ? "text-white" : "text-gray-400"}>
                  {t.icon}
                </div>
                <span className="text-[11px] font-semibold">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Challenge banner */}
        {isChallengeType && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white">
            <Sparkles size={20} className="text-yellow-300 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-extrabold">Tantangan Minggu Ini</p>
              <p className="text-[11px] text-white/80">{challenge.prompt}</p>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Judul</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masukkan judul karyamu..."
            className="w-full px-4 py-3.5 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
            required
          />
        </div>

        {/* Cover Image URL */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
            <div className="flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5" />
              Gambar Sampul (opsional)
            </div>
          </label>
          <input
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://example.com/gambar.jpg"
            className="w-full px-4 py-3.5 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Konten</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis karyamu di sini..."
            rows={12}
            className="w-full px-4 py-3.5 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 resize-none"
            required
          />
          <p className="text-[10px] text-gray-400 mt-1.5 text-right">{content.length} karakter</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !title.trim() || !content.trim()}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm hover:shadow-lg hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
        >
          {loading ? "Menyimpan..." : "Publikasikan"}
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
