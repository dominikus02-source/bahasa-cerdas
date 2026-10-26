"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, ChevronDown, Crown, Gift, Info, Loader2, Minus, Store } from "lucide-react";
import { loadMidtransSnap } from "@/lib/midtrans-client";
import { reconcilePayment } from "@/lib/billing/reconcile-client";
import { paymentErrorMessage, PAYMENT_HELP_CODES } from "@/lib/billing/messages";
import { formatCurrency } from "@/lib/format";
import type { UmumTrialView } from "@/lib/umum/trial";
import PaymentStatusPanel, { PanelView, fetchPaymentView } from "@/components/billing/PaymentStatusPanel";
import PaymentHistory from "@/components/billing/PaymentHistory";
import CouponInput, { AppliedCoupon } from "@/components/billing/CouponInput";
import { PayMethods, PlanPicker, PriceSummary, ProBadge, formatTanggal, sisaHari } from "@/components/billing/parts";
import "@/components/billing/billing.css";

export interface UmumPlanView { planId: string; label: string; price: number; durationDays: number }

/** [fitur, Gratis, Premium, segera?] — "Ya" = centang, "" = tidak. */
const COMPARE: Array<[string, string, string, boolean?]> = [
  ["NARA, AKSARA, Gim, BIGT, Jalur Cerdas, Main Bersama", "Ya", "Ya"],
  ["Beli karya di Toko Karya", "Ya", "Ya"],
  ["JUMPA: peserta per ruang", "10", "25", true],
  ["JUMPA: durasi ruang", "45 mnt", "120 mnt", true],
  ["JUMPA: video 1080p & latar blur", "", "Ya", true],
  ["AKU SASTRAWAN: ruang menulis", "", "Ya", true],
  ["Jual karya di Toko Karya", "", "Ya", true],
  ["Lencana Premium Umum", "", "Ya"],
];

function planOption(p: UmumPlanView, monthly?: UmumPlanView) {
  const yearly = p.durationDays >= 365;
  const hemat = yearly && monthly ? monthly.price * 12 - p.price : 0;
  return {
    id: p.planId,
    name: yearly ? "Tahunan" : "Bulanan",
    price: p.price,
    note: yearly ? `365 hari · ± ${formatCurrency(Math.round(p.price / 12))}/bulan` : "30 hari",
    ...(hemat > 0 ? { badge: `Hemat ${formatCurrency(hemat)}` } : {}),
  };
}

