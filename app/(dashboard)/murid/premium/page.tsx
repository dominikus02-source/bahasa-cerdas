"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, BarChart3, Brain, Check, ChevronDown, Gem, Info, Loader2, Minus, Target } from "lucide-react";
import { loadMidtransSnap } from "@/lib/midtrans-client";
import { reconcilePayment } from "@/lib/billing/reconcile-client";
import { paymentErrorMessage, PAYMENT_HELP_CODES } from "@/lib/billing/messages";
import { formatCurrency } from "@/lib/format";
import PaymentStatusPanel, { PanelView, fetchPaymentView } from "@/components/billing/PaymentStatusPanel";
import PaymentHistory from "@/components/billing/PaymentHistory";
import { PayMethods, PlanPicker, PriceSummary, ProBadge, formatTanggal, sisaHari } from "@/components/billing/parts";
import "@/components/billing/billing.css";

type MuridPlan = "MURID_PREMIUM_MONTHLY" | "MURID_PREMIUM_YEARLY";

const PLANS: Record<MuridPlan, { name: string; label: string; price: number; note: string; period: string; badge?: string }> = {
  MURID_PREMIUM_MONTHLY: { name: "Bulanan", label: "Premium Bulanan", price: 19000, note: "30 hari", period: "Aktif 30 hari" },
  MURID_PREMIUM_YEARLY: { name: "Tahunan", label: "Premium Tahunan", price: 180000, note: "365 hari · ± Rp 15.000/bulan", period: "Aktif 365 hari", badge: "Hemat Rp 48.000" },
};

const COMPARE: Array<[string, string, string]> = [
  ["Latihan personal", "", "Ya"],
  ["Mentor AI: kenapa salah?", "", "Ya"],
  ["Ringkasan perkembangan", "", "Mingguan"],
  ["Simulasi UKBI/TKA", "3/bulan", "10/bulan"],
  ["Peta kemampuan", "Dasar", "Rinci"],
  ["Jaga runtunan", "", "1/bulan"],
  ["Bingkai & gelar profil", "", "Ya"],
];

interface UserInfo { isPremium: boolean; premiumUntil: string | null }

