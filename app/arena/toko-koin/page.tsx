"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ShoppingBag, Zap, Shield, Sparkles, Moon, Sticker, ArrowLeft, Coins, Loader2 } from "lucide-react"

interface StoreItem {
  id: string; name: string; description: string; type: string;
  price: number; icon: string; isActive: boolean;
}

const TYPE_ICONS: Record<string, any> = {
  STREAK_FREEZE: Shield, XP_BOOST: Zap, AVATAR_FRAME: Sparkles,
  THEME: Moon, STICKER: Sticker,
}

const TYPE_COLORS: Record<string, string> = {
  STREAK_FREEZE: "from-cyan-500 to-blue-600",
  XP_BOOST: "from-yellow-400 to-amber-600",
  AVATAR_FRAME: "from-violet-500 to-purple-600",
  THEME: "from-indigo-500 to-violet-600",
  STICKER: "from-pink-500 to-rose-600",
}

export default function ArenaTokoKoinPage() {
  const [items, setItems] = useState<StoreItem[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/user/me").then(r => r.json()),
      fetch("/api/siswa/store").then(r => r.json()),
    ]).then(([u, d]) => {
      setUser(u.user)
      setItems(d.items || [])
      setLoading(false)
    })
  }, [])

  const handleBuy = async (item: StoreItem) => {
    if ((user?.coins || 0) < item.price) {
      setMessage({ type: "error", text: "Koin tidak mencukupi!" })
      return
    }
    setBuying(item.id)
    try {
      const res = await fetch("/api/siswa/store/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUser((prev: any) => ({ ...prev, coins: (prev?.coins || 0) - item.price }))
      setMessage({ type: "success", text: `Berhasil membeli ${item.name}!` })
    } catch (e: any) {
      setMessage({ type: "error", text: e.message })
    } finally {
      setBuying(null)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin w-8 h-8 text-violet-500" />
    </div>
  )

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/arena" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 active:scale-90 transition-transform">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Toko Koin</h1>
            <p className="text-xs text-gray-500">Tukarkan koinmu dengan item spesial</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl shrink-0">
          <Coins size={18} className="text-amber-500" />
          <span className="font-bold text-amber-600">{user?.coins || 0}</span>
        </div>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === "success" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(item => {
          const Icon = TYPE_ICONS[item.type] || ShoppingBag
          const color = TYPE_COLORS[item.type] || "from-gray-500 to-gray-600"
          const canAfford = (user?.coins || 0) >= item.price

          return (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg shrink-0`}>
                  <Icon size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                      <Coins size={14} className="text-amber-500" /> {item.price}
                    </span>
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={buying === item.id || !canAfford}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        canAfford
                          ? "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      } disabled:opacity-50`}
                    >
                      {buying === item.id ? <Loader2 size={16} className="animate-spin" /> : canAfford ? "Beli" : "Kurang Koin"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {items.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={24} className="text-violet-500" />
          </div>
          <p className="text-gray-500">Belum ada item di toko</p>
        </div>
      )}
    </div>
  )
}
