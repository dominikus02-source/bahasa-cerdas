"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Heart, MessageCircle, Eye, Clock, Sparkles, BookOpen, FileText,
  Smile, Music, MessageSquare, PenLine, Send, Flame,
  Zap, Trophy, Target, TrendingUp, Share2,
} from "lucide-react"

const typeColors: Record<string, { label: string; bg: string; text: string; border: string }> = {
  PUISI: { label: "Puisi", bg: "bg-fuchsia-100", text: "text-fuchsia-700", border: "border-fuchsia-200" },
  CERPEN: { label: "Cerpen", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  ARTIKEL: { label: "Artikel", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  ANEKDOT: { label: "Anekdot", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  PANTUN: { label: "Pantun", bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
  OPINI: { label: "Opini", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
}

const tickerMessages = [
  "Baru: Rafi S. posting Pantun Cinta, Siti R. dapat 12 suka dalam 3 menit",
  "Tantangan Pantun berakhir 2 jam lagi, 12 karya baru masuk",
  "Alexander membalas pantunmu, 89 anak sudah baca karya hari ini",
  "Nadia K. mengomentari puisimu, 5 suka baru untuk karyamu",
]

const INITIALS_COLORS = [
  "from-violet-500 to-purple-600",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-blue-600",
]

interface KaryaItem {
  id: string
  type: string
  title: string
  content: string
  excerpt: string
  likesCount: number
  viewsCount: number
  createdAt: string
  user: {
    id: string
    fullName: string
    avatar: string | null
    profile?: { school?: string; city?: string } | null
  }
  _count: {
    likes: number
    comments: number
  }
}

export default function FeedPage() {
  const [karyaList, setKaryaList] = useState<KaryaItem[]>([])
  const [filter, setFilter] = useState("SEMUA")
  const [tickerIdx, setTickerIdx] = useState(0)
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set())
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({})
  const [onlineCount, setOnlineCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/siswa/karya?limit=30`)
      .then(r => r.json())
      .then(data => {
        setKaryaList(data.karya || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch("/api/arena/stats")
      .then(r => r.json())
      .then(data => setOnlineCount(data.onlineCount || 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const ti = setInterval(() => setTickerIdx(i => (i + 1) % tickerMessages.length), 4000)
    return () => clearInterval(ti)
  }, [])

  const filtered = filter === "POPULER"
    ? [...karyaList].sort((a, b) => b.likesCount - a.likesCount)
    : filter === "SEMUA"
      ? karyaList
      : karyaList.filter(k => k.type === filter)
  const trending = [...karyaList].sort((a, b) => b.likesCount - a.likesCount).slice(0, 4)

  const toggleLike = async (id: string) => {
    const wasLiked = likedSet.has(id)
    setLikedSet(prev => { const n = new Set(prev); wasLiked ? n.delete(id) : n.add(id); return n })
    setLikeCounts(prev => ({ ...prev, [id]: (prev[id] || 0) + (wasLiked ? -1 : 1) }))
    try { await fetch(`/api/siswa/karya/${id}/like`, { method: "POST" }) } catch {}
  }

  const submitComment = async (karyaId: string) => {
    const text = commentTexts[karyaId]?.trim()
    if (!text || submittingComment[karyaId]) return
    setSubmittingComment(prev => ({ ...prev, [karyaId]: true }))
    setCommentTexts(prev => ({ ...prev, [karyaId]: "" }))
    setKaryaList(prev => prev.map(k => k.id === karyaId ? { ...k, _count: { ...k._count, comments: k._count.comments + 1 } } : k))
    try {
      const res = await fetch(`/api/siswa/karya/${karyaId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      })
      if (!res.ok) {
        setKaryaList(prev => prev.map(k => k.id === karyaId ? { ...k, _count: { ...k._count, comments: k._count.comments - 1 } } : k))
        setCommentTexts(prev => ({ ...prev, [karyaId]: text }))
      }
    } catch {
      setKaryaList(prev => prev.map(k => k.id === karyaId ? { ...k, _count: { ...k._count, comments: k._count.comments - 1 } } : k))
      setCommentTexts(prev => ({ ...prev, [karyaId]: text }))
    }
    setSubmittingComment(prev => ({ ...prev, [karyaId]: false }))
  }

  const getLikeCount = (karya: KaryaItem) => likeCounts[karya.id] ?? karya.likesCount
  const excerpt = (karya: KaryaItem) => {
    const text = karya.excerpt || karya.content?.replace(/\n/g, " ").trim() || ""
    return text.length > 120 ? text.slice(0, 120) + "..." : text
  }

  const waktuLalu = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "baru saja"
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}j`
    return `${Math.floor(hours / 24)}h`
  }

  const firstComment = (karya: KaryaItem) => null // would need separate fetch for comments

  const filters = [
    { value: "SEMUA", label: "Semua" },
    { value: "PANTUN", label: "Pantun" },
    { value: "PUISI", label: "Puisi" },
    { value: "CERPEN", label: "Cerpen" },
    { value: "ARTIKEL", label: "Artikel" },
    { value: "POPULER", label: "Terpopuler" },
  ]

  return (
    <div className="min-h-screen bg-[#F7F6FF]">
      {/* HEADER */}
      <div className="feed-header">
          <div className="mb-1">
            <h1 className="text-xl font-extrabold text-white">KARYA</h1>
          </div>
        <p className="text-sm text-white/70">Karya terbaru dari murid di seluruh Indonesia</p>
      </div>

      {/* LIVE TICKER */}
      <div className="feed-ticker">
        <div className="w-[7px] h-[7px] bg-red-500 rounded-full ticker-dot shrink-0" />
        <p className="text-xs text-white font-semibold truncate" key={tickerIdx}>
          {tickerMessages[tickerIdx]}
        </p>
      </div>

      {/* FILTER CHIPS */}
      <div className="feed-chips">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`feed-chip ${filter === f.value ? "active" : ""}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* TRENDING STRIP */}
      {trending.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.8px] mb-2">Trending sekarang</p>
          <div className="trending-scroll">
            {trending.map(k => (
              <Link key={k.id} href={`/arena/feed/${k.id}`} className="trend-card block">
                <p className="text-[10px] font-bold text-violet-700 uppercase tracking-[0.5px] mb-1">
                  {typeColors[k.type]?.label || k.type}
                </p>
                <p className="text-[11px] font-bold text-[#1F1B3A] leading-tight mb-2 line-clamp-2">{k.title}</p>
                <p className="text-[10px] text-gray-400">
                  {k.user?.fullName?.split(" ")[0] || "User"} &middot; {k.likesCount} suka
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* FEED ITEMS */}
      <div className="px-4 pb-6">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-full bg-gray-100" />
                  <div className="flex-1">
                    <div className="h-3 w-28 bg-gray-100 rounded-full" />
                    <div className="h-2.5 w-20 bg-gray-50 rounded-full mt-2" />
                  </div>
                </div>
                <div className="h-4 w-3/4 bg-gray-100 rounded-full mb-3" />
                <div className="h-3 w-full bg-gray-50 rounded-full mb-1.5" />
                <div className="h-3 w-2/3 bg-gray-50 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
              <PenLine className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Belum ada karya nih!</p>
            <Link href="/arena/tulis" className="inline-block mt-3 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold">
              Tulis Karya Pertama
            </Link>
          </div>
        ) : (
          <>
            {/* CHALLENGE BANNER */}
            <div className="challenge-banner">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-white">Tantangan Minggu Ini</p>
                <p className="text-[11px] text-white/60">Pantun Persahabatan &middot; 134 karya masuk</p>
              </div>
              <Link
                href="/arena/tulis?type=PANTUN"
                className="bg-violet-600 text-white border-none rounded-xl px-3 py-2 text-[11px] font-bold cursor-pointer font-sans whitespace-nowrap hover:bg-violet-500 active:scale-95 transition-all inline-flex items-center"
              >
                Ikut
              </Link>
            </div>

            {/* FEED CARDS */}
            {filtered.map((karya, idx) => {
              const likersColor = INITIALS_COLORS[idx % INITIALS_COLORS.length]
              const isHot = karya.likesCount >= 10
              const isViral = karya.likesCount >= 5 && karya.likesCount < 10
              const isNew = Date.now() - new Date(karya.createdAt).getTime() < 3600000
              const likeCount = getLikeCount(karya)
              const isLiked = likedSet.has(karya.id)
              const school = karya.user?.profile?.school || "Siswa"

              return (
                <div key={karya.id} className={`feed-card relative ${isHot ? "hot" : isViral ? "viral" : ""}`}>
                  {/* Badges */}
                  {isHot && (
                    <div className="absolute top-3 right-3 bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <Flame size={11} /> Hot
                    </div>
                  )}
                  {isNew && !isHot && (
                    <div className="absolute top-3 right-3 bg-violet-50 text-violet-700 text-[10px] font-bold px-2 py-1 rounded-full">
                      Baru
                    </div>
                  )}

                  {/* Author row */}
                  <div className="flex items-center gap-2.5 mb-3 pr-[60px]">
                    <div className="relative shrink-0">
                      <div className={`w-[38px] h-[38px] rounded-full bg-gradient-to-br ${likersColor} flex items-center justify-center text-white text-sm font-extrabold`}>
                        {karya.user?.fullName?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="absolute bottom-0 right-0 w-[10px] h-[10px] bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[#1F1B3A] truncate">{karya.user?.fullName || "Pengguna"}</p>
                      <p className="text-[11px] text-gray-400 truncate">{school}</p>
                    </div>
                    <span className="text-[11px] text-[#C4B5FD] font-semibold shrink-0">{waktuLalu(karya.createdAt)}</span>
                  </div>

                  {/* Type Badge */}
                  <span className={`inline-block text-[10px] font-bold tracking-[0.5px] uppercase ${typeColors[karya.type]?.bg || "bg-gray-100"} ${typeColors[karya.type]?.text || "text-gray-700"} px-2 py-1 rounded-md mb-2`}>
                    {typeColors[karya.type]?.label || karya.type}
                  </span>

                  {/* Title */}
                  <Link href={`/arena/feed/${karya.id}`}>
                    <h3 className="text-[16px] font-extrabold text-[#1F1B3A] leading-tight mb-2">{karya.title}</h3>
                  </Link>

                  {/* Excerpt */}
                  <div className="text-[13px] text-gray-500 leading-relaxed italic border-l-[3px] border-[#EDE9FE] pl-2.5 mb-3 line-clamp-3">
                    {excerpt(karya)}
                  </div>

                  {/* Social proof - reading avatars */}
                  <div className="flex items-center mb-2.5">
                    <div className="reading-stack">
                      {idx < 4 && (
                        <div className="reading-av bg-gradient-to-br from-violet-500 to-purple-600">R</div>
                      )}
                      {idx < 3 && (
                        <div className="reading-av bg-gradient-to-br from-emerald-500 to-teal-600">S</div>
                      )}
                      {idx < 2 && (
                        <div className="reading-av bg-gradient-to-br from-amber-500 to-orange-600">B</div>
                      )}
                      <div className="reading-av bg-gradient-to-br from-pink-500 to-rose-600">N</div>
                    </div>
                    <span className="text-[11px] text-gray-400 ml-1.5">
                      <strong className="text-violet-700">Rafi, Siti +{8 + idx * 3}</strong> lagi baca
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <Eye size={12} className="text-[#C4B5FD]" />
                      <span className="text-[11px] text-[#C4B5FD] font-semibold">{karya.viewsCount || 0}</span>
                    </div>
                  </div>

                  {/* Comment preview */}
                  {/* {karya._count.comments > 0 && firstComment(karya) && ( ... )} */}

                  {/* Action buttons */}
                  <div className="flex items-center gap-0">
                    <button
                      onClick={() => toggleLike(karya.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        isLiked ? "text-rose-500 bg-rose-50" : "text-gray-400 hover:bg-[#F9F7FF]"
                      }`}
                    >
                      <Heart size={15} className={isLiked ? "fill-rose-500 text-rose-500" : ""} />
                      <span>{likeCount}</span>
                    </button>
                    <button
                      onClick={() => document.getElementById(`comment-${karya.id}`)?.focus()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-400 hover:bg-[#F9F7FF] transition-all"
                    >
                      <MessageCircle size={15} />
                      <span>{karya._count.comments}</span>
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-400 hover:bg-[#F9F7FF] transition-all">
                      <Share2 size={15} />
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => router.push(`/arena/feed/${karya.id}`)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-violet-700 hover:bg-[#F9F7FF] transition-all"
                    >
                      <MessageSquare size={14} />
                      {karya.type === "PANTUN" ? "Balas" : "Komentar"}
                    </button>
                  </div>

                  {/* Inline comment input */}
                  <div className="flex items-center gap-2 bg-[#F9F7FF] rounded-xl px-3 py-2.5 mt-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-extrabold shrink-0">
                      K
                    </div>
                    <input
                      id={`comment-${karya.id}`}
                      value={commentTexts[karya.id] || ""}
                      onChange={e => setCommentTexts(prev => ({ ...prev, [karya.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && submitComment(karya.id)}
                      placeholder="Tulis komentar... (Enter kirim)"
                      className="flex-1 bg-transparent text-xs text-gray-500 placeholder:text-gray-400 focus:outline-none border-none"
                      maxLength={500}
                    />
                    {karya._count.comments === 0 && !commentTexts[karya.id] && (
                      <span className="text-[9px] font-bold text-amber-500 shrink-0 whitespace-nowrap">+1 Koin</span>
                    )}
                    <button
                      onClick={() => submitComment(karya.id)}
                      disabled={!commentTexts[karya.id]?.trim()}
                      className="text-violet-700 disabled:text-gray-300 transition-colors disabled:cursor-not-allowed"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
