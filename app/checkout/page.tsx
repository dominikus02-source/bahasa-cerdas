"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

declare global {
  interface Window {
    snap?: { pay: (token: string, options?: { onSuccess: Function; onPending: Function; onError: Function; onClose: Function }) => void };
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    if (!clientKey) return;
    const isProd = window.location.hostname === "bahasacerdas.com";
    const script = document.createElement("script");
    script.src = isProd ? "https://app.midtrans.com/snap/snap.js" : "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute("data-client-key", clientKey);
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("bc-cart") || "[]");
    if (cart.length === 0) router.push("/cart");
    setItems(cart);
  }, []);

  const total = items.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const totalItems = items.reduce((s, i) => s + (i.qty || 1), 0);
  const hasPaid = items.some(i => i.price > 0);

  const handlePay = async () => {
    setLoading(true);
    setError("");

    try {
      // Process all items — collect tokens for paid items
      for (const item of items) {
        const res = await fetch("/api/marketplace/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ karyaId: item.id }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal checkout");

        // If paid item -> open Snap popup
        if (data.token && window.snap) {
          localStorage.removeItem("bc-cart");
          window.snap.pay(data.token, {
            onSuccess: () => { setSuccess(true); },
            onPending: () => { setSuccess(true); },
            onError: () => { setError("Pembayaran gagal, silakan coba lagi."); setLoading(false); },
            onClose: () => { if (!success) setLoading(false); },
          });
          return; // Snap handles the flow from here
        }

        // If redirect URL (fallback)
        if (data.redirectUrl) {
          localStorage.removeItem("bc-cart");
          window.location.href = data.redirectUrl;
          return;
        }
      }

      // All free items — done
      localStorage.removeItem("bc-cart");
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || "Gagal memproses pembayaran");
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
        <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 mb-6 transition-colors">
          <ArrowLeft size={16} /> Kembali ke Keranjang
        </button>

        <h1 className="text-2xl font-bold text-slate-900 mb-8">Checkout</h1>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Ringkasan Pesanan ({totalItems} item)</h2>
          <div className="space-y-3">
            {items.map((item, i) => (
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
      </div>
    </div>
  );
}
