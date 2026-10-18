"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, ChevronDown, Crown, Info, Loader2, Minus } from "lucide-react";
import { loadMidtransSnap } from "@/lib/midtrans-client";
import { reconcilePayment } from "@/lib/billing/reconcile-client";
import { paymentErrorMessage, PAYMENT_HELP_CODES } from "@/lib/billing/messages";
import { formatCurrency } from "@/lib/format";
import CouponInput, { AppliedCoupon } from "@/components/billing/CouponInput";
import PaymentStatusPanel, { PanelView, fetchPaymentView } from "@/components/billing/PaymentStatusPanel";
import PaymentHistory from "@/components/billing/PaymentHistory";
import { PayMethods, PlanPicker, PriceSummary, ProBadge, formatTanggal, sisaHari } from "@/components/billing/parts";
import "@/components/billing/billing.css";

type GuruPlan = "GURU_PRO_MONTHLY" | "GURU_PRO_YEARLY";

const PLANS: Record<GuruPlan, { name: string; label: string; price: number; note: string; period: string; badge?: string }> = {
  GURU_PRO_MONTHLY: { name: "Bulanan", label: "Guru Pro Bulanan", price: 49000, note: "30 hari", period: "Aktif 30 hari" },
  GURU_PRO_YEARLY: { name: "Tahunan", label: "Guru Pro Tahunan", price: 399000, note: "365 hari · ± Rp 33.250/bulan", period: "Aktif 365 hari", badge: "Hemat Rp 189.000" },
};

/** Kode Program Guru Cerdas — hanya untuk paket Bulanan. */
const PROMO_GURU = "bcgurucerdas1000";

const COMPARE: Array<[string, string, string]> = [
  ["Kredit AI per bulan", "30", "500"],
  ["Pakai AI per hari", "20×", "200×"],
  ["Unduh dokumen per hari", "1×", "10×"],
  ["Simpan hasil AI", "50", "Tanpa batas"],
  ["Jual karya berbayar", "", "Ya · 85%"],
  ["Bantuan prioritas", "", "Ya"],
];

interface UserInfo { isPremium: boolean; premiumPlan: string; premiumUntil: string | null }
interface PlanInfo { isTrial: boolean; daysRemaining: number }

