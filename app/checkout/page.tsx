"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, FileText, Loader2 } from "lucide-react";
import { loadMidtransSnap } from "@/lib/midtrans-client";
import { reconcilePayment } from "@/lib/billing/reconcile-client";
import { paymentErrorMessage, PAYMENT_HELP_CODES } from "@/lib/billing/messages";
import { formatCurrency } from "@/lib/format";
import PaymentStatusPanel, { PanelView, fetchPaymentView } from "@/components/billing/PaymentStatusPanel";
import { PayMethods } from "@/components/billing/parts";
import "@/components/billing/billing.css";

declare global {
  interface Window {
    snap?: { pay: (token: string, options?: { onSuccess: Function; onPending: Function; onError: Function; onClose: Function }) => void };
  }
}

interface CartItem { id: string; title: string; price: number; qty?: number }

function clearCart() {
  localStorage.removeItem("bc-cart");
  window.dispatchEvent(new Event("cart-update"));
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [order, setOrder] = useState<PanelView | null>(null);

  useEffect(() => {
    loadMidtransSnap(process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "").catch(() => {});
    let cart: CartItem[] = [];
    try { cart = JSON.parse(localStorage.getItem("bc-cart") || "[]"); } catch { cart = []; }
    if (cart.length === 0) router.push("/cart");
    setItems(cart);
  }, [router]);

  const showOrder = useCallback(async (orderId: string, fallback: PanelView["status"]) => {
    await reconcilePayment(orderId);
    const view = await fetchPaymentView(orderId);
    setOrder(view ?? { orderId, status: fallback, kind: "KARYA", planLabel: "Karya", owner: null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const list = items ?? [];
  const total = list.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const count = list.reduce((s, i) => s + (i.qty || 1), 0);
  const hasPaid = list.some((i) => i.price > 0);

  const pay = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: list.map((i) => ({ karyaId: i.id, quantity: i.qty || 1 })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        const code = data.error || "CHECKOUT_UNKNOWN_ERROR";
        setError({ code, message: paymentErrorMessage(code, data.message) });
        return;
      }
      const orderId: string | null = typeof data.orderId === "string" ? data.orderId : null;
      const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
      if (data.token && clientKey && (await loadMidtransSnap(clientKey).catch(() => false)) && window.snap) {
        window.snap.pay(data.token, {
          onSuccess: () => { clearCart(); if (orderId) void showOrder(orderId, "SUCCESS"); },
          // Pesanan sudah dibuat: kosongkan keranjang agar tidak terbayar dua kali.
          onPending: () => { clearCart(); if (orderId) void showOrder(orderId, "PENDING"); },
          onError: () => setError({ code: "SNAP_FAILED", message: paymentErrorMessage("SNAP_FAILED") }),
          onClose: () => {},
        });
        return;
      }
      if (data.redirectUrl) {
        clearCart();
        window.location.href = data.redirectUrl;
        return;
      }
      setError({ code: "SNAP_UNAVAILABLE", message: paymentErrorMessage("SNAP_UNAVAILABLE") });
    } catch {
      setError({ code: "NETWORK", message: paymentErrorMessage("NETWORK") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100dvh", background: "var(--clr-bg)", color: "var(--clr-text)", padding: "16px 16px 40px" }}>
      <div className="bp bp--narrow">
        {order ? (
          <>
            <PaymentStatusPanel key={order.orderId + order.status} initial={order} loggedIn />
            <Link href="/marketplace" className="bp-ghost">Belanja lagi</Link>
          </>
        ) : (
          <>
            <Link href="/cart" className="bp-ghost" style={{ justifySelf: "start", minHeight: 44, paddingLeft: 12 }}>
              <ArrowLeft size={18} aria-hidden="true" /> Keranjang
            </Link>
            <section className="bp-card bp-card--accent bp-in" aria-labelledby="judul-bayar">
              <p className="bp-eyebrow">Toko Karya</p>
              <h1 id="judul-bayar" className="bp-h1">Pembayaran</h1>
              <p className="bp-text">{count} karya · file dikirim ke emailmu setelah lunas.</p>

              {items === null ? (
                <p className="bp-small" style={{ marginTop: 16 }}>Memuat…</p>
              ) : (
                <ul className="bp-history" style={{ marginTop: 14 }}>
                  {list.map((item) => (
                    <li key={item.id}>
                      <span className="bp-history__title" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <FileText size={18} aria-hidden="true" style={{ flex: "0 0 auto", marginTop: 1, color: "var(--clr-text-3)" }} />
                        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{item.title}</span>
                      </span>
                      <span className="bp-history__amount">{formatCurrency(item.price * (item.qty || 1))}</span>
                      {(item.qty || 1) > 1 && (
                        <span className="bp-history__meta" style={{ paddingLeft: 28 }}>{item.qty} × {formatCurrency(item.price)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="bp-summary">
                <div className="bp-summary__total">
                  <p className="bp-eyebrow" style={{ margin: 0 }}>Total bayar</p>
                  <p className="bp-price" style={{ margin: 0 }}>{formatCurrency(total)}</p>
                </div>
              </div>

              {error && (
                <div className="bp-alert" role="alert" style={{ marginTop: 14 }}>
                  <AlertCircle size={18} aria-hidden="true" />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{error.message}</p>
                    {PAYMENT_HELP_CODES.has(error.code) && <p className="bp-small" style={{ margin: "4px 0 0" }}>Kode {error.code}</p>}
                    {["INVALID_ITEM", "ITEM_NOT_FOUND", "ITEM_NOT_PURCHASABLE", "CART_EMPTY"].includes(error.code) && (
                      <Link href="/cart" className="bp-link" style={{ fontSize: 14 }}>Ubah keranjang</Link>
                    )}
                  </div>
                </div>
              )}

              <div className="bp-actions">
                <button type="button" className="bp-btn" onClick={pay} disabled={loading || list.length === 0}>
                  {loading ? <Loader2 size={18} className="bp-spin" aria-hidden="true" /> : null}
                  {loading ? "Membuka pembayaran…" : hasPaid ? `Bayar ${formatCurrency(total)}` : "Unduh gratis"}
                </button>
              </div>
              {hasPaid && <PayMethods />}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
