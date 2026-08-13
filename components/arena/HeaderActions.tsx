"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell, Search, X, ArrowRight } from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"

export function HeaderActions() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetch("/api/notifikasi?unread=true")
      .then(r => r.json())
      .then(d => setUnreadCount(d.unreadCount || 0))
      .catch(() => {})
  }, [])

  return (
    <>
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <button
          onClick={() => setShowSearch(true)}
          className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          aria-label="Cari"
        >
          <Search size={20} className="text-gray-600" />
        </button>

        <Link
          href="/arena/notifikasi"
          className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center relative transition-colors"
          aria-label="Notifikasi"
        >
          <Bell size={20} className="text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </div>

      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3 p-4 border-b border-gray-100">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari karya, pengguna, atau topik..."
                  className="flex-1 bg-transparent text-sm focus:outline-none text-gray-900 placeholder:text-gray-400"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === "Enter" && searchQuery.trim()) {
                      window.location.href = `/arena/feed?q=${encodeURIComponent(searchQuery.trim())}`
                    }
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowSearch(false)}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Batal
              </button>
            </div>
            <div className="p-4">
              {searchQuery.trim() ? (
                <Link
                  href={`/arena/feed?q=${encodeURIComponent(searchQuery.trim())}`}
                  onClick={() => setShowSearch(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-violet-50 text-sm text-violet-600 font-medium transition-colors"
                >
                  <ArrowRight size={14} />
                  Cari "{searchQuery}" di Karya
                </Link>
              ) : (
                <div className="text-center py-6">
                  <Search size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Ketik kata kunci untuk mencari</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
