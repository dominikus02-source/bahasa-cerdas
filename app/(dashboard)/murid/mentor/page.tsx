"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Crown,
  Gem,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { HomeDataProvider, useHomeData } from "@/components/student-home/home-data";

type MentorResult = {
  headline: string;
  diagnosis: string;
  reason: string;
  action: string;
  encouragement: string;
};

function MentorRoom() {
  const { premium, premiumLoading } = useHomeData();
  const [result, setResult] = useState<MentorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const isPremium =
    premium?.plan === "PRO" ||
    premium?.plan === "FOUNDER" ||
    premium?.plan === "MURID_PREMIUM";

  async function askMentor() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/player/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze" }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError({
          message: payload.message || payload.error || "Mentor belum bisa merespons. Coba lagi.",
          code: payload.code,
        });
        return;
      }

      if (!payload.data) {
        setError({ message: "Respons Mentor belum lengkap. Coba lagi." });
        return;
      }

      setResult(payload.data);
    } catch {
      setError({ message: "Koneksi ke Mentor terputus. Coba lagi beberapa saat." });
    } finally {
      setLoading(false);
    }
  }

  if (premiumLoading) {
    return (
      <div className="mx-auto max-w-5xl pb-20">
        <div className="h-[420px] animate-pulse rounded-[2rem] bg-slate-200 dark:bg-white/[0.06]" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="mx-auto max-w-5xl pb-20">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#07152f] px-6 py-10 text-white shadow-[0_30px_90px_-42px_rgba(79,70,229,0.85)] sm:px-10 lg:px-12 lg:py-14">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-violet-500/25 blur-3xl" />
            <div className="absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.045]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
          </div>

          <div className="relative mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-[0_20px_50px_-16px_rgba(168,85,247,0.9)]">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
              <Crown className="h-3.5 w-3.5 text-[#ffd24a]" />
              Fitur Premium
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
              Kenalan dengan
              <span className="block bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
                AI Mentor.
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-blue-100/75 sm:text-base">
              Mentor membaca pola belajarmu dari data nyata, lalu membantu menentukan
              apa yang sebaiknya kamu lakukan berikutnya.
            </p>
            <Link
              href="/murid/premium"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-[#18255b] shadow-xl transition hover:-translate-y-0.5"
            >
              Buka Premium
              <Gem className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-20">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#07152f] text-white shadow-[0_30px_90px_-42px_rgba(79,70,229,0.85)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-violet-500/25 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.045]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        </div>

        <div className="relative grid gap-8 px-6 py-8 sm:px-9 sm:py-10 lg:grid-cols-[1fr_310px] lg:items-center lg:px-12 lg:py-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[#ffd24a]" />
              Premium Mentor
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl">
              Jangan cuma belajar.
              <span className="block bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
                Pahami arahmu.
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100/75 sm:text-base">
              Mentor BahasaCerdas melihat bukti belajar yang sudah kamu kumpulkan,
              mengenali fokus yang paling penting, lalu memberimu satu langkah yang bisa dilakukan.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {[
                [TrendingUp, "Baca progres"],
                [Target, "Cari fokus"],
                [ArrowRight, "Tentukan langkah"],
              ].map(([Icon, label]) => {
                const I = Icon as typeof TrendingUp;
                return (
                  <span key={label as string} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2 text-[11px] font-bold text-white/85 backdrop-blur">
                    <I className="h-3.5 w-3.5 text-cyan-200" />
                    {label as string}
                  </span>
                );
              })}
            </div>

            <button
              onClick={askMentor}
              disabled={loading}
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-[#18255b] shadow-xl transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {loading ? "Mentor sedang membaca..." : result ? "Perbarui analisis" : "Tanya Mentor"}
            </button>
          </div>

          <div className="relative mx-auto w-full max-w-[300px]">
            <div className="absolute inset-4 rounded-[2rem] border border-white/10" />
            <div className="absolute inset-10 rounded-full border border-cyan-200/10" />
            <div className="relative aspect-square overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-violet-500/20 via-blue-500/10 to-cyan-300/10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_42%)]" />
              <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#ffe58a] via-[#ffb52e] to-fuchsia-500 shadow-[0_25px_70px_-18px_rgba(255,181,46,0.8)]">
                <Brain className="h-14 w-14 text-white" />
              </div>
              <span className="absolute left-[20%] top-[22%] h-3 w-3 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(165,243,252,0.9)]" />
              <span className="absolute right-[18%] top-[31%] h-2.5 w-2.5 rounded-full bg-fuchsia-300 shadow-[0_0_18px_rgba(240,171,252,0.8)]" />
              <span className="absolute bottom-[22%] left-[24%] h-2.5 w-2.5 rounded-full bg-[#ffd24a] shadow-[0_0_18px_rgba(255,210,74,0.9)]" />
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/70 backdrop-blur">
                Learning Intelligence
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/[0.08] dark:text-rose-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-bold">{error.message}</p>
              {error.code === "QUOTA_EXCEEDED" && (
                <p className="mt-1 text-xs opacity-75">Kuota Mentor akan tersedia lagi setelah reset harian.</p>
              )}
            </div>
            {error.code !== "QUOTA_EXCEEDED" && (
              <button onClick={askMentor} className="shrink-0 text-xs font-black underline underline-offset-4">
                Coba lagi
              </button>
            )}
          </div>
        </div>
      )}

      {result ? (
        <section className="mt-7 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="relative overflow-hidden rounded-[1.75rem] border border-violet-200/70 bg-white p-6 shadow-[0_25px_65px_-40px_rgba(79,70,229,0.7)] dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[0_25px_65px_-40px_rgba(0,0,0,0.8)] sm:p-8">
            <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-400/15 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700 dark:bg-violet-400/10 dark:text-violet-200">
                <Sparkles className="h-3.5 w-3.5" />
                Analisis Mentor
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                {result.headline}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300/75">
                {result.diagnosis}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 dark:border-amber-300/10 dark:bg-amber-400/[0.06]">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Mengapa?</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200/80">{result.reason}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 dark:border-emerald-300/10 dark:bg-emerald-400/[0.06]">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Langkah berikutnya</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200/80">{result.action}</p>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/[0.04]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                <p className="text-xs italic leading-5 text-slate-500 dark:text-slate-300/65">{result.encouragement}</p>
              </div>
            </div>
          </article>

          <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.045]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg">
              <Target className="h-5 w-5 text-white" />
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Learning Loop</p>
            <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Satu langkah yang jelas.</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-300/65">
              Mentor tidak mencoba menjelaskan semuanya sekaligus. Fokusnya satu insight yang paling berguna untuk sesi belajarmu sekarang.
            </p>
            <div className="mt-5 space-y-3">
              {[
                "Data belajar berasal dari progresmu",
                "Konteks dibangun server-side",
                "Respons punya fallback saat AI bermasalah",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300/70">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>
            <button
              onClick={askMentor}
              disabled={loading}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/80 dark:hover:bg-white/[0.08]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Analisis ulang
            </button>
          </aside>
        </section>
      ) : !error ? (
        <section className="mt-7 rounded-[1.75rem] border border-slate-200 bg-white p-7 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.045] sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-400/10">
            <Brain className="h-7 w-7 text-violet-600 dark:text-violet-300" />
          </div>
          <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">Siap membaca progresmu.</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-300/65">
            Tekan Tanya Mentor. Tidak perlu menulis prompt—Mentor akan memulai dari bukti belajar yang sudah tersedia.
          </p>
        </section>
      ) : null}

      <div className="mt-6 text-center">
        <Link href="/murid/premium" className="text-xs font-bold text-slate-400 transition hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300">
          Kembali ke Premium
          <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}


export default function MentorPage() {
  return (
    <HomeDataProvider>
      <MentorRoom />
    </HomeDataProvider>
  );
}
