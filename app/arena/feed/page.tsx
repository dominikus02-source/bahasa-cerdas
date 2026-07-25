"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Heart, MessageCircle, Eye, Clock, Sparkles, BookOpen, FileText,
  Smile, Music, MessageSquare, PenLine, Send, Flame,
  Zap, Trophy, Target, TrendingUp, Share2, Loader2,
} from "lucide-react"
import { getWeeklyChallenge } from "@/lib/weekly-challenge"

const typeColors: Record<string, { label: string; bg: string; text: string; border: string }> = {
  PUISI: { label: "Puisi", bg: "bg-fuchsia-100", text: "text-fuchsia-700", border: "border-fuchsia-200" },
  CERPEN: { label: "Cerpen", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  ARTIKEL: { label: "Artikel", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  ANEKDOT: { label: "Anekdot", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  PANTUN: { label: "Pantun", bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
  OPINI: { label: "Opini", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
}

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
    displayName?: string
    avatar: string | null
    profile?: { school?: string; city?: string } | null
  }
  _count: {
    likes: number
    comments: number
  }
  likedByCurrentUser?: boolean
}

export default function FeedPage() {
  const [karyaList, setKaryaList] = useState<KaryaItem[]>([])
  const [filter, setFilter] = useState("SEMUA")
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set())
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({})
  const [likePending, setLikePending] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<string | null>(null)
  const [onlineCount, setOnlineCount] = useState(0)
  const [totalKarya, setTotalKarya] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isGuruViewer, setIsGuruViewer] = useState(false)
  const nameOf = (u?: { fullName: string; displayName?: string }) =>
    !u ? "Pengguna" : (isGuruViewer ? u.fullName : (u.displayName || u.fullName))
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [challengeCount, setChallengeCount] = useState(0)
  const [loadingChallenge, setLoadingChallenge] = useState(true)
  const challenge = getWeeklyChallenge()
  const router = useRouter()

  const loadKarya = useCallback(async (cursorVal: string | null, append: boolean) => {
    const params = new URLSearchParams({ limit: "20" });
    if (cursorVal) params.set("cursor", cursorVal);
    const res = await fetch(`/api/siswa/karya?${params}`);
    const data = await res.json();
    const items: KaryaItem[] = data.karya || [];
    setKaryaList(prev => append ? [...prev, ...items] : items);
    setLikedSet(prev => {
      const n = append ? new Set(prev) : new Set<string>();
      for (const k of items) if (k.likedByCurrentUser) n.add(k.id);
      return n;
    });
    setLikeCounts(prev => {
      const n = append ? { ...prev } : {} as Record<string, number>;
      for (const k of items) n[k.id] = k._count?.likes ?? k.likesCount ?? 0;
      return n;
    });
    setTotalKarya(data.total || 0);
    setHasMore(!!data.nextCursor);
    setCursor(data.nextCursor);
  }, []);

  useEffect(() => {
    async function init() {
      await loadKarya(null, false);
      const [uData, stats, chCount] = await Promise.all([
        fetch("/api/user/me").then(r => r.ok ? r.json() : null),
        fetch("/api/arena/stats").then(r => r.json()).catch(() => ({})),
        fetch(`/api/siswa/karya/count?type=${challenge.type}`).then(r => r.json()).catch(() => ({ count: 0 })),
      ]);
      if (uData) {
        setCurrentUserId(uData.user?.id || uData.id);
        setIsGuruViewer(uData.user?.role === "GURU" || uData.role === "GURU" || false);
      }
      setOnlineCount(stats.onlineCount || 0);
      setChallengeCount(chCount.count || 0);
      setLoadingChallenge(false);
    }
    init();
  }, [loadKarya, challenge.type]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "20" });
    if (filter !== "SEMUA") params.set("type", filter);
    fetch(`/api/siswa/karya?${params}`)
      .then(r => r.json())
      .then(data => {
        setKaryaList(data.karya || []);
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
        setLoading(false);
      });
  }, [filter]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !cursor) return;
    setLoadingMore(true);
    const params = new URLSearchParams({ limit: "20", cursor });
    if (filter !== "SEMUA") params.set("type", filter);
    const res = await fetch(`/api/siswa/karya?${params}`);
    const data = await res.json();
    setKaryaList(prev => [...prev, ...(data.karya || [])]);
    setCursor(data.nextCursor);
    setHasMore(!!data.nextCursor);
    setLoadingMore(false);
  }, [cursor, loadingMore, filter]);

  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore();
    }, { rootMargin: "300px" });
    const el = document.getElementById("feed-sentinel");
    if (el) io.observe(el);
    return () => io.disconnect();
  }, [loadMore, hasMore, loadingMore]);

  const handleLike = async (id: string) => {
    if (likePending[id]) return;
    setLikePending(prev => ({ ...prev, [id]: true }));
    const isLiked = likedSet.has(id);
    // optimistic
    setLikedSet(prev => { const n = new Set(prev); isLiked ? n.delete(id) : n.add(id); return n; });
    setLikeCounts(prev => ({ ...prev, [id]: prev[id] + (isLiked ? -1 : 1) }));
    try {
      const res = await fetch(`/api/siswa/karya/${id}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLikeCounts(prev => ({ ...prev, [id]: data.likesCount }));
    } catch {
      // rollback
      setLikedSet(prev => { const n = new Set(prev); isLiked ? n.add(id) : n.delete(id); return n; });
      setLikeCounts(prev => ({ ...prev, [id]: prev[id] + (isLiked ? 1 : -1) }));
    }
    setLikePending(prev => ({ ...prev, [id]: false }));
  };

  const handleComment = async (karyaId: string) => {
    const text = commentTexts[karyaId]?.trim();
    if (!text || submittingComment[karyaId]) return;
    setSubmittingComment(prev => ({ ...prev, [karyaId]: true }));
    // optimistic
    const tempId = `temp-${Date.now()}`;
    setKaryaList(prev => prev.map(k => k.id === karyaId ? { ...k, _count: { ...k._count, comments: k._count.comments + 1 } } : k));
    setCommentTexts(prev => ({ ...prev, [karyaId]: "" }));
    try {
      const res = await fetch(`/api/siswa/karya/${karyaId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setKaryaList(prev => prev.map(k => k.id === karyaId ? { ...k, _count: { ...k._count, comments: k._count.comments - 1 } } : k));
      setCommentTexts(prev => ({ ...prev, [karyaId]: text }));
    }
    setSubmittingComment(prev => ({ ...prev, [karyaId]: false }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus karya ini?")) return;
    setDeletingId(id);
    const res = await fetch(`/api/siswa/karya/${id}`, { method: "DELETE" });
    if (res.ok) {
      setKaryaList(prev => prev.filter(k => k.id !== id));
      setToast("Karya berhasil dihapus");
      setTimeout(() => setToast(null), 3000);
    }
    setDeletingId(null);
  };

  const initials = (name: string) =>
    name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"

  function waktuLalu(t: string) {
    const diff = Date.now() - new Date(t).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return "baru saja"
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}j`
    return `${Math.floor(h / 24)}h`
  }

  const isOwner = (karyaUserId: string) => currentUserId === karyaUserId

  return (
    <div className="arena-page max-w-3xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Feed Karya</h1>
          <p className="text-sm text-gray-500">Karya terbaru dari siswa</p>
        </div>
        <Link href="/arena/tulis" className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-all shadow-sm">
          <PenLine size={16} /> Tulis
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-hide">
        {["SEMUA", "PUISI", "CERPEN", "ARTIKEL", "ANEKDOT", "PANTUN", "OPINI"].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filter === t ? "bg-violet-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "SEMUA" ? "Semua" : typeColors[t]?.label || t}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-violet-500" /></div>
      ) : karyaList.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p>Belum ada karya.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {karyaList.map(k => {
            const tc = typeColors[k.type] || typeColors.PUISI
            const likeCount = likeCounts[k.id] ?? k._count?.likes ?? k.likesCount ?? 0
            const isLiked = likedSet.has(k.id)
            const isDeleting = deletingId === k.id
            return (
              <div key={k.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                  <Link href={`/profile/${k.user.id}`} className={`w-9 h-9 rounded-full bg-gradient-to-br ${INITIALS_COLORS[0]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {k.user.avatar ? <img src={k.user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : initials(nameOf(k.user))}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${k.user.id}`} className="text-sm font-semibold text-gray-900 hover:text-violet-600">{nameOf(k.user)}</Link>
                    <p className="text-xs text-gray-400">{k.user.profile?.school || ""}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={12} /> {waktuLalu(k.createdAt)}
                  </div>
                </div>

                {/* Content */}
                <Link href={`/arena/feed/${k.id}`} className="block px-5 py-2">
                  <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${tc.bg} ${tc.text} mb-2`}>
                    <span>{tc.label}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{k.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{k.content?.slice(0, 250)}</p>
                </Link>

                {/* Actions */}
                <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-50">
                  <button onClick={() => handleLike(k.id)} disabled={likePending[k.id]} className={`flex items-center gap-1.5 text-sm font-medium transition-all ${isLiked ? "text-red-500" : "text-gray-400 hover:text-red-500"}`}>
                    {isLiked ? <Heart size={16} fill="currentColor" /> : <Heart size={16} />}
                    {likeCount}
                  </button>
                  <Link href={`/arena/feed/${k.id}`} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-500 transition-all">
                    <MessageCircle size={16} /> {k._count?.comments ?? 0}
                  </Link>
                  <span className="flex items-center gap-1.5 text-sm text-gray-400 ml-auto">
                    <Eye size={16} /> {k.viewsCount || 0}
                  </span>
                  {isOwner(k.user.id) && (
                    <button onClick={() => handleDelete(k.id)} disabled={isDeleting} className="text-gray-300 hover:text-red-500 transition-all">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          <div id="feed-sentinel" className="h-4" />
          {loadingMore && <div className="flex justify-center py-4"><Loader2 size={24} className="animate-spin text-violet-400" /></div>}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm font-medium shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
