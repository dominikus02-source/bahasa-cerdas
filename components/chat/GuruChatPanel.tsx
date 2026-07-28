"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Smile, Sticker, ChevronDown } from "lucide-react";

interface Group { id: string; name: string; grade: string; _count?: { members: number }; members?: { user: { id: string; fullName: string; avatar?: string } }[]; }
interface Message { id: string; content: string; createdAt: string; user: { id: string; fullName: string; avatar?: string }; }
interface OnlineUser { id: string; fullName: string; avatar?: string; }

const EMOJI_LIST = ["😀","😃","😄","😁","😅","😂","🤣","😊","😇","🙂","😉","😌","😍","🥰","😘","😗","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥴","😵","🤯","🤠","🥳","🥺","😢","😭","😤","😠","😡","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","🤖","👍","👎","👊","✊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✌️","🤞","🤟","🤘","👌","💪","🦵","🦶","👀","👅","👄","💋","❤️","🧡","💛","💚","💙","💜","🖤","💕","💞","💗","💖","💘","💝","🌟","⭐","🔥","💯","✨","🎉","🎊","🎈","🎁","🏆","🥇","🥈","🥈","👑","💎","✅","❌","💔","💤","💥","💫","💦","💨","🕐","🕑","🕒","🕓","🕔","🕕","🕖","🕗","🕘","🕙","🕚","🕛","🌞","🌝","🌚","🌛","🌜","☀️","🌤️","⛅","🌥️","☁️","🌦️","🌧️","⛈️","🌩️","🌨️","❄️","☃️","⛄","🌟","🌠","🌊","🌈","☂️","🌂","💧","💧","🔥","🌲","🌳","🌴","🌵","🌾","🌿","☘️","🍀","🍁","🍂","🍃","🍇","🍈","🍉","🍊","🍋","🍌","🍍","🥭","🍎","🍏","🍐","🍑","🍒","🍓","🫐","🥝","🍅","🫒","🥥","🥑","🍆","🥔","🥕","🌽","🌶️","🫑","🥒","🥬","🥦","🧄","🧅","🍄","🥜","🌰","🍞","🥐","🥖","🫓","🧀","🥚","🍳","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🫓","🥪","🥙","🧆","🌮","🌯","🥗","🥘","🫕","🥫","🍝","🍜","🍲","🍛","🍣","🍱","🍤","🥟","🦪","🍦","🍧","🍨","🍩","🍪","🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","🍼","🥛","☕","🫖","🍵","🍶","🍾","🍷","🍸","🍹","🍺","🍻","🥂","🥃","🥤","🧋","🧃","🧊","🥢","🍽️","🍴","🥄"];

const STICKERS: { label: string; text: string }[] = [
  { label: "⭐ Hebat!", text: "⭐ Hebat sekali! Pertahankan! 💪" },
  { label: "🎉 Selamat!", text: "🎉 Selamat! Kamu keren! 🎊" },
  { label: "🔥 Mantap", text: "🔥 Mantap jiwa! Lanjutkan! 💯" },
  { label: "👏 Bagus", text: "👏 Bagus sekali! 👍" },
  { label: "💪 Semangat", text: "💪 Semangat terus! Kamu pasti bisa! ⭐" },
  { label: "🌟 Kreatif", text: "🌟 Karya yang sangat kreatif! 🎨" },
  { label: "📚 Rajin", text: "📚 Rajin banget belajarnya! 🏆" },
  { label: "😍 Keren", text: "😍 Keren abis! 🎯" },
];

