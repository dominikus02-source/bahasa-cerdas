"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { IconChat } from "@/lib/icons";

interface ChatMsg {
  id: string; content: string; createdAt: string;
  user: { id: string; fullName: string; avatar?: string };
}

interface GroupInfo {
  id: string; name: string; memberCount: number;
}

function OnlineDot() {
  return <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />;
}

export default function ChatPanel({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval>>();
  const lastStampRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    fetch("/api/group/memberships")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const gs = (d?.memberships || []).map((m: any) => ({
          id: m.group.id,
          name: m.group.name,
          memberCount: m.group.members?.length || 0,
        }));
        setGroups(gs);
        if (gs.length > 0) setActiveGroup(gs[0].id);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!activeGroup) return;
    let alive = true;
    lastStampRef.current = null;

    fetch(`/api/chat/${activeGroup}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!alive) return;
        const list = d?.messages || [];
        setMessages(list);
        if (list.length > 0) lastStampRef.current = list[list.length - 1].createdAt;
      });

    // Ask only for what arrived since the newest message we hold. The previous
    // version re-fetched the whole list every 5s and replaced the array
    // wholesale, so React saw a new array on every tick even when nothing had
    // been said — which re-fired the scroll effect below and yanked the reader
    // back to the bottom every five seconds while they were reading upward.
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const since = lastStampRef.current;
      const url = since
        ? `/api/chat/${activeGroup}?after=${encodeURIComponent(since)}`
        : `/api/chat/${activeGroup}`;
      fetch(url)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!alive) return;
          const fresh = d?.messages || [];
          if (fresh.length === 0) return; // nothing new: leave state untouched
          setMessages(prev => {
            const known = new Set(prev.map((m: any) => m.id));
            const added = fresh.filter((m: any) => !known.has(m.id));
            if (added.length === 0) return prev;
            const next = since ? [...prev, ...added] : added;
            lastStampRef.current = next[next.length - 1].createdAt;
            return next;
          });
        });
    }, 5000);

    return () => {
      alive = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeGroup]);

  // Only follow the conversation when the reader is already at the bottom.
  // Scrolling unconditionally stole the view from anyone reading earlier
  // messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); return; }
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/user/online")
      .then(r => r.ok ? r.json() : null)
      .then(d => setOnlineUsers(d?.users || []));
    const iv = setInterval(() => {
      fetch("/api/user/online")
        .then(r => r.ok ? r.json() : null)
        .then(d => setOnlineUsers(d?.users || []));
    }, 15000);
    return () => clearInterval(iv);
  }, []);

  const sendMessage = async () => {
    if (!text.trim() || !activeGroup) return;
    setSendError("");
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: activeGroup, content: text.trim() }),
      });
      if (!res.ok) throw new Error("gagal");
      setText("");
      const data = await res.json();
      if (data?.message) {
        setMessages(prev => [...prev, data.message]);
        // Move the cursor past our own message so polling does not fetch it back.
        lastStampRef.current = data.message.createdAt;
      }
    } catch {
      // Previously a rejected send did nothing at all: no message, no warning.
      setSendError("Pesan belum terkirim. Coba lagi.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-20 bg-gray-50 rounded" />
        </div>
      </div>
    );
  }

  const activeName = groups.find(g => g.id === activeGroup)?.name || "Ruang Diskusi";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
        <div className="flex items-center gap-2">
          <IconChat size={16} className="text-violet-600" />
          <h3 className="font-bold text-sm text-gray-900">Ruang Diskusi</h3>
        </div>
        {groups.length > 1 && (
          <select
            value={activeGroup || ""}
            onChange={e => setActiveGroup(e.target.value)}
            className="mt-1.5 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-600 w-full"
          >
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        {/* Online Users */}
        <div className="px-4 py-2 border-b border-gray-50">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Online — {onlineUsers.length}
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {onlineUsers.length === 0 ? (
              <span className="text-[11px] text-gray-400">Tidak ada yang online</span>
            ) : (
              onlineUsers.slice(0, 8).map((u: any) => (
                <Link key={u.id} href={`/murid/profile`}
                  className="flex flex-col items-center gap-0.5 shrink-0 group"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                      {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : u.fullName?.charAt(0)}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <span className="text-[9px] text-gray-500 truncate max-w-12">{u.fullName?.split(" ")[0]}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-gray-400">Belum ada pesan. Mulai diskusi!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.user.id === userId;
              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                  {!isMe && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-[8px] font-bold shrink-0 mt-0.5">
                      {msg.user.avatar ? <img src={msg.user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : msg.user.fullName?.charAt(0)}
                    </div>
                  )}
                  <div className={`max-w-[80%] ${isMe ? "items-end" : ""}`}>
                    {!isMe && <p className="text-[10px] text-gray-400 mb-0.5">{msg.user.fullName}</p>}
                    <div className={`rounded-2xl px-3 py-2 text-sm break-words ${
                      isMe ? "bg-violet-600 text-white rounded-tr-md" : "bg-gray-50 text-gray-800 rounded-tl-md"
                    }`}>
                      {msg.content}
                    </div>
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      {new Date(msg.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100">
          {sendError && <p className="mb-2 text-xs text-rose-600 font-medium">{sendError}</p>}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tulis pesan..."
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-400 focus:bg-white transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim()}
              className="px-3 py-2 bg-violet-600 text-white rounded-xl disabled:opacity-40 hover:bg-violet-700 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
