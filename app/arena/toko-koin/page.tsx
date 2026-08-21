"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { ShoppingBag, Zap, Shield, Sparkles, Moon, Sticker, ArrowLeft, Coins, Loader2, Check, Palette, BookOpen, PenLine, Ticket, Timer, Heart, Trophy, Target, Rocket } from "lucide-react"
import CosmeticPreview from "@/components/arena/CosmeticPreview"
import { isCosmeticType, isEquippableIcon } from "@/lib/cosmetics"

interface StoreItem {
  id: string; name: string; description: string; type: string;
  price: number; icon: string; isActive: boolean;
}

type EquippedMap = Record<string, string | null>

type Category = "all" | "cosmetic" | "boost" | "consumable"

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "cosmetic", label: "Kosmetik" },
  { key: "boost", label: "Power-Up" },
  { key: "consumable", label: "Bantuan" },
]

const TYPE_ICONS: Record<string, any> = {
  STREAK_FREEZE: Shield, XP_BOOST: Zap, AVATAR_FRAME: Sparkles,
  THEME: Moon, STICKER: Sticker, NAME_COLOR: Palette,
  BADGE: Trophy, ANSWER_EFFECT: Sparkles, HINT_TOKEN: BookOpen,
  TIME_EXTENSION: Timer, HEART_REFILL: Heart, EXTRA_TRYOUT: Ticket,
  HINT_TOKEN_PACK: BookOpen, PROFILE_BACKGROUND: Sparkles, NAMEPLATE: PenLine,
}

// Items with no working implementation — hidden from store (Coin Shop 2.1/2.2)
const RETIRED_TYPES = new Set(["THEME", "STICKER", "HEART_REFILL", "EXTRA_TRYOUT", "TIME_EXTENSION"])

const TYPE_COLORS: Record<string, string> = {
  STREAK_FREEZE: "from-cyan-500 to-blue-600",
  XP_BOOST: "from-yellow-400 to-amber-600",
  AVATAR_FRAME: "from-violet-500 to-purple-600",
  THEME: "from-indigo-500 to-violet-600",
  STICKER: "from-pink-500 to-rose-600",
  NAME_COLOR: "from-emerald-500 to-teal-600",
  BADGE: "from-orange-400 to-red-500",
  ANSWER_EFFECT: "from-fuchsia-500 to-pink-600",
  HINT_TOKEN: "from-sky-400 to-blue-500",
  TIME_EXTENSION: "from-teal-400 to-cyan-600",
  HEART_REFILL: "from-rose-400 to-red-500",
  EXTRA_TRYOUT: "from-amber-400 to-orange-500",
  HINT_TOKEN_PACK: "from-sky-500 to-blue-600",
  PROFILE_BACKGROUND: "from-pink-400 to-rose-500",
  NAMEPLATE: "from-amber-400 to-yellow-500",
}

function getRarity(price: number): { label: string; color: string } {
  if (price >= 1000) return { label: "Legendaris", color: "text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-700" }
  if (price >= 300) return { label: "Epik", color: "text-violet-600 bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-700" }
  return { label: "Umum", color: "text-gray-500 bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700" }
}

function categorize(type: string): Category {
  if (["AVATAR_FRAME", "NAME_COLOR", "BADGE", "ANSWER_EFFECT", "THEME", "STICKER", "PROFILE_BACKGROUND", "NAMEPLATE"].includes(type)) return "cosmetic"
  if (["XP_BOOST", "STREAK_FREEZE", "EXTRA_TRYOUT"].includes(type)) return "boost"
  return "consumable"
}

const COSMETIC_TYPES = new Set(["AVATAR_FRAME", "NAME_COLOR", "BADGE", "ANSWER_EFFECT", "PROFILE_BACKGROUND", "NAMEPLATE"])

/**
 * Dynamic section: "Apa yang bisa kubeli?"
 * Shows the BEST item the student can afford, or the nearest aspirational target.
 *
 * Priority for affordable items:
 *   cosmetic > consumable > boost, then lower price first.
 *
 * Priority for aspirational items (none affordable):
 *   nearest price above balance, cosmetic > consumable, then lower price.
 */
