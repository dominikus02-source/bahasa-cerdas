"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PenLine, Send, Image, Sparkles, BookOpen, FileText, Smile, Music, MessageSquare, Trophy, CheckCircle2 } from "lucide-react"
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
          // Server memvalidasi field ini sebagai `coverImage`; dikirim sebagai
          // `coverUrl` gambar sampulnya diam-diam dibuang dan tidak pernah tersimpan.
          coverImage: coverUrl || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan")

      if (data.challengeBonus > 0) {
        sessionStorage.setItem(
          "karya-reward",
          `Karyamu masuk tantangan "${data.challengeTheme}" — dapat ${data.coins + data.challengeBonus} koin!`
        )
      }

      // Respons memakai bentuk { karya, id, ... }. Dulu di sini membaca data.id
      // saat server hanya mengirim { karya }, jadi murid selalu dilempar ke
      // /arena/feed/undefined dan memantul balik ke feed tanpa melihat karyanya.
      router.push(`/arena/feed/${data.id ?? data.karya?.id}`)
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

        {/* Tantangan Minggu Ini — selalu tampil. Dulu hanya muncul kalau jenis
            karyanya kebetulan sudah cocok, jadi murid tidak pernah tahu ada
            tantangannya sampai tidak sengaja memilih jenis yang tepat. */}
        <button
          type="button"
          onClick={() => setType(challenge.type)}
          className={`w-full text-left rounded-2xl p-4 transition-all ${
            isChallengeType
              ? "bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25"
              : "bg-white border-2 border-dashed border-violet-300 text-gray-800 hover:border-violet-400 active:scale-[0.99]"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isChallengeType ? "bg-white/20" : "bg-violet-100"
            }`}>
              <Sparkles size={22} className={isChallengeType ? "text-yellow-300" : "text-violet-600"} />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isChallengeType ? "bg-white/20" : "bg-violet-100 text-violet-700"
              }`}>
                Tantangan Minggu Ini
              </span>
              <p className="text-base font-extrabold mt-1.5 leading-tight">{challenge.theme}</p>
              <p className={`text-xs mt-0.5 leading-snug ${isChallengeType ? "text-white/80" : "text-gray-500"}`}>
                {challenge.prompt}
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <span className="inline-flex items-center gap-1.5 bg-yellow-400 text-yellow-950 text-[11px] font-extrabold px-2.5 py-1 rounded-full">
                  <Trophy size={12} /> +{challenge.bonusCoins} koin
                </span>
                {isChallengeType ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white/90">
                    <CheckCircle2 size={13} /> Karyamu ikut tantangan ini
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-violet-600">
                    Ketuk untuk ikut &rarr;
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>

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
