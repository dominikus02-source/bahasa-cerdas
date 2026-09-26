"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, AlertCircle, Loader2, X, Shield, CreditCard, Calendar, Clock, Info, Landmark, Smartphone, Gift, Sparkles } from "lucide-react";
import { loadMidtransSnap } from "@/lib/midtrans-client";
import CouponInput, { AppliedCoupon } from "@/components/billing/CouponInput";
import { formatCurrency } from "@/lib/format";

interface PlanFeature {
  label: string;
  free: string;
  freeOk: boolean;
  pro: string;
  proOk: boolean;
}

const PLAN_FEATURES: PlanFeature[] = [
  { label: "Kredit AI per bulan", free: "30", freeOk: true, pro: "500", proOk: true },
  { label: "Buat RPP & Soal dengan AI", free: "Ya", freeOk: true, pro: "Ya", proOk: true },
  { label: "Unduh dokumen per hari (PDF/DOCX/PPTX)", free: "1×/hari", freeOk: true, pro: "10×/hari", proOk: true },
  { label: "Simpan hasil AI (riwayat)", free: "50 hasil", freeOk: true, pro: "Tak terbatas", proOk: true },
  { label: "Kecepatan pakai AI per hari", free: "20×", freeOk: true, pro: "200×", proOk: true },
  { label: "Jual karya berbayar di Marketplace", free: "Tidak", freeOk: false, pro: "Ya", proOk: true },
  { label: "Komisi penjualan 85% untukmu", free: "Tidak", freeOk: false, pro: "Ya", proOk: true },
  { label: "Dukungan prioritas", free: "Tidak", freeOk: false, pro: "Ya", proOk: true },
];

interface UserInfo {
  isPremium: boolean;
  premiumPlan: string;
  premiumUntil: string | null;
}

interface PlanInfo {
  plan: string;
  isTrial: boolean;
  trialEndsAt: string | null;
  daysRemaining: number;
}

const ERROR_MESSAGES: Record<string, string> = {
  MIDTRANS_UNAUTHORIZED: "Kredensial pembayaran belum sesuai. Silakan hubungi admin.",
  MIDTRANS_CONFIG_MISSING: "Konfigurasi pembayaran belum lengkap. Silakan hubungi admin.",
  MIDTRANS_MODE_MISMATCH: "Mode pembayaran tidak konsisten. Silakan hubungi admin.",
  MIDTRANS_CREATE_FAILED: "Pembayaran belum bisa dibuat. Silakan coba beberapa saat lagi.",
  CHECKOUT_AUTH_REQUIRED: "Silakan login terlebih dahulu.",
  CHECKOUT_FORBIDDEN_ROLE: "Hanya guru yang dapat membeli paket Guru Pro.",
  CHECKOUT_INVALID_PLAN: "Paket tidak tersedia.",
  CHECKOUT_INVALID_COUPON: "Kode kupon tidak valid.",
  CHECKOUT_DB_FAILED: "Gagal menyimpan pesanan. Silakan coba lagi.",
};