export default function MuridPremiumPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [plan, setPlan] = useState<MuridPlan>("MURID_PREMIUM_YEARLY");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [order, setOrder] = useState<PanelView | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me?fresh=1", { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
      const d = await res.json();
      const u = d.user || d;
      const next: UserInfo = { isPremium: Boolean(u.isPremium), premiumUntil: u.premiumUntil || null };
      setUser(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  const showOrder = useCallback(async (orderId: string, fallback: PanelView["status"] = "PENDING") => {
    await reconcilePayment(orderId);
    const view = await fetchPaymentView(orderId);
    setOrder(view ?? { orderId, status: fallback, kind: "MURID_PREMIUM", planLabel: null, owner: null });
    setHistoryKey((k) => k + 1);
    if (view?.status === "SUCCESS") await refreshUser();
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [refreshUser]);

  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get("order_id");
    refreshUser().finally(() => setUserLoading(false));
    if (orderId) void showOrder(orderId);
    loadMidtransSnap(process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "").catch(() => {});
  }, [refreshUser, showOrder]);

  const pay = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.ok === false) {
        const code = result.error || "CHECKOUT_FAILED";
        setError({ code, message: paymentErrorMessage(code, result.message) });
        return;
      }
      if (result.bypass) {
        setNotice(result.message || "Akun pendiri/admin — Premium aktif tanpa pembayaran.");
        await refreshUser();
        return;
      }
      const orderId: string | null = typeof result.orderId === "string" ? result.orderId : null;
      const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
      if (result.token && clientKey && (await loadMidtransSnap(clientKey).catch(() => false)) && window.snap) {
        window.snap.pay(result.token, {
          onSuccess: () => { if (orderId) void showOrder(orderId, "SUCCESS"); },
          onPending: () => { if (orderId) void showOrder(orderId); },
          onError: () => setError({ code: "SNAP_FAILED", message: paymentErrorMessage("SNAP_FAILED") }),
          onClose: () => setHistoryKey((k) => k + 1),
        });
        return;
      }
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      setError({ code: "SNAP_UNAVAILABLE", message: paymentErrorMessage("SNAP_UNAVAILABLE") });
    } catch {
      setError({ code: "NETWORK", message: paymentErrorMessage("NETWORK") });
    } finally {
      setLoading(false);
    }
  }, [plan, refreshUser, showOrder]);

  if (userLoading) {
    return (
      <div className="bp" data-tone="murid" style={{ placeItems: "center", minHeight: "50vh" }} aria-busy="true">
        <Loader2 size={24} className="bp-spin" style={{ color: "var(--clr-violet)" }} aria-label="Memuat" />
      </div>
    );
  }

  const until = user?.premiumUntil ?? null;
  const daysLeft = sisaHari(until);
  const active = Boolean(user?.isPremium) && (!until || daysLeft > 0);
  const current = PLANS[plan];

  return (
    <div className="bp" data-tone="murid">
      <section className="bp-card bp-card--accent bp-in">
        <div className="bp-head">
          <span className="bp-icon bp-icon--lg" aria-hidden="true"><Gem size={26} /></span>
          <div style={{ minWidth: 0 }}>
            <p className="bp-eyebrow">Paket murid</p>
            <h1 className="bp-h1">{active ? "Premium aktif" : "Premium"}</h1>
            <p className="bp-text">
              {active
                ? "Latihan personal, Mentor AI, dan ringkasan perkembangan sudah terbuka."
                : "Latihan yang menyesuaikan kemampuanmu, dengan Mentor AI yang menjelaskan kesalahan."}
            </p>
          </div>
        </div>
        <div className="bp-badges" style={{ marginTop: 14 }}>
          {active ? (
            <>
              <ProBadge label="Premium" />
              <span className="bp-badge bp-badge--ok">{until ? `Sampai ${formatTanggal(until, { short: true })}` : "Aktif"}</span>
            </>
          ) : (
            <span className="bp-badge bp-badge--mute">Paket Gratis</span>
          )}
        </div>
        {active && (
          <>
            {until && daysLeft <= 7 && (
              <p className="bp-alert bp-alert--info" style={{ marginTop: 12 }}>
                <Info size={18} aria-hidden="true" />Tinggal {daysLeft} hari. Perpanjang agar belajarmu tidak terputus.
              </p>
            )}
            <div className="bp-actions" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(9.5rem, 1fr))" }}>
              <Link href="/murid/belajar" className="bp-ghost"><Target size={18} aria-hidden="true" /> Latihan</Link>
              <Link href="/murid/mentor" className="bp-ghost"><Brain size={18} aria-hidden="true" /> Mentor AI</Link>
              <Link href="/murid/progresku" className="bp-ghost"><BarChart3 size={18} aria-hidden="true" /> Perkembangan</Link>
            </div>
          </>
        )}
      </section>

      {notice && (
        <p className="bp-alert bp-alert--info" role="status"><Info size={18} aria-hidden="true" />{notice}</p>
      )}

      {order && !(order.status === "REPLACED" && active) && (
        <div ref={panelRef} style={{ scrollMarginTop: 80 }}>
          <PaymentStatusPanel
            key={order.orderId + order.status}
            initial={order}
            loggedIn
            onSettled={() => { void refreshUser(); setHistoryKey((k) => k + 1); }}
          />
        </div>
      )}

      <div className="bp-grid bp-grid--2">
        <section className="bp-card bp-in" aria-labelledby="pilih-paket">
          <p className="bp-eyebrow">{active ? "Perpanjang" : "Pilih paket"}</p>
          <h2 id="pilih-paket" className="bp-h2">{active ? "Tambah masa aktif" : "Mulai Premium"}</h2>
          <PlanPicker
            label="Paket Premium"
            value={plan}
            onChange={(id) => { setPlan(id as MuridPlan); setError(null); }}
            options={(Object.keys(PLANS) as MuridPlan[]).map((id) => ({ id, ...PLANS[id] }))}
          />
          <PriceSummary planName={current.label} price={current.price} promo={null} period={current.period} />

          {error && (
            <div className="bp-alert" role="alert" style={{ marginTop: 14 }}>
              <AlertCircle size={18} aria-hidden="true" />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700 }}>{error.message}</p>
                {PAYMENT_HELP_CODES.has(error.code) && <p className="bp-small" style={{ margin: "4px 0 0" }}>Kode {error.code}</p>}
              </div>
            </div>
          )}

          <div className="bp-actions">
            <button type="button" className="bp-btn" onClick={pay} disabled={loading}>
              {loading ? <Loader2 size={18} className="bp-spin" aria-hidden="true" /> : null}
              {loading ? "Membuka pembayaran…" : `${active ? "Perpanjang" : "Bayar"} ${formatCurrency(current.price)}`}
            </button>
          </div>
          <PayMethods />
        </section>

        <div className="bp-stack">
          <section className="bp-card bp-in" aria-labelledby="yang-didapat">
            <p className="bp-eyebrow">Yang kamu dapat</p>
            <h2 id="yang-didapat" className="bp-h2">Gratis dan Premium</h2>
            <div className="bp-compare" role="table" aria-label="Perbandingan paket Gratis dan Premium">
              <div className="bp-compare__row bp-compare__head" role="row">
                <span role="columnheader">Fitur</span>
                <span role="columnheader">Gratis</span>
                <span role="columnheader">Premium</span>
              </div>
              {COMPARE.map(([label, free, pro]) => (
                <div key={label} className="bp-compare__row" role="row">
                  <span role="cell">{label}</span>
                  <span role="cell">{free || <Minus size={14} aria-label="Tidak" />}</span>
                  <span role="cell">{pro === "Ya" ? <Check size={16} aria-label="Ya" /> : pro}</span>
                </div>
              ))}
            </div>
            <p className="bp-small" style={{ margin: "10px 0 0" }}>Jalur Cerdas, XP, koin, dan lencana tetap gratis untuk semua.</p>
          </section>

          <PaymentHistory refreshKey={historyKey} onPaid={() => void refreshUser()} />

          <section className="bp-card">
            <details className="bp-details">
              <summary>Ketentuan <ChevronDown size={18} aria-hidden="true" /></summary>
              <ul>
                <li>Sekali bayar, tanpa perpanjangan otomatis.</li>
                <li>Bayar saat Premium aktif menambah masa aktif.</li>
                <li>Setelah masa aktif habis, akun kembali ke paket Gratis. Data belajarmu tetap tersimpan.</li>
              </ul>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}
