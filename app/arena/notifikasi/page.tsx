"use client"

import { useState, useEffect } from "react"
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
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNotifs() }, [])

  const markAllRead = async () => {
    await fetch("/api/notifikasi", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    })
    fetchNotifs()
  }

  const hapusNotif = async (id: string) => {
    await fetch(`/api/notifikasi?id=${id}`, { method: "DELETE" })
    setNotifs((prev) => prev.filter((n) => n.id !== id))
  }

  const filtered = filter === "baru" ? notifs.filter((n) => !n.isRead) : notifs
  const unreadCount = notifs.filter((n) => !n.isRead).length

  return (
    <div className="px-4 py-5 arena-page min-h-screen bg-[#F4F2FF]">
      <div className="flex items-center gap-3 mb-6">
 <Link href="/arena" className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-[#1A1033]">Notifikasi</h1>
          <p className="text-xs text-[#9B93B8]">{unreadCount} belum dibaca</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="ml-auto flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-lg">
            <CheckCheck size={14} /> Tandai Dibaca
          </button>
        )}
      </div>

      <div className="flex gap-1.5 mb-4">
        {(["semua", "baru"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
 filter === f ? "bg-purple-600 text-white" : "bg-white dark:bg-slate-800/90 text-[#5A5278] border border-gray-200 dark:border-slate-700"
            }`}
          >
            {f === "semua" ? "Semua" : "Belum Dibaca"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="text-purple-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell size={40} className="text-[#9B93B8] mb-3" />
          <p className="text-sm font-semibold text-[#5A5278]">Belum ada notifikasi</p>
          <p className="text-xs text-[#9B93B8] mt-1">Notifikasi akan muncul di sini</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NotificationCard key={n.id} n={n} onDelete={hapusNotif} />
          ))}
        </div>
      )}
    </div>
  )
}
