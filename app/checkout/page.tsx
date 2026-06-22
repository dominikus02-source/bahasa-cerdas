"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { loadMidtransSnap } from "@/lib/midtrans-client";

declare global {
  interface Window {
    snap?: { pay: (token: string, options?: { onSuccess: Function; onPending: Function; onError: Function; onClose: Function }) => void };
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Silakan login terlebih dahulu.",
  CART_EMPTY: "Keranjang Anda masih kosong.",
  INVALID_ITEM: "Item tidak valid.",
  ITEM_NOT_FOUND: "Item tidak ditemukan.",
  ITEM_NOT_PURCHASABLE: "Item tidak tersedia untuk dibeli.",
  MIDTRANS_UNAUTHORIZED: "Kredensial pembayaran belum sesuai. Silakan hubungi admin.",
  MIDTRANS_CONFIG_MISSING: "Konfigurasi pembayaran belum lengkap. Silakan hubungi admin.",
  MIDTRANS_MODE_MISMATCH: "Mode pembayaran tidak konsisten. Silakan hubungi admin.",
  MIDTRANS_CREATE_FAILED: "Pembayaran belum bisa dibuat. Silakan coba beberapa saat lagi.",
  CHECKOUT_DB_FAILED: "Gagal menyimpan pesanan. Silakan coba lagi.",
};

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const snapReady = useRef(false);

  useEffect(() => {
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
    loadMidtransSnap(clientKey)
      .then((loaded) => { snapReady.current = loaded; })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("bc-cart") || "[]");
    if (cart.length === 0) router.push("/cart");
    setItems(cart);
  }, [router]);

  const total = items.reduce((s: number, i: any) => s + i.price * (i.qty || 1), 0);
  const totalItems = items.reduce((s: number, i: any) => s + (i.qty || 1), 0);
  const hasPaid = items.some((i: any) => i.price > 0);

  const handlePay = async () => {
    setLoading(true);
    setError("");

    try {
      const payload = {
        items: items.map((i: any) => ({
          karyaId: i.id,
          quantity: i.qty || 1,
        })),
      };

      const res = await fetch("/api/marketplace/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        const code = data.error || "";
        const msg = data.message || ERROR_MESSAGES[code] || "Gagal memproses pembayaran.";
        setError(msg);
        setLoading(false);
        return;
      }

      if (data.redirectUrl) {
        localStorage.removeItem("bc-cart");
        window.dispatchEvent(new Event("cart-update"));
        window.location.href = data.redirectUrl;
        return;
      }

      if (data.token && window.snap) {
        window.snap.pay(data.token, {
          onSuccess: () => { localStorage.removeItem("bc-cart"); window.dispatchEvent(new Event("cart-update")); setSuccess(true); setLoading(false); },
          onPending: () => { setSuccess(true); setLoading(false); },
          onError: () => {
            if (data.redirectUrl) {
              window.location.href = data.redirectUrl;
            } else {
              setError("Pembayaran gagal, silakan coba lagi.");
              setLoading(false);
            }
          },
          onClose: () => { setLoading(false); },
        });
        return;
      }

      setSuccess(true);
    } catch (e: any) {
      setError("Tidak bisa menghubungi server pembayaran. Periksa koneksi internet Anda.");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Pembayaran Berhasil!</h1>
          <p className="text-slate-500 mb-2">Karya akan dikirim ke email kamu.</p>
          <p className="text-slate-400 text-sm mb-8">Cek email atau lihat di halaman pesanan.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push("/orders")} className="bg-gradient-to-r from-red-600 to-red-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all">
              Lihat Pesanan
            </button>
            <button onClick={() => router.push("/marketplace")} className="bg-white border-2 border-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-2xl hover:bg-slate-50 transition-all">
              Belanja Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => router.push("/cart")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 mb-6 transition-colors">
          <ArrowLeft size={16} /> Kembali ke Keranjang
        </button>

        <h1 className="text-2xl font-bold text-slate-900 mb-8">Checkout</h1>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
            <a href="/guru/bantuan/pembayaran" className="text-xs text-red-600 hover:underline mt-2 inline-block">
              Lihat bantuan pembayaran →
            </a>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Ringkasan Pesanan ({totalItems} item)</h2>
          <div className="space-y-3">
            {items.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 line-clamp-1">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.qty || 1}x Rp {item.price.toLocaleString("id")}</p>
                </div>
                <p className="text-sm font-semibold text-slate-900 ml-4">Rp {((item.qty || 1) * item.price).toLocaleString("id")}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <span className="font-bold text-slate-900">Total</span>
            <span className="text-xl font-bold text-red-600">Rp {total.toLocaleString("id")}</span>
          </div>
          <a href="/cart" className="text-xs text-slate-400 hover:text-red-600 mt-2 inline-block underline">
            Edit item di keranjang →
          </a>
        </div>

        <button onClick={handlePay} disabled={loading || items.length === 0}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-4 rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2">
          {loading ? (
            <><Loader2 size={20} className="animate-spin" /> Memproses...</>
          ) : (
            <><ShoppingBag size={20} /> {hasPaid ? `Bayar Rp ${total.toLocaleString("id")}` : "Unduh Gratis"}</>
          )}
        </button>

        <p className="text-xs text-slate-400 text-center mt-4">
          Pembayaran diproses oleh Midtrans. Data kamu aman.
        </p>
        <p className="text-xs text-slate-400 text-center mt-1">
          <a href="/guru/bantuan/pembayaran" className="underline">Bantuan pembayaran</a>
        </p>
      </div>
    </div>
  );
}
