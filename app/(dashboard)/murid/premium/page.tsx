"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Crown, Gem, Check, X, Loader2, Zap, ArrowRight, BookOpen, Target, Sparkles, BarChart3, Brain, Shield, Clock } from "lucide-react";
import { loadMidtransSnap } from "@/lib/midtrans-client";
import { formatCurrency } from "@/lib/format";

interface UserInfo {
  isPremium: boolean;
  premiumPlan: string;
  premiumUntil: string | null;
  fullName: string;
}

interface PremiumFeature {
  label: string;
  free: string;
  freeOk: boolean;
  premium: string;
  premiumOk: boolean;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  { label: "Latihan Personal (Adaptive)", free: "Segera Hadir", freeOk: false, premium: "Tersedia — soal disesuaikan kemampuanmu", premiumOk: true },
  { label: "AI Mentor (Penjelasan Kesalahan)", free: "Segera Hadir", freeOk: false, premium: "Tersedia — \"Kenapa saya salah?\"", premiumOk: true },
  { label: "Insight Perkembangan", free: "—", freeOk: false, premium: "Ringkasan mingguan + perbandingan", premiumOk: true },
  { label: "Tes Ulang Berkala", free: "—", freeOk: false, premium: "Auto-suggest setelah 20 latihan", premiumOk: true },
  { label: "Simulasi UKBI/TKA", free: "3/bulan", freeOk: true, premium: "10/bulan", premiumOk: true },
  { label: "Kemampuan (SkillRadar)", free: "7 bar + tren", freeOk: true, premium: "Detail + rekomendasi per skill", premiumOk: true },
  { label: "Jalur Cerdas (72 unit)", free: "Semua unit", freeOk: true, premium: "Semua unit", premiumOk: true },
  { label: "XP, Koin, Streak, Badge", free: "Ya", freeOk: true, premium: "Ya + Streak Freeze 1/bulan", premiumOk: true },
  { label: "Profil Premium", free: "—", freeOk: false, premium: "Frame, badge, title khusus", premiumOk: true },
  { label: "Statistik Lanjutan", free: "—", freeOk: false, premium: "Detail per pertanyaan", premiumOk: true },
];

const ERROR_MESSAGES: Record<string, string> = {
  CHECKOUT_AUTH_REQUIRED: "Silakan login terlebih dahulu.",
  CHECKOUT_FORBIDDEN_ROLE: "Hanya murid yang dapat membeli paket Premium.",
  CHECKOUT_INVALID_PLAN: "Paket tidak tersedia.",
  MIDTRANS_UNAUTHORIZED: "Kredensial pembayaran belum sesuai.",
  MIDTRANS_CREATE_FAILED: "Pembayaran belum bisa dibuat. Coba lagi.",
};

