"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { NotificationCard, type NotifikasiItem } from "@/components/notifikasi/NotificationCard";

/** Daftar notifikasi UMUM — memakai API notifikasi yang sama dengan peran lain. */
export function UmumNotifikasiList() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<NotifikasiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<"semua" | "baru">("semua");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/notifikasi", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setNotifs(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const markAllRead = async () => {
    await fetch("/api/notifikasi", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    await load();
    router.refresh(); // perbarui lencana di sidebar/nav bawah
  };

  const hapus = async (id: string) => {
    await fetch(`/api/notifikasi?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    router.refresh();
  };

  const unread = notifs.filter((n) => !n.isRead).length;
  const shown = filter === "baru" ? notifs.filter((n) => !n.isRead) : notifs;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Saring notifikasi" className="flex gap-2">
          {(["semua", "baru"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-bc-ctl px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bc-focus ${
                filter === f ? "bg-bc-violet text-bc-on-brand" : "border border-bc-line bg-bc-surface text-bc-text-2 hover:bg-bc-surface-2"
              }`}
            >
              {f === "semua" ? "Semua" : `Belum dibaca (${unread})`}
            </button>
          ))}
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="ml-auto inline-flex items-center gap-1.5 rounded-bc-ctl border border-bc-line bg-bc-surface px-3 py-2 text-xs font-semibold text-bc-text hover:bg-bc-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bc-focus"
          >
            <CheckCheck size={14} aria-hidden /> Tandai semua dibaca
          </button>
        )}
      </div>

      {loading ? (
        <div role="status" className="rounded-bc-card border border-bc-line bg-bc-surface py-16 text-center">
          <RefreshCw size={22} aria-hidden className="mx-auto animate-spin text-bc-violet motion-reduce:animate-none" />
          <p className="mt-3 text-xs text-bc-text-3">Memuat notifikasi…</p>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-bc-card border border-bc-line bg-bc-surface px-5 py-12 text-center">
          <p className="text-sm font-semibold text-bc-text">Notifikasi gagal dimuat.</p>
          <button type="button" onClick={() => void load()} className="mt-3 rounded-bc-ctl border border-bc-line px-4 py-2 text-sm font-semibold text-bc-text">Coba lagi</button>
        </div>
      ) : shown.length === 0 ? (
        <div data-testid="notifikasi-kosong" className="rounded-bc-card border border-dashed border-bc-line bg-bc-surface px-5 py-16 text-center">
          <Bell size={28} aria-hidden className="mx-auto text-bc-text-3" />
          <p className="mt-3 text-sm font-semibold text-bc-text">Belum ada notifikasi</p>
          <p className="mt-1 text-xs text-bc-text-3">Notifikasi akan muncul di sini.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {shown.map((n) => <NotificationCard key={n.id} n={n} onDelete={hapus} />)}
        </div>
      )}
    </div>
  );
}
