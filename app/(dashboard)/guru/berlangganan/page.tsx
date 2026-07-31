"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, AlertCircle, Loader2, X, Shield, CreditCard, Calendar, Clock, Info, Landmark, Smartphone, Gift, Sparkles } from "lucide-react";
import { loadMidtransSnap } from "@/lib/midtrans-client";
import CouponInput, { AppliedCoupon } from "@/components/billing/CouponInput";
import { formatCurrency } from "@/lib/premium";

interface PlanFeature {
  label: string;
  free: string;
  freeOk: boolean;
  pro: string;
  proOk: boolean;
}

const PLAN_FEATURES: PlanFeature[] = [
  { label: "Kredit AI per bulan", free: "30", freeOk: true, pro: "500", proOk: true },
  { label: "Buat RPP, Soal & PPT dengan AI", free: "Ya", freeOk: true, pro: "Ya", proOk: true },
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
  const isExpiring = daysLeft > 0 && daysLeft <= 7;
  const isExpired = isPremium && daysLeft === 0;
  const premiumSince = premiumUntil && daysLeft > 0 ? new Date(premiumUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null;

  if (status === "success" && isPremium) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-amber-500 to-yellow-500 p-8 text-white text-center shadow-xl">
          <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Kamu PRO Aktif!</h1>
          <p className="mt-2 text-amber-100">Berlaku hingga {premiumSince}</p>
        </div>

        {isExpiring && (
          <Card className="p-4 border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">PRO akan berakhir dalam {daysLeft} hari</p>
                <p className="text-xs text-amber-700 mt-1">
                  Perpanjang sekarang agar akses AI Tools tetap 500 kredit/bulan tanpa terputus.
                </p>
                <p className="text-xs text-amber-600 mt-2 bg-amber-100 rounded-lg p-2">
                  Jika anda masih aktif PRO, pembelian baru akan <strong>memperpanjang</strong> masa aktif anda.
                </p>
              </div>
            </div>
          </Card>
        )}

        {isExpired && (
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-700 text-sm">Masa PRO telah berakhir</p>
                <p className="text-xs text-red-600 mt-1">Anda tetap bisa menggunakan Guru Free dengan 30 kredit/bulan.</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 border-2 border-amber-300 bg-gradient-to-b from-amber-50/40 to-white">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h3 className="font-bold text-gray-900">Perpanjang PRO</h3>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs font-bold shadow">
              <Crown className="w-3.5 h-3.5" /> Guru Pro Aktif
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-xl p-1 w-fit mx-auto mb-6">
            <button onClick={() => { setSelectedPlan("GURU_PRO_MONTHLY"); setCoupon(null); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium ${selectedPlan === "GURU_PRO_MONTHLY" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              Bulanan — {coupon && selectedPlan === "GURU_PRO_MONTHLY" ? formatCurrency(coupon.hargaDiskon) : "Rp 49.000"}
            </button>
            <button onClick={() => { setSelectedPlan("GURU_PRO_YEARLY"); setCoupon(null); }}
              className={`px-5 py-2 rounded-lg text-sm font-medium ${selectedPlan === "GURU_PRO_YEARLY" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              Tahunan — {coupon && selectedPlan === "GURU_PRO_YEARLY" ? formatCurrency(coupon.hargaDiskon) : "Rp 399.000"}
              <Badge variant="warning" className="ml-1.5 text-[10px] py-0">HEMAT</Badge>
            </button>
          </div>
          <div className="max-w-md mx-auto mb-6">
            <CouponInput
              planId={selectedPlan}
              price={selectedPlan === "GURU_PRO_YEARLY" ? 399000 : 49000}
              value={coupon}
              onChange={setCoupon}
            />
          </div>
          <Button onClick={handleUpgrade} disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Zap className="w-4 h-4 mr-1.5" />}
            {loading ? "Memproses..." : coupon ? `Perpanjang PRO — ${formatCurrency(coupon.hargaDiskon)}` : "Perpanjang PRO"}
          </Button>
        </Card>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Butuh bantuan?</p>
              <p className="text-xs text-blue-700 mt-1">
                Jika pembayaran berhasil tetapi akun PRO belum aktif dalam 5 menit,
                hubungi admin dengan menyertakan email akun dan nomor transaksi.
              </p>
            </div>
          </div>
        </Card>

        <div className="text-center">
          <a href="/guru/ai-tools" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
            Mulai menggunakan Alat AI →
          </a>
        </div>
      </div>
    );
  }

  if ((status === "success" || status === "pending") && !isPremium) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          {status === "pending" ? (
            <div className="h-10 w-10 animate-spin border-[3px] border-white border-t-transparent rounded-full" />
          ) : (
            <Crown className="h-10 w-10 text-white" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {status === "pending" ? "Menunggu Pembayaran" : "Pembayaran Berhasil Diproses!"}
        </h1>
        <p className="mt-2 text-gray-500">
          {status === "pending"
            ? "Selesaikan pembayaran melalui metode yang kamu pilih. Status akan diperbarui otomatis setelah pembayaran dikonfirmasi."
            : "Pembayaran sedang dikonfirmasi. Akun PRO akan aktif dalam beberapa saat."}
        </p>
        <Card className="mt-6 p-4 bg-amber-50 border-amber-200 text-left">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Menunggu konfirmasi</p>
              <p className="text-xs text-amber-700 mt-1">
                Jika status belum berubah dalam 5 menit, refresh halaman atau hubungi admin dengan menyertakan email akun dan nomor transaksi.
              </p>
            </div>
          </div>
        </Card>
        <div className="mt-8">
          <a href="/guru/ai-tools"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold">
            <Zap className="w-4 h-4" /> Mulai menggunakan Alat AI
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="text-center py-6">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Crown className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Pilih Paketmu</h1>
        <p className="mt-3 text-gray-500 max-w-md mx-auto">
          Coba gratis 30 hari, lalu lanjutkan dengan Pro: 500 kredit AI, unduh 10 dokumen/hari, dan jual karya di Marketplace.
        </p>
      </div>

      <div className="max-w-lg mx-auto">
        {planInfo?.isTrial ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 py-2.5 px-4 text-sm text-violet-700">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
              <Sparkles className="w-3 h-3" /> Guru Pro Trial
            </span>
            Kamu sedang di masa trial ({planInfo.daysRemaining} hari lagi) — setelah habis, lanjutkan dengan Pro.
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
              <Zap className="w-3 h-3" /> Guru Free
            </span>
            Kamu sedang memakai paket Gratis (30 kredit AI/bulan, 1 unduhan/hari).
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
          <div className="absolute right-10 -bottom-10 h-20 w-20 rounded-full bg-white/10" />
          <div className="flex items-start gap-4 relative">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">Program Guru Cerdas</h2>
                <Badge className="bg-white/20 text-white text-[10px] py-0 border-white/30">PROMO</Badge>
              </div>
              <p className="text-sm text-emerald-50 mt-1">
                Guru terverifikasi bisa menjadi <strong>Guru Pro</strong> hanya dengan <strong>Rp 1.000/bulan</strong>.
              </p>
              <p className="text-xs text-emerald-100 mt-1.5">
                Masukkan kode <span className="font-mono font-semibold bg-white/20 px-1.5 py-0.5 rounded">bcgurucerdas1000</span> saat memilih paket <strong>Bulanan</strong> untuk mendapat harga khusus.
              </p>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="max-w-lg mx-auto rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="shrink-0" /> {errorMsg}
          </div>
          {diagnosticCode && (
            <p className="text-xs text-red-400 mt-1 font-mono">Kode: {diagnosticCode}</p>
          )}
          <a href="/guru/bantuan/pembayaran" className="text-xs text-red-600 hover:text-red-800 underline mt-2 inline-block">
            Lihat bantuan pembayaran →
          </a>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-xl p-1 w-fit mx-auto">
        <button onClick={() => { setSelectedPlan("GURU_PRO_MONTHLY"); setCoupon(null); }}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${selectedPlan === "GURU_PRO_MONTHLY" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          Bulanan
        </button>
        <button onClick={() => { setSelectedPlan("GURU_PRO_YEARLY"); setCoupon(null); }}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${selectedPlan === "GURU_PRO_YEARLY" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          Tahunan
          <Badge variant="warning" className="ml-2 text-[10px] py-0">HEMAT Rp 189K</Badge>
        </button>
      </div>

      <div className="max-w-lg mx-auto">
        <CouponInput
          planId={selectedPlan}
          price={selectedPlan === "GURU_PRO_YEARLY" ? 399000 : 49000}
          value={coupon}
          onChange={setCoupon}
        />
        {selectedPlan === "GURU_PRO_YEARLY" ? (
          <p className="text-[11px] text-amber-600 mt-1.5 text-center font-medium">
            Kupon Program Guru Cerdas (Rp 1.000) hanya berlaku untuk paket Bulanan.
          </p>
        ) : (
          <p className="text-[11px] text-gray-400 mt-1.5 text-center">
            Kupon berlaku otomatis saat checkout — Anda tetap membayar lewat Midtrans.
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 border-2 border-gray-100">
          <div className="mb-6"><h2 className="text-xl font-bold text-gray-900">Gratis</h2><p className="text-sm text-gray-500 mt-1">Untuk memulai</p></div>
          <p className="text-3xl font-bold text-gray-900 mb-6">Rp 0</p>
          <ul className="space-y-3 mb-8">
            {PLAN_FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-sm">
                {f.freeOk ? <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> : <X className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />}
                <span className={f.freeOk ? "text-gray-700" : "text-gray-400"}>
                  <span className="font-medium">{f.label}:</span> {f.free}
                </span>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full" disabled>Paket Saat Ini</Button>
        </Card>

        <Card className="p-6 border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 relative overflow-hidden">
          <div className="absolute top-0 right-0"><div className="bg-gradient-to-l from-amber-400 to-orange-400 text-white text-[10px] font-bold px-4 py-1 rounded-bl-lg shadow">POPULER</div></div>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1"><h2 className="text-xl font-bold text-gray-900">PRO</h2><Crown className="w-5 h-5 text-amber-500" /></div>
            <p className="text-sm text-gray-500 mt-1">Untuk guru profesional</p>
          </div>
          {coupon ? (
            <div className="mb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-3xl font-bold text-emerald-600">{formatCurrency(coupon.hargaDiskon)}</p>
                <p className="text-lg text-gray-400 line-through">{formatCurrency(coupon.hargaAsli)}</p>
              </div>
              <p className="text-sm text-gray-500">
                {selectedPlan === "GURU_PRO_YEARLY" ? "per tahun" : "per bulan"} · harga khusus kupon
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {coupon.kode} — hemat {formatCurrency(coupon.hemat)}
              </p>
            </div>
          ) : selectedPlan === "GURU_PRO_YEARLY" ? (
            <div className="mb-6">
              <p className="text-3xl font-bold text-gray-900">Rp 399.000</p>
              <p className="text-sm text-gray-500">per tahun (Rp 33.250/bln)</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">Hemat Rp 189.000 dari bulanan</p>
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-3xl font-bold text-gray-900">Rp 49.000</p>
              <p className="text-sm text-gray-500">per bulan</p>
            </div>
          )}
          <ul className="space-y-3 mb-8">
            {PLAN_FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-gray-700">
                  <span className="font-medium">{f.label}:</span> {f.pro}
                </span>
              </li>
            ))}
          </ul>
          <Button onClick={handleUpgrade} disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-white shadow-lg shadow-amber-200/50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Zap className="w-4 h-4 mr-1.5" />}
            {loading ? "Memproses..." : "Langganan Sekarang"}
          </Button>
        </Card>
      </div>

      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400"><Shield className="w-4 h-4" /> Pembayaran aman via Midtrans</div>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> Kartu</span>
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> QRIS</span>
          <span className="flex items-center gap-1"><Landmark className="w-3.5 h-3.5" /> VA</span>
          <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> e-Wallet</span>
        </div>
      </div>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Butuh bantuan?</p>
            <p className="text-xs text-blue-700 mt-1">
              Jika pembayaran berhasil tetapi akun PRO belum aktif dalam 5 menit,
              hubungi admin dengan menyertakan email akun dan nomor transaksi.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-4">Ketentuan Pembayaran</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <p>• Pembayaran diproses melalui <strong>Midtrans</strong> yang aman.</p>
          <p>• Paket <strong>Bulanan</strong> berlaku <strong>30 hari</strong> sejak pembayaran berhasil.</p>
          <p>• Paket <strong>Tahunan</strong> berlaku <strong>365 hari</strong> sejak pembayaran berhasil.</p>
          <p>• Pembayaran bersifat <strong>sekali bayar</strong> dan tidak diperpanjang otomatis.</p>
          <p>• Jika PRO masih aktif, pembelian baru akan <strong>memperpanjang</strong> masa aktif Anda.</p>
          <p>• Guru baru otomatis mendapat <strong>Guru Pro Trial 30 hari</strong> (200 kredit). Trial <strong>tidak diperpanjang otomatis</strong> — setelah habis, lanjutkan dengan berlangganan Pro.</p>
          <p>• Kupon Program Guru Cerdas (Rp 1.000/bulan) <strong>hanya berlaku untuk paket Bulanan</strong>.</p>
          <p>• Setelah masa PRO habis, akun kembali ke <strong>Guru Free</strong> (30 kredit AI/bulan, 1 unduhan/hari).</p>
          <p>• Kredit AI mengikuti paket yang aktif — PRO: 500/bulan, Free: 30/bulan.</p>
          <p>• Jika pembayaran berhasil tetapi PRO belum aktif dalam 5 menit, <a href="/guru/bantuan/pembayaran" className="text-blue-600 hover:underline">hubungi bantuan</a>.</p>
        </div>
      </Card>
    </div>
  );
}
