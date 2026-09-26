"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Crown, Gem, Check, X, Loader2, ArrowRight, BookOpen, Target, Sparkles, BarChart3, Brain, Shield, Clock, ChevronRight, WandSparkles, Gamepad2, Rocket, Heart } from "lucide-react";
import { loadMidtransSnap } from "@/lib/midtrans-client";

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
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        {/* Hero — Premium Membership Identity */}
        <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 p-7 sm:p-10 text-white shadow-2xl shadow-violet-900/25">
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-400/5 blur-3xl" />
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          </div>

          <div className="relative z-10">
            {/* Membership Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <span className="text-amber-400 text-sm">✦</span>
              <span className="text-[11px] font-semibold tracking-widest uppercase text-white/90">Premium Member</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Belajar dengan arahan yang dipersonalisasi
            </h1>
            <p className="text-violet-200 text-base sm:text-lg max-w-xl">
              BahasaCerdas memahami bagaimana cara belajarmu dan membantu menentukan langkah terbaik berikutnya.
            </p>

            {/* Status Card */}
            <div className="mt-8 inline-flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Gem className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-violet-300 uppercase tracking-wider">Berlaku hingga</p>
                  <p className="text-white font-semibold">
                    {new Date(premiumUntil!).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
              {daysLeft > 0 && (
                <>
                  <div className="hidden sm:block w-px h-10 bg-white/20" />
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-violet-300" />
                    <span className="text-sm text-violet-200">
                      <span className="font-bold text-white">{daysLeft}</span> hari tersisa
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Expiry Warning — Premium Status Card */}
        {isExpiring && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 text-sm">Premium Anda akan berakhir</p>
                <p className="text-xs text-amber-700 mt-1">Perpanjang sekarang untuk menjaga akses fitur Premium tetap berlanjut.</p>
              </div>
              <button
                onClick={() => setStatus("default")}
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-all shadow-sm shadow-amber-200"
              >
                Perpanjang
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Benefit Section — Premium Capability Cards */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-5">Yang kamu dapatkan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="group relative rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50/50 border border-violet-100 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-200">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Latihan Personal</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Soal disesuaikan dengan kemampuanmu. Fokus pada bagian yang perlu diperkuat.</p>
            </div>

            <div className="group relative rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50/50 border border-violet-100 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-200">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">AI Mentor</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Pahami bukan hanya jawabanmu, tetapi mengapa kamu salah.</p>
            </div>

            <div className="group relative rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50/50 border border-violet-100 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-200">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Insight Perkembangan</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Ringkasan mingguan pertumbuhan dan perbandingan skill.</p>
            </div>

            <div className="group relative rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50/50 border border-violet-100 p-5 transition-all duration-300 hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-200">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Simulasi 10x</h3>
              <p className="text-sm text-slate-600 leading-relaxed">UKBI/TKA 10 kali per bulan untuk latihan lebih intensif.</p>
            </div>
          </div>
        </div>

        {/* Feature comparison */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-5">Perbandingan Gratis vs Premium</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-4 px-5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Fitur</th>
                  <th className="text-center py-4 px-5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Gratis</th>
                  <th className="text-center py-4 px-5 font-semibold text-violet-600 text-xs uppercase tracking-wider bg-violet-50/50">Premium ✦</th>
                </tr>
              </thead>
              <tbody>
                {PREMIUM_FEATURES.map((f, i) => (
                  <tr key={f.label} className={`border-b border-slate-50 last:border-0 ${i % 2 === 0 ? "bg-slate-50/30" : ""}`}>
                    <td className="py-3.5 px-5 font-medium text-slate-700">{f.label}</td>
                    <td className="py-3.5 px-5 text-center">
                      {f.freeOk ? (
                        <span className="inline-flex items-center gap-1 text-slate-500"><Check className="w-4 h-4" /> {f.free}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-center bg-violet-50/30">
                      <span className="inline-flex items-center gap-1 text-violet-600 font-medium"><Check className="w-4 h-4" /> {f.premium}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA Section */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/arena/jalur-cerdas"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 px-6 py-3 rounded-xl font-semibold transition-all"
          >
            <BookOpen className="w-4 h-4" />
            Mulai Belajar
            <ArrowRight className="w-4 h-4" />
          </a>
          <button
            onClick={() => setStatus("default")}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 hover:-translate-y-0.5 transition-all"
          >
            <Gem className="w-4 h-4" />
            {isExpiring ? "Perpanjang Sekarang" : "Beli Lagi / Perpanjang"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Pending Payment View ──
  if (status === "pending") {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-200">
          <div className="h-10 w-10 animate-spin border-[3px] border-white border-t-transparent rounded-full" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Menunggu Pembayaran</h1>
        <p className="text-slate-500">Selesaikan pembayaran melalui metode yang kamu pilih.</p>
      </div>
    );
  }

  // ── Pricing / Upgrade View ──
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-16">
      {/* Hero — Premium Aspiration */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#2d1b69] via-[#4c1d95] to-[#1e1b4b] p-8 sm:p-12 text-center text-white shadow-2xl shadow-violet-900/30">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-400/5 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>

        <div className="relative z-10">
          {/* Membership Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
            <span className="text-amber-400 text-sm">✦</span>
            <span className="text-[11px] font-semibold tracking-widest uppercase text-white/90">Premium</span>
          </div>

          {/* Main Heading */}
          <div className="flex justify-center gap-2 mb-4">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 border border-white/20"><WandSparkles size={19} /></span>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 border border-white/20"><Rocket size={19} /></span>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15 border border-white/20"><Heart size={19} /></span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4">
            Naik level belajarmu 🚀
          </h1>
          <p className="text-violet-100 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Mentor AI membantu menjelaskan kesalahanmu, latihan personal menyesuaikan kemampuanmu, dan kamu bisa melihat progres dengan lebih jelas.
          </p>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="max-w-lg mx-auto rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Nilai utama untuk anak — manfaat dijelaskan sebelum harga. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
        {[
          { icon: Brain, title: "Mentor AI", text: "Tanya kenapa kamu salah." },
          { icon: Target, title: "Latihan Personal", text: "Soal mengikuti kemampuanmu." },
          { icon: Gamepad2, title: "Lebih Seru", text: "Streak, XP, badge, dan tantangan." },
          { icon: Sparkles, title: "Insight", text: "Tahu langkah belajarmu berikutnya." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600 mb-3"><Icon size={19} /></div>
            <p className="text-sm font-extrabold text-slate-900">{title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{text}</p>
          </div>
        ))}
      </div>

      {/* Plan Toggle */}
      <div className="flex items-center justify-center gap-2 bg-slate-100 rounded-2xl p-1.5 w-fit mx-auto">
        <button
          onClick={() => setSelectedPlan("MURID_PREMIUM_MONTHLY")}
          className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
            selectedPlan === "MURID_PREMIUM_MONTHLY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Bulanan
        </button>
        <button
          onClick={() => setSelectedPlan("MURID_PREMIUM_YEARLY")}
          className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">Gratis</h2>
          <p className="text-sm text-slate-500 mt-1">Untuk memulai</p>
          <p className="text-3xl font-bold text-slate-900 mt-5 mb-6">Rp 0</p>
          <ul className="space-y-3 mb-8">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2.5 text-sm">
                {f.freeOk ? (
                  <Check className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-slate-200 mt-0.5 shrink-0" />
                )}
                <span className={f.freeOk ? "text-slate-600" : "text-slate-400"}>
                  <span className="font-medium">{f.label}:</span> {f.free}
                </span>
              </li>
            ))}
          </ul>
          <button disabled className="w-full py-3 rounded-xl border border-slate-200 text-slate-400 text-sm font-medium cursor-not-allowed">
            Paket Saat Ini
          </button>
        </div>

        {/* Premium */}
        <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/80 to-purple-50/50 p-6 sm:p-8 relative overflow-hidden shadow-lg shadow-violet-100/50">
          {/* Premium Badge */}
          <div className="absolute top-0 right-0">
            <div className="bg-gradient-to-l from-violet-600 to-purple-600 text-white text-[10px] font-bold px-5 py-1.5 rounded-bl-xl shadow-lg">
              POPULER
            </div>
          </div>

          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-xl font-bold text-slate-900">Premium</h2>
            <Gem className="w-5 h-5 text-violet-500" />
          </div>
          <p className="text-sm text-slate-500 mt-1">Latihan personal & mentor AI</p>

          {selectedPlan === "MURID_PREMIUM_YEARLY" ? (
            <div className="mt-5 mb-6">
              <p className="text-3xl font-bold text-slate-900">Rp 180.000</p>
              <p className="text-sm text-slate-500">per tahun (Rp 15.000/bln)</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1.5">Hemat Rp 39.000 dari bulanan</p>
            </div>
          ) : (
            <div className="mt-5 mb-6">
              <p className="text-3xl font-bold text-slate-900">Rp 19.000</p>
              <p className="text-sm text-slate-500">per bulan</p>
            </div>
          )}

          <ul className="space-y-3 mb-8">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-2.5 text-sm">
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
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-violet-200/50 transition-all disabled:opacity-50 hover:shadow-xl hover:-translate-y-0.5"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</span>
            ) : (
              <span className="inline-flex items-center gap-2">Berlangganan Sekarang <ChevronRight className="w-4 h-4" /></span>
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
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 max-w-2xl mx-auto">
        <h3 className="font-bold text-slate-900 mb-4 text-sm">Ketentuan</h3>
        <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-violet-400 mt-0.5">•</span>
            <span>Pembayaran <strong>sekali bayar</strong> — tidak diperpanjang otomatis.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-400 mt-0.5">•</span>
            <span>Jika Premium masih aktif, pembelian baru <strong>memperpanjang</strong> masa aktif.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-400 mt-0.5">•</span>
            <span>Setelah masa Premium habis, kembali ke <strong>Gratis</strong> (data profil tetap tersimpan).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-400 mt-0.5">•</span>
            <span>Latihan Personal & AI Mentor mulai aktif setelah pembayaran terkonfirmasi.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
