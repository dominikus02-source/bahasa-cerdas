"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ShoppingBag, LogIn } from "lucide-react";

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
    fetch("/api/user/me").then(r => setIsLoggedIn(r.ok)).catch(() => {});
  }, []);

  const updateQty = (id: string, delta: number) => {
    const updated = items.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, (i.qty || 1) + delta);
        return { ...i, qty: newQty };
      }
      return i;
    }).filter(i => i.qty > 0);
    setItems(updated);
    localStorage.setItem("bc-cart", JSON.stringify(updated));
  };

  const removeItem = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    localStorage.setItem("bc-cart", JSON.stringify(updated));
  };

  const total = items.reduce((sum, i) => sum + i.price * (i.qty || 1), 0);
  const totalItems = items.reduce((sum, i) => sum + (i.qty || 1), 0);

  const handleCheckout = () => {
    if (!isLoggedIn) { router.push("/login"); return; }
    router.push("/checkout");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingCart size={28} className="text-red-600" />
          <h1 className="text-2xl font-bold text-slate-900">Keranjang</h1>
          {totalItems > 0 && <span className="text-sm text-slate-400">({totalItems} item)</span>}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">Keranjang kosong</p>
            <p className="text-sm text-slate-400 mt-1">Tambahkan karya dari Toko Karya</p>
            <Link href="/marketplace" className="mt-4 inline-block text-red-600 font-semibold hover:underline">Jelajahi Toko Karya →</Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center text-2xl shrink-0">
                    📦
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/marketplace/${item.id}`} className="font-semibold text-slate-900 hover:text-red-600 line-clamp-1">{item.title}</Link>
                    <p className="text-xs text-slate-400 mt-0.5">{item.seller}</p>
                    <p className="text-sm font-bold text-red-600 mt-1">Rp {item.price.toLocaleString("id")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Minus size={14} /></button>
                    <span className="w-8 text-center font-semibold text-sm">{item.qty || 1}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600">Total ({totalItems} item)</span>
                <span className="text-2xl font-bold text-red-600">Rp {total.toLocaleString("id")}</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">Harga sudah termasuk PPN</p>
              {!isLoggedIn && (
                <p className="text-xs text-amber-600 mb-3 flex items-center gap-1"><LogIn size={12} /> Login dulu untuk checkout</p>
              )}
              <button onClick={handleCheckout} disabled={!isLoggedIn}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-40">
                Checkout ({totalItems} item)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
