"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Trash2, CheckCheck, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { subscribeNotifications } from "@/lib/supabase/realtime";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data: any;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const userIdRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifikasi?unread=true");
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
      // Store userId from session for realtime sub
      if (data.userId) userIdRef.current = data.userId;
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Polling fallback every 30s
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    // Get userId from /api/user/me first
    fetch("/api/user/me").then(r => r.json()).then(d => {
      const uid = d?.user?.id || d?.id;
      if (uid) {
        userIdRef.current = uid;
        unsub = subscribeNotifications(uid, (notif) => {
          setNotifications(prev => [notif as Notification, ...prev]);
          setUnreadCount(c => c + 1);
        });
      }
    });
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = () => {
    setOpen(!open);
    if (!open && unreadCount > 0) {
      fetch("/api/notifikasi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/notifikasi?id=${id}`, { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleDeleteAll = async () => {
    await fetch("/api/notifikasi?all=true", { method: "DELETE" });
    setNotifications([]);
    setUnreadCount(0);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success": return "bg-green-100 text-green-600";
      case "warning": return "bg-amber-100 text-amber-600";
      case "error": return "bg-red-100 text-red-600";
      default: return "bg-blue-100 text-blue-600";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success": return "✓";
      case "warning": return "⚠";
      case "error": return "✕";
      default: return "ℹ";
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
        title="Notifikasi"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* The panel is 320px wide but the desktop sidebars holding this bell are
          only 256px, so anchoring it right-0 pushed 80px of it off the left of
          the screen and the list was unreadable. On md+ it therefore opens
          rightward into the content area; on mobile the bell sits at the right
          of the top bar, where opening leftward is correct. max-w keeps it
          inside the viewport at any width. */}
      {open && (
        <div className="absolute right-0 md:right-auto md:left-0 top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-900">Notifikasi</h3>
            {notifications.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Hapus Semua
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">Memuat...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Tidak ada notifikasi</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.isRead ? "bg-blue-50/50" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${getTypeColor(n.type)}`}>
                      {getTypeIcon(n.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-1 hover:bg-red-100 rounded transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-2 border-t border-slate-100">
              <Link
                href="/guru/notifikasi"
                className="flex items-center justify-center gap-1.5 text-xs font-medium py-1"
                style={{ color: '#059669' }}
                onClick={() => setOpen(false)}
              >
                Lihat Semua <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
