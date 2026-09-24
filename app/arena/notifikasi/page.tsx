"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Bell, CheckCheck, RefreshCw } from "lucide-react"
import { NotificationCard, type NotifikasiItem } from "@/components/notifikasi/NotificationCard"

export default function NotifikasiPage() {
  const [notifs, setNotifs] = useState<NotifikasiItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"semua" | "baru">("semua")

  const fetchNotifs = async (unread = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/notifikasi?${unread ? "unread=true" : ""}`)
      const data = await res.json()
      setNotifs(data.notifications || [])
    } catch {
      // Empty/error state is represented by the existing list state.
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchNotifs()
  }, [])

  const markAllRead = async () => {
    await fetch("/api/notifikasi", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    })
    await fetchNotifs()
  }

  const hapusNotif = async (id: string) => {
    await fetch(`/api/notifikasi?id=${id}`, { method: "DELETE" })
    setNotifs((prev) => prev.filter((n) => n.id !== id))
  }

  const filtered = filter === "baru" ? notifs.filter((n) => !n.isRead) : notifs
  const unreadCount = notifs.filter((n) => !n.isRead).length

  return (
    <div className="arena-page min-h-screen min-w-0 bg-[#F4F2FF] px-4 py-5 pb-24 dark:bg-slate-950 sm:px-5 md:pb-8">
      <div className="mx-auto w-full min-w-0 max-w-4xl">
        <section className="mb-5 rounded-3xl border border-violet-100/80 bg-white/88 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/78 sm:p-5">
          <div className="flex min-w-0 flex-wrap items-start gap-3">
            <Link
              href="/arena"
              aria-label="Kembali ke Arena"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ArrowLeft size={18} />
            </Link>

            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold text-[#1A1033] dark:text-slate-100">Notifikasi</h1>
              <p className="mt-0.5 text-xs font-medium text-[#81799D] dark:text-slate-400">
                {unreadCount} belum dibaca
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-100 dark:bg-violet-950/45 dark:text-violet-300 dark:hover:bg-violet-900/50"
              >
                <CheckCheck size={14} /> Tandai Dibaca
              </button>
            )}
          </div>
        </section>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {(["semua", "baru"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                filter === f
                  ? "bg-purple-600 text-white shadow-sm"
                  : "border border-gray-200 bg-white text-[#5A5278] hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {f === "semua" ? "Semua" : "Belum Dibaca"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-violet-100/70 bg-white/75 py-20 text-center dark:border-slate-800 dark:bg-slate-900/65">
            <RefreshCw size={24} className="mx-auto animate-spin text-purple-500 dark:text-violet-400" />
            <p className="mt-3 text-xs font-medium text-[#81799D] dark:text-slate-400">Memuat notifikasi...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-violet-100/70 bg-white/75 px-5 py-20 text-center dark:border-slate-800 dark:bg-slate-900/65">
            <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 dark:bg-slate-800">
              <Bell size={28} className="text-[#9B93B8] dark:text-slate-500" />
            </span>
            <p className="text-sm font-semibold text-[#5A5278] dark:text-slate-200">Belum ada notifikasi</p>
            <p className="mt-1 text-xs text-[#9B93B8] dark:text-slate-500">Notifikasi akan muncul di sini.</p>
          </div>
        ) : (
          <div className="min-w-0 space-y-2.5">
            {filtered.map((n) => (
              <NotificationCard key={n.id} n={n} onDelete={hapusNotif} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
