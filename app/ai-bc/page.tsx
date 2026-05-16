"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Trash2, BookOpen, GraduationCap, Home, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BatikDecoration from "@/components/shared/BatikDecoration";

const SUGGESTIONS = [
  "Apa sinonim kata 'cerdas'?",
  "Apa antonim 'baik'?",
  "Buat contoh kalimat dengan kata 'apresiasi'",
  "Apa perbedaan 'di mana' dan 'dimana'?",
  "Jelaskan arti kata 'budaya'",
  "Kata baku dari 'kepinteran'?",
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: "Hai! 👋\n\nAku **AI BC**, teman belajar Bahasa Indonesia kamu. Mau nanya apa nih?\n\nKamu bisa tanya tentang:\n- 📖 **Arti kata** & definisi\n- 🔄 **Sinonim & antonim**\n- ✍️ **Contoh kalimat**\n- 📝 **Kata baku & tidak baku**\n- 🤔 **Perbedaan kata**\n- Dan apa aja soal Bahasa Indonesia!" },
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
            { role: "system", content: "Kamu adalah AI BC, asisten belajar Bahasa Indonesia yang ramah dan membantu." },
            { role: "user", content: text },
          ],
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.answer || "Maaf, aku belum bisa jawab. Coba tanya yang lain ya! 😊" }]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Maaf, ada gangguan. Coba lagi ya! 🙏" }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex flex-col">
      <BatikDecoration />

      {/* Header */}
      <header className="relative z-10 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">AI BC</h1>
              <p className="text-red-100 text-xs">Asisten Bahasa Indonesia</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a href="/" className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors" title="Beranda">
              <Home size={18} />
            </a>
            <button onClick={() => { if (confirm("Hapus semua chat?")) setMessages([{ role: "bot", text: messages[0].text }]); }}
              className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors" title="Hapus chat">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-3 flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
          <BookOpen size={16} className="text-red-200 shrink-0" />
          <p className="text-sm text-red-100">Tanya apa aja tentang Bahasa Indonesia — arti kata, sinonim, antonim, contoh kalimat, dll!</p>
        </div>
      </header>

      {/* Chat */}
      <div ref={chatRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-4 max-w-4xl mx-auto w-full space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "bot" && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                <Bot size={18} className="text-white" />
              </div>
            )}
            <div className={`max-w-[90%] md:max-w-[80%] rounded-2xl p-4 ${
              msg.role === "user"
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white rounded-br-md shadow-md"
                : "bg-white border border-red-100 text-slate-700 rounded-bl-md shadow-sm"
            }`}>
              {msg.role === "bot" ? (
                <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-a:text-red-600 prose-strong:text-slate-800 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{msg.text}</p>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                <User size={18} className="text-white" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shrink-0 shadow-md">
              <Bot size={18} className="text-white" />
            </div>
            <div className="bg-white border border-red-100 rounded-2xl rounded-bl-md p-4 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2.5 h-2.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2.5 h-2.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="pt-2">
            <p className="text-xs text-slate-400 mb-3 text-center">Coba tanya:</p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-xs px-3 py-2 bg-white border border-red-100 text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm">
                  {s}
                </button>
              ))}
            </div>
            <div className="text-center">
              <a href="https://kbbi.web.id/" target="_blank"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-600 transition-colors">
                <ExternalLink size={12} /> Cari di KBBI Online
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="relative z-10 border-t border-red-100 bg-white px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pertanyaan Bahasa Indonesia..."
            className="flex-1 rounded-2xl border-2 border-red-100 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all bg-white shadow-sm"
          />
          <button onClick={handleSend} disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-slate-300 text-center mt-2">Ditenagai oleh Google Gemini AI • Asisten Bahasa Indonesia</p>
      </div>
    </div>
  );
}