export default function GuruChatPanel({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const messagesEnd = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch groups (classes yang diajar guru)
  useEffect(() => {
    fetch("/api/group").then(r => r.ok ? r.json() : null).then(data => {
      const gs = data?.groups || data || [];
      setGroups(gs);
      if (gs.length > 0) {
        setActiveGroup(gs[0].id);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Poll messages
  useEffect(() => {
    if (!activeGroup) return;
    const fetchMessages = () => {
      fetch(`/api/chat/${activeGroup}?limit=50`).then(r => r.ok ? r.json() : null).then(data => setMessages(data?.messages || []));
    };
    fetchMessages();
    // Hanya menarik pesan saat panel benar-benar dilihat. Sebelumnya berjalan
    // terus tiap 5 detik walau tab ditinggalkan, dan tiap panggilan memvalidasi
    // sesi ke server Auth Supabase.
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchMessages();
    }, 8000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchMessages();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activeGroup]);

  // Poll online users
  useEffect(() => {
    const fetchOnline = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/user/online").then(r => r.ok ? r.json() : null).then(data => setOnlineUsers(data?.users || data || []));
    };
    fetchOnline();
    // Daftar "sedang online" tidak perlu setiap 15 detik.
    const interval = setInterval(fetchOnline, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || !activeGroup || sending) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: activeGroup, content }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        // Keep the text so the guru can retry without retyping.
        setSendError(d.error || "Pesan belum terkirim. Silakan coba lagi.");
        return;
      }
      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      setText("");
      setShowEmoji(false);
      setShowStickers(false);
    } catch {
      setSendError("Pesan belum terkirim. Silakan coba lagi.");
    } finally {
      setSending(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const insertSticker = (stickerText: string) => {
    setText(stickerText);
    setShowStickers(false);
    setTimeout(() => sendMessage(), 100);
  };

  const activeGroupData = groups.find(g => g.id === activeGroup);
  const activeMemberIds = activeGroupData?.members?.map(m => m.user.id) || [];
  const classOnlineUsers = onlineUsers.filter(u => activeMemberIds.includes(u.id));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
          <h3 className="text-sm font-bold text-white">Pesan Kelas</h3>
        </div>
      </div>

      {/* Group Selector */}
      <div className="px-3 pt-3 relative">
        <button onClick={() => setGroupOpen(!groupOpen)} className="flex items-center justify-between w-full px-3 py-2 bg-emerald-50 rounded-xl text-sm font-semibold text-gray-700 hover:bg-emerald-100 transition-colors">
          <span>{activeGroupData?.name || "Pilih kelas..."}</span>
          <ChevronDown size={14} className={`transition-transform ${groupOpen ? "rotate-180" : ""}`} />
        </button>
        {groupOpen && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
            {groups.map(g => (
              <button key={g.id} onClick={() => { setActiveGroup(g.id); setGroupOpen(false); setShowEmoji(false); setShowStickers(false); }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-emerald-50 transition-colors ${
                  activeGroup === g.id ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-700"
                }`}
              >
                <span>{g.name}</span>
                <span className="text-[10px] text-gray-400 ml-2">{g.grade} · {g._count?.members || g.members?.length || 0} murid</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Online Users */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <span className="text-[10px] text-emerald-500 font-semibold shrink-0">
            {classOnlineUsers.length > 0
              ? `${classOnlineUsers.length} online`
              : "Tidak ada yg online"}
          </span>
          {classOnlineUsers.slice(0, 6).map(u => (
            <div key={u.id} className="relative shrink-0">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-[8px] font-bold">
                {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : u.fullName.charAt(0)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-white" />
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto px-3 py-2 space-y-2">
        {!activeGroup ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">Pilih kelas untuk mulai chat</div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">Belum ada pesan</div>
        ) : (
          messages.map(m => {
            const isMe = m.user.id === userId;
            return (
              <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0 ${
                  isMe ? "bg-emerald-500" : "bg-gradient-to-br from-emerald-300 to-green-400"
                }`}>
                  {m.user.avatar ? <img src={m.user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : m.user.fullName.charAt(0)}
                </div>
                <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  isMe ? "bg-emerald-600 text-white rounded-tr-sm" : "bg-gray-100 text-gray-700 rounded-tl-sm"
                }`}>
                  {!isMe && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{m.user.fullName}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={`text-[9px] mt-1 ${isMe ? "text-emerald-200" : "text-gray-400"}`}>
                    {new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="px-3 pb-1">
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-2 max-h-36 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {EMOJI_LIST.map(e => (
                <button key={e} onClick={() => insertEmoji(e)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded-lg text-lg transition-colors">
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sticker Picker */}
      {showStickers && (
        <div className="px-3 pb-1">
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-2">
            <div className="grid grid-cols-4 gap-1.5">
              {STICKERS.map(s => (
                <button key={s.label} onClick={() => insertSticker(s.text)}
                  className="px-2 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-center leading-tight"
                >
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input.
          Right padding keeps the send button clear of the floating AI button,
          which the dashboard layout fixes to the bottom-right at z-50 and which
          otherwise sits directly on top of it. */}
      <div className="p-3 pr-20 border-t border-gray-50">
        {sendError && (
          <p className="text-[11px] text-red-500 font-medium mb-2 px-1">{sendError}</p>
        )}
        <div className="flex gap-2 items-end">
          <div className="flex gap-0.5">
            <button onClick={() => { setShowEmoji(!showEmoji); setShowStickers(false); }}
              className={`p-2 rounded-lg transition-colors ${showEmoji ? "bg-emerald-100 text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Smile size={18} />
            </button>
            <button onClick={() => { setShowStickers(!showStickers); setShowEmoji(false); }}
              className={`p-2 rounded-lg transition-colors ${showStickers ? "bg-emerald-100 text-emerald-600" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Sticker size={18} />
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={text} onChange={e => setText(e.target.value)}
            placeholder="Ketik pesan..."
            rows={1}
            className="flex-1 px-3 py-2 bg-emerald-50 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <button onClick={sendMessage} disabled={!text.trim() || !activeGroup || sending}
            aria-label="Kirim pesan"
            className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-all"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
