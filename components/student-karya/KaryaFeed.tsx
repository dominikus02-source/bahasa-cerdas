"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import type { FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Heart, MessageCircle, Eye, Clock, Sparkles, BookOpen, FileText,
  Smile, Music, MessageSquare, PenLine, Send, Flame,
  Zap, Trophy, Target, TrendingUp, Share2, Loader2, Search,
} from "lucide-react"
import { getWeeklyChallenge } from "@/lib/weekly-challenge"
import UserAvatar from "@/components/arena/UserAvatar"
import UserName from "@/components/arena/UserName"
import ShareKaryaButton from "@/components/arena/ShareKaryaButton"

export const typeColors: Record<string, { label: string; bg: string; text: string; border: string }> = {
  PUISI: { label: "Puisi", bg: "bg-fuchsia-100 dark:bg-fuchsia-500/15", text: "text-fuchsia-700 dark:text-fuchsia-300", border: "border-fuchsia-200 dark:border-fuchsia-500/20" },
  CERPEN: { label: "Cerpen", bg: "bg-blue-100 dark:bg-blue-500/15", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-500/20" },
  ARTIKEL: { label: "Artikel", bg: "bg-emerald-100 dark:bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-500/20" },
  ANEKDOT: { label: "Anekdot", bg: "bg-amber-100 dark:bg-amber-500/15", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-500/20" },
  PANTUN: { label: "Pantun", bg: "bg-violet-100 dark:bg-violet-500/15", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-500/20" },
  OPINI: { label: "Opini", bg: "bg-rose-100 dark:bg-rose-500/15", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-500/20" },
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
    equippedFrame?: string | null
    equippedNameColor?: string | null
    equippedBadge?: string | null
    profile?: { school?: string; city?: string } | null
  }
  _count: {
    likes: number
    comments: number
  }
  likedByCurrentUser?: boolean
}

/**
 * KaryaFeed — SATU implementasi feed karya (discovery, filter, like, komentar,
 * share, tantangan mingguan, infinite scroll). Dipakai oleh dua route:
 *   - /murid/karya   (kanonik) → variant="stage" (Panggung Karya, grid 3/2/1)
 *   - /arena/feed    (mirror APK + preview guru) → variant="compact" (default)
 * Semua tautan di-parameter-kan agar tiap shell mengarah ke route kanoniknya.
 * Perubahan pada file ini HANYA presentation/configuration — logika bisnis
 * (fetch, like/comment/delete, scope guru, pagination) TIDAK disentuh.
 */
interface KaryaFeedProps {
  /** Header eksternal (route kanonik). Pada variant stage diabaikan (hero page). */
  header?: React.ReactNode
  /** "stage" = showcase grid; "compact" = feed 1 kolom (arena mirror). */
  variant?: "stage" | "compact"
  /** Prefix detail karya (default "/murid/karya") → `${detailBase}/${id}` */
  detailBase?: string
  /** Prefix profil publik (default "/profile") → `${profileBase}/${userId}` */
  profileBase?: string
  /** Route tulis/ikuti tantangan (default "/murid/karya/tulis") */
  tulisHref?: string
  /** Route untuk "Hapus Filter"/search (default "/murid/karya") */
  clearHref?: string
}

function FeedContent({
  header, variant, detailBase, profileBase, tulisHref, clearHref,
}: Required<Pick<KaryaFeedProps, "header" | "variant" | "detailBase" | "profileBase" | "tulisHref" | "clearHref">>) {
  const stage = variant === "stage"
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get("q") || ""

  const [karyaList, setKaryaList] = useState<KaryaItem[]>([])
  const [filter, setFilter] = useState("SEMUA")
  const [scope, setScope] = useState<"global" | "school" | "students">("global")
  const scopeRef = useRef(scope)
  useEffect(() => { scopeRef.current = scope }, [scope])
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set())
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({})
  const [likePending, setLikePending] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState<string | null>(null)
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
  const challenge = getWeeklyChallenge()
  const router = useRouter()
  const [searchInput, setSearchInput] = useState(searchQuery)
  useEffect(() => { setSearchInput(searchQuery) }, [searchQuery])

  // Refs untuk observer — biar observer gak perlu di-recreate tiap state change
  const loadingMoreRef = useRef(false)
  const cursorRef = useRef<string | null>(null)
  const hasMoreRef = useRef(true)
  const filterRef = useRef(filter)
  const searchQueryRef = useRef(searchQuery)
  useEffect(() => { loadingMoreRef.current = loadingMore }, [loadingMore])
  useEffect(() => { cursorRef.current = cursor }, [cursor])
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])
  useEffect(() => { filterRef.current = filter }, [filter])
  useEffect(() => { searchQueryRef.current = searchQuery }, [searchQuery])

  // Single source of truth untuk fetch data — dipanggil oleh init dan loadMore
  const fetchKarya = async (cursorVal: string | null, append: boolean, q?: string) => {
    const params = new URLSearchParams({ limit: "20" });
    if (cursorVal) params.set("cursor", cursorVal);
    if (filterRef.current !== "SEMUA") params.set("type", filterRef.current);
    if (isGuruViewer) params.set("scope", scopeRef.current);
    if (q) params.set("q", q);
    const res = await fetch(`/api/siswa/karya?${params}`);
    const data = await res.json();
    const items: KaryaItem[] = data.karya || [];
    if (append) {
      setKaryaList(prev => [...prev, ...items]);
    } else {
      setKaryaList(items);
      setLikedSet(new Set(items.filter(k => k.likedByCurrentUser).map(k => k.id)));
      setLikeCounts(Object.fromEntries(items.map(k => [k.id, k._count?.likes ?? k.likesCount ?? 0])));
    }
    setHasMore(!!data.nextCursor);
    setCursor(data.nextCursor);
  };

  // Single effect: fetch data saat filter/search/scope berubah (termasuk mount)
  useEffect(() => {
    setLoading(true);
    fetchKarya(null, false, searchQuery || undefined).finally(() => {
      setLoading(false);
    });
    // fetch user info + challenge count (side quest, ga blok loading)
    Promise.all([
      fetch("/api/user/me").then(r => r.ok ? r.json() : null),
      fetch(`/api/siswa/karya/count?type=${challenge.type}`).then(r => r.json()).catch(() => ({ count: 0 })),
    ]).then(([uData, chCount]) => {
      if (uData) {
        setCurrentUserId(uData.user?.id || uData.id);
        setIsGuruViewer(uData.user?.role === "GURU" || uData.role === "GURU" || false);
      }
      setChallengeCount(chCount.count || 0);
    });
  }, [filter, searchQuery, scope, isGuruViewer]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    if (loadingMoreRef.current || !cursorRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await fetchKarya(cursorRef.current, true, searchQueryRef.current || undefined);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  // Observer sekali (gak depend on loadMore/hasMore/loadingMore — pakai refs)
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      if (loadingMoreRef.current) return;
      if (!hasMoreRef.current) return;
      loadMore();
    }, { rootMargin: "300px" });
    const el = document.getElementById("feed-sentinel");
    if (el) io.observe(el);
    return () => io.disconnect();
  }, [filter, searchQuery, loading]); // loading = sentinel siap di-DOM

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

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    const v = searchInput.trim()
    router.push(v ? `${clearHref}?q=${encodeURIComponent(v)}` : clearHref)
  }

  const searchControl = (
    <form onSubmit={submitSearch} role="search" className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" aria-hidden />
      <input
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Cari karya..."
        aria-label="Cari karya"
        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-500 transition-all"
      />
    </form>
  )

  const filterPills = (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="tablist" aria-label="Filter jenis karya">
      {["SEMUA", "PUISI", "CERPEN", "ARTIKEL", "ANEKDOT", "PANTUN", "OPINI"].map(t => (
        <button key={t} onClick={() => setFilter(t)} role="tab" aria-selected={filter === t}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            filter === t ? "bg-violet-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          {t === "SEMUA" ? "Semua" : typeColors[t]?.label || t}
        </button>
      ))}
    </div>
  )

  const challengeCard = (
    <Link
      href={`${tulisHref}?type=${challenge.type}`}
      className="block mb-5 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-5 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 active:scale-[0.99] transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <Sparkles size={24} className="text-yellow-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
              Tantangan Minggu Ini
            </span>
          </div>
          <p className="text-lg font-extrabold leading-tight">{challenge.theme}</p>
          <p className="text-sm text-white/80 mt-1 leading-snug">{challenge.prompt}</p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 bg-yellow-400 text-yellow-950 text-xs font-extrabold px-3 py-1.5 rounded-full">
              <Trophy size={13} /> +{challenge.bonusCoins} koin
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              {challengeCount} karya masuk
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 bg-white text-violet-700 text-sm font-extrabold px-4 py-2 rounded-xl">
              <PenLine size={14} /> Ikut Tantangan
            </span>
          </div>
        </div>
      </div>
    </Link>
  )

  const aiBcCard = (
    <div className="mb-5 rounded-2xl border border-violet-100 dark:border-violet-500/20 bg-violet-50/60 dark:bg-violet-500/[0.07] p-4 flex flex-wrap items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0">
        <Sparkles size={18} />
      </div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-bold text-gray-900 dark:text-slate-100">Butuh ide?</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">
          Bingung mau menulis apa? AI BC bisa membantumu menemukan tema dan mengembangkan idemu.
        </p>
      </div>
      <Link href="/arena/ai" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors">
        Tanya AI BC
        <span aria-hidden>→</span>
      </Link>
    </div>
  )

  const stageEmpty = (
    <div className="text-center py-16">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center mb-4">
        <PenLine size={26} className="text-violet-500 dark:text-violet-300" />
      </div>
      <h3 className="text-base font-extrabold text-gray-900 dark:text-slate-100">Panggungmu masih kosong.</h3>
      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Tulis sesuatu yang ingin kamu bagikan kepada dunia.</p>
      <Link href={tulisHref} className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-all">
        <PenLine size={15} /> Buat Karya
      </Link>
    </div>
  )

  const cardList = (k: KaryaItem) => {
    const tc = typeColors[k.type] || typeColors.PUISI
    const likeCount = likeCounts[k.id] ?? k._count?.likes ?? k.likesCount ?? 0
    const isLiked = likedSet.has(k.id)
    const isDeleting = deletingId === k.id
    if (stage) {
      return (
        <article key={k.id} className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden hover:border-violet-200 dark:hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/[0.06] hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
            <Link href={`${profileBase}/${k.user.id}`} className="shrink-0">
              <UserAvatar
                size={32}
                avatar={k.user.avatar}
                frame={k.user.equippedFrame}
                initials={initials(nameOf(k.user))}
                gradient={INITIALS_COLORS[0]}
              />
            </Link>
            <div className="flex-1 min-w-0">
              <UserName
                name={nameOf(k.user)}
                href={`${profileBase}/${k.user.id}`}
                color={k.user.equippedNameColor}
                badge={k.user.equippedBadge}
                className="text-[13px] font-semibold text-gray-900 dark:text-slate-100 hover:text-violet-600 dark:hover:text-violet-300"
                badgeSize={14}
              />
              <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{k.user.profile?.school || ""}</p>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-slate-500 shrink-0">
              <Clock size={11} /> {waktuLalu(k.createdAt)}
            </span>
          </div>

          <Link href={`${detailBase}/${k.id}`} className="flex-1 block px-4 py-2">
            <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-[0.14em] uppercase ${tc.bg} ${tc.text} mb-2`}>
              {tc.label}
            </div>
            <h3 className="text-[15px] font-extrabold text-gray-900 dark:text-slate-100 mb-1.5 leading-snug line-clamp-2">{k.title}</h3>
            <p className="text-[13px] text-gray-500 dark:text-slate-400 line-clamp-3 leading-relaxed">{k.content?.slice(0, 250)}</p>
          </Link>

          <div className="flex items-center gap-3.5 px-4 py-3 border-t border-gray-50 dark:border-slate-800/80 mt-2">
            <button onClick={() => handleLike(k.id)} disabled={likePending[k.id]} aria-label={isLiked ? "Batal suka" : "Suka karya ini"}
              className={`flex items-center gap-1 text-[13px] font-medium transition-all min-h-[44px] ${isLiked ? "text-red-500" : "text-gray-400 hover:text-red-500 dark:text-slate-400"}`}>
              {isLiked ? <Heart size={15} fill="currentColor" /> : <Heart size={15} />}
              {likeCount}
            </button>
            <Link href={`${detailBase}/${k.id}`} className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-violet-500 transition-all dark:text-slate-400 dark:hover:text-violet-300 min-h-[44px]">
              <MessageCircle size={15} /> {k._count?.comments ?? 0}
            </Link>
            <ShareKaryaButton karyaId={k.id} title={k.title} className="text-gray-400 hover:text-violet-500 dark:text-slate-400 dark:hover:text-violet-300" />
            <span className="flex items-center gap-1 text-[13px] text-gray-400 ml-auto dark:text-slate-500">
              <Eye size={15} /> {k.viewsCount || 0}
            </span>
            {isOwner(k.user.id) && (
              <button onClick={() => handleDelete(k.id)} disabled={isDeleting} aria-label="Hapus karya"
                className="text-gray-300 hover:text-red-500 transition-all min-h-[44px] dark:text-slate-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 1 2 2 2v2" /></svg>
              </button>
            )}
          </div>
        </article>
      )
    }
    return (
      <div key={k.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-md transition-all">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-2">
          <Link href={`${profileBase}/${k.user.id}`} className="shrink-0">
            <UserAvatar
              size={36}
              avatar={k.user.avatar}
              frame={k.user.equippedFrame}
              initials={initials(nameOf(k.user))}
              gradient={INITIALS_COLORS[0]}
            />
          </Link>
          <div className="flex-1 min-w-0">
            <UserName
              name={nameOf(k.user)}
              href={`${profileBase}/${k.user.id}`}
              color={k.user.equippedNameColor}
              badge={k.user.equippedBadge}
              className="text-sm font-semibold text-gray-900 dark:text-slate-100 hover:text-violet-600 dark:hover:text-violet-300"
              badgeSize={15}
            />
            <p className="text-xs text-gray-400 dark:text-slate-500">{k.user.profile?.school || ""}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
            <Clock size={12} /> {waktuLalu(k.createdAt)}
          </div>
        </div>

        {/* Content */}
        <Link href={`${detailBase}/${k.id}`} className="block px-5 py-2">
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${tc.bg} ${tc.text} mb-2`}>
            <span>{tc.label}</span>
          </div>
          <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-1">{k.title}</h3>
          <p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-3 leading-relaxed">{k.content?.slice(0, 250)}</p>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-50 dark:border-slate-800">
          <button onClick={() => handleLike(k.id)} disabled={likePending[k.id]} aria-label={isLiked ? "Batal suka" : "Suka karya ini"} className={`flex items-center gap-1.5 text-sm font-medium transition-all min-h-[44px] ${isLiked ? "text-red-500" : "text-gray-400 hover:text-red-500 dark:text-slate-400"}`}>
            {isLiked ? <Heart size={16} fill="currentColor" /> : <Heart size={16} />}
            {likeCount}
          </button>
          <Link href={`${detailBase}/${k.id}`} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-500 transition-all dark:text-slate-400 dark:hover:text-violet-300 min-h-[44px]">
            <MessageCircle size={16} /> {k._count?.comments ?? 0}
          </Link>
          <ShareKaryaButton karyaId={k.id} title={k.title} className="text-gray-400 hover:text-violet-500 dark:text-slate-400 dark:hover:text-violet-300" />
          <span className="flex items-center gap-1.5 text-sm text-gray-400 ml-auto dark:text-slate-500">
            <Eye size={16} /> {k.viewsCount || 0}
          </span>
          {isOwner(k.user.id) && (
            <button onClick={() => handleDelete(k.id)} disabled={isDeleting} aria-label="Hapus karya" className="text-gray-300 hover:text-red-500 transition-all min-h-[44px] dark:text-slate-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 1 2 2 2v2" /></svg>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    stage ? (
      <div className="arena-page" id="jelajahi-karya" scroll-mt-24>
        {challengeCard}
        {aiBcCard}

        {/* Control bar — filter kiri, search kanan (desktop) */}
        <div className="mb-5">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Jelajahi Karya</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Temukan dan beri apresiasi karya murid dari seluruh Indonesia.</p>
            </div>
            <div className="hidden md:block w-72">{searchControl}</div>
          </div>
          {filterPills}
          <div className="mt-3 md:hidden">{searchControl}</div>
        </div>

        {/* Search context */}
        {searchQuery && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-violet-50 dark:bg-violet-500/10 rounded-xl border border-violet-200 dark:border-violet-500/20">
            <span className="text-sm text-violet-700 dark:text-violet-300">
              Hasil untuk: "<span className="font-bold">{searchQuery}</span>"
              {karyaList.length > 0 && <> &mdash; {karyaList.length} ditemukan</>}
            </span>
            <button onClick={() => router.push(clearHref)} className="ml-auto text-xs font-semibold text-violet-600 hover:text-violet-800 dark:text-violet-300">
              Hapus Filter
            </button>
          </div>
        )}

        {/* Scope — GLOBAL DISCOVERY (guru); murid pada stage tidak memakai scope */}
        {isGuruViewer && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            {([
              { v: "global", label: "Semua Indonesia" },
              { v: "school", label: "Sekolahku" },
              { v: "students", label: "Muridku" },
            ] as const).map(s => (
              <button key={s.v} onClick={() => setScope(s.v)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  scope === s.v ? "bg-violet-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Grid karya — 3 kolom ≥1280px, 2 kolom ≥768px, 1 kolom <768px */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-violet-500" /></div>
        ) : karyaList.length === 0 ? (
          stageEmpty
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {karyaList.map(cardList)}
            {hasMore && <div id="feed-sentinel" className="h-4 col-span-full" />}
            {loadingMore && <div className="flex justify-center py-4 col-span-full"><Loader2 size={24} className="animate-spin text-violet-400" /></div>}
          </div>
        )}
      </div>
    ) : (
      <div className="arena-page max-w-3xl mx-auto p-4">
        {/* Header — header eksternal (route kanonik) atau header internal */}
        {header}

        {challengeCard}

        {/* Search context */}
        {searchQuery && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-violet-50 dark:bg-violet-500/10 rounded-xl border border-violet-200 dark:border-violet-500/20">
            <span className="text-sm text-violet-700 dark:text-violet-300">
              Hasil untuk: "<span className="font-bold">{searchQuery}</span>"
              {karyaList.length > 0 && <> &mdash; {karyaList.length} ditemukan</>}
            </span>
            <button onClick={() => router.push(clearHref)} className="ml-auto text-xs font-semibold text-violet-600 hover:text-violet-800 dark:text-violet-300">
              Hapus Filter
            </button>
          </div>
        )}

        {/* Scope — GLOBAL DISCOVERY (guru): Semua Indonesia / Sekolahku / Muridku.
            Murid tetap melihat feed nasional seperti sebelumnya (tanpa nav scope). */}
        {isGuruViewer && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            {([
              { v: "global", label: "Semua Indonesia" },
              { v: "school", label: "Sekolahku" },
              { v: "students", label: "Muridku" },
            ] as const).map(s => (
              <button key={s.v} onClick={() => setScope(s.v)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  scope === s.v ? "bg-violet-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-hide">
          {["SEMUA", "PUISI", "CERPEN", "ARTIKEL", "ANEKDOT", "PANTUN", "OPINI"].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filter === t ? "bg-violet-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
          <div className="text-center py-16 text-gray-400 dark:text-slate-500">
            <FileText size={48} className="mx-auto mb-3 opacity-50" />
            {isGuruViewer && scope === "students" ? (
              <>
                <p>Belum ada karya dari muridmu.</p>
                <p className="text-sm mt-1">Ajak muridmu berkarya lewat kelasmu.</p>
                <Link href="/guru/kelasku" className="inline-block mt-3 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-all">
                  Ajak Muridmu Berkarya →
                </Link>
              </>
            ) : isGuruViewer && scope === "school" ? (
              <>
                <p>Belum ada karya dari sekolahmu.</p>
                <p className="text-sm mt-1">Karya murid sekolahmu akan muncul di sini.</p>
                <button onClick={() => setScope("global")} className="inline-block mt-3 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-all">
                  Jelajahi Semua Indonesia →
                </button>
              </>
            ) : (
              <p>Belum ada karya.</p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {karyaList.map(cardList)}
            {hasMore && <div id="feed-sentinel" className="h-4" />}
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
  )
}

/**
 * KaryaFeed — satu feed untuk dua shell:
 *   - /murid/karya  (kanonik): variant="stage" — Panggung Karya (grid showcase)
 *   - /arena/feed   (mirror): variant="compact" (default) — feed 1 kolom
 */
export default function KaryaFeed({
  header = null,
  variant = "compact",
  detailBase = "/murid/karya",
  profileBase = "/profile",
  tulisHref = "/murid/karya/tulis",
  clearHref = "/murid/karya",
}: KaryaFeedProps) {
  return (
    <Suspense fallback={
      <div className="arena-page max-w-3xl mx-auto p-4">
        <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-violet-500" /></div>
      </div>
    }>
      <FeedContent
        header={header === null ? (
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Jelajah Karya</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Temukan karya murid dari seluruh Indonesia</p>
            </div>
            <Link href={tulisHref} className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-all shadow-sm">
              <PenLine size={16} /> Tulis
            </Link>
          </div>
        ) : header}
        variant={variant}
        detailBase={detailBase}
        profileBase={profileBase}
        tulisHref={tulisHref}
        clearHref={clearHref}
      />
    </Suspense>
  )
}
