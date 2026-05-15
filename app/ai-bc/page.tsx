"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, BookOpen, X, MessageSquare, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SUGGESTIONS = [
  "Apa sinonim kata 'cerdas'?",
  "Apa antonim 'baik'?",
  "Buatkan contoh kalimat dengan kata 'apresiasi'",
  "Apa perbedaan 'di mana' dan 'dimana'?",
  "Jelaskan kata 'budaya'",
  "Kata baku dari 'kepinteran'?",
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: "Hai Cerdas! 👋\n\nAku **AI BC**, asisten belajarmu. Mau belajar Bahasa Indonesia apa hari ini?\n\nKamu bisa tanya tentang:\n- 📖 **Arti kata** & definisi\n- 🔄 **Sinonim & antonim**\n- ✍️ **Contoh kalimat**\n- 📝 **Kata baku & tidak baku**\n- 🤔 **Perbedaan kata**\n- Dan apa aja soal Bahasa Indonesia!" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "Kamu adalah AI BC, asisten belajar Bahasa Indonesia yang ramah dan membantu. Jawab pertanyaan tentang Bahasa Indonesia dengan jelas, berikan contoh, dan gunakan bahasa yang mudah dipahami. Jika ditanya di luar Bahasa Indonesia, arahkan kembali ke topik Bahasa Indonesia." },
            { role: "user", content: text },
          ],
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.answer || "Maaf, aku gak bisa jawab sekarang. Coba tanya yang lain ya! 😊" }]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Maaf, ada gangguan. Coba lagi ya! 🙏" }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">AI BC</h1>
            <p className="text-white/40 text-[10px]">Asisten Bahasa Indonesia</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMessages([{ role: "bot", text: messages[0].text }])}
            className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            title="Hapus chat">
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {/* Chat */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "bot" && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-white" />
              </div>
            )}
            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 ${
              msg.role === "user"
                ? "bg-emerald-500 text-white rounded-br-md"
                : "bg-white/5 border border-white/10 text-white/90 rounded-bl-md"
            }`}>
              {msg.role === "bot" ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{msg.text}</p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shrink-0 mt-1">
                <User size={16} className="text-white" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md p-4">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="pt-4">
            <p className="text-white/30 text-xs mb-3 text-center">Coba tanya:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => { setInput(s); }}
                  className="text-xs px-3 py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl hover:bg-white/10 hover:text-white transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10 bg-white/5">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pertanyaan Bahasa Indonesia..."
            className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-all"
          />
          <button onClick={handleSend} disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-white/20 text-center mt-2">Ditenagai oleh DeepSeek AI • Asisten Bahasa Indonesia</p>
      </div>
    </div>
  );
}