export default function UmumPremiumClient({ view, plans }: { view: UmumTrialView; plans: UmumPlanView[] }) {
  const router = useRouter();
  const monthly = plans.find((p) => p.durationDays < 365);
  const [plan, setPlan] = useState<string>(plans.find((p) => p.durationDays >= 365)?.planId ?? plans[0]?.planId ?? "");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [loading, setLoading] = useState(false);
  const [trialBusy, setTrialBusy] = useState<"claim" | "cancel" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [order, setOrder] = useState<PanelView | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const showOrder = useCallback(async (orderId: string, fallback: PanelView["status"] = "PENDING") => {
    await reconcilePayment(orderId);
    const v = await fetchPaymentView(orderId);
    setOrder(v ?? { orderId, status: fallback, kind: "UMUM_PREMIUM", planLabel: null, owner: null });
    setHistoryKey((k) => k + 1);
    if (v?.status === "SUCCESS") router.refresh();
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [router]);

  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get("order_id");
    if (orderId) void showOrder(orderId);
    if (view.enabled) loadMidtransSnap(process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "").catch(() => {});
  }, [showOrder, view.enabled]);

  const trial = useCallback(async (method: "POST" | "DELETE") => {
    setTrialBusy(method === "POST" ? "claim" : "cancel");
    setError(null);
    setNotice("");
    try {
      const res = await fetch("/api/umum/trial", { method });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok === false) {
        const code = d.error || "CHECKOUT_UNKNOWN_ERROR";
        setError({ code, message: paymentErrorMessage(code, d.message) });
        return;
      }
      setConfirmCancel(false);
      setNotice(method === "POST" ? "Uji coba Premium Umum aktif. Selamat mencoba!" : "Uji coba dihentikan. Akunmu kembali ke paket Gratis, tanpa biaya.");
      router.refresh();
    } catch {
      setError({ code: "NETWORK", message: paymentErrorMessage("NETWORK") });
    } finally {
      setTrialBusy(null);
    }
  }, [router]);

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
        const code = result.error || "CHECKOUT_UNKNOWN_ERROR";
        setError({ code, message: paymentErrorMessage(code, result.message) });
        return;
      }
      if (result.bypass) {
        setNotice(result.message || "Akun pendiri/admin — Premium aktif tanpa pembayaran.");
        router.refresh();
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
  }, [plan, coupon, router, showOrder]);

  const current = plans.find((p) => p.planId === plan) ?? plans[0];
  const paidDays = sisaHari(view.paidUntil);
  const trialDays = sisaHari(view.endsAt);
  const state: "paid" | "trial" | "free" = view.paid ? "paid" : view.active ? "trial" : "free";
  const canBuy = view.enabled;

  return (
    <div className="bp" data-testid="umum-premium" data-state={state}>
      <section className="bp-card bp-card--accent bp-in">
        <div className="bp-head">
          <span className="bp-icon bp-icon--lg" aria-hidden="true"><Crown size={26} /></span>
          <div style={{ minWidth: 0 }}>
            <p className="bp-eyebrow">Akun Umum</p>
            <h1 className="bp-h1">
              {state === "paid" ? "Premium Umum aktif" : state === "trial" ? "Uji coba Premium Umum" : "Premium Umum"}
            </h1>
            <p className="bp-text">
              {state === "free"
                ? "Ruang JUMPA lebih besar, ruang menulis AKU SASTRAWAN, dan jual karya di Toko Karya — tanpa langganan otomatis."
                : "Fitur Premium Umum terbuka di akunmu."}
            </p>
          </div>
        </div>
        <div className="bp-badges" style={{ marginTop: 14 }}>
          {state === "paid" && (
            <>
              <ProBadge label="Premium Umum" />
              {view.paidUntil && <span className="bp-badge bp-badge--ok">Sampai {formatTanggal(view.paidUntil, { short: true })}</span>}
            </>
          )}
          {state === "trial" && (
            <>
              <ProBadge label="Uji coba" />
              {view.endsAt && <span className="bp-badge bp-badge--ok" data-testid="trial-ends">Sisa {trialDays} hari · sampai {formatTanggal(view.endsAt, { short: true })}</span>}
            </>
          )}
          {state === "free" && <span className="bp-badge bp-badge--mute">Paket Gratis</span>}
        </div>
        {state === "paid" && view.paidUntil && paidDays <= 7 && (
          <p className="bp-alert bp-alert--info" style={{ marginTop: 12 }}>
            <Info size={18} aria-hidden="true" />Tinggal {paidDays} hari. Setelah itu akunmu kembali ke Gratis — tidak ada tagihan otomatis.
          </p>
        )}
      </section>

      {notice && <p className="bp-alert bp-alert--info" role="status"><Info size={18} aria-hidden="true" />{notice}</p>}

      {!view.enabled && state === "free" && (
        <p className="bp-alert bp-alert--info" role="status" data-testid="premium-closed">
          <Info size={18} aria-hidden="true" />Premium Umum segera dibuka. Semua fitur Gratis tetap bisa kamu pakai.
        </p>
      )}

      {order && (
        <div ref={panelRef} style={{ scrollMarginTop: 80 }}>
          <PaymentStatusPanel
            key={order.orderId + order.status}
            initial={order}
            loggedIn
            onSettled={() => { router.refresh(); setHistoryKey((k) => k + 1); }}
          />
        </div>
      )}

      {(view.eligible || state === "trial") && (
        <section className="bp-card bp-in" aria-labelledby="uji-coba" data-testid="trial-card">
          <div className="bp-head">
            <span className="bp-icon" aria-hidden="true"><Gift size={22} /></span>
            <div style={{ minWidth: 0 }}>
              <p className="bp-eyebrow">Uji coba gratis</p>
              <h2 id="uji-coba" className="bp-h2">{state === "trial" ? "Uji coba sedang berjalan" : "Coba gratis 1 bulan"}</h2>
              <p className="bp-text">
                {state === "trial"
                  ? "Berhenti kapan saja. Saat uji coba selesai, akunmu kembali ke Gratis — tidak ada tagihan dan tidak berubah jadi langganan."
                  : "Tanpa kartu, tanpa tagihan. Sekali per orang. Setelah 30 hari akunmu kembali ke Gratis dengan sendirinya."}
              </p>
            </div>
          </div>
          <div className="bp-actions">
            {state === "trial" ? (
              confirmCancel ? (
                <>
                  <button type="button" className="bp-btn" onClick={() => void trial("DELETE")} disabled={trialBusy !== null} data-testid="trial-cancel-confirm">
                    {trialBusy === "cancel" ? <Loader2 size={18} className="bp-spin" aria-hidden="true" /> : null} Ya, hentikan
                  </button>
                  <button type="button" className="bp-ghost" onClick={() => setConfirmCancel(false)}>Batal</button>
                </>
              ) : (
                <button type="button" className="bp-ghost" onClick={() => setConfirmCancel(true)} data-testid="trial-cancel">Hentikan uji coba</button>
              )
            ) : (
              <button type="button" className="bp-btn" onClick={() => void trial("POST")} disabled={trialBusy !== null} data-testid="trial-claim">
                {trialBusy === "claim" ? <Loader2 size={18} className="bp-spin" aria-hidden="true" /> : <Gift size={18} aria-hidden="true" />}
                {trialBusy === "claim" ? "Mengaktifkan…" : "Coba gratis 1 bulan"}
              </button>
            )}
          </div>
        </section>
      )}

      {error && (
        <div className="bp-alert" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>{error.message}</p>
            {PAYMENT_HELP_CODES.has(error.code) && <p className="bp-small" style={{ margin: "4px 0 0" }}>Kode {error.code}</p>}
          </div>
        </div>
      )}

      <div className="bp-grid bp-grid--2">
        <section className="bp-card bp-in" aria-labelledby="pilih-paket" data-testid="plan-card">
          <p className="bp-eyebrow">{state === "paid" ? "Tambah masa aktif" : "Pilih paket"}</p>
          <h2 id="pilih-paket" className="bp-h2">{state === "paid" ? "Perpanjang sekali bayar" : "Sekali bayar, tanpa langganan"}</h2>
          {current && (
            <>
              <PlanPicker
                label="Paket Premium Umum"
                value={plan}
                onChange={(id) => { setPlan(id); setCoupon(null); setError(null); }}
                options={plans.map((p) => planOption(p, monthly))}
              />
              {canBuy && <CouponInput planId={plan} price={current.price} value={coupon} onChange={setCoupon} />}
              <PriceSummary
                planName={current.label}
                price={current.price}
                promo={coupon ? { kode: coupon.kode, hargaDiskon: coupon.hargaDiskon } : null}
                period={`Aktif ${current.durationDays} hari${state === "trial" ? " + sisa uji coba" : ""}`}
              />
            </>
          )}
          <p className="bp-small" style={{ margin: "12px 2px 0" }} data-testid="no-autorenew">
            Pembayaran sekali saja lewat Midtrans. <strong>Tidak ada perpanjangan atau tagihan otomatis</strong> — kamu bisa berhenti kapan saja
            cukup dengan tidak membayar lagi.{state === "trial" ? " Sisa hari uji coba ditambahkan ke masa aktif." : ""}
          </p>
          <div className="bp-actions">
            <button type="button" className="bp-btn" onClick={pay} disabled={loading || !canBuy || !current} data-testid="pay">
              {loading ? <Loader2 size={18} className="bp-spin" aria-hidden="true" /> : null}
              {!canBuy ? "Segera dibuka" : loading ? "Membuka pembayaran…" : `Bayar ${formatCurrency(coupon ? coupon.hargaDiskon : current?.price ?? 0)}`}
            </button>
          </div>
          <PayMethods note="Sekali bayar, tanpa perpanjangan otomatis." />
        </section>

        <div className="bp-stack">
          <section className="bp-card bp-in" aria-labelledby="yang-didapat">
            <p className="bp-eyebrow">Yang kamu dapat</p>
            <h2 id="yang-didapat" className="bp-h2">Gratis dan Premium Umum</h2>
            <div className="bp-compare" role="table" aria-label="Perbandingan paket Gratis dan Premium Umum">
              <div className="bp-compare__row bp-compare__head" role="row">
                <span role="columnheader">Fitur</span>
                <span role="columnheader">Gratis</span>
                <span role="columnheader">Premium</span>
              </div>
              {COMPARE.map(([label, free, pro, soon]) => (
                <div key={label} className="bp-compare__row" role="row">
                  <span role="cell">{label}{soon ? <span className="bp-small"> · segera</span> : null}</span>
                  <span role="cell">{free === "Ya" ? <Check size={16} aria-label="Ya" /> : free || <Minus size={14} aria-label="Tidak" />}</span>
                  <span role="cell">{pro === "Ya" ? <Check size={16} aria-label="Ya" /> : pro}</span>
                </div>
              ))}
            </div>
            <p className="bp-small" style={{ margin: "10px 0 0" }}>Fitur bertanda “segera” terbuka otomatis untuk Premium Umum saat diluncurkan.</p>
          </section>

          <section id="jual-karya" className="bp-card bp-in" aria-labelledby="judul-jual" data-testid="jual-karya-hook">
            <div className="bp-head">
              <span className="bp-icon" aria-hidden="true"><Store size={22} /></span>
              <div style={{ minWidth: 0 }}>
                <p className="bp-eyebrow">Toko Karya</p>
                <h2 id="judul-jual" className="bp-h2">Jual karya (Premium)</h2>
                <p className="bp-text">
                  Menjelajah dan membeli karya gratis untuk semua. Menjual karya akan dibuka untuk Premium Umum —
                  kami sedang menyiapkan pencairan dana dan peninjauan karya.
                </p>
              </div>
            </div>
            <div className="bp-actions">
              <Link href="/marketplace" className="bp-ghost"><Store size={18} aria-hidden="true" /> Jelajahi Toko Karya</Link>
            </div>
          </section>

          <PaymentHistory refreshKey={historyKey} onPaid={() => router.refresh()} />

          <section className="bp-card">
            <details className="bp-details">
              <summary>Ketentuan <ChevronDown size={18} aria-hidden="true" /></summary>
              <ul>
                <li>Sekali bayar lewat Midtrans. Tidak ada perpanjangan otomatis dan kami tidak pernah menagihmu otomatis.</li>
                <li>Uji coba gratis 1 bulan hanya sekali per orang, tanpa kartu. Bisa dihentikan kapan saja dan tidak berubah jadi langganan.</li>
                <li>Bayar saat uji coba berjalan: sisa hari uji coba ditambahkan ke masa aktif. Bayar saat Premium aktif menambah masa aktif.</li>
                <li>Setelah masa aktif habis, akun kembali ke Gratis. Tulisan dan karyamu tetap tersimpan dan bisa dibaca serta diekspor.</li>
                <li>Kode promo yang berlaku hanya kode khusus Premium Umum.</li>
              </ul>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}