export default function MuridPremiumPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"default" | "success" | "pending">("default");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"MURID_PREMIUM_MONTHLY" | "MURID_PREMIUM_YEARLY">("MURID_PREMIUM_YEARLY");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const snapLoaded = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "success") setStatus("success");
  }, []);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => {
        const u = d.user || d;
        setUserInfo({
          isPremium: u.isPremium || false,
          premiumPlan: u.premiumPlan || "FREE",
          premiumUntil: u.premiumUntil || null,
          fullName: u.fullName || "",
        });
        if (u.isPremium) setStatus("success");
      })
      .catch(() => {})
      .finally(() => setUserLoading(false));
  }, []);

  useEffect(() => {
    loadMidtransSnap(process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "")
      .then((loaded) => { snapLoaded.current = loaded; })
      .catch(() => {});
  }, []);

  const handleUpgrade = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan }),
      });
      const result = await res.json();
      if (!res.ok || result.ok === false) {
        setErrorMsg(result.message || ERROR_MESSAGES[result.error] || "Gagal memproses pembayaran.");
        setLoading(false);
        return;
      }
      if (result.bypass) { setStatus("success"); setLoading(false); return; }
      const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
      if (result.token && clientKey) {
        try { await loadMidtransSnap(clientKey); } catch {}
        if (typeof window !== "undefined" && window.snap) {
          window.snap.pay(result.token, {
            onSuccess: () => { setStatus("success"); setLoading(false); },
            onPending: () => { setStatus("pending"); setLoading(false); },
            onError: () => { setErrorMsg("Pembayaran gagal. Coba lagi."); setLoading(false); },
            onClose: () => { setLoading(false); },
          });
          return;
        }
      }
      if (result.redirectUrl) { window.location.href = result.redirectUrl; return; }
      setErrorMsg("Pembayaran belum bisa dibuka. Coba beberapa saat lagi.");
      setLoading(false);
    } catch {
      setErrorMsg("Tidak bisa menghubungi server pembayaran.");
      setLoading(false);
    }
  }, [selectedPlan]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
      </div>
    );
  }

  const isPremium = userInfo?.isPremium || false;
  const premiumUntil = userInfo?.premiumUntil;
  const daysLeft = premiumUntil
    ? Math.max(0, Math.ceil((new Date(premiumUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const isExpiring = daysLeft > 0 && daysLeft <= 7;

  // ── Active Premium View ──
  if (isPremium && (status === "success" || status === "pending")) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-8 text-white text-center shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute right-12 -bottom-8 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4">
              <Gem className="h-8 w-8 text-white" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold mb-3">
              <span>✦</span> Premium Aktif
            </div>
            <h1 className="text-2xl font-bold">Premium Aktif!</h1>
            <p className="mt-2 text-violet-100">
              Berlaku hingga{" "}
              {new Date(premiumUntil!).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {isExpiring && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900 text-sm">Premium akan berakhir dalam {daysLeft} hari</p>
                <p className="text-xs text-amber-700 mt-1">Perpanjang sekarang agar akses tetap berlanjut.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
            <Target className="w-8 h-8 text-violet-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-900">Latihan Personal</p>
            <p className="text-xs text-slate-500 mt-1">Soal disesuaikan dengan kemampuanmu</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
            <Brain className="w-8 h-8 text-violet-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-900">AI Mentor</p>
            <p className="text-xs text-slate-500 mt-1">Penjelasan kenapa kamu salah</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
            <BarChart3 className="w-8 h-8 text-violet-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-900">Insight Perkembangan</p>
            <p className="text-xs text-slate-500 mt-1">Ringkasan mingguan pertumbuhan</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
            <Sparkles className="w-8 h-8 text-violet-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-900">Simulasi 10x</p>
            <p className="text-xs text-slate-500 mt-1">UKBI/TKA 10 kali/bulan</p>
          </div>
        </div>

        <div className="text-center">
          <a href="/arena/jalur-cerdas" className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-violet-700 hover:to-purple-700 transition-all">
            <BookOpen className="w-4 h-4" /> Mulai Belajar
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  // ── Pending Payment View ──
  if (status === "pending") {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <div className="h-10 w-10 animate-spin border-[3px] border-white border-t-transparent rounded-full" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Menunggu Pembayaran</h1>
        <p className="mt-2 text-slate-500">Selesaikan pembayaran melalui metode yang kamu pilih.</p>
      </div>
    );
  }

  // ── Pricing / Upgrade View ──
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Hero */}
      <div className="text-center py-6">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Gem className="h-8 w-8 text-white" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold mb-3">
          ✦ Premium
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Bangun Kemampuanmu</h1>
        <p className="mt-3 text-slate-500 max-w-md mx-auto">
          Latihan personal, AI Mentor, dan insight perkembangan — semuanya disesuaikan untukmu.
        </p>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="max-w-lg mx-auto rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Plan Toggle */}
      <div className="flex items-center justify-center gap-2 bg-slate-100 rounded-xl p-1 w-fit mx-auto">
        <button
          onClick={() => setSelectedPlan("MURID_PREMIUM_MONTHLY")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedPlan === "MURID_PREMIUM_MONTHLY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Bulanan
        </button>
        <button
          onClick={() => setSelectedPlan("MURID_PREMIUM_YEARLY")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedPlan === "MURID_PREMIUM_YEARLY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Tahunan
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
            HEMAT 21%
          </span>
        </button>
      </div>

      {/* Feature Comparison */}
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Free */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">Gratis</h2>
          <p className="text-sm text-slate-500 mt-1">Untuk memulai</p>
          <p className="text-3xl font-bold text-slate-900 mt-4 mb-6">Rp 0</p>
          <ul className="space-y-3 mb-8">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-sm">
                {f.freeOk ? (
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                )}
                <span className={f.freeOk ? "text-slate-700" : "text-slate-400"}>
                  <span className="font-medium">{f.label}:</span> {f.free}
                </span>
              </li>
            ))}
          </ul>
          <button disabled className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-400 text-sm font-medium cursor-not-allowed">
            Paket Saat Ini
          </button>
        </div>

        {/* Premium */}
        <div className="rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50/50 to-purple-50/50 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0">
            <div className="bg-gradient-to-l from-violet-500 to-purple-500 text-white text-[10px] font-bold px-4 py-1 rounded-bl-lg shadow">
              POPULER
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900">Premium</h2>
            <Gem className="w-5 h-5 text-violet-500" />
          </div>
          <p className="text-sm text-slate-500 mt-1">Latihan personal & mentor AI</p>
          {selectedPlan === "MURID_PREMIUM_YEARLY" ? (
            <div className="mt-4 mb-6">
              <p className="text-3xl font-bold text-slate-900">Rp 180.000</p>
              <p className="text-sm text-slate-500">per tahun (Rp 15.000/bln)</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">Hemat Rp 39.000 dari bulanan</p>
            </div>
          ) : (
            <div className="mt-4 mb-6">
              <p className="text-3xl font-bold text-slate-900">Rp 19.000</p>
              <p className="text-sm text-slate-500">per bulan</p>
            </div>
          )}
          <ul className="space-y-3 mb-8">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                <span className="text-slate-700">
                  <span className="font-medium">{f.label}:</span> {f.premium}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-violet-200/50 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</span>
            ) : (
              <span className="inline-flex items-center gap-2"><Zap className="w-4 h-4" /> Berlangganan Sekarang</span>
            )}
          </button>
        </div>
      </div>

      {/* Trust */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <Shield className="w-4 h-4" /> Pembayaran aman via Midtrans
        </div>
      </div>

      {/* Terms */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 max-w-2xl mx-auto">
        <h3 className="font-bold text-slate-900 mb-3 text-sm">Ketentuan</h3>
        <ul className="space-y-2 text-xs text-slate-600">
          <li>• Pembayaran <strong>sekali bayar</strong> — tidak diperpanjang otomatis.</li>
          <li>• Jika Premium masih aktif, pembelian baru <strong>memperpanjang</strong> masa aktif.</li>
          <li>• Setelah masa Premium habis, kembali ke <strong>Gratis</strong> (data profil tetap tersimpan).</li>
          <li>• Latihan Personal & AI Mentor mulai aktif setelah pembayaran terkonfirmasi.</li>
        </ul>
      </div>
    </div>
  );
}
