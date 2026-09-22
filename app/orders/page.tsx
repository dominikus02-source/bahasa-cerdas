"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Download, Clock, CheckCircle, XCircle, ArrowLeft, Store } from "lucide-react";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const [userResult, ordersResult] = await Promise.allSettled([
      fetchWithTimeout("/api/user/me"),
      fetchWithTimeout("/api/marketplace/order"),
    ]);
    setIsLoggedIn(userResult.status === "fulfilled" && userResult.value.ok);
    if (ordersResult.status === "fulfilled" && ordersResult.value.ok) {
      const data = await ordersResult.value.json();
      setOrders(data.orders || []);
    } else {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center">
          <ShoppingBag size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Login untuk lihat pesanan</p>
          <Link href="/login" className="mt-4 inline-block text-red-600 font-semibold hover:underline">Login →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingBag size={28} className="text-red-600" />
          <h1 className="text-2xl font-bold text-slate-900">Pesanan Saya</h1>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
          >
            <Store size={16} /> Toko Karya
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} /> Beranda
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Memuat...</div>
        ) : loadError ? (
          <div className="text-center py-20"><p className="text-slate-500">Pesanan belum bisa dimuat.</p><button onClick={() => void loadOrders()} className="mt-4 text-red-600 font-semibold hover:underline">Coba lagi</button></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">Belum ada pesanan</p>
            <Link href="/marketplace" className="mt-4 inline-block text-red-600 font-semibold hover:underline">Jelajahi Toko Karya →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{order.karya?.title || order.itemTitle}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(order.createdAt || order.soldAt).toLocaleDateString("id", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    order.status === "PAID" || order.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" :
                    order.status === "PENDING" ? "bg-amber-50 text-amber-700" :
                    "bg-red-50 text-red-700"
                  }`}>
                    {order.status === "PAID" || order.status === "COMPLETED" ? "Lunas" :
                     order.status === "PENDING" ? "Menunggu Pembayaran" : "Gagal"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-600">Rp {(order.amount || order.price || 0).toLocaleString("id")}</span>
                  {(order.status === "PAID" || order.status === "COMPLETED") && (
                    <a href={order.karya?.fileUrl || order.fileUrl} download
                      className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-semibold hover:underline">
                      <Download size={14} /> Unduh
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
