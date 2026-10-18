"use client";

import { useCallback, useEffect, useState } from "react";
import { Receipt, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { reconcilePayment } from "@/lib/billing/reconcile-client";
import { StatusBadge, formatTanggal } from "./parts";
import "./billing.css";

export interface HistoryItem {
  orderId: string;
  planId: string;
  label: string;
  amount: number;
  hargaAsli: number | null;
  kuponKode: string | null;
  status: string;
  createdAt: string;
}

/** Riwayat pembayaran paket milik pengguna, dengan "Cek lagi" untuk yang menunggu. */
export default function PaymentHistory({ refreshKey = 0, onPaid }: { refreshKey?: number; onPaid?: () => void }) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/riwayat", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      setItems(res.ok && data?.ok ? (data.items as HistoryItem[]) : []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const recheck = async (orderId: string) => {
    setBusy(orderId);
    const status = await reconcilePayment(orderId);
    await load();
    setBusy(null);
    if (status === "SUCCESS") onPaid?.();
  };

  return (
    <section className="bp-card" aria-labelledby="bp-riwayat">
      <p className="bp-eyebrow">Riwayat</p>
      <h2 id="bp-riwayat" className="bp-h2">Pembayaran kamu</h2>
      {items === null ? (
        <p className="bp-small" style={{ marginTop: 12 }}>Memuat…</p>
      ) : items.length === 0 ? (
        <div className="bp-empty">
          <span className="bp-empty__icon" aria-hidden="true"><Receipt size={26} /></span>
          <p className="bp-h3" style={{ fontSize: 14 }}>Belum ada pembayaran</p>
          <p className="bp-small" style={{ margin: 0 }}>Pembayaran paket muncul di sini.</p>
        </div>
      ) : (
        <ul className="bp-history">
          {items.slice(0, 8).map((it) => (
            <li key={it.orderId}>
              <span className="bp-history__title">{it.label}</span>
              <span className="bp-history__amount">{formatCurrency(it.amount)}</span>
              <span className="bp-history__meta">
                <StatusBadge status={it.status} />
                <span>{formatTanggal(it.createdAt, { short: true })}</span>
                {it.kuponKode && <span>Promo {it.kuponKode}</span>}
                {(it.status === "PENDING" || it.status === "REPLACED") && (
                  <button type="button" className="bp-chip" style={{ minHeight: 36 }} onClick={() => recheck(it.orderId)} disabled={busy === it.orderId}>
                    <RefreshCw size={14} aria-hidden="true" className={busy === it.orderId ? "bp-spin" : undefined} /> Cek lagi
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
