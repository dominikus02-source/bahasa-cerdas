"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ShoppingBag, Zap, Shield, Sparkles, Moon, Sticker, Check,
  Clock, Plus, Minus, AlertTriangle, BookOpen, PenLine,
} from "lucide-react";
import { IconCoin, IconCheck } from "@/lib/icons";
import CosmeticPreview from "@/components/arena/CosmeticPreview";
import { isCosmeticType, isEquippableIcon } from "@/lib/cosmetics";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

interface StoreItem {
  id: string; name: string; description: string; type: string;
  price: number; icon: string; isActive: boolean;
}

type EquippedMap = Record<string, string | null>;

const CONSUMABLE_TYPES = new Set(["HINT_TOKEN"]);
const AUTO_TYPES = new Set(["STREAK_FREEZE"]);
// Items with no working implementation — hidden from store (Coin Shop 2.1/2.2)
const RETIRED_TYPES = new Set(["THEME", "STICKER", "HEART_REFILL", "EXTRA_TRYOUT", "TIME_EXTENSION"]);

function isConsumable(type: string) { return CONSUMABLE_TYPES.has(type); }
function isAutoItem(type: string) { return AUTO_TYPES.has(type); }
function isBoostType(type: string) { return type === "XP_BOOST"; }

const TYPE_ICONS: Record<string, any> = {
  STREAK_FREEZE: Shield, XP_BOOST: Zap, AVATAR_FRAME: Sparkles,
  THEME: Moon, STICKER: Sticker, HINT_TOKEN_PACK: BookOpen,
  PROFILE_BACKGROUND: Sparkles, NAMEPLATE: PenLine,
};
const TYPE_COLORS: Record<string, string> = {
  STREAK_FREEZE: "from-cyan-500 to-blue-600",
  XP_BOOST: "from-yellow-400 to-amber-600",
  AVATAR_FRAME: "from-violet-500 to-purple-600",
  THEME: "from-indigo-500 to-violet-600",
  STICKER: "from-pink-500 to-rose-600",
  HINT_TOKEN_PACK: "from-sky-500 to-blue-600",
  PROFILE_BACKGROUND: "from-pink-400 to-rose-500",
  NAMEPLATE: "from-amber-400 to-yellow-500",
};