function SmartShopBalance({ user, items, owned }: { user: any; items: StoreItem[]; owned: Set<string> }) {
  const coins = user?.coins || 0
  const unowned = items.filter(i => !owned.has(i.id))

  // All items owned — nothing to recommend
  if (unowned.length === 0) {
    const hasRepeatable = items.some(i => i.type === "HINT_TOKEN" || i.type === "HINT_TOKEN_PACK" || i.type === "XP_BOOST" || i.type === "STREAK_FREEZE")
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 px-5 py-4">
        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Koleksimu lengkap!</p>
        {hasRepeatable && (
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-1">Gunakan koinmu untuk item yang bisa dipakai berulang.</p>
        )}
      </div>
    )
  }

  // Sort helper: cosmetic first, then by price ascending
  const sortByValue = (a: StoreItem, b: StoreItem) => {
    const aCosmetic = COSMETIC_TYPES.has(a.type) ? 0 : 1
    const bCosmetic = COSMETIC_TYPES.has(b.type) ? 0 : 1
    if (aCosmetic !== bCosmetic) return aCosmetic - bCosmetic
    return a.price - b.price
  }

  // Items student can afford RIGHT NOW
  const affordable = unowned.filter(i => coins >= i.price).sort(sortByValue)
  // Items student cannot yet afford (aspirational targets)
  const aspirational = unowned.filter(i => coins < i.price).sort(sortByValue)

  // STATE: CAN_BUY — student can afford at least one item
  if (affordable.length > 0) {
    const best = affordable[0]!  // best affordable: cosmetic-first, then cheapest
    const nextTarget = aspirational[0] || null

    return (
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-2xl border border-amber-200 dark:border-amber-800 px-5 py-4">
        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
          Koinmu sudah bisa dipakai!
        </p>
        <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 mt-1">
          Kamu bisa mendapatkan {best.name} — {best.price.toLocaleString("id-ID")} Koin.
        </p>
        {nextTarget && (
          <p className="text-[10px] text-amber-500/60 dark:text-amber-400/50 mt-1.5">
            Atau kumpulkan {(nextTarget.price - coins).toLocaleString("id-ID")} Koin lagi untuk {nextTarget.name}.
          </p>
        )}
      </div>
    )
  }

  // STATE: SAVING — nothing affordable, recommend nearest aspirational target
  const target = aspirational[0]!
  const needed = target.price - coins
  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 rounded-2xl border border-violet-200 dark:border-violet-800 px-5 py-4">
      <p className="text-xs font-bold text-violet-700 dark:text-violet-300">
        Kumpulkan {needed.toLocaleString("id-ID")} Koin lagi untuk {target.name}
      </p>
      <div className="mt-2 h-2 rounded-full bg-violet-200/60 dark:bg-violet-800/40 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.round((coins / target.price) * 100))}%` }}
        />
      </div>
      <p className="text-[10px] text-violet-500/70 dark:text-violet-400/60 mt-1.5">
        {coins.toLocaleString("id-ID")} / {target.price.toLocaleString("id-ID")} Koin
      </p>
    </div>
  )
}

