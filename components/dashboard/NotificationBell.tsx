"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { subscribeNotifications } from "@/lib/supabase/realtime";
import { NotificationCard, type NotifikasiItem } from "@/components/notifikasi/NotificationCard";

interface Notification extends NotifikasiItem {
  data: any;
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

    // Cadangan saja — notifikasi sungguhan datang lewat langganan realtime di
    // bawah. Dulu 30 detik: komponen ini terpasang di layout murid dan mobile
    // nav, jadi SETIAP murid memanggil /api/notifikasi 120x/jam, dan tiap
    // panggilan itu memvalidasi sesi ke server Auth Supabase. Dengan ~200 murid
    // aktif itu saja sudah ~24.000 panggilan auth per jam — penyebab utama
    // limit auth kena dan murid tidak bisa login.
    const interval = setInterval(() => {
      // Tab di latar belakang tidak perlu disegarkan; saat murid kembali,
      // listener visibilitas di bawah yang menyegarkan sekali.
      if (document.visibilityState !== "visible") return;
      fetchNotifications();
    }, 180000);

    const onVisible = () => {
      if (document.visibilityState === "visible") fetchNotifications();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    // userId diambil dari respons /api/notifikasi yang memang sudah dipanggil di
    // atas — sebelumnya ada fetch("/api/user/me") terpisah hanya untuk ini,
    // yaitu satu panggilan API (dan satu validasi auth) ekstra per murid.
    const tunggu = setInterval(() => {
      const uid = userIdRef.current;
      if (!uid || cancelled) return;
      clearInterval(tunggu);
      unsub = subscribeNotifications(uid, (notif) => {
        setNotifications(prev => [notif as Notification, ...prev]);
        setUnreadCount(c => c + 1);
      });
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(tunggu);
      unsub?.();
    };
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors dark:hover:bg-slate-800"
        title="Notifikasi"
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
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
        <div className="absolute right-0 md:right-auto md:left-0 top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between dark:border-slate-800">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Notifikasi</h3>
            {notifications.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-xs text-red-500 hover:text-red-700 font-medium dark:text-red-400 dark:hover:text-red-300"
              >
                Hapus Semua
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">Memuat...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 dark:text-slate-600" />
                <p className="text-sm text-slate-400 dark:text-slate-500">Tidak ada notifikasi</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto p-2 space-y-1.5">
                {notifications.map((n) => (
                  <NotificationCard key={n.id} n={n} dense onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-2 border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/arena/notifikasi"
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
