"use client"

import { useState, useEffect, useRef } from "react"
import {
  MessageCircle, Send, ChevronRight, Users, ArrowLeft,
  Search, Plus, Sparkles, Eye,
} from "lucide-react"

interface Group {
  id: string; name: string; accessCode: string | null
  memberCount: number; onlineCount: number
  lastMessage: { id: string; content: string; createdAt: string; user: { fullName: string } } | null
}
interface Message {
  id: string; content: string; userId: string; createdAt: string
  user: { id: string; fullName: string }
}

const INITIALS_COLORS = [
  "from-violet-500 to-purple-600",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-blue-600",
]

function initials(name: string) { return name?.charAt(0).toUpperCase() || "?" }

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

export function ChatClient({ userId, groups }: { userId: string; groups: Group[] }) {
  const [selected, setSelected] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<"semua" | "kelas">("semua")
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const pilihGrup = async (g: Group) => {
    setSelected(g)
    try {
      const res = await fetch(`/api/chat/${g.id}`)
      if (!res.ok) { setMessages([]); return }
      const data = await res.json()
      setMessages(data.messages || [])
    } catch { setMessages([]) }
  }

  const kirim = async () => {
    if (!input.trim() || !selected || loading) return
    setLoading(true)
    const text = input.trim()
    setInput("")
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      content: text,
      userId,
      createdAt: new Date().toISOString(),
      user: { id: userId, fullName: "" },
    }])
    try {
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: selected.id, content: text }),
      })
    } catch {}
    setLoading(false)
  }

  // === CHAT VIEW ===
  if (selected) {
    return (
      <div className="flex flex-col h-screen bg-[#F7F6FF]">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100 shrink-0">
          <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-95 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{selected.name}</p>
            <p className="text-[11px] text-gray-400">{selected.onlineCount} online &middot; {selected.memberCount} anggota</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <MessageCircle className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400 font-medium">Belum ada pesan</p>
              <p className="text-xs text-gray-300 mt-1">Mulai diskusi dengan kelasmu!</p>
            </div>
          )}
          {messages.map((m) => {
            const saya = m.userId === userId
            return (
              <div key={m.id} className={`flex gap-2.5 ${saya ? "flex-row-reverse" : ""}`}>
                {!saya && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
                    {initials(m.user?.fullName)}
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  saya
                    ? "bg-violet-600 text-white rounded-br-md"
                    : "bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm"
                }`}>
                  {!saya && <p className="text-[10px] font-semibold text-violet-600 mb-1">{m.user?.fullName}</p>}
                  {m.content}
                  <p className={`text-[9px] mt-1.5 ${saya ? "text-violet-300" : "text-gray-400"}`}>{waktuLalu(m.createdAt)}</p>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 bg-white border-t border-gray-100 shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); kirim() }} className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ketik pesan..."
              className="flex-1 px-4 py-3 rounded-xl bg-[#F7F6FF] text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 border-none"
            />
            <button type="submit" disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center disabled:opacity-50 hover:shadow-lg active:scale-95 transition-all">
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    )
  }

  // === LIST VIEW ===
  const displayGroups = tab === "kelas" ? groups : groups

  // Collect unique online member initials for the strip
  const onlineInitials = groups
    .filter(g => g.onlineCount > 0)
    .slice(0, 5)
    .map((_, i) => ({ initial: String.fromCharCode(65 + (i * 7) % 26), idx: i }))

  return (
    <div className="min-h-screen bg-[#F7F6FF]">
      {/* HEADER */}
      <div className="chat-header">
          <div className="mb-3">
            <h1 className="text-xl font-extrabold text-white">Chat</h1>
            <p className="text-sm text-white/65 mt-0.5">Ngobrol bareng teman sekelas</p>
          </div>
        {/* Search bar */}
        <div className="flex items-center gap-2 bg-white/15 rounded-xl px-4 py-2.5">
          <Search size={15} className="text-white/50 shrink-0" />
          <span className="text-sm text-white/60">Cari teman atau kelas...</span>
        </div>
      </div>

      {/* ONLINE STRIP */}
      {onlineInitials.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.8px] mb-2.5">Sedang online</p>
          <div className="chat-online-scroll">
            {onlineInitials.map((o, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
                <div className={`w-[46px] h-[46px] rounded-full bg-gradient-to-br ${INITIALS_COLORS[o.idx % 5]} flex items-center justify-center text-white text-sm font-extrabold relative border-[2.5px] border-violet-600`}>
                  {o.initial}
                  <div className="absolute bottom-0 right-0 w-[11px] h-[11px] bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <span className="text-[10px] font-semibold text-gray-500 max-w-[48px] truncate text-center">Teman</span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-[46px] h-[46px] rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                <Plus size={18} className="text-gray-400" />
              </div>
              <span className="text-[10px] font-semibold text-[#C4B5FD]">Undang</span>
            </div>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-2 px-4 pt-3 pb-1">
        <button onClick={() => setTab("semua")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
            tab === "semua" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-violet-600 border-[#EDE9FE]"
          }`}>
          Semua
        </button>
        <button onClick={() => setTab("kelas")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
            tab === "kelas" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-violet-600 border-[#EDE9FE]"
          }`}>
          Kelas
        </button>
      </div>

      {/* GROUP LIST */}
      <div className="px-4 pt-3 pb-6">
        {displayGroups.length === 0 && (
          <div className="text-center py-16">
            <MessageCircle className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Kamu belum bergabung ke kelas manapun</p>
            <p className="text-xs text-gray-400 mt-1">Minta kode kelas ke gurumu untuk bergabung</p>
          </div>
        )}

        {displayGroups.map((g, idx) => {
          const isPinned = idx === 0
          const lm = g.lastMessage
          return (
            <div key={g.id} className={`chat-group-card ${isPinned ? "pinned" : ""}`}>
              {/* Top row */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-[44px] h-[44px] rounded-[14px] bg-violet-50 flex items-center justify-center shrink-0">
                  <Users size={22} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#1F1B3A] truncate">{g.name}</p>
                    {isPinned && <Sparkles size={13} className="text-amber-400 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-gray-400">Kode: {g.accessCode}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </div>

              {/* Members row */}
              <div className="flex items-center gap-2 mb-3">
                <div className="chat-mstack">
                  {[0, 1, 2, 3].slice(0, Math.min(g.memberCount, 4)).map((i) => (
                    <div key={i} className={`chat-mav bg-gradient-to-br ${INITIALS_COLORS[i % 5]}`}>
                      {String.fromCharCode(65 + (i * 5 + idx) % 26)}
                    </div>
                  ))}
                  {g.memberCount > 4 && (
                    <div className="chat-mav bg-gray-500">+{g.memberCount - 4}</div>
                  )}
                </div>
                <span className="text-[11px] text-gray-400">{g.memberCount} anggota</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-[6px] h-[6px] bg-emerald-500 rounded-full" />
                  <span className="text-[11px] font-bold text-emerald-600">{g.onlineCount} online</span>
                </div>
              </div>

              {/* Last message */}
              {lm && (
                <div className="bg-[#F9F7FF] rounded-xl p-2.5 mb-3">
                  <p className="text-[11px] font-bold text-violet-700">{lm.user?.fullName}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{lm.content}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button className="flex-1 bg-[#F9F7FF] rounded-xl py-2.5 text-[11px] font-bold text-violet-700 hover:bg-violet-50 active:scale-95 transition-all">
                  <Eye size={13} className="inline mr-1" /> Lihat Karya Kelas
                </button>
                <button onClick={() => pilihGrup(g)}
                  className="flex-1 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl py-2.5 text-[11px] font-bold text-white hover:shadow-lg active:scale-95 transition-all">
                  <MessageCircle size={13} className="inline mr-1" /> Buka Chat
                </button>
              </div>
            </div>
          )
        })}

        {/* New group button */}
        {displayGroups.length > 0 && (
          <button className="w-full bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-[14px] py-3.5 mt-1 text-sm font-bold flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98] transition-all">
            <Plus size={18} /> Buat Grup Baru atau Gabung Kelas
          </button>
        )}
      </div>
    </div>
  )
}