export default function BerlanggananPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"default" | "success" | "failed" | "pending">("default");
  const [errorMsg, setErrorMsg] = useState("");
  const [diagnosticCode, setDiagnosticCode] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"GURU_PRO_MONTHLY" | "GURU_PRO_YEARLY">("GURU_PRO_YEARLY");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const snapLoaded = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "success") {
      setStatus("success");
    }
    if (params.get("plan") === "monthly") {
      setSelectedPlan("GURU_PRO_MONTHLY");
      setCoupon(null);
    }
  }, []);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => {
        setUserInfo({
          isPremium: d.isPremium || d.user?.isPremium || false,
          premiumPlan: d.premiumPlan || d.user?.premiumPlan || "FREE",
          premiumUntil: d.premiumUntil || d.user?.premiumUntil || null,
        });
        if (d.isPremium || d.user?.isPremium) {
          setStatus("success");
        }
      })
      .catch(() => {})
      .finally(() => setUserLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/ai/quota/status")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.plan) {
          setPlanInfo({
            plan: d.plan,
            isTrial: !!d.isTrial,
            trialEndsAt: d.trialEndsAt || null,
            daysRemaining: d.daysRemaining || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadMidtransSnap(process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "")
      .then((loaded) => { snapLoaded.current = loaded; })
      .catch(() => {});
  }, []);

  const handleUpgrade = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    setDiagnosticCode("");

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          ...(coupon ? { couponCode: coupon.kode } : {}),
        }),
      });

      const result = await res.json();

      if (!res.ok || result.ok === false) {
        const code = result.error || "";
        const msg = result.message || ERROR_MESSAGES[code] || "Gagal memproses pembayaran.";
        setDiagnosticCode(code);
        setErrorMsg(msg);
        setLoading(false);
        return;
      }

      if (result.bypass) {
        setStatus("success");
        setLoading(false);
        return;
      }

      const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

      if (result.token && clientKey) {
        try {
          await loadMidtransSnap(clientKey);
        } catch {}

        if (typeof window !== "undefined" && window.snap) {
          window.snap.pay(result.token, {
            onSuccess: () => {
              setStatus("success");
              setLoading(false);
            },
            onPending: () => {
              setStatus("pending");
              setLoading(false);
            },
            onError: () => {
              if (result.redirectUrl) {
                window.location.href = result.redirectUrl;
              } else {
                setErrorMsg("Pembayaran gagal. Silakan coba lagi.");
                setLoading(false);
              }
            },
            onClose: () => {
              setLoading(false);
            },
          });
          return;
        }
      }

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }

      setErrorMsg("Pembayaran belum bisa dibuka. Silakan coba lagi beberapa saat.");
      setLoading(false);
    } catch (err: any) {
      setErrorMsg("Tidak bisa menghubungi server pembayaran. Periksa koneksi internet Anda.");
      setLoading(false);
    }
  }, [selectedPlan, coupon]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  const isPremium = userInfo?.isPremium || false;
  const premiumUntil = userInfo?.premiumUntil;
  const daysLeft = premiumUntil
    ? Math.max(0, Math.ceil((new Date(premiumUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const hasActivePremium = isPremium && (!premiumUntil || daysLeft > 0);
  const isExpiring = !!premiumUntil && daysLeft > 0 && daysLeft <= 7;
  const isExpired = !!premiumUntil && daysLeft === 0;
  const premiumUntilLabel = premiumUntil
    ? new Date(premiumUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "Akses aktif";

  const currentPrice = selectedPlan === "GURU_PRO_YEARLY" ? 399000 : 49000;
  const selectedPriceLabel = coupon
    ? formatCurrency(coupon.hargaDiskon)
    : formatCurrency(currentPrice);

  const handlePlanChange = (plan: "GURU_PRO_MONTHLY" | "GURU_PRO_YEARLY") => {
    setSelectedPlan(plan);
    setCoupon(null);
    if (errorMsg) setErrorMsg("");
    if (diagnosticCode) setDiagnosticCode("");
  };

  if ((status === "success" || status === "pending") && !hasActivePremium) {
    return (
      <div className="mx-auto max-w-3xl py-6 sm:py-10">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)]">
          <div className="relative overflow-hidden bg-[#101a3a] px-6 py-12 text-center text-white sm:px-12">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
              {status === "pending" ? (
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              ) : (
                <Crown className="h-8 w-8 text-amber-300" />
              )}
            </div>
            <p className="relative mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">Guru Pro</p>
            <h1 className="relative mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              {status === "pending" ? "Menunggu pembayaran" : "Pembayaran berhasil diproses"}
            </h1>
            <p className="relative mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
              {status === "pending"
                ? "Selesaikan pembayaran melalui metode yang kamu pilih. Status akan diperbarui setelah pembayaran dikonfirmasi."
                : "Pembayaran sedang dikonfirmasi. Akses Guru Pro akan aktif dalam beberapa saat."}
            </p>
          </div>
          <div className="p-6 sm:p-8">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-black text-amber-950">Konfirmasi pembayaran</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    Jika status belum berubah dalam 5 menit, refresh halaman atau hubungi admin dengan email akun dan nomor transaksi.
                  </p>
                </div>
              </div>
            </div>
            <a
              href="/guru/ai-tools"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#18255b] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#223273]"
            >
              <Zap className="h-4 w-4" />
              Mulai menggunakan Alat AI
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-10 sm:space-y-9">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[#101a3a] px-6 py-8 text-white shadow-[0_26px_70px_-36px_rgba(15,23,42,0.65)] sm:px-10 sm:py-10">
        <div className="absolute -right-28 -top-32 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
                <Crown className="h-3.5 w-3.5" />
                Guru Pro
              </span>
              {hasActivePremium && (
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">
                  Aktif
                </span>
              )}
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              Mengajar lebih cepat.
              <span className="block text-cyan-300">Buat lebih banyak.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Naikkan kapasitas mengajar dengan kredit AI lebih besar, unduhan lebih banyak, dan akses untuk menjual karya pembelajaranmu.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {[
                ["500", "kredit AI/bulan"],
                ["10×", "unduhan/hari"],
                ["85%", "komisi karya"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur">
                  <p className="text-lg font-black">{value}</p>
                  <p className="text-[10px] font-semibold text-slate-300">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="mx-auto max-w-xs rounded-[1.75rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 shadow-lg">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-200">
                  Untuk Guru
                </span>
              </div>
              <p className="mt-5 text-2xl font-black">Guru Pro</p>
              <p className="mt-1 text-xs text-slate-300">Semua yang kamu butuhkan untuk mengajar lebih efisien.</p>
              <div className="mt-5 space-y-2.5">
                {["AI lebih leluasa", "Dokumen lebih banyak", "Marketplace karya"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-slate-200">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Current state */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${hasActivePremium ? "bg-emerald-50 text-emerald-600" : isExpired ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"}`}>
              {hasActivePremium ? <Check className="h-5 w-5" /> : isExpired ? <AlertCircle className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">
                {hasActivePremium ? "Guru Pro sedang aktif" : isExpired ? "Masa Guru Pro telah berakhir" : planInfo?.isTrial ? "Kamu sedang mencoba Guru Pro" : "Kamu sedang menggunakan Guru Free"}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {hasActivePremium
                  ? premiumUntil
                    ? `Berlaku hingga ${premiumUntilLabel}${isExpiring ? ` · tersisa ${daysLeft} hari` : ""}`
                    : "Akses aktif tanpa tanggal berakhir."
                  : isExpired
                    ? "Perpanjang sekarang agar akses dan kredit Pro kembali aktif."
                    : planInfo?.isTrial
                      ? `Trial tersisa ${planInfo.daysRemaining} hari.`
                      : "30 kredit AI/bulan dan 1 unduhan/hari."}
              </p>
            </div>
          </div>
          <span className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${hasActivePremium ? "bg-emerald-50 text-emerald-700" : isExpired ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
            {hasActivePremium ? "PRO AKTIF" : isExpired ? "EXPIRED" : planInfo?.isTrial ? "TRIAL" : "FREE"}
          </span>
        </div>
      </section>

      {/* Pricing */}
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_20px_60px_-38px_rgba(15,23,42,0.35)]">
          <div className="border-b border-slate-100 p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">Pilih paket</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                  {hasActivePremium ? "Perpanjang Guru Pro" : "Aktifkan Guru Pro"}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">Sekali bayar. Tidak ada perpanjangan otomatis.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-700">
                <Shield className="h-3.5 w-3.5" />
                Aman via Midtrans
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => handlePlanChange("GURU_PRO_MONTHLY")}
                className={`rounded-xl px-4 py-3 text-left transition ${selectedPlan === "GURU_PRO_MONTHLY" ? "bg-white shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}
              >
                <span className="block text-xs font-black">Bulanan</span>
                <span className="mt-0.5 block text-lg font-black text-slate-900">Rp 49.000</span>
                <span className="block text-[10px] text-slate-500">30 hari</span>
              </button>
              <button
                type="button"
                onClick={() => handlePlanChange("GURU_PRO_YEARLY")}
                className={`relative rounded-xl px-4 py-3 text-left transition ${selectedPlan === "GURU_PRO_YEARLY" ? "bg-white shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}
              >
                <span className="absolute right-3 top-3 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700">Hemat Rp 189K</span>
                <span className="block text-xs font-black">Tahunan</span>
                <span className="mt-0.5 block text-lg font-black text-slate-900">Rp 399.000</span>
                <span className="block text-[10px] text-slate-500">365 hari · setara Rp 33.250/bln</span>
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                  <Gift className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-amber-950">Program Guru Cerdas</p>
                  <p className="mt-0.5 text-xs leading-5 text-amber-800">
                    Guru terverifikasi bisa mendapat paket bulanan <strong>Rp 1.000</strong> dengan kode promo.
                  </p>
                  <p className="mt-2 inline-flex max-w-full rounded-lg bg-white/70 px-2 py-1 font-mono text-[10px] font-bold text-amber-900 ring-1 ring-amber-200">
                    bcgurucerdas1000
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <CouponInput
                planId={selectedPlan}
                price={currentPrice}
                value={coupon}
                onChange={setCoupon}
              />
              <p className="mt-1.5 text-center text-[10px] text-slate-400">
                Promo Rp 1.000 hanya berlaku untuk paket Bulanan.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-7">
            {errorMsg && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold">{errorMsg}</p>
                    {diagnosticCode && <p className="mt-1 font-mono text-[10px] text-red-500">Kode: {diagnosticCode}</p>}
                    <a href="/guru/bantuan/pembayaran" className="mt-2 inline-block text-xs font-semibold underline underline-offset-2">Bantuan pembayaran →</a>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500">{selectedPlan === "GURU_PRO_YEARLY" ? "Guru Pro Tahunan" : "Guru Pro Bulanan"}</p>
                <div className="mt-1 flex items-end gap-2">
                  <p className="text-4xl font-black tracking-tight text-slate-950">{selectedPriceLabel}</p>
                  {!coupon && <span className="pb-1 text-xs font-semibold text-slate-400">{selectedPlan === "GURU_PRO_YEARLY" ? "/ 365 hari" : "/ 30 hari"}</span>}
                </div>
                {coupon && (
                  <p className="mt-1 text-xs font-bold text-emerald-600">
                    Hemat {formatCurrency(coupon.hemat)} · {coupon.kode}
                  </p>
                )}
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Akses</p>
                <p className="mt-1 text-xs font-bold text-slate-700">AI + Marketplace</p>
              </div>
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={loading}
              className="mt-5 h-12 w-full rounded-2xl bg-[#18255b] text-sm font-black text-white shadow-lg shadow-slate-900/10 transition hover:bg-[#223273]"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              {loading ? "Memproses pembayaran..." : hasActivePremium ? "Perpanjang Guru Pro" : "Aktifkan Guru Pro"}
            </Button>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] font-semibold text-slate-400">
              <span className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Kartu</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> QRIS</span>
              <span className="flex items-center gap-1"><Landmark className="h-3.5 w-3.5" /> VA</span>
              <span className="flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" /> e-Wallet</span>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-violet-100 bg-gradient-to-br from-violet-50 to-cyan-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Yang kamu dapat</p>
                <p className="text-[11px] text-slate-500">Upgrade yang terasa setiap hari.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ["500", "kredit AI setiap bulan"],
                ["200×", "akses AI per hari"],
                ["10×", "unduhan dokumen per hari"],
                ["85%", "komisi penjualan karya"],
              ].map(([value, label]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3.5 py-3 ring-1 ring-black/[0.04]">
                  <span className="text-xs font-semibold text-slate-600">{label}</span>
                  <span className="text-sm font-black text-violet-700">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Free → Pro</p>
            <div className="mt-4 space-y-2.5">
              {PLAN_FEATURES.slice(0, 5).map((feature) => (
                <div key={feature.label} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700">{feature.label}</p>
                    <p className="text-[10px] text-slate-400">{feature.free} → <span className="font-bold text-slate-600">{feature.pro}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature comparison */}
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">Perbandingan</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">Free vs Guru Pro</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {PLAN_FEATURES.map((feature) => (
            <div key={feature.label} className="grid gap-3 px-6 py-4 sm:grid-cols-[1.4fr_0.8fr_0.8fr] sm:items-center sm:px-7">
              <p className="text-xs font-bold text-slate-700">{feature.label}</p>
              <div className="text-left sm:text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 sm:hidden">Free · </span>
                <span className={feature.freeOk ? "text-xs font-semibold text-slate-500" : "text-xs font-semibold text-slate-300"}>{feature.free}</span>
              </div>
              <div className="text-left sm:text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-500 sm:hidden">Pro · </span>
                <span className="text-xs font-black text-violet-700">{feature.pro}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust + help */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-950">Pembayaran aman</p>
              <p className="mt-1 text-xs leading-5 text-emerald-800">
                Pembayaran diproses melalui Midtrans. Paket dibeli sekali dan tidak diperpanjang otomatis.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-sky-100 bg-sky-50/70 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-black text-sky-950">Butuh bantuan?</p>
              <p className="mt-1 text-xs leading-5 text-sky-800">
                Jika pembayaran berhasil tetapi Pro belum aktif dalam 5 menit, sertakan email akun dan nomor transaksi saat menghubungi bantuan.
              </p>
              <a href="/guru/bantuan/pembayaran" className="mt-2 inline-block text-xs font-black text-sky-700 underline underline-offset-2">
                Buka bantuan pembayaran →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Terms */}
      <details className="group rounded-[1.5rem] border border-slate-200 bg-white">
        <summary className="cursor-pointer list-none px-6 py-5 text-sm font-black text-slate-800 sm:px-7">
          Ketentuan pembayaran
          <span className="float-right text-slate-400 transition group-open:rotate-180">⌄</span>
        </summary>
        <div className="border-t border-slate-100 px-6 py-5 text-xs leading-6 text-slate-500 sm:px-7">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Paket Bulanan berlaku 30 hari dan paket Tahunan berlaku 365 hari sejak pembayaran berhasil.</li>
            <li>Pembayaran bersifat sekali bayar dan tidak diperpanjang otomatis.</li>
            <li>Jika Guru Pro masih aktif, pembelian baru akan memperpanjang masa aktif.</li>
            <li>Guru baru dapat memperoleh Guru Pro Trial 30 hari sesuai program yang berlaku.</li>
            <li>Kupon Program Guru Cerdas Rp 1.000 hanya berlaku untuk paket Bulanan.</li>
            <li>Setelah Pro berakhir, akun kembali ke Guru Free dengan 30 kredit AI/bulan dan 1 unduhan/hari.</li>
            <li>Kredit AI mengikuti paket aktif: Pro 500/bulan, Free 30/bulan.</li>
          </ul>
        </div>
      </details>
    </div>
  );
}
