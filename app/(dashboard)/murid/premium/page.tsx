"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Crown, Gem, Check, X, Loader2, ArrowRight, BookOpen, Target, Sparkles, BarChart3, Brain, Shield, Clock, ChevronRight } from "lucide-react";
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
    const expiryLabel = premiumUntil
      ? new Date(premiumUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : "—";

    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-20">
        {/* Premium stage — playful, visual, membership-first */}
        <section className="relative overflow-hidden rounded-[2rem] bg-[#07152f] text-white shadow-[0_30px_90px_-42px_rgba(79,70,229,0.85)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-28 -top-32 h-80 w-80 rounded-full bg-fuchsia-500/25 blur-3xl" />
            <div className="absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.045]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
          </div>

          <div className="relative grid gap-8 px-6 py-7 sm:px-9 sm:py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-12 lg:py-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 backdrop-blur">
                <Crown className="h-3.5 w-3.5 fill-[#ffd24a] text-[#ffd24a]" />
                Premium Aktif
              </div>

              <h1 className="mt-5 max-w-2xl text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl lg:text-[3.4rem]">
                Kamu sudah masuk
                <span className="block bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
                  mode Premium.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100/75 sm:text-base">
                Sekarang kamu punya lebih banyak ruang untuk berlatih, memahami kesalahan,
                dan melihat perkembangan belajarmu dengan lebih jelas.
              </p>

              <div className="mt-7 flex flex-wrap gap-2.5">
                {[
                  ["Latihan Personal", Target],
                  ["AI Mentor", Brain],
                  ["Insight", BarChart3],
                ].map(([label, Icon]) => {
                  const I = Icon as typeof Target;
                  return (
                    <span key={label as string} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3.5 py-2 text-[11px] font-bold text-white/90 backdrop-blur">
                      <I className="h-3.5 w-3.5 text-cyan-200" />
                      {label as string}
                    </span>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/murid/belajar"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-[#18255b] shadow-[0_14px_30px_-14px_rgba(255,255,255,0.9)] transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Mulai belajar
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="/arena"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-3.5 text-sm font-bold text-white backdrop-blur transition-all hover:bg-white/[0.13]"
                >
                  Masuk Arena
                  <Sparkles className="h-4 w-4 text-cyan-200" />
                </a>
              </div>
            </div>

            {/* CSS-built premium crystal — no external artwork required */}
            <div className="relative mx-auto w-full max-w-[330px]">
              <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
              <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10" />
              <div className="relative aspect-square overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-violet-500/30 via-blue-500/15 to-cyan-300/10 shadow-2xl">
                <div className="absolute inset-6 rounded-[2rem] border border-white/10 bg-white/[0.035]" />
                <div className="absolute left-1/2 top-1/2 flex h-36 w-36 -translate-x-1/2 -translate-y-1/2 rotate-6 items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-[#ffe58a] via-[#ffb52e] to-fuchsia-500 shadow-[0_30px_70px_-18px_rgba(255,181,46,0.85)]">
                  <div className="absolute inset-2 rounded-[2rem] border border-white/25" />
                  <Gem className="relative h-16 w-16 text-white drop-shadow-[0_8px_12px_rgba(120,50,200,0.45)]" strokeWidth={1.8} />
                </div>

                <div className="absolute left-6 top-7 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
                  <p className="text-[9px] font-black uppercase tracking-wider text-cyan-100/70">Status</p>
                  <p className="mt-0.5 text-xs font-extrabold text-white">Aktif</p>
                </div>

                <div className="absolute bottom-7 right-6 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-right backdrop-blur">
                  <p className="text-[9px] font-black uppercase tracking-wider text-fuchsia-100/70">Akses Premium</p>
                  <p className="mt-0.5 text-xs font-extrabold text-white">{daysLeft > 0 ? `${daysLeft} hari lagi` : "Aktif"}</p>
                </div>

                <Sparkles className="absolute right-8 top-14 h-6 w-6 text-cyan-200" />
                <Sparkles className="absolute bottom-14 left-8 h-5 w-5 text-fuchsia-200" />
                <span className="absolute left-1/2 top-8 h-2 w-2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.9)]" />
              </div>
            </div>
          </div>

          {/* Membership status rail */}
          <div className="relative grid gap-px border-t border-white/10 bg-white/[0.04] sm:grid-cols-3">
            <div className="px-6 py-4 sm:px-9">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-200/55">Paket</p>
              <p className="mt-1 text-sm font-extrabold text-white">BahasaCerdas Premium</p>
            </div>
            <div className="border-white/10 px-6 py-4 sm:border-l sm:px-9">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-200/55">Berlaku hingga</p>
              <p className="mt-1 text-sm font-extrabold text-white">{expiryLabel}</p>
            </div>
            <div className="border-white/10 px-6 py-4 sm:border-l sm:px-9">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-200/55">Sisa akses</p>
              <p className="mt-1 text-sm font-extrabold text-white">{daysLeft > 0 ? `${daysLeft} hari` : "Aktif"}</p>
            </div>
          </div>
        </section>

        {isExpiring && (
          <div className="relative overflow-hidden rounded-[1.5rem] border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 p-5 shadow-sm sm:p-6">
            <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full bg-amber-300/20 blur-2xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-amber-950">Premium kamu akan berakhir sebentar lagi</p>
                <p className="mt-1 text-xs leading-5 text-amber-800/80">Perpanjang sebelum masa aktif berakhir agar pengalaman belajarmu tetap utuh.</p>
              </div>
              <button
                onClick={() => setStatus("default")}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-amber-600"
              >
                Perpanjang
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Premium capabilities */}
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Yang terbuka untukmu</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Gunakan Premium untuk progres nyata</h2>
            </div>
            <span className="hidden rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-black text-violet-700 sm:inline-flex">3 kemampuan utama</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: Target,
                eyebrow: "01 · Fokus",
                title: "Latihan Personal",
                text: "Latihan diarahkan ke bagian yang perlu kamu perkuat, bukan sekadar menambah jumlah soal.",
                tone: "from-violet-600 to-indigo-600",
                href: "/murid/belajar",
                action: "Mulai latihan",
              },
              {
                icon: Brain,
                eyebrow: "02 · Pahami",
                title: "AI Mentor",
                text: "Jangan berhenti di benar atau salah. Gunakan penjelasan untuk memahami alasan di balik jawaban.",
                tone: "from-blue-600 to-cyan-500",
                href: "/murid/belajar",
                action: "Belajar dengan mentor",
              },
              {
                icon: BarChart3,
                eyebrow: "03 · Tumbuh",
                title: "Insight Perkembangan",
                text: "Lihat pola kemampuanmu dan gunakan insight sebagai petunjuk untuk langkah belajar berikutnya.",
                tone: "from-fuchsia-600 to-violet-600",
                href: "/murid/profile",
                action: "Lihat progres",
              },
            ].map(({ icon: Icon, eyebrow, title, text, tone, href, action }) => (
              <a
                key={title}
                href={href}
                className="group relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.55)] transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${tone} opacity-[0.08] blur-2xl transition-opacity group-hover:opacity-20`} />
                <div className={`relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} shadow-lg`}>
                  <Icon className="h-5.5 w-5.5 text-white" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
                <h3 className="mt-1.5 text-lg font-black text-slate-900">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
                <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-violet-600">
                  {action}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Premium promise */}
        <section className="relative overflow-hidden rounded-[1.7rem] border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-6 sm:p-8">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-300/20 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-violet-700 shadow-sm">
                <Gem className="h-3.5 w-3.5" />
                Pengalaman Premium
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Bukan lebih banyak. Lebih tepat.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Premium dirancang agar waktu belajarmu lebih bernilai: fokus pada kelemahan,
                pahami kesalahan, lalu lihat perkembanganmu dari waktu ke waktu.
              </p>
            </div>
            <a
              href="/murid/belajar"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Lanjut belajar
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        <div className="flex justify-center pt-1">
          <a href="/murid/profile" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 transition hover:text-slate-700">
            Kelola status Premium di Profil
            <ChevronRight className="h-3.5 w-3.5" />
          </a>
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
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Premium hero — product story first, price second */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[#08163a] px-5 py-7 text-white shadow-[0_24px_70px_-34px_rgba(43,75,255,0.75)] sm:px-8 sm:py-9 lg:px-10">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-violet-500/20 blur-2xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur">
              <Gem className="h-3.5 w-3.5 text-[#ffd24a]" />
              BahasaCerdas Premium
            </div>

            <h1 className="mt-5 max-w-2xl text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-[3.15rem]">
              Belajar lebih terarah.
              <span className="block bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
                Berkembang lebih cepat.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100/75 sm:text-base">
              Dapatkan latihan yang lebih personal, AI Mentor, insight perkembangan,
              dan pengalaman belajar Premium yang dirancang untuk membantumu terus maju.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {[
                ["Latihan personal", Target],
                ["AI Mentor", Brain],
                ["Insight perkembangan", BarChart3],
              ].map(([label, Icon]) => {
                const I = Icon as typeof Target;
                return (
                  <span key={label as string} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[11px] font-bold text-white/85 ring-1 ring-white/10">
                    <I className="h-3.5 w-3.5 text-cyan-200" />
                    {label as string}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[300px] lg:max-w-none">
            <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/30 via-blue-500/20 to-cyan-300/10 shadow-2xl">
              <div className="absolute inset-5 rounded-[1.6rem] border border-white/10 bg-white/[0.04]" />
              <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2.2rem] bg-gradient-to-br from-[#ffd24a] via-[#ffb020] to-fuchsia-500 shadow-[0_20px_55px_-15px_rgba(255,178,32,0.8)] rotate-3">
                <Gem className="h-16 w-16 text-white drop-shadow-lg" strokeWidth={1.8} />
              </div>
              <div className="absolute left-6 top-7 rounded-2xl bg-white/10 px-3 py-2 text-[10px] font-extrabold text-cyan-100 backdrop-blur">
                72 unit
              </div>
              <div className="absolute bottom-7 right-6 rounded-2xl bg-white/10 px-3 py-2 text-[10px] font-extrabold text-fuchsia-100 backdrop-blur">
                AI + Insight
              </div>
              <Sparkles className="absolute right-8 top-16 h-6 w-6 text-cyan-200" />
              <Sparkles className="absolute bottom-14 left-9 h-5 w-5 text-fuchsia-200" />
            </div>
          </div>
        </div>
      </section>

      {errorMsg && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Value pillars */}
      <section>
        <div className="mb-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-violet-600">Lebih dari sekadar fitur</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Premium dibuat untuk menemani progresmu</h2>
          <p className="mt-1 text-sm text-slate-500">Fokus pada hal yang perlu kamu kuasai, bukan sekadar menambah jumlah latihan.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Target, title: "Latihan Personal", text: "Latihan disesuaikan dengan kemampuanmu.", tone: "from-violet-500 to-purple-600" },
            { icon: Brain, title: "AI Mentor", text: "Pahami kenapa jawabanmu benar atau salah.", tone: "from-blue-500 to-indigo-600" },
            { icon: BarChart3, title: "Insight", text: "Lihat perkembangan dan area yang perlu diperkuat.", tone: "from-cyan-500 to-teal-600" },
            { icon: Sparkles, title: "Lebih Banyak Latihan", text: "Lebih banyak ruang untuk berlatih dan bertumbuh.", tone: "from-fuchsia-500 to-pink-600" },
          ].map(({ icon: Icon, title, text, tone }) => (
            <div key={title} className="rounded-[1.4rem] border border-slate-200/80 bg-white p-4 shadow-[0_12px_35px_-28px_rgba(15,23,42,0.5)] transition-transform hover:-translate-y-0.5">
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} shadow-lg`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section className="rounded-[1.8rem] border border-slate-200/80 bg-white p-4 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.5)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-violet-600">Pilih paket</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Mulai pengalaman Premium</h2>
            <p className="mt-1 text-sm text-slate-500">Sekali bayar. Tidak ada perpanjangan otomatis.</p>
          </div>

          <div className="inline-flex w-fit rounded-2xl bg-slate-100 p-1.5">
            <button
              onClick={() => setSelectedPlan("MURID_PREMIUM_MONTHLY")}
              className={`rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all ${selectedPlan === "MURID_PREMIUM_MONTHLY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setSelectedPlan("MURID_PREMIUM_YEARLY")}
              className={`rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all ${selectedPlan === "MURID_PREMIUM_YEARLY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              Tahunan
              <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700">HEMAT 21%</span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
            <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-600">Gratis</span>
            <h3 className="mt-4 text-xl font-extrabold text-slate-900">Mulai tanpa biaya</h3>
            <p className="mt-1 text-xs text-slate-500">Tetap belajar dengan fitur dasar BahasaCerdas.</p>
            <div className="mt-5 flex items-end gap-1">
              <span className="text-3xl font-black tracking-tight text-slate-900">Rp 0</span>
              <span className="pb-1 text-xs text-slate-400">selamanya</span>
            </div>
            <div className="mt-5 space-y-2.5">
              {[
                "Jalur Cerdas tetap tersedia",
                "XP, koin, streak, dan badge",
                "Simulasi UKBI/TKA 3× per bulan",
                "SkillRadar dasar",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-slate-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[1.5rem] border-2 border-violet-300 bg-gradient-to-br from-[#f7f3ff] via-white to-[#eef5ff] p-5 shadow-[0_22px_55px_-30px_rgba(124,58,237,0.55)] sm:p-6">
            <div className="absolute right-0 top-0 rounded-bl-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
              Rekomendasi
            </div>

            <div className="flex items-start justify-between gap-3 pr-20">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-violet-700">
                  <Gem className="h-3 w-3" /> Premium
                </span>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">Belajar lebih personal</h3>
                <p className="mt-1 text-xs text-slate-500">Semua yang kamu butuhkan untuk latihan lebih terarah.</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-white/80 p-4 ring-1 ring-violet-100">
              {selectedPlan === "MURID_PREMIUM_YEARLY" ? (
                <>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black tracking-tight text-slate-900">Rp 180.000</span>
                    <span className="pb-1 text-xs text-slate-500">/tahun</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-emerald-600">Setara Rp 15.000/bulan · hemat Rp 39.000</p>
                </>
              ) : (
                <>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black tracking-tight text-slate-900">Rp 19.000</span>
                    <span className="pb-1 text-xs text-slate-500">/bulan</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Sekali bayar untuk 1 bulan akses Premium.</p>
                </>
              )}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {PREMIUM_FEATURES.map((f) => (
                <div key={f.label} className="flex items-start gap-2 rounded-xl bg-white/65 px-3 py-2.5 text-xs text-slate-700 ring-1 ring-slate-100">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" />
                  <span><strong>{f.label}</strong><span className="block text-slate-500">{f.premium}</span></span>
                </div>
              ))}
            </div>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4f46e5] via-[#6366f1] to-[#8b5cf6] px-5 py-4 text-sm font-extrabold text-white shadow-[0_14px_28px_-12px_rgba(79,70,229,0.75)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-12px_rgba(79,70,229,0.85)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Memproses pembayaran...</>
              ) : (
                <>Mulai Premium <ArrowRight className="h-4 w-4" /></>
              )}
            </button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
              <Shield className="h-3.5 w-3.5" />
              Pembayaran aman melalui Midtrans
            </div>
          </div>
        </div>
      </section>

      {/* Comparison — concise, mobile friendly */}
      <section>
        <div className="mb-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Transparan</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">Gratis vs Premium</h2>
        </div>
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.25fr_0.65fr_0.85fr] border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 sm:px-5">
            <span>Fitur</span><span className="text-center">Gratis</span><span className="text-center text-violet-600">Premium</span>
          </div>
          {PREMIUM_FEATURES.map((f, i) => (
            <div key={f.label} className={`grid grid-cols-[1.25fr_0.65fr_0.85fr] items-center border-b border-slate-50 px-4 py-3 last:border-0 sm:px-5 ${i % 2 === 0 ? "bg-slate-50/25" : ""}`}>
              <span className="pr-2 text-xs font-semibold text-slate-700">{f.label}</span>
              <span className="text-center text-[10px] text-slate-400">
                {f.freeOk ? <Check className="mx-auto h-3.5 w-3.5 text-slate-400" /> : <X className="mx-auto h-3.5 w-3.5 text-slate-200" />}
              </span>
              <span className="text-center text-[10px] font-semibold text-violet-600">
                <Check className="mx-auto h-3.5 w-3.5" />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Terms */}
      <section className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Jelas sejak awal</h3>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-500">
              <li>• Pembayaran sekali bayar, tanpa perpanjangan otomatis.</li>
              <li>• Jika Premium masih aktif, pembelian baru memperpanjang masa aktif.</li>
              <li>• Setelah masa Premium berakhir, akun kembali ke paket Gratis dan data tetap tersimpan.</li>
              <li>• Latihan Personal dan AI Mentor aktif setelah pembayaran terkonfirmasi.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
