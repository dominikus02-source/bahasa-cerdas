"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Send, Sparkles, BookOpen, MessageSquare, PenTool, Globe, GraduationCap } from "lucide-react"

const quickActions = [
  { label: "Arti kata", icon: <BookOpen className="w-4 h-4" />, prompt: "Apa arti kata..." },
  { label: "Tata bahasa", icon: <PenTool className="w-4 h-4" />, prompt: "Perbaiki kalimat ini..." },
  { label: "Sinonim", icon: <MessageSquare className="w-4 h-4" />, prompt: "Apa sinonim dari..." },
  { label: "UKBI", icon: <GraduationCap className="w-4 h-4" />, prompt: "Bantu aku belajar UKBI..." },
]

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function ArenaAIPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Halo! Aku AI Cerdik, asisten AI Bahasa Indonesia kamu. Aku bisa bantu jelasin materi, perbaiki tulisan, atau latihan UKBI. Ada yang mau ditanyakan?" }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg = text.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: "assistant", content: data.message || data.reply || "Maaf, aku belum bisa jawab itu." }])
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Maaf, ada gangguan. Coba lagi ya!" }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md relative">
            <Bot className="w-6 h-6" />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-base">AI Cerdik</p>
            <p className="text-xs text-gray-400">Asisten AI • Online</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user" ? "bg-violet-600 text-white rounded-br-md" : "bg-gray-100 text-gray-800 rounded-bl-md"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {messages.length === 1 && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 font-medium mb-2">Coba tanya AI Cerdik:</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q.prompt)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:border-violet-200 hover:text-violet-600 hover:shadow-sm transition-all active:scale-95"
                >
                  {q.icon}
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya AI Cerdik..."
            className="flex-1 px-4 py-3 rounded-xl bg-gray-100 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center disabled:opacity-50 hover:bg-violet-700 transition-all active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
