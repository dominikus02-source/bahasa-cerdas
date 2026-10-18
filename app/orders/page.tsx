"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, LogIn, RefreshCw, ShoppingBag, Store } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { reconcilePayment } from "@/lib/billing/reconcile-client";
import { StatusBadge, formatTanggal } from "@/components/billing/parts";
import PaymentHistory from "@/components/billing/PaymentHistory";
import "@/components/billing/billing.css";

interface Order {
  id: string;
  karya?: { title?: string; fileUrl?: string | null } | null;
  amount?: number;
  status: string;
  midtransOrderId?: string | null;
  createdAt: string;
}

const STATUS: Record<string, string> = { PAID: "SUCCESS", COMPLETED: "SUCCESS", PENDING: "PENDING", EXPIRED: "EXPIRED", CANCELLED: "CANCELLED", REFUNDED: "REFUNDED" };

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/marketplace/order", { cache: "no-store" });
      if (res.status === 401) {
        setNeedLogin(true);
        setOrders([]);
        return;
      }
      const d = await res.json().catch(() => ({}));
      setOrders(Array.isArray(d.orders) ? d.orders : []);
    } catch {
      setOrders([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const recheck = async (orderId: string) => {
    setBusy(orderId);
    await reconcilePayment(orderId);
    await load();
    setBusy(null);
  };

  return (
    <main style={{ minHeight: "100dvh", background: "var(--clr-bg)", color: "var(--clr-text)", padding: "16px 16px 40px" }}>
      <div className="bp" style={{ maxWidth: "48rem" }}>
        <section className="bp-card bp-card--accent bp-in">
          <div className="bp-head">
            <span className="bp-icon" aria-hidden="true"><ShoppingBag size={22} /></span>
            <div style={{ minWidth: 0 }}>
              <p className="bp-eyebrow">Riwayat transaksi</p>
              <h1 className="bp-h1">Pesanan saya</h1>
              <p className="bp-text">Karya yang kamu beli dan statusnya.</p>
            </div>
          </div>
          <div className="bp-actions bp-actions--row">
            <Link href="/marketplace" className="bp-ghost"><Store size={18} aria-hidden="true" /> Toko Karya</Link>
            <Link href="/" className="bp-ghost">Beranda</Link>
          </div>
        </section>

        {needLogin ? (
          <section className="bp-card">
            <div className="bp-empty">
              <span className="bp-empty__icon" aria-hidden="true"><LogIn size={24} /></span>
              <p className="bp-h3">Masuk untuk melihat pesanan</p>
              <Link href="/login?next=/orders" className="bp-btn" style={{ marginTop: 8 }}>Masuk</Link>
            </div>
          </section>
        ) : (
          <section className="bp-card" aria-labelledby="daftar-pesanan">
            <h2 id="daftar-pesanan" className="bp-h2">Karya</h2>
            {orders === null ? (
              <p className="bp-small" style={{ marginTop: 12 }}>Memuat…</p>
            ) : orders.length === 0 ? (
              <div className="bp-empty">
                <span className="bp-empty__icon" aria-hidden="true"><ShoppingBag size={24} /></span>
                <p className="bp-h3">Belum ada pesanan</p>
                <Link href="/marketplace" className="bp-link" style={{ fontSize: 14 }}>Jelajahi Toko Karya</Link>
              </div>
            ) : (
              <ul className="bp-history">
                {orders.map((o) => {
                  const status = STATUS[o.status] || "FAILED";
                  return (
                    <li key={o.id}>
                      <span className="bp-history__title" style={{ overflowWrap: "anywhere" }}>{o.karya?.title || "Karya"}</span>
                      <span className="bp-history__amount">{formatCurrency(o.amount || 0)}</span>
                      <span className="bp-history__meta">
                        <StatusBadge status={status} />
                        <span>{formatTanggal(o.createdAt, { short: true })}</span>
                        {status === "SUCCESS" && o.karya?.fileUrl && (
                          <a href={o.karya.fileUrl} download className="bp-chip" style={{ minHeight: 36, textDecoration: "none" }}>
                            <Download size={14} aria-hidden="true" /> Unduh
                          </a>
                        )}
                        {status === "PENDING" && o.midtransOrderId && (
                          <button type="button" className="bp-chip" style={{ minHeight: 36 }} onClick={() => recheck(o.midtransOrderId!)} disabled={busy === o.midtransOrderId}>
                            <RefreshCw size={14} aria-hidden="true" className={busy === o.midtransOrderId ? "bp-spin" : undefined} /> Cek lagi
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {!needLogin && orders !== null && <PaymentHistory />}
      </div>
    </main>
  );
}
