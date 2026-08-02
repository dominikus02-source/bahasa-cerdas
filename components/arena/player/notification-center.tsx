"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { GlassCard, useRelativeTime } from "./ui";
import type { PlayerNotificationView } from "@/lib/gamification/client-types";

/** Pusat notifikasi pemain — agregasi event reward terbaru. */
export function NotificationCenter({ compact = false }: { compact?: boolean }) {
  const [notifications, setNotifications] = useState<PlayerNotificationView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/player/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error("Gagal memuat notifikasi");
      const data = await res.json();
      setNotifications(data.notifications);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!notifications) {
    return (
      <GlassCard className="p-4">
        <div className="space-y-2">
          <div className="px-skeleton h-4 w-1/3 rounded-lg" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="px-skeleton h-14 rounded-xl" />
          ))}
        </div>
      </GlassCard>
    );
  }

  const visible = compact ? notifications.slice(0, 5) : notifications;

  return (
    <GlassCard className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-[var(--px-text)]">
          <Bell size={16} className="text-[var(--px-gold)]" />
          Notifikasi Pemain
        </h3>
        {notifications.length > 0 && <span className="px-chip">{notifications.length} terbaru</span>}
      </div>

      {error && <p className="mb-2 text-xs text-rose-300">{error}</p>}

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--px-border)] py-8 text-center">
          <p className="text-sm font-semibold text-[var(--px-text-dim)]">Belum ada notifikasi</p>
          <p className="mt-1 text-xs text-[var(--px-text-faint)]">Mulai belajar untuk menerima notifikasi reward!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((n) => (
            <NotificationRow key={n.id} n={n} />
          ))}
          {compact && notifications.length > 5 && (
            <p className="pt-1 text-center text-xs font-semibold text-[var(--px-text-faint)]">Lihat semua</p>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function NotificationRow({ n }: { n: PlayerNotificationView }) {
  const time = useRelativeTime(n.createdAt);
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--px-border)] bg-white/[0.04] px-3 py-2.5">
      <span className="mt-0.5 text-lg">{n.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--px-text)]">{n.title}</p>
        <p className="line-clamp-2 text-xs text-[var(--px-text-dim)]">{n.body}</p>
        <p className="mt-0.5 text-[10px] text-[var(--px-text-faint)]">{time}</p>
      </div>
    </div>
  );
}
