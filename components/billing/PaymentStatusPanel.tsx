"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Crown, LogIn, RefreshCw, XCircle, SearchX, Repeat } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { ProBadge, formatTanggal } from "./parts";
import "./billing.css";

export type PanelStatus = "SUCCESS" | "PENDING" | "FAILED" | "EXPIRED" | "CANCELLED" | "REFUNDED" | "REPLACED" | "NOT_FOUND";
export type PanelKind = "GURU_PRO" | "MURID_PREMIUM" | "UMUM_PREMIUM" | "KARYA" | "LAIN";

export interface PanelView {
  orderId: string;
  status: PanelStatus;
  kind: PanelKind;
  planLabel: string | null;
  owner: null | {
    amount: number;
    hargaAsli: number | null;
    kuponKode: string | null;
    premiumUntil: string | null;
    isPremium: boolean;
    manualReview?: boolean;
  };
}

const COPY: Record<PanelKind, { pro: string; go: string; goLabel: string; plans: string; plansLabel: string }> = {
  GURU_PRO: { pro: "Guru Pro", go: "/guru/beranda", goLabel: "Mulai pakai Guru Pro", plans: "/guru/berlangganan", plansLabel: "Lihat paket" },
  MURID_PREMIUM: { pro: "Premium", go: "/murid/belajar", goLabel: "Mulai belajar", plans: "/murid/premium", plansLabel: "Lihat paket" },
  UMUM_PREMIUM: { pro: "Premium Umum", go: "/umum", goLabel: "Ke beranda Umum", plans: "/umum/premium", plansLabel: "Lihat paket" },
  KARYA: { pro: "Karya", go: "/orders", goLabel: "Buka pesanan saya", plans: "/marketplace", plansLabel: "Ke Toko Karya" },
  LAIN: { pro: "Paket", go: "/", goLabel: "Ke beranda", plans: "/", plansLabel: "Ke beranda" },
};

