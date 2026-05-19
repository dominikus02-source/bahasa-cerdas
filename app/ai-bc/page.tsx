"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Trash2, BookOpen, GraduationCap, Home, Copy, Check, RefreshCw, FileText, School, Lightbulb, Users, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BatikDecoration from "@/components/shared/BatikDecoration";
import PageFooter from "@/components/public/PageFooter";

type Mode = "murid" | "guru";

const CATEGORIES = [
  { label: "Arti Kata", icon: "📖", prompt: "Jelaskan arti kata " },
  { label: "Sinonim", icon: "🔄", prompt: "Apa sinonim dari kata " },
  { label: "Tata Bahasa", icon: "📝", prompt: "Jelaskan aturan tata bahasa: " },
  { label: "Sastra", icon: "📚", prompt: "Jelaskan tentang " },
  { label: "PUEBI", icon: "📋", prompt: "Bagaimana aturan PUEBI tentang " },
  { label: "UKBI", icon: "🎯", prompt: "Bantu saya belajar UKBI: " },
];

const MURID_SUGGESTIONS = [
  "Apa sinonim kata 'cerdas'?",
  "Buat contoh kalimat dengan kata 'apresiasi'",
  "Apa perbedaan 'di mana' dan 'dimana'?",
  "Jelaskan seperti aku kelas 4 SD: apa itu kata depan?",
  "Apa antonim 'rajin'? Berikan contoh kalimat",
  "Kata baku dari 'kepinteran'?",
  "Buatkan soal pilihan ganda tentang kata baku untuk kelas 5 SD",
];

const GURU_SUGGESTIONS = [
  "Buatkan RPP 1 lembar materi puisi kelas 10 Kurikulum Merdeka",
  "Generate 5 soal HOTS tentang teks argumentasi",
  "Jelaskan perbedaan pendekatan saintifik dan discovery learning",
  "Buat modul ajar materi pantun untuk kelas 7",
  "Koreksi tata bahasa paragraf ini: [tempel teks]",
  "Bagaimana cara mengajar materi imbuhan yang menyenangkan?",
  "Buat kisi-kisi soal UKBI untuk guru SMA",
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("murid");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  const suggestions = mode === "guru" ? GURU_SUGGESTIONS : MURID_SUGGESTIONS;

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const greeting = "Halo! 👋\n\nAku AI Tutor BahasaCerdas.\n\n**Kamu mau tanya apa?**\n\nAku bisa bantu:\n- 📖 Arti kata & KBBI\n- ✍️ Tata bahasa & PUEBI\n- 📝 Sinonim & antonim\n- 📚 Sastra Indonesia\n- 🎯 Persiapan UKBI";
      setMessages([{ role: "bot", text: greeting }]);
    }
  }, [mode]);

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
          messages: [{ role: "user", content: text }],
          mode,
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

  const handleCopy = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text.replace(/<[^>]*>/g, ""));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerate = async (index: number) => {
    const userMsg = messages.slice(0, index).filter(m => m.role === "user").pop();
    if (!userMsg) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: userMsg.text }], mode }),
      });
      const data = await res.json();
      const newMessages = [...messages];
      newMessages[index] = { role: "bot", text: data.answer || "Maaf, coba lagi ya 😊" };
      setMessages(newMessages);
    } catch {}
    setLoading(false);
  };

  const handleCategoryClick = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex flex-col">
      <BatikDecoration />

      {/* Header */}
      <header className="relative z-10 bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
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
              <button onClick={() => { if (confirm("Hapus semua chat?")) setMessages([]); }}
                className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors" title="Hapus chat">
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-1 bg-white/10 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setMode("murid")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "murid" ? "bg-white text-red-700 shadow-sm" : "text-red-100 hover:bg-white/10"
              }`}
            >
              <School size={16} /> Murid
            </button>
            <button
              onClick={() => setMode("guru")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "guru" ? "bg-white text-red-700 shadow-sm" : "text-red-100 hover:bg-white/10"
              }`}
            >
              <Users size={16} /> Guru
            </button>
          </div>
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
            <div className={`group relative max-w-[90%] md:max-w-[80%] rounded-2xl p-4 ${
              msg.role === "user"
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white rounded-br-md shadow-md"
                : "bg-white border border-red-100 text-slate-700 rounded-bl-md shadow-sm"
            }`}>
              {msg.role === "bot" ? (
                <>
                  <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-a:text-red-600 prose-strong:text-slate-800 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-1 mt-3 pt-2 border-t border-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleCopy(msg.text, i)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                      {copiedId === i ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      {copiedId === i ? "Tersalin" : "Salin"}
                    </button>
                    <button onClick={() => handleRegenerate(i)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                      <RefreshCw size={12} /> Regenerate
                    </button>
                    <button onClick={() => setInput("Buat soal dari topik ini")}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                      <FileText size={12} /> Buat Soal
                    </button>
                  </div>
                </>
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
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2.5 h-2.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2.5 h-2.5 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-slate-400">AI BC sedang menulis...</span>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={28} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-700 mb-2">Ada yang bisa dibantu?</h2>
            <p className="text-sm text-slate-400 mb-4">Tanya apa aja tentang Bahasa Indonesia!</p>
          </div>
        )}

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="pt-2">
            <p className="text-xs text-slate-400 mb-3 text-center">Coba tanya:</p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {suggestions.slice(0, 5).map((s) => (
                <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="text-xs px-3 py-2 bg-white border border-red-100 text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm">
                  {s}
                </button>
              ))}
            </div>
            {suggestions.length > 5 && (
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {suggestions.slice(5).map((s) => (
                  <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="text-xs px-3 py-2 bg-white border border-red-100 text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="relative z-10 border-t border-red-100 bg-white px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto">
          {/* Quick categories */}
          <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => setShowCategories(!showCategories)}
              className="flex items-center gap-1 shrink-0 text-[11px] px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium">
              <Lightbulb size={12} /> Kategori
              {showCategories ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {!showCategories && CATEGORIES.slice(0, 4).map((cat) => (
              <button key={cat.label} onClick={() => handleCategoryClick(cat.prompt)}
                className="flex items-center gap-1 shrink-0 text-[11px] px-2.5 py-1.5 rounded-lg bg-gray-50 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                <span>{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>
          {showCategories && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CATEGORIES.map((cat) => (
                <button key={cat.label} onClick={() => { handleCategoryClick(cat.prompt); setShowCategories(false); }}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium">
                  <span>{cat.icon}</span> {cat.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === "guru" ? "Contoh: Buatkan RPP materi puisi kelas 10..." : "Contoh: Apa arti kata 'budaya'?"}
              className="flex-1 rounded-2xl border-2 border-red-100 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all bg-white shadow-sm"
            />
            <button onClick={handleSend} disabled={!input.trim() || loading}
              className="w-12 h-12 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-300 text-center mt-2">Ditenagai oleh Google Gemini AI • Asisten Bahasa Indonesia</p>
      </div>
      <PageFooter />
    </div>
  );
}