export default function BerlanggananPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [plan, setPlan] = useState<GuruPlan>("GURU_PRO_YEARLY");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [order, setOrder] = useState<PanelView | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me?fresh=1", { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
      const d = await res.json();
      const next: UserInfo = {
        isPremium: d.isPremium || d.user?.isPremium || false,
        premiumPlan: d.premiumPlan || d.user?.premiumPlan || "FREE",
        premiumUntil: d.premiumUntil || d.user?.premiumUntil || null,
      };
      setUser(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  const showOrder = useCallback(async (orderId: string, fallback: PanelView["status"] = "PENDING") => {
    await reconcilePayment(orderId);
    const view = await fetchPaymentView(orderId);
    setOrder(view ?? { orderId, status: fallback, kind: "GURU_PRO", planLabel: null, owner: null });
    setHistoryKey((k) => k + 1);
    if (view?.status === "SUCCESS") await refreshUser();
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [refreshUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("plan") === "monthly") setPlan("GURU_PRO_MONTHLY");
    const orderId = params.get("order_id");
    refreshUser().finally(() => setUserLoading(false));
    if (orderId) void showOrder(orderId);
    fetch("/api/ai/quota/status")
      .then((r) => r.json())
      .then((d) => d?.plan && setPlanInfo({ isTrial: !!d.isTrial, daysRemaining: d.daysRemaining || 0 }))
      .catch(() => {});
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
        body: JSON.stringify({ planId: plan, ...(coupon ? { couponCode: coupon.kode } : {}) }),
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
  }, [plan, coupon, refreshUser, showOrder]);

  if (userLoading) {
    return (
      <div className="bp" style={{ placeItems: "center", minHeight: "50vh" }} aria-busy="true">
        <Loader2 size={24} className="bp-spin" style={{ color: "var(--clr-accent)" }} aria-label="Memuat" />
      </div>
    );
  }

  const until = user?.premiumUntil ?? null;
  const daysLeft = sisaHari(until);
  const active = Boolean(user?.isPremium) && (!until || daysLeft > 0);
  const expired = Boolean(until) && daysLeft === 0;
  const current = PLANS[plan];
  const total = coupon ? coupon.hargaDiskon : current.price;
  const choose = (id: string) => {
    setPlan(id as GuruPlan);
    setCoupon(null);
    setError(null);
  };
  // Panel status hanya untuk pesanan yang belum menjadi Pro aktif atau baru lunas.
  const showPanel = order && !(order.status === "REPLACED" && active);

  return (
    <div className="bp">
      <section className="bp-card bp-card--accent bp-in">
        <div className="bp-head">
          <span className="bp-icon bp-icon--lg" aria-hidden="true"><Crown size={26} /></span>
          <div style={{ minWidth: 0 }}>
            <p className="bp-eyebrow">Paket guru</p>
            <h1 className="bp-h1">Guru Pro</h1>
            <p className="bp-text">Kredit AI, unduhan, dan hak jual karya lebih banyak untuk mengajar tiap hari.</p>
          </div>
        </div>
        <div className="bp-badges" style={{ marginTop: 14 }}>
          {active ? (
            <>
              <ProBadge label="Guru Pro" />
              <span className="bp-badge bp-badge--ok">{until ? `Aktif sampai ${formatTanggal(until, { short: true })}` : "Aktif"}</span>
            </>
          ) : expired ? (
            <span className="bp-badge bp-badge--bad">Masa Pro habis</span>
          ) : planInfo?.isTrial ? (
            <span className="bp-badge bp-badge--wait">Masa coba · {planInfo.daysRemaining} hari lagi</span>
          ) : (
            <span className="bp-badge bp-badge--mute">Paket Gratis</span>
          )}
        </div>
        {active && until && (
          <p className="bp-small" style={{ margin: "8px 0 0" }}>
            Tersisa {daysLeft} hari. Bayar lagi untuk menambah masa aktif.
          </p>
        )}
      </section>

      {notice && (
        <p className="bp-alert bp-alert--info" role="status"><Info size={18} aria-hidden="true" />{notice}</p>
      )}

      {showPanel && (
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
          <p className="bp-eyebrow">Langkah 1</p>
          <h2 id="pilih-paket" className="bp-h2">{active ? "Perpanjang paket" : "Pilih paket"}</h2>
          <PlanPicker
            label="Paket Guru Pro"
            value={plan}
            onChange={choose}
            options={(Object.keys(PLANS) as GuruPlan[]).map((id) => ({ id, ...PLANS[id] }))}
          />

          <div style={{ marginTop: 16 }}>
            {plan === "GURU_PRO_MONTHLY" ? (
              <CouponInput
                planId={plan}
                price={current.price}
                value={coupon}
                onChange={setCoupon}
                suggestedCode={PROMO_GURU}
                suggestedLabel="Program Guru Cerdas · Rp 1.000"
              />
            ) : (
              <>
                <CouponInput planId={plan} price={current.price} value={coupon} onChange={setCoupon} />
                <p className="bp-small" style={{ margin: "8px 4px 0" }}>
                  Promo Guru Cerdas Rp 1.000 khusus paket Bulanan.{" "}
                  <button type="button" className="bp-link" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit", fontWeight: 700 }} onClick={() => choose("GURU_PRO_MONTHLY")}>
                    Pilih Bulanan
                  </button>
                </p>
              </>
            )}
          </div>

          <PriceSummary
            planName={current.label}
            price={current.price}
            promo={coupon ? { kode: coupon.kode, hargaDiskon: coupon.hargaDiskon } : null}
            period={current.period}
          />

          {error && (
            <div className="bp-alert" role="alert" style={{ marginTop: 14 }}>
              <AlertCircle size={18} aria-hidden="true" />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700 }}>{error.message}</p>
                {PAYMENT_HELP_CODES.has(error.code) && (
                  <p className="bp-small" style={{ margin: "4px 0 0" }}>
                    Kode {error.code} · <a href="/guru/bantuan/pembayaran" className="bp-link">Bantuan pembayaran</a>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="bp-actions">
            <button type="button" className="bp-btn" onClick={pay} disabled={loading}>
              {loading ? <Loader2 size={18} className="bp-spin" aria-hidden="true" /> : null}
              {loading ? "Membuka pembayaran…" : `${active ? "Perpanjang" : "Bayar"} ${formatCurrency(total)}`}
            </button>
          </div>
          <PayMethods />
        </section>

        <div className="bp-stack">
          <section className="bp-card bp-in" aria-labelledby="yang-didapat">
            <p className="bp-eyebrow">Yang kamu dapat</p>
            <h2 id="yang-didapat" className="bp-h2">Gratis dan Pro</h2>
            <div className="bp-compare" role="table" aria-label="Perbandingan paket Gratis dan Guru Pro">
              <div className="bp-compare__row bp-compare__head" role="row">
                <span role="columnheader">Fitur</span>
                <span role="columnheader">Gratis</span>
                <span role="columnheader">Pro</span>
              </div>
              {COMPARE.map(([label, free, pro]) => (
                <div key={label} className="bp-compare__row" role="row">
                  <span role="cell">{label}</span>
                  <span role="cell">{free || <Minus size={14} aria-label="Tidak" />}</span>
                  <span role="cell">{pro === "Ya" ? <Check size={16} aria-label="Ya" /> : pro}</span>
                </div>
              ))}
            </div>
          </section>

          <PaymentHistory refreshKey={historyKey} onPaid={() => void refreshUser()} />

          <section className="bp-card">
            <details className="bp-details">
              <summary>Ketentuan dan bantuan <ChevronDown size={18} aria-hidden="true" /></summary>
              <ul>
                <li>Sekali bayar, tanpa perpanjangan otomatis.</li>
                <li>Masa aktif dihitung sejak lunas. Bayar saat Pro aktif menambah masa aktif.</li>
                <li>Setelah masa aktif habis, akun kembali ke paket Gratis.</li>
                <li>Pro belum aktif 5 menit setelah lunas? Tekan <b>Cek lagi</b> di riwayat, lalu buka <a href="/guru/bantuan/pembayaran" className="bp-link">bantuan pembayaran</a>.</li>
              </ul>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}
