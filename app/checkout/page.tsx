"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("bc-cart") || "[]");
    if (cart.length === 0) router.push("/cart");
    setItems(cart);
  }, []);

  const total = items.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const totalItems = items.reduce((s, i) => s + (i.qty || 1), 0);

  const handlePay = async () => {
    setLoading(true);
    setError("");
    try {
      // Create orders for each item
      for (const item of items) {
        const res = await fetch("/api/marketplace/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ karyaId: item.id }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal checkout");
        }
      }

      // Create Midtrans invoice
      const invoiceRes = await fetch("/api/payment/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({
            id: i.id,
            name: i.title,
            price: i.price,
            quantity: i.qty || 1,
          })),
          total,
        }),
      });

      const invoiceData = await invoiceRes.json();
      if (invoiceData.invoice?.invoice_url) {
        localStorage.removeItem("bc-cart");
        window.location.href = invoiceData.invoice.invoice_url;
      } else {
        setPaymentUrl("/orders");
        localStorage.removeItem("bc-cart");
      }
    } catch (e: any) {
      setError(e.message || "Gagal memproses pembayaran");
    }
    setLoading(false);
  };

  if (paymentUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center max-w-md mx-auto px-4">
          <CheckCircle size={64} className="text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Pesanan Dibuat!</h1>
          <p className="text-slate-500 mb-6">Kami akan memproses pesanan kamu. Cek status di halaman pesanan.</p>
          <button onClick={() => router.push("/orders")} className="bg-gradient-to-r from-red-600 to-red-700 text-white font-bold px-8 py-3 rounded-2xl shadow-lg">
            Lihat Pesanan Saya
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 mb-6">
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
            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Memproses...</>
          ) : (
            <><ShoppingBag size={20} /> Bayar Rp {total.toLocaleString("id")}</>
          )}
        </button>

        <p className="text-xs text-slate-400 text-center mt-4">Pembayaran diproses oleh Midtrans. Data kamu aman.</p>
      </div>
    </div>
  );
}
