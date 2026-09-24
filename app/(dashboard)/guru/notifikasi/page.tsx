"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ChevronLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCard } from "@/components/notifikasi/NotificationCard";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data: any;
  createdAt: string;
}

export default function NotifikasiPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const url = filter === "unread" ? "/api/notifikasi?unread=true" : "/api/notifikasi";
      const res = await fetch(url);
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
  }, [filter]);

  const handleMarkAllRead = async () => {
    await fetch("/api/notifikasi", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    await fetchNotifications();
  };

  const handleDeleteAll = async () => {
    await fetch("/api/notifikasi?all=true", { method: "DELETE" });
    setNotifications([]);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/notifikasi?id=${id}`, { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl">
      <section className="mb-5 rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-sm backdrop-blur-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900/72">
        <div className="flex min-w-0 flex-wrap items-start gap-3">
          <Link
            href="/guru/beranda"
            aria-label="Kembali ke beranda guru"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 sm:text-2xl dark:text-slate-100">
              <Bell className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              Notifikasi
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pemberitahuan dan update dari BahasaCerdas.
            </p>
          </div>

          {notifications.length > 0 && (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAllRead}
                className="min-h-9 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <CheckCheck className="mr-1 h-4 w-4" /> Tandai Dibaca
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeleteAll}
                className="min-h-9 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
              >
                <Trash2 className="mr-1 h-4 w-4" /> Hapus Semua
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            filter === "all"
              ? "bg-emerald-600 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          Semua
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            filter === "unread"
              ? "bg-emerald-600 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          Belum Dibaca
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200/70 bg-white/70 py-20 text-center dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-emerald-500/25 border-t-emerald-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Memuat notifikasi...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-3xl border border-slate-200/70 bg-white/80 px-5 py-20 text-center dark:border-slate-800 dark:bg-slate-900/70">
          <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          </span>
          <h3 className="mb-2 font-bold text-slate-700 dark:text-slate-200">Tidak ada notifikasi</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Anda akan mendapat notifikasi saat ada update penting.
          </p>
        </div>
      ) : (
        <div className="min-w-0 space-y-3">
          {notifications.map((n) => (
            <NotificationCard key={n.id} n={n} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
