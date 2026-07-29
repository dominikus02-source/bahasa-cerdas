"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Bell, CheckCheck, Trash2, Sparkles, Award, AlertCircle, Info, RefreshCw } from "lucide-react"

interface Notif {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  createdAt: string
  data?: { link?: string }
}

const ICON_MAP: Record<string, any> = {
  PREMIUM: { icon: Award, color: "text-amber-500", bg: "bg-amber-50" },
  PURCHASE: { icon: Sparkles, color: "text-emerald-500", bg: "bg-emerald-50" },
  WITHDRAWAL: { icon: AlertCircle, color: "text-blue-500", bg: "bg-blue-50" },
  INFO: { icon: Info, color: "text-violet-500", bg: "bg-violet-50" },
}

export default function NotifikasiPage() {
  const [notifs, setNotifs] = useState<Notif[]>([])
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
        <Link href="/arena" className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-[#1A1033]">Notifikasi</h1>
          <p className="text-xs text-[#9B93B8]">{unreadCount} belum dibaca</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="ml-auto flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg">
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
              filter === f ? "bg-purple-600 text-white" : "bg-white text-[#5A5278] border border-gray-200"
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
          {filtered.map((n) => {
            const meta = ICON_MAP[n.type] || { icon: Bell, color: "text-gray-500", bg: "bg-gray-50" }
            const Icon = meta.icon
            const target = n.data?.link
            const content = (
              <>
                <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A1033]">{n.title}</p>
                  <p className="text-xs text-[#5A5278] mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-[#9B93B8] mt-1">{waktuLalu(n.createdAt)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); hapusNotif(n.id); }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
                  <Trash2 size={14} className="text-gray-400" />
                </button>
              </>
            )
            return target ? (
              <Link key={n.id} href={target}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-colors cursor-pointer hover:bg-purple-50/80 ${
                  n.isRead ? "bg-white border-gray-100" : "bg-purple-50 border-purple-100"
                }`}
              >
                {content}
              </Link>
            ) : (
              <div key={n.id}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-colors ${
                  n.isRead ? "bg-white border-gray-100" : "bg-purple-50 border-purple-100"
                }`}
              >
                {content}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function waktuLalu(tanggal: string) {
  const diff = Date.now() - new Date(tanggal).getTime()
  const menit = Math.floor(diff / 60000)
  if (menit < 1) return "baru saja"
  if (menit < 60) return `${menit}m`
  const jam = Math.floor(menit / 60)
  if (jam < 24) return `${jam}j`
  return `${Math.floor(jam / 24)}h`
}
