"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  MessageCircle, Send, ChevronLeft, Users, Search, Plus, X,
  PanelRight, List, ChevronRight, Hash,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

export interface GroupMemberPreview {
  id: string
  fullName: string
  avatar: string | null
  lastActiveAt: string | null
}

export interface Group {
  id: string
  name: string
  accessCode: string | null
  grade: string
  memberCount: number
  onlineCount: number
  lastMessage: {
    id: string
    content: string
    createdAt: string
    user: { fullName: string }
  } | null
  members: GroupMemberPreview[]
}

interface Message {
  id: string
  content: string
  userId: string
  createdAt: string
  user: { id: string; fullName: string; avatar?: string | null }
}

type ConvState = "idle" | "loading" | "ok" | "unavailable" | "error"

// ── Helpers ──────────────────────────────────────────────────────────────────

const ONLINE_WINDOW_MS = 5 * 60 * 1000
const GROUP_WINDOW_MS = 5 * 60 * 1000

const INITIALS_COLORS = [
  "from-violet-500 to-purple-600",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-blue-600",
]

function initials(name: string) {
  return name?.charAt(0).toUpperCase() || "?"
}

function waktuLalu(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "baru"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}j`
  if (h < 168) return `${Math.floor(h / 24)}h`
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
}

function jamLengkap(d: string) {
  const date = new Date(d)
  const now = new Date()
  const samaHari = date.toDateString() === now.toDateString()
  if (samaHari) return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

function isOnline(lastActiveAt: string | null) {
  if (!lastActiveAt) return false
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_WINDOW_MS
}

// APK (TWA) membedakan diri lewat cookie bc_apk (non-HttpOnly sengaja — lihat
// middleware.ts). Client memakai ini untuk menjaga link tetap dalam scope
// /arena/*: join kelas di APK memakai modal inline, di web menuju halaman
// /murid/gabung-kelas.
function useIsApkClient() {
  const [isApk, setIsApk] = useState(false)
  useEffect(() => {
    setIsApk(typeof document !== "undefined" && document.cookie.includes("bc_apk=1"))
  }, [])
  return isApk
}

function Avatar({
  src, name, size = "w-8 h-8", text = "text-xs", className = "",
}: {
  src?: string | null
  name: string
  size?: string
  text?: string
  className?: string
}) {
  if (src) {
    return <img src={src} alt="" className={`${size} rounded-full object-cover shrink-0 ${className}`} />
  }
  return (
    <div
      aria-hidden
      className={`${size} rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white ${text} font-bold shrink-0 ${className}`}
    >
      {initials(name)}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function ChatClient({ userId, groups }: { userId: string; groups: Group[] }) {
  const router = useRouter()
  const isApk = useIsApkClient()

  const [selected, setSelected] = useState<Group | null>(null)
  const [convState, setConvState] = useState<ConvState>("idle")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [listToggle, setListToggle] = useState(true)
  const [showContext, setShowContext] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [joinError, setJoinError] = useState("")
  const [joinLoading, setJoinLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const lastStampRef = useRef<string | null>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, convState])

  useEffect(() => {
    const real = messages.filter((m) => !m.id.startsWith("temp-"))
    lastStampRef.current = real.length > 0 ? real[real.length - 1].createdAt : null
  }, [messages])

  // Kelas hilang dari daftar (diarsipkan / membership dicabut) → kembali ke
  // daftar dan re-sync data server (kelas invalid otomatis tidak muncul lagi).
  const kembaliKeObrolan = () => {
    setSelected(null)
    setConvState("idle")
    setMessages([])
    setSendError("")
    router.refresh()
  }

  const pilihGrup = async (g: Group) => {
    setSelected(g)
    setMessages([])
    setSendError("")
    setConvState("loading")
    try {
      const res = await fetch(`/api/chat/${g.id}`)
      if (res.status === 404 || res.status === 403) { setConvState("unavailable"); return }
      if (!res.ok) { setConvState("error"); return }
      const data = await res.json()
      setMessages(data.messages || [])
      setConvState("ok")
    } catch {
      setConvState("error")
    }
  }

  // Polling pesan baru — memakai mekanisme existing: `after` (timestamp terbaru
  // yang sudah dimiliki), backoff 4s→15s, pause saat tab tersembunyi.
  useEffect(() => {
    if (!selected || convState === "unavailable") return
    let timer: ReturnType<typeof setTimeout> | null = null
    let delay = 4000
    let stopped = false

    const tick = async () => {
      if (stopped) return
      if (document.visibilityState !== "visible") { schedule(); return }
      try {
        const newest = lastStampRef.current
        const url = newest
          ? `/api/chat/${selected.id}?after=${encodeURIComponent(newest)}`
          : `/api/chat/${selected.id}`
        const res = await fetch(url)
        if (res.status === 404 || res.status === 403) {
          setConvState("unavailable")
          stopped = true
          return
        }
        if (res.ok) {
          const data = await res.json()
          const fresh: Message[] = data.messages || []
          if (fresh.length > 0) {
            setMessages((prev) => {
              const known = new Set(prev.map((m) => m.id))
              const added = fresh.filter((m) => !known.has(m.id))
              return added.length > 0 ? [...prev, ...added] : prev
            })
            delay = 4000
          } else {
            delay = Math.min(delay + 2000, 15000)
          }
        }
      } catch { /* offline — tick berikutnya mencoba lagi */ }
      schedule()
    }

    const schedule = () => {
      if (stopped) return
      timer = setTimeout(tick, delay)
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        delay = 4000
        if (timer) clearTimeout(timer)
        tick()
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    schedule()

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [selected, convState])

  const kirim = async () => {
    if (!input.trim() || !selected || sending) return
    setSending(true)
    setSendError("")
    const text = input.trim()
    setInput("")
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      content: text,
      userId,
      createdAt: new Date().toISOString(),
      user: { id: userId, fullName: "" },
    }])
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: selected.id, content: text }),
      })
      if (res.status === 404 || res.status === 403) {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        setInput(text)
        setConvState("unavailable")
        return
      }
      if (!res.ok) throw new Error("gagal")
      const data = await res.json()
      if (data?.message) {
        setMessages(prev => prev.map(m => (m.id === tempId ? data.message : m)))
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setInput(text)
      setSendError("Pesan belum terkirim. Coba lagi.")
    }
    setSending(false)
  }

  const filteredGroups = searchQuery
    ? groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : groups

  const bukaJoin = () => {
    setJoinCode("")
    setJoinError("")
    setShowJoinModal(true)
  }

  const classList = (
    <>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-gray-900 dark:text-slate-100">Obrolan</h2>
          {groups.length > 0 && (
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
              {groups.length} Kelas Aktif
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">Tempat ngobrol dengan teman sekelas.</p>

        {/* Search */}
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:ring-violet-500/20">
          <Search size={15} className="text-gray-400 dark:text-slate-500 shrink-0" aria-hidden />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari kelas atau teman..."
            aria-label="Cari kelas"
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} aria-label="Hapus pencarian" className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Daftar kelas */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-2 min-h-0" role="list" aria-label="Daftar kelas aktif">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center text-center px-6 py-14">
            <MessageCircle className="w-12 h-12 text-gray-200 dark:text-slate-700 mb-3" aria-hidden />
            <p className="text-sm font-bold text-gray-700 dark:text-slate-200">Belum ada ruang obrolan</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
              Gabung kelas untuk mulai ngobrol<br />dengan teman sekelasmu.
            </p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-gray-400 dark:text-slate-500">
            Tidak ada kelas yang cocok dengan pencarianmu.
          </p>
        ) : (
          filteredGroups.map((g) => {
            const aktif = selected?.id === g.id
            return (
              <button
                key={g.id}
                role="listitem"
                aria-current={aktif ? "true" : undefined}
                onClick={() => pilihGrup(g)}
                className={`w-full text-left rounded-xl border px-3 py-3 mb-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-500 ${
                  aktif
                    ? "bg-violet-50 border-violet-200 dark:bg-violet-500/15 dark:border-violet-500/30"
                    : "border-transparent hover:bg-gray-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={g.members?.[0]?.avatar}
                    name={g.name}
                    size="w-10 h-10"
                    text="text-sm"
                    className={aktif ? "ring-2 ring-violet-300 dark:ring-violet-500/40" : ""}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold truncate ${aktif ? "text-violet-900 dark:text-violet-200" : "text-gray-900 dark:text-slate-100"}`}>
                      {g.name}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">
                      {g.memberCount} anggota
                      {g.onlineCount > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-semibold"> · ● {g.onlineCount} online</span>}
                    </p>
                    {g.lastMessage && (
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500 truncate">
                        <span className="font-semibold text-gray-500 dark:text-slate-400">{g.lastMessage.user?.fullName}:</span> {g.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {g.lastMessage && (
                    <span className="shrink-0 text-[10px] text-gray-400 dark:text-slate-500">{waktuLalu(g.lastMessage.createdAt)}</span>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* CTA Gabung Kelas — APK: modal inline (tetap dalam scope /arena);
          web: halaman kanonik /murid/gabung-kelas. */}
      <div className="p-3 border-t border-gray-100 dark:border-slate-800">
        {isApk ? (
          <button
            onClick={bukaJoin}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md hover:brightness-105 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
          >
            <Plus className="w-4 h-4" aria-hidden /> Gabung Kelas
          </button>
        ) : (
          <Link
            href="/murid/gabung-kelas"
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
          >
            <Plus className="w-4 h-4" aria-hidden /> Gabung Kelas
          </Link>
        )}
      </div>
    </>
  )

  // ── Konteks panel (inline ≥xl, drawer <xl) ──
  const contextPanel = selected && (
    <div className="flex flex-col h-full">
      {/* KELAS */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">Kelas</h3>
        <div className="flex items-center gap-3">
          <Avatar src={selected.members?.[0]?.avatar} name={selected.name} size="w-11 h-11" text="text-base" />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-gray-900 dark:text-slate-100 truncate">{selected.name}</p>
            {selected.grade && <p className="text-[11px] text-gray-400 dark:text-slate-500">{selected.grade}</p>}
          </div>
        </div>
        <div className="mt-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-500 dark:text-slate-400"><Users className="w-4 h-4 text-gray-400 dark:text-slate-500" aria-hidden /> Anggota</span>
            <span className="font-bold text-gray-900 dark:text-slate-100">{selected.memberCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-500 dark:text-slate-400"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" aria-hidden /> Online</span>
            <span className="font-bold text-gray-900 dark:text-slate-100">{selected.onlineCount}</span>
          </div>
          {selected.accessCode && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-500 dark:text-slate-400"><Hash className="w-4 h-4 text-gray-400 dark:text-slate-500" aria-hidden /> Kode kelas</span>
              <span className="font-bold tracking-widest text-gray-900 dark:text-slate-100 uppercase">{selected.accessCode}</span>
            </div>
          )}
        </div>
      </div>

      {/* KARYA KELAS */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2.5">Karya Kelas</h3>
        <Link
          href="/arena/feed"
          className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50/60 px-3.5 py-3 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-500 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
        >
          Lihat Karya Kelas <ChevronRight className="w-4 h-4" aria-hidden />
        </Link>
      </div>

      {/* ANGGOTA — preview asli (bukan data palsu) */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">Anggota</h3>
        {selected.members.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-slate-500">Belum ada anggota lain.</p>
        ) : (
          <ul className="space-y-1">
            {selected.members.map((m) => (
              <li key={m.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                <Avatar src={m.avatar} name={m.fullName} size="w-8 h-8" text="text-xs" />
                <span className="flex-1 min-w-0 text-sm text-gray-700 dark:text-slate-200 truncate">{m.fullName}</span>
                {isOnline(m.lastActiveAt) && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden /> online
                  </span>
                )}
              </li>
            ))}
            {selected.memberCount > selected.members.length && (
              <li className="px-2 pt-1.5 text-[11px] text-gray-400 dark:text-slate-500">
                +{selected.memberCount - selected.members.length} anggota lainnya
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100dvh-7rem)] md:overflow-hidden">
      {/* ── MOBILE LIST SCREEN (<md) — tampil saat belum ada kelas dipilih ── */}
      {!selected && (
        <div className="md:hidden flex-1 min-h-[calc(100dvh-7rem)] flex flex-col bg-white dark:bg-slate-900">
          {classList}
        </div>
      )}

      {/* ── SIDEBAR KELAS (md+) — toggleable di 768–1023, selalu tampil ≥1024 ── */}
      <aside
        className={`hidden ${listToggle ? "md:flex" : "md:hidden"} lg:flex w-full md:w-72 lg:w-80 shrink-0 flex-col bg-white dark:bg-slate-900 border-b md:border-b-0 md:border-r border-gray-200 dark:border-slate-800`}
        aria-label="Daftar kelas"
      >
        {classList}
      </aside>

      {/* ── CONVERSATION ── */}
      <section
        className={`${selected ? "flex" : "hidden"} md:flex flex-1 min-w-0 flex-col bg-white dark:bg-slate-900`}
        aria-label="Percakapan kelas"
      >
        {!selected ? (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-violet-300 dark:text-violet-500/60" aria-hidden />
            </div>
            <p className="text-base font-extrabold text-gray-900 dark:text-slate-100">Mulai dari salah satu kelasmu</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">Semua percakapan kelasmu akan muncul di sini.</p>
          </div>
        ) : convState === "loading" ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" role="status" aria-label="Memuat obrolan" />
          </div>
        ) : convState === "unavailable" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-rose-300 dark:text-rose-500/60" aria-hidden />
            </div>
            <p className="text-base font-extrabold text-gray-900 dark:text-slate-100">Obrolan tidak tersedia</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">Kamu sudah tidak tergabung dalam kelas ini.</p>
            <button
              onClick={kembaliKeObrolan}
              className="mt-5 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            >
              Kembali ke Obrolan
            </button>
          </div>
        ) : convState === "error" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <p className="text-base font-extrabold text-gray-900 dark:text-slate-100">Gagal memuat obrolan</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">Periksa koneksimu dan coba lagi.</p>
            <button
              onClick={() => selected && pilihGrup(selected)}
              className="mt-5 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
            >
              Muat Ulang
            </button>
          </div>
        ) : (
          <>
            {/* Header percakapan */}
            <div className="flex items-center gap-2.5 px-3 md:px-4 py-3 border-b border-gray-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
              <button
                onClick={kembaliKeObrolan}
                className="md:hidden w-9 h-9 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-500"
                aria-label="Kembali ke daftar kelas"
              >
                <ChevronLeft className="w-5 h-5" aria-hidden />
              </button>
              <button
                onClick={() => setListToggle(v => !v)}
                aria-label={listToggle ? "Sembunyikan daftar kelas" : "Tampilkan daftar kelas"}
                aria-pressed={listToggle}
                className="hidden md:flex lg:hidden w-9 h-9 rounded-xl bg-gray-50 dark:bg-slate-800 items-center justify-center text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-500"
              >
                <List className="w-5 h-5" aria-hidden />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shrink-0" aria-hidden>
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 dark:text-slate-100 truncate">{selected.name}</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  {selected.memberCount} anggota{selected.onlineCount > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-semibold"> · ● {selected.onlineCount} online</span>}
                </p>
              </div>
              <button
                onClick={() => setShowContext(true)}
                className="xl:hidden w-9 h-9 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-500"
                aria-label="Buka panel info kelas"
              >
                <PanelRight className="w-5 h-5" aria-hidden />
              </button>
            </div>

            {/* Pesan */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 bg-gray-50/50 dark:bg-slate-950/40 min-h-0">
              {messages.length === 0 && convState === "ok" && (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <MessageCircle className="w-12 h-12 text-gray-200 dark:text-slate-700 mb-3" aria-hidden />
                  <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">Belum ada pesan</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Mulai diskusi dengan kelasmu!</p>
                </div>
              )}
              <div className="space-y-1.5 max-w-3xl mx-auto">
                {messages.map((m, i) => {
                  const saya = m.userId === userId
                  const prev = messages[i - 1]
                  const compact = prev && prev.userId === m.userId &&
                    new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS
                  return (
                    <div key={m.id} className={`flex gap-2.5 ${saya ? "flex-row-reverse" : ""} ${compact ? "mt-0.5" : "mt-2.5 first:mt-0"}`}>
                      {!saya && !compact && (
                        <Avatar src={m.user?.avatar} name={m.user?.fullName} size="w-8 h-8" text="text-xs" className="mt-1" />
                      )}
                      <div className={`${saya ? "max-w-[85%] md:max-w-[70%]" : "max-w-[85%] md:max-w-[70%]"}`}>
                        {!saya && !compact && (
                          <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 mb-1 px-1">{m.user?.fullName}</p>
                        )}
                        <div
                          title={jamLengkap(m.createdAt)}
                          className={`px-4 py-2.5 text-sm leading-relaxed break-words transition-colors group-hover:shadow-sm ${
                            saya
                              ? "bg-violet-600 text-white rounded-2xl rounded-br-md"
                              : "bg-white border border-gray-100 text-gray-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 rounded-2xl rounded-bl-md shadow-sm"
                          }`}
                        >
                          {m.content}
                          <p className={`text-[9px] mt-1.5 ${saya ? "text-violet-300" : "text-gray-400 dark:text-slate-500"}`}>{waktuLalu(m.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>
            </div>

            {/* Composer */}
            <div className="px-3 md:px-4 py-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shrink-0">
              {sendError && <p className="mb-2 text-xs text-rose-600 dark:text-rose-400 font-medium">{sendError}</p>}
              <form onSubmit={(e) => { e.preventDefault(); kirim() }} className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tulis pesan..."
                  aria-label="Tulis pesan"
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-500/40 border border-gray-100 dark:border-slate-700"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  aria-label="Kirim pesan"
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center disabled:opacity-40 hover:shadow-lg hover:brightness-105 active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-500"
                >
                  <Send className="w-5 h-5" aria-hidden />
                </button>
              </form>
            </div>
          </>
        )}
      </section>

      {/* ── CONTEXT PANEL (≥1280 inline) ── */}
      {selected && (
        <aside className="hidden xl:flex w-[300px] shrink-0 flex-col bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 overflow-hidden" aria-label="Info kelas">
          {contextPanel}
        </aside>
      )}

      {/* ── CONTEXT DRAWER (<1280) ── */}
      {showContext && selected && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Info kelas">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowContext(false)} aria-hidden />
          <div className="absolute inset-y-0 right-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
              <p className="text-sm font-extrabold text-gray-900 dark:text-slate-100">Info Kelas</p>
              <button
                onClick={() => setShowContext(false)}
                aria-label="Tutup panel info kelas"
                className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-500"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">{contextPanel}</div>
          </div>
        </div>
      )}

      {/* ── JOIN MODAL — dipakai APK agar tetap dalam scope /arena; web memakai
            halaman /murid/gabung-kelas. ── */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-label="Gabung Kelas">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">Gabung Kelas</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Masukkan kode akses dari gurumu</p>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Contoh: ABC123"
              aria-label="Kode akses kelas"
              className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-center font-bold tracking-widest uppercase focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-violet-500/20 mb-4"
              maxLength={8}
              autoFocus
            />
            {joinError && <p className="text-xs text-red-500 mb-3 text-center">{joinError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowJoinModal(false); setJoinCode(""); setJoinError("") }}
                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-bold text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-500"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (!joinCode.trim()) return
                  setJoinLoading(true)
                  setJoinError("")
                  try {
                    const res = await fetch("/api/group/join", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ accessCode: joinCode.trim() }),
                    })
                    const data = await res.json()
                    if (!res.ok) {
                      setJoinError(data.error || "Gagal bergabung")
                    } else {
                      setShowJoinModal(false)
                      setJoinCode("")
                      router.refresh()
                    }
                  } catch {
                    setJoinError("Gagal terhubung ke server")
                  } finally {
                    setJoinLoading(false)
                  }
                }}
                disabled={!joinCode.trim() || joinLoading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:shadow-lg disabled:opacity-50 transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-500"
              >
                {joinLoading ? "Memproses..." : "Gabung"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