export default function TokoKoinPage() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [equipping, setEquipping] = useState<string | null>(null);
  const [consuming, setConsuming] = useState<string | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [equipped, setEquipped] = useState<EquippedMap>({});
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [boostActive, setBoostActive] = useState(false);
  const [boostRemainingMs, setBoostRemainingMs] = useState(0);
  const [boostItemName, setBoostItemName] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const boostInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStore = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [userResult, storeResult, inventoryResult, boostResult] = await Promise.allSettled([
        fetchWithTimeout("/api/user/me").then(async (response) => {
          if (!response.ok) throw new Error("Gagal memuat akun");
          return response.json();
        }),
        fetchWithTimeout("/api/siswa/store").then(async (response) => {
          if (!response.ok) throw new Error("Gagal memuat katalog");
          return response.json();
        }),
        fetchWithTimeout("/api/siswa/store/equip").then((response) => response.ok ? response.json() : null),
        fetchWithTimeout("/api/siswa/store/boost-status").then((response) => response.ok ? response.json() : null),
      ]);

      if (userResult.status !== "fulfilled" || storeResult.status !== "fulfilled") {
        throw new Error("Gagal memuat toko");
      }

      const u = userResult.value;
      const d = storeResult.value;
      const inv = inventoryResult.status === "fulfilled" ? inventoryResult.value : null;
      const boost = boostResult.status === "fulfilled" ? boostResult.value : null;
      setUser(u.user);
      setItems(d.items || []);
      if (inv) {
        setOwned(new Set<string>(inv.ownedItemIds || []));
        setQuantities(
          (inv.owned || []).reduce((acc: Record<string, number>, o: any) => {
            acc[o.itemId] = (acc[o.itemId] || 0) + (o.quantity || 0);
            return acc;
          }, {}),
        );
        setEquipped(inv.equipped || {});
      }
      if (boost?.active) {
        setBoostActive(true);
        setBoostRemainingMs(boost.remainingMs);
        setBoostItemName(boost.itemName || "XP Boost");
      }
    } catch {
      setLoadError("Toko Koin belum bisa dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStore();
  }, [loadStore]);

  useEffect(() => {
    if (!boostActive) return;
    boostInterval.current = setInterval(() => {
      setBoostRemainingMs((prev) => {
        if (prev <= 1000) {
          setBoostActive(false);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => {
      if (boostInterval.current) clearInterval(boostInterval.current);
    };
  }, [boostActive]);

  const isWearable = (item: StoreItem) => isCosmeticType(item.type) && isEquippableIcon(item.type, item.icon);

  const handleEquip = async (item: StoreItem, equip: boolean) => {
    setEquipping(item.id);
    try {
      const res = await fetch("/api/siswa/store/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, equip }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEquipped(prev => ({ ...prev, [item.type]: data.icon }));
      setMessage({ type: "success", text: equip ? `${item.name} sekarang dipakai!` : `${item.name} dilepas.` });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Gagal menyimpan" });
    } finally {
      setEquipping(null);
    }
  };

  const handleConsume = async (item: StoreItem) => {
    setConsuming(item.id);
    try {
      const res = await fetch("/api/siswa/store/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: item.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuantities(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 1) - 1) }));
      setMessage({ type: "success", text: `${item.name} berhasil dipakai!` });
      if ((quantities[item.id] || 1) <= 1) {
        setOwned(prev => { const n = new Set(prev); n.delete(item.id); return n; });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Gagal memakai item" });
    } finally {
      setConsuming(null);
    }
  };

  const handleBuy = async (item: StoreItem) => {
    if ((user?.coins || 0) < item.price) {
      setMessage({ type: "error", text: "Koin tidak mencukupi!" });
      return;
    }
    setBuying(item.id);
    try {
      const res = await fetch("/api/siswa/store/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser((prev: any) => ({ ...prev, coins: (prev?.coins || 0) - item.price }));
      setOwned(prev => new Set(prev).add(item.id));
      setQuantities(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
      if (isBoostType(item.type)) {
        setBoostActive(true);
        setBoostRemainingMs(data.remainingMs || (24 * 3600 * 1000));
        setBoostItemName(item.name);
      }
      setMessage({
        type: "success",
        text: isWearable(item)
          ? (item.type === "HINT_TOKEN_PACK"
            ? `Berhasil dibeli! 5 Hint Token sudah masuk ke inventarismu.`
            : `Berhasil dibeli! Pasang ${item.name} sekarang.`)
          : `Berhasil dibeli! ${item.name} sudah masuk ke koleksimu.`,
      });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setBuying(null);
    }
  };

  function formatWaktu(ms: number) {
    const totalDetik = Math.floor(ms / 1000);
    const jam = Math.floor(totalDetik / 3600);
    const menit = Math.floor((totalDetik % 3600) / 60);
    const detik = totalDetik % 60;
    if (jam > 0) return `${jam}j ${menit}m ${detik}d`;
    if (menit > 0) return `${menit}m ${detik}d`;
    return `${detik}d`;
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" /></div>;

  if (loadError) return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-gray-100 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-800/90">
      <p className="text-gray-600 dark:text-slate-300">{loadError}</p>
      <button onClick={() => void loadStore()} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">Coba lagi</button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Toko Koin</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Tukarkan koinmu dengan item spesial</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-4 py-2 rounded-xl">
          <IconCoin size={20} className="text-amber-500 dark:text-amber-400" />
          <span className="font-bold text-amber-600 dark:text-amber-400">{user?.coins || 0}</span>
        </div>
      </div>

      {boostActive && (
        <div className="mb-5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 dark:bg-slate-900/20 flex items-center justify-center">
                <Zap size={20} className="text-amber-200" />
              </div>
              <div>
                <p className="font-bold text-sm">{boostItemName} Aktif</p>
                <p className="text-amber-100 text-xs">2x XP dari semua permainan</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-200" />
              <span className="font-mono font-bold tabular-nums">{formatWaktu(boostRemainingMs)}</span>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === "success" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
        }`}>
          {message.type === "success" ? <IconCheck size={16} className="inline mr-1" /> : null}{message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.filter(i => !RETIRED_TYPES.has(i.type)).map(item => {
          const Icon = TYPE_ICONS[item.type] || ShoppingBag;
          const color = TYPE_COLORS[item.type] || "from-gray-500 to-gray-600";
          const canAfford = (user?.coins || 0) >= item.price;
          const wearable = isWearable(item);
          const isOwned = owned.has(item.id);
          const qty = quantities[item.id] || 0;
          const isWorn = wearable && equipped[item.type] === item.icon;

          return (
            <div key={item.id} className={`bg-white dark:bg-slate-800/90 rounded-2xl border p-5 hover:shadow-lg transition-all ${
              isWorn ? "border-violet-300 dark:border-violet-700 ring-1 ring-violet-200" :
              boostActive && isBoostType(item.type) ? "border-amber-200 dark:border-amber-800 ring-1 ring-amber-100" :
              "border-gray-100 dark:border-slate-800"
            }`}>
              <div className="flex items-start gap-4">
                <CosmeticPreview type={item.type} icon={item.icon}>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg shrink-0 relative`}>
                    <Icon size={28} />
                    {isBoostType(item.type) && boostActive && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-ping opacity-75" />
                    )}
                  </div>
                </CosmeticPreview>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-slate-100 truncate">{item.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 leading-snug">{item.description}</p>

                  {/* Badge baris status */}
                  {isBoostType(item.type) && boostActive && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full w-fit border border-amber-200 dark:border-amber-800">
                      <Zap size={12} />
                      <span>Aktif — sisa {formatWaktu(boostRemainingMs)}</span>
                    </div>
                  )}
                  {isConsumable(item.type) && isOwned && qty > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1 rounded-full w-fit border border-violet-200 dark:border-violet-800">
                      <span>Dimiliki {qty}x</span>
                    </div>
                  )}
                  {isAutoItem(item.type) && isOwned && qty > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full w-fit border border-emerald-200 dark:border-emerald-800">
                      <Check size={12} />
                      <span>Dimiliki {qty}x</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-3">
                    <span className="flex items-center gap-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
                      <IconCoin size={14} className="text-amber-500 dark:text-amber-400" /> {item.price}
                    </span>

                    {/* Wearable: Pakai / Dipakai */}
                    {wearable && isOwned ? (
                      <button
                        onClick={() => handleEquip(item, !isWorn)}
                        disabled={equipping === item.id}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0 ${
                          isWorn
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200"
                        }`}
                      >
                        {equipping === item.id ? "..." : isWorn ? <><Check size={14} /> Dipakai</> : "Pakai"}
                      </button>
                    ) : isConsumable(item.type) && isOwned && qty > 0 ? (
                      <button
                        onClick={() => handleConsume(item)}
                        disabled={consuming === item.id}
                        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0 bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200"
                      >
                        {consuming === item.id ? "..." : "Pakai"}
                      </button>
                    ) : isBoostType(item.type) && isOwned && boostActive ? (
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={buying === item.id || !canAfford}
                        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200 disabled:opacity-50"
                      >
                        {buying === item.id ? "..." : "Perpanjang"}
                      </button>
                    ) : isAutoItem(item.type) && isOwned && qty > 0 ? (
                      <span className="px-4 py-2 rounded-xl text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        Dimiliki
                      </span>
                    ) : (
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={buying === item.id || !canAfford}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                          canAfford
                            ? "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200"
                            : "bg-gray-100 dark:bg-slate-800/80 text-gray-400 cursor-not-allowed"
                        } disabled:opacity-50`}
                      >
                        {buying === item.id ? "..." : canAfford ? "Beli" : "Kurang Koin"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-800">
          <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={24} className="text-violet-500 dark:text-violet-400" />
          </div>
          <p className="text-gray-500 dark:text-slate-400">Belum ada item di toko</p>
        </div>
      )}
    </div>
  );
}
