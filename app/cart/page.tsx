"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ShoppingBag, LogIn, AlertCircle } from "lucide-react";

interface CartItem {
  id: string;
  title: string;
  price: number;
  seller?: string;
  type: string;
  qty: number;
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem("bc-cart") || "[]"));
    fetch("/api/user/me", { cache: "no-store" }).then(r => setIsLoggedIn(r.ok)).catch(() => {});
  }, []);

  const syncCart = (updated: CartItem[]) => {
    setItems(updated);
    localStorage.setItem("bc-cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cart-update"));
  };

  const updateQty = (id: string, delta: number) => {
    const updated = items.map(i => {
      if (i.id === id) return { ...i, qty: Math.max(1, (i.qty || 1) + delta) };
      return i;
    });
    syncCart(updated);
  };

  const removeItem = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    syncCart(updated);
  };

  const clearCart = () => syncCart([]);

  const totalItems = items.reduce((sum, i) => sum + (i.qty || 1), 0);
  const total = items.reduce((sum, i) => sum + i.price * (i.qty || 1), 0);
  const hasPaidItem = items.some(i => i.price > 0);

  const TYPES: Record<string, string> = {
    RPP: "RPP", MODUL: "Modul", PPT: "PPT", SOAL: "Soal",
    VIDEO: "Video", EBOOK: "Ebook", ADMINISTRASI: "Administrasi", LAINNYA: "Lainnya"
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <ShoppingCart size={28} className="text-red-600" />
            <h1 className="text-2xl font-bold text-slate-900">Keranjang</h1>
          </div>
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">Keranjang kosong</p>
            <p className="text-sm text-slate-400 mt-1">Tambahkan karya dari Toko Karya</p>
            <Link href="/marketplace" className="mt-4 inline-flex items-center gap-1 text-red-600 font-semibold hover:underline">
              Jelajahi Toko Karya <ArrowLeft size={14} className="rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <ShoppingCart size={28} className="text-red-600" />
            <h1 className="text-2xl font-bold text-slate-900">Keranjang</h1>
            <span className="text-sm text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">{totalItems} item</span>
          </div>
          <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-600 hover:underline">
            Kosongkan
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center shrink-0">
                <ShoppingBag size={22} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/marketplace/${item.id}`} className="font-semibold text-slate-900 hover:text-red-600 line-clamp-1">
                  {item.title}
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-400">{TYPES[item.type] || item.type}</span>
                  {item.seller && <span className="text-xs text-slate-400">• {item.seller}</span>}
                </div>
                <p className="text-sm font-bold text-red-600 mt-1">
                  Rp {(item.price * (item.qty || 1)).toLocaleString("id")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateQty(item.id, -1)}
                  className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  value={item.qty || 1}
                  min={1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    updateQty(item.id, val - (item.qty || 1));
                  }}
                  className="w-10 text-center font-semibold text-sm border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => updateQty(item.id, 1)}
                  className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                >
                  <Plus size={14} />
                </button>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="p-2.5 rounded-xl hover:bg-red-50 text-red-300 hover:text-red-500 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="space-y-2 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 line-clamp-1">{item.title} x{item.qty || 1}</span>
                <span className="text-slate-900 font-medium">Rp {(item.price * (item.qty || 1)).toLocaleString("id")}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-600">Total</span>
              <span className="text-2xl font-bold text-red-600">Rp {total.toLocaleString("id")}</span>
            </div>
            <p className="text-xs text-slate-400">Harga sudah termasuk PPN</p>
          </div>

          {!isLoggedIn && (
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 flex items-center gap-2">
              <LogIn size={14} /> Login dulu untuk checkout
            </div>
          )}

          <button
            onClick={() => {
              if (!isLoggedIn) { router.push("/login"); return; }
              router.push("/checkout");
            }}
            disabled={items.length === 0}
            className="mt-4 w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <ShoppingBag size={18} />
            {hasPaidItem ? `Bayar Rp ${total.toLocaleString("id")}` : `Unduh Gratis (${totalItems} item)`}
          </button>
        </div>
      </div>
    </div>
  );
}