export async function fetchPaymentView(orderId: string): Promise<PanelView | null> {
  try {
    const res = await fetch(`/api/billing/status?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return null;
    return data as PanelView;
  } catch {
    return null;
  }
}

/**
 * Hasil pembayaran yang sudah diverifikasi server. Saat menunggu, cek
 * otomatis (5 dtk selama 2 mnt, lalu 15 dtk sampai 20 mnt) + tombol Cek lagi.
 */
export default function PaymentStatusPanel({
  initial,
  loggedIn,
  loginHref,
  onSettled,
}: {
  initial: PanelView;
  loggedIn: boolean;
  loginHref?: string;
  /** Dipanggil sekali saat status berubah menjadi lunas (mis. muat ulang profil). */
  onSettled?: (view: PanelView) => void;
}) {
  const [view, setView] = useState<PanelView>(initial);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const startedAt = useRef(Date.now());
  const settledFired = useRef(initial.status === "SUCCESS");

  const check = useCallback(async () => {
    setChecking(true);
    const next = await fetchPaymentView(view.orderId);
    setChecking(false);
    setCheckedAt(new Date());
    if (next) setView((prev) => ({ ...next, owner: next.owner ?? prev.owner }));
  }, [view.orderId]);

  useEffect(() => {
    if (view.status === "SUCCESS" && !settledFired.current) {
      settledFired.current = true;
      onSettled?.(view);
    }
  }, [view, onSettled]);

  useEffect(() => {
    if (view.status !== "PENDING") return;
    const elapsed = Date.now() - startedAt.current;
    if (elapsed > 20 * 60_000) return;
    const t = setTimeout(check, elapsed < 2 * 60_000 ? 5_000 : 15_000);
    return () => clearTimeout(t);
  }, [view.status, checkedAt, check]);

  const c = COPY[view.kind] || COPY.LAIN;
  const login = loginHref || `/login?next=${encodeURIComponent(`/payment/finish?order_id=${view.orderId}`)}`;
  const facts = (
    <dl className="bp-facts">
      {view.planLabel && <div><dt>Paket</dt><dd>{view.planLabel}</dd></div>}
      {view.owner && (
        <div>
          <dt>{view.status === "SUCCESS" ? "Dibayar" : "Total"}</dt>
          <dd>
            {formatCurrency(view.owner.amount)}
            {view.owner.kuponKode ? <span className="bp-small"> · promo {view.owner.kuponKode}</span> : null}
          </dd>
        </div>
      )}
      <div><dt>Nomor pesanan</dt><dd className="bp-mono">{view.orderId}</dd></div>
    </dl>
  );

  const loginAction = !loggedIn ? (
    <Link href={login} className={view.status === "SUCCESS" ? "bp-btn" : "bp-ghost"}>
      <LogIn size={18} aria-hidden="true" /> Masuk untuk melihat akun
    </Link>
  ) : null;

  if (view.status === "SUCCESS" && view.owner?.manualReview) {
    return (
      <section className="bp-card bp-card--accent bp-status bp-in" role="status" aria-live="polite">
        <span className="bp-icon bp-icon--lg" aria-hidden="true"><Clock size={26} /></span>
        <p className="bp-eyebrow" style={{ marginTop: 10 }}>Pembayaran diterima</p>
        <h1 className="bp-h1">Sedang diverifikasi</h1>
        <p className="bp-text">
          Dana sudah masuk. Tim BahasaCerdas memverifikasi pesanan ini secara manual, lalu {c.pro} diaktifkan.
          Kamu akan menerima notifikasi. Tidak perlu membayar lagi.
        </p>
        {facts}
        <div className="bp-actions" style={{ width: "100%" }}>
          {loggedIn ? <Link href={c.go} className="bp-btn">{c.goLabel}</Link> : loginAction}
        </div>
      </section>
    );
  }

  if (view.status === "SUCCESS") {
    const until = view.owner?.premiumUntil;
    return (
      <section className="bp-card bp-card--accent bp-status bp-in" role="status" aria-live="polite">
        <span className="bp-icon bp-icon--lg" aria-hidden="true">
          {view.kind === "KARYA" ? <CheckCircle2 size={26} /> : <Crown size={26} />}
        </span>
        <p className="bp-eyebrow" style={{ marginTop: 10 }}>Pembayaran lunas</p>
        <h1 className="bp-h1">{view.kind === "KARYA" ? "Karya siap diunduh" : `${c.pro} aktif`}</h1>
        {view.kind !== "KARYA" && view.kind !== "LAIN" && (
          <div className="bp-badges" style={{ justifyContent: "center", marginTop: 8 }}>
            <ProBadge label={c.pro} />
            {until && <span className="bp-badge bp-badge--ok">Sampai {formatTanggal(until, { short: true })}</span>}
          </div>
        )}
        <p className="bp-text">
          {view.kind === "KARYA"
            ? "File ada di halaman pesanan dan dikirim ke emailmu."
            : until
              ? `Semua fitur ${c.pro} terbuka sampai ${formatTanggal(until)}.`
              : loggedIn
                ? `Semua fitur ${c.pro} sudah terbuka di akunmu.`
                : `Masuk dengan akun yang membayar untuk memakai ${c.pro}.`}
        </p>
        {facts}
        <div className="bp-actions" style={{ width: "100%" }}>
          {loggedIn ? <Link href={c.go} className="bp-btn">{c.goLabel}</Link> : loginAction}
        </div>
      </section>
    );
  }

  if (view.status === "PENDING") {
    return (
      <section className="bp-card bp-card--accent bp-status bp-in" role="status" aria-live="polite">
        <span className="bp-icon bp-icon--lg" aria-hidden="true"><Clock size={26} /></span>
        <p className="bp-eyebrow" style={{ marginTop: 10 }}>Belum lunas</p>
        <h1 className="bp-h1">Menunggu pembayaran</h1>
        <ol className="bp-steps">
          <li>Selesaikan pembayaran di aplikasi atau bank yang kamu pilih.</li>
          <li>Halaman ini mengecek sendiri setiap beberapa detik.</li>
          <li>{view.kind === "KARYA" ? "Setelah lunas, karya langsung bisa diunduh." : `Setelah lunas, ${c.pro} langsung aktif. Tidak perlu kirim bukti.`}</li>
        </ol>
        {facts}
        <p className="bp-small" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12 }}>
          <span className="bp-pulse" aria-hidden="true" />
          {checking ? "Mengecek…" : checkedAt ? `Dicek ${checkedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Mengecek otomatis"}
        </p>
        <div className={`bp-actions${loginAction ? " bp-actions--row" : ""}`} style={{ width: "100%" }}>
          <button type="button" className="bp-btn" onClick={check} disabled={checking}>
            <RefreshCw size={18} aria-hidden="true" className={checking ? "bp-spin" : undefined} /> Cek lagi
          </button>
          {loginAction}
        </div>
      </section>
    );
  }

  if (view.status === "REPLACED") {
    return (
      <section className="bp-card bp-status bp-in" role="status">
        <span className="bp-icon bp-icon--lg bp-icon--soft" aria-hidden="true"><Repeat size={26} /></span>
        <h1 className="bp-h1" style={{ marginTop: 10 }}>Diganti pesanan baru</h1>
        <p className="bp-text">Kamu membuat pesanan baru setelah ini. Jika pesanan ini tetap kamu bayar, akses tetap aktif otomatis.</p>
        {facts}
        <div className={`bp-actions${loginAction ? " bp-actions--row" : ""}`} style={{ width: "100%" }}>
          <button type="button" className="bp-ghost" onClick={check} disabled={checking}>
            <RefreshCw size={18} aria-hidden="true" className={checking ? "bp-spin" : undefined} /> Cek lagi
          </button>
          {loginAction ?? <Link href={c.plans} className="bp-btn">{c.plansLabel}</Link>}
        </div>
      </section>
    );
  }

  const notFound = view.status === "NOT_FOUND";
  const title = notFound
    ? "Pesanan tidak ditemukan"
    : view.status === "EXPIRED"
      ? "Waktu pembayaran habis"
      : view.status === "REFUNDED"
        ? "Pembayaran dikembalikan"
        : view.status === "CANCELLED"
          ? "Pembayaran dibatalkan"
          : "Pembayaran gagal";
  const body = notFound
    ? "Periksa tautan dari email atau aplikasi pembayaranmu."
    : view.status === "REFUNDED"
      ? "Dana sudah dikembalikan ke metode pembayaranmu."
      : "Belum ada dana yang ditarik. Kamu bisa membuat pembayaran baru.";
  return (
    <section className="bp-card bp-status bp-in" role="status">
      <span className="bp-icon bp-icon--lg bp-icon--bad" aria-hidden="true">{notFound ? <SearchX size={26} /> : <XCircle size={26} />}</span>
      <h1 className="bp-h1" style={{ marginTop: 10 }}>{title}</h1>
      <p className="bp-text">{body}</p>
      {!notFound && facts}
      <div className={`bp-actions${loginAction ? " bp-actions--row" : ""}`} style={{ width: "100%" }}>
        <Link href={c.plans} className="bp-btn">{notFound ? c.plansLabel : "Bayar lagi"}</Link>
        {loginAction}
      </div>
    </section>
  );
}