export default function ArenaTokoKoinPage() {
  const [items, setItems] = useState<StoreItem[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [equipping, setEquipping] = useState<string | null>(null)
  const [owned, setOwned] = useState<Set<string>>(new Set())
  const [equipped, setEquipped] = useState<EquippedMap>({})
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<Category>("all")
  const [showOwned, setShowOwned] = useState(false)
  const [lastPurchased, setLastPurchased] = useState<StoreItem | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/user/me").then(r => r.json()),
      fetch("/api/siswa/store").then(r => r.json()),
      fetch("/api/siswa/store/equip").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([u, d, inv]) => {
      setUser(u.user)
      setItems(d.items || [])
      if (inv) {
        setOwned(new Set<string>(inv.ownedItemIds || []))
        setEquipped(inv.equipped || {})
      }
      setLoading(false)
    })
  }, [])

  const isWearable = (item: StoreItem) => isCosmeticType(item.type) && isEquippableIcon(item.type, item.icon)

  const filteredItems = useMemo(() => {
    let list = items.filter(i => !RETIRED_TYPES.has(i.type))
    if (activeTab !== "all") list = list.filter(i => categorize(i.type) === activeTab)
    return list
  }, [items, activeTab])

  const ownedItems = useMemo(() => items.filter(i => owned.has(i.id)), [items, owned])

  const handleEquip = async (item: StoreItem, equip: boolean) => {
    setEquipping(item.id)
    try {
      const res = await fetch("/api/siswa/store/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, equip }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEquipped(prev => ({ ...prev, [item.type]: data.icon }))
      setMessage({ type: "success", text: equip ? `${item.name} sekarang dipakai!` : `${item.name} dilepas.` })
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Gagal menyimpan" })
    } finally {
      setEquipping(null)
    }
  }

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
      setOwned(prev => new Set(prev).add(item.id))
      setLastPurchased(item)
      setMessage({
        type: "success",
        text: item.type === "HINT_TOKEN_PACK"
          ? `Berhasil dibeli! 5 Hint Token sudah masuk ke inventarismu.`
          : isWearable(item)
            ? `Berhasil dibeli! Pasang ${item.name} sekarang.`
            : `Berhasil dibeli! ${item.name} sudah masuk ke koleksimu.`,
      })
    } catch (e: any) {
      setMessage({ type: "error", text: e.message })
    } finally {
      setBuying(null)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin w-8 h-8 text-violet-500 dark:text-violet-400" />
    </div>
  )

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/arena" className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-800/80 flex items-center justify-center text-gray-600 active:scale-90 transition-transform">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">Toko Koin</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">Tukarkan koinmu dengan item spesial</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-4 py-2 rounded-xl shrink-0">
          <Coins size={18} className="text-amber-500 dark:text-amber-400" />
          <span className="font-bold text-amber-600 dark:text-amber-400">{(user?.coins || 0).toLocaleString("id-ID")}</span>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === "success" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
        }`}>
          {message.text}
        </div>
      )}

      {/* "Apa yang bisa kubeli?" Dynamic Section */}
      {user && (
        <SmartShopBalance user={user} items={items.filter(i => !RETIRED_TYPES.has(i.type))} owned={owned} />
      )}

      {/* Value Proposition Hero */}
      <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/20 dark:via-purple-950/20 dark:to-fuchsia-950/20 rounded-2xl border border-violet-200/60 dark:border-violet-800/40 p-5">
        <h2 className="text-base font-extrabold text-gray-900 dark:text-slate-100 mb-1">Koinmu, Pilihanmu</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 leading-relaxed">
          Kumpulkan koin dari aktivitas belajar, lalu tukarkan dengan item yang membuat profilmu lebih personal dan perjalanan belajarmu lebih seru.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-2 shadow-md">
              <Palette size={16} className="text-white" />
            </div>
            <p className="text-[11px] font-bold text-gray-800 dark:text-slate-200">Personalisasi</p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Jadikan profilmu punya ciri khas</p>
          </div>
          <div className="text-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-2 shadow-md">
              <Rocket size={16} className="text-white" />
            </div>
            <p className="text-[11px] font-bold text-gray-800 dark:text-slate-200">Progress</p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Dukung perjalanan belajarmu</p>
          </div>
          <div className="text-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-2 shadow-md">
              <Target size={16} className="text-white" />
            </div>
            <p className="text-[11px] font-bold text-gray-800 dark:text-slate-200">Pencapaian</p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Tunjukkan hasil yang kamu raih</p>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveTab(cat.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === cat.key
                ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                : "bg-gray-100 dark:bg-slate-800/80 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Owned Items Banner */}
      {ownedItems.length > 0 && (
        <button
          onClick={() => setShowOwned(!showOwned)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 text-sm font-semibold text-violet-700 dark:text-violet-300 transition-all hover:bg-violet-100 dark:hover:bg-violet-950/50"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={16} />
            Item Dimiliki ({ownedItems.length})
          </span>
          <span className="text-xs">{showOwned ? "Sembunyikan" : "Tampilkan"}</span>
        </button>
      )}

      {/* Owned Items (collapsed section) */}
      {showOwned && ownedItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ownedItems.map(item => {
            const Icon = TYPE_ICONS[item.type] || ShoppingBag
            const color = TYPE_COLORS[item.type] || "from-gray-500 to-gray-600"
            const wearable = isWearable(item)
            const isWorn = wearable && equipped[item.type] === item.icon

            return (
              <div key={item.id} className={`bg-white dark:bg-slate-800/90 rounded-xl border p-4 ${isWorn ? "border-violet-300 ring-1 ring-violet-200 dark:border-violet-600 dark:ring-violet-700" : "border-gray-100 dark:border-slate-700"}`}>
                <div className="flex items-center gap-3">
                  <CosmeticPreview type={item.type} icon={item.icon}>
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md shrink-0`}>
                      <Icon size={20} />
                    </div>
                  </CosmeticPreview>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{item.name}</p>
                    {wearable ? (
                      <button
                        onClick={() => handleEquip(item, !isWorn)}
                        disabled={equipping === item.id}
                        className={`mt-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          isWorn
                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                            : "bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 hover:bg-violet-200"
                        }`}
                      >
                        {equipping === item.id ? <Loader2 size={12} className="animate-spin" /> : isWorn ? "Dipakai" : "Pakai"}
                      </button>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">Dimiliki</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map(item => {
          const Icon = TYPE_ICONS[item.type] || ShoppingBag
          const color = TYPE_COLORS[item.type] || "from-gray-500 to-gray-600"
          const canAfford = (user?.coins || 0) >= item.price
          const wearable = isWearable(item)
          const isOwned = owned.has(item.id)
          const isWorn = wearable && equipped[item.type] === item.icon
          const rarity = getRarity(item.price)

          return (
            <div key={item.id} className={`bg-white dark:bg-slate-800/90 rounded-2xl border p-5 hover:shadow-lg transition-all ${isWorn ? "border-violet-300 ring-1 ring-violet-200 dark:border-violet-600 dark:ring-violet-700" : "border-gray-100 dark:border-slate-700"}`}>
              <div className="flex items-start gap-4">
                <CosmeticPreview type={item.type} icon={item.icon}>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg shrink-0`}>
                    <Icon size={28} />
                  </div>
                </CosmeticPreview>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-slate-100">{item.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${rarity.color}`}>{rarity.label}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{item.description}</p>
                  <div className="flex items-center justify-between gap-2 mt-4">
                    <span className="flex items-center gap-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
                      <Coins size={14} className="text-amber-500 dark:text-amber-400" /> {item.price.toLocaleString("id-ID")}
                    </span>
                    {wearable && isOwned ? (
                      <button
                        onClick={() => handleEquip(item, !isWorn)}
                        disabled={equipping === item.id}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                          isWorn
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200"
                        }`}
                      >
                        {equipping === item.id
                          ? <Loader2 size={16} className="animate-spin" />
                          : isWorn ? <><Check size={14} /> Dipakai</> : "Pakai"}
                      </button>
                    ) : isOwned ? (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-slate-700/60 text-gray-500 dark:text-slate-400">
                        Dimiliki
                      </span>
                    ) : (
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={buying === item.id || !canAfford}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          canAfford
                            ? "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200"
                            : "bg-gray-100 dark:bg-slate-800/80 text-gray-400 cursor-not-allowed"
                        } disabled:opacity-50`}
                      >
                        {buying === item.id ? <Loader2 size={16} className="animate-spin" /> : canAfford ? "Beli" : "Kurang Koin"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-700">
          <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={24} className="text-violet-500 dark:text-violet-400" />
          </div>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Belum ada item di kategori ini</p>
        </div>
      )}

      {/* How to Earn Coins */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-5">
        <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
          <Coins size={16} /> Cara Mendapat Koin
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[10px] font-bold">10</span> Menulis karya</div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[10px] font-bold">5</span> Main game solo</div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[10px] font-bold">5</span> Login harian</div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[10px] font-bold">30</span> Streak 7 hari</div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[10px] font-bold">2</span> Karya di-like</div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[10px] font-bold">1</span> Memberi komentar</div>
        </div>
      </div>
    </div>
  )
}
