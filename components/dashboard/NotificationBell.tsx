"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Bell, ExternalLink } from "lucide-react";
import Link from "next/link";
import { subscribeNotifications } from "@/lib/supabase/realtime";
import { NotificationCard, type NotifikasiItem } from "@/components/notifikasi/NotificationCard";
import { bacaViewport, hitungPosisiPanel, type PanelPosition } from "@/lib/notifikasi/posisi-panel";

interface Notification extends NotifikasiItem {
  data: any;
}

export function NotificationBell({
  allHref = "/arena/notifikasi",
}: {
  allHref?: string;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);

  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifikasi?unread=true");
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
      if (data.userId) userIdRef.current = data.userId;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
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

    const tunggu = setInterval(() => {
      const uid = userIdRef.current;
      if (!uid || cancelled) return;
      clearInterval(tunggu);
      unsub = subscribeNotifications(uid, (notif) => {
        setNotifications((prev) => [notif as Notification, ...prev]);
        setUnreadCount((count) => count + 1);
      });
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(tunggu);
      unsub?.();
    };
  }, []);

  const positionPanel = useCallback(() => {
    const button = triggerRef.current;
    if (!button || typeof window === "undefined") return;

    setPanelPosition(hitungPosisiPanel(button.getBoundingClientRect(), bacaViewport()));
  }, []);

  useEffect(() => {
    if (!open) return;
    positionPanel();

    const sync = () => positionPanel();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    window.addEventListener("scroll", sync, true);

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open, positionPanel]);

  useEffect(() => {
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (triggerWrapRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
    };
  }, []);

  const handleOpen = () => {
    setOpen((current) => {
      const next = !current;
      if (next) requestAnimationFrame(positionPanel);
      return next;
    });

    if (!open && unreadCount > 0) {
      void fetch("/api/notifikasi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/notifikasi?id=${id}`, { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleDeleteAll = useCallback(async () => {
    await fetch("/api/notifikasi?all=true", { method: "DELETE" });
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const panel = useMemo(() => {
    if (!open || !panelPosition || typeof document === "undefined") return null;

    return createPortal(
      <div
        ref={panelRef}
        className="fixed z-[120] flex flex-col overflow-hidden rounded-bc-tile border border-bc-line bg-bc-surface text-bc-text shadow-bc-3"
        style={{
          top: panelPosition.top,
          left: panelPosition.left,
          width: panelPosition.width,
          maxHeight: panelPosition.maxHeight,
        }}
        role="dialog"
        aria-label="Notifikasi terbaru"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-bc-line px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm text-bc-text">Notifikasi</h3>
            <p className="mt-0.5 text-[11px] text-bc-text-3">
              Kabar terbaru dari BahasaCerdas
            </p>
          </div>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold text-bc-danger transition-colors hover:bg-bc-danger-soft"
            >
              Hapus semua
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-bc-text-3">Memuat…</div>
          ) : notifications.length === 0 ? (
            <div className="p-9 text-center">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-bc-icon bg-bc-violet-soft">
                <Bell className="h-6 w-6 text-bc-violet" />
              </span>
              <p className="text-sm font-bold text-bc-text">Tidak ada notifikasi</p>
              <p className="mt-1 text-xs text-bc-text-3">Kabar baru muncul di sini.</p>
            </div>
          ) : (
            <div className="space-y-2 p-2.5">
              {notifications.map((n) => (
                <NotificationCard key={n.id} n={n} dense onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="shrink-0 border-t border-bc-line bg-bc-surface-2 p-2.5">
            <Link
              href={allHref}
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-full text-xs font-bold text-bc-accent-strong transition-colors hover:bg-bc-accent-soft dark:text-bc-accent"
              onClick={() => setOpen(false)}
            >
              Lihat semua <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>,
      document.body,
    );
  }, [allHref, handleDelete, handleDeleteAll, loading, notifications, open, panelPosition]);

  return (
    <>
      <div className="relative" ref={triggerWrapRef}>
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          className="relative grid h-10 w-10 place-items-center rounded-bc-sm text-bc-text-2 transition-colors hover:bg-bc-text/5 hover:text-bc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bc-focus"
          title="Notifikasi"
          aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : "Notifikasi"}
          aria-expanded={open}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bc-danger px-0.5 text-[9px] font-bold leading-none text-bc-on-brand ring-2 ring-bc-surface">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
      {panel}
    </>
  );
}
