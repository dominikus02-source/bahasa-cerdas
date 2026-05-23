"use client"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, Send, ChevronRight, Users, ArrowLeft } from "lucide-react"

interface Group { id: string; name: string; accessCode: string | null }
interface Message { id: string; content: string; userId: string; createdAt: string; user: { id: string; fullName: string } }

export function ChatClient({ userId, groups }: { userId: string; groups: Group[] }) {
  const [selected, setSelected] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const pilihGrup = async (g: Group) => {
    setSelected(g)
    try {
      const res = await fetch(`/api/chat/${g.id}`)
      if (!res.ok) { setMessages([]); return }
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {
      setMessages([])
    }
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

  if (!selected) {
    return (
      <div className="px-4 py-5 arena-page">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Chat</h1>
          <p className="text-base text-gray-500 mt-1">Ngobrol bareng teman sekelas</p>
        </div>
        <div className="space-y-3">
          {groups.length === 0 && (
            <div className="text-center py-16">
              <MessageCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">Kamu belum bergabung ke kelas manapun</p>
            </div>
          )}
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => pilihGrup(g)}
              className="w-full flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                <Users className="w-7 h-7" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-gray-900 text-base">{g.name}</p>
                  <p className="text-sm text-gray-500">Kode: {g.accessCode}</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-300" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] arena-page">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 bg-white shrink-0">
        <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">{selected.name}</p>
          <p className="text-[10px] text-gray-400">Kelas diskusi</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => {
          const saya = m.userId === userId
          return (
            <div key={m.id} className={`flex gap-2.5 ${saya ? "flex-row-reverse" : ""}`}>
              {!saya && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
                  {m.user?.fullName?.charAt(0) || "?"}
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${saya ? "bg-violet-600 text-white rounded-br-md" : "bg-gray-100 text-gray-800 rounded-bl-md"}`}>
                {!saya && <p className="text-[10px] font-semibold text-violet-600 mb-1">{m.user?.fullName}</p>}
                {m.content}
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); kirim() }} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik pesan..."
            className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <button type="submit" disabled={!input.trim() || loading} className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center disabled:opacity-50 hover:bg-violet-700 transition-all active:scale-95">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
