"use client";

import Link from "next/link";
import { ArrowRight, Brain, Crown, Gem, LockKeyhole, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useHomeData } from "./home-data";

export function MentorHomeCard() {
  const { me, premium, premiumLoading } = useHomeData();
  const [notice, setNotice] = useState(false);

  const isPremium =
    me?.isPremium === true ||
    premium?.plan === "PRO" ||
    premium?.plan === "FOUNDER" ||
    premium?.plan === "MURID_PREMIUM";

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(false), 7000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <section
      aria-label="AI Mentor"
      className="relative overflow-hidden rounded-[1.75rem] border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-5 shadow-[0_20px_55px_-38px_rgba(79,70,229,0.75)] dark:border-white/10 dark:from-[#111a32] dark:via-[#10182d] dark:to-[#0d2138] sm:p-6"
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 shadow-[0_18px_40px_-16px_rgba(124,58,237,0.8)]">
            <Brain className="h-7 w-7 text-white" />
            <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#ffd24a] text-[#3b2400] shadow-sm dark:border-[#111a32]">
              <Crown className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
                AI Mentor
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white/80 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-violet-700 dark:border-violet-300/15 dark:bg-white/[0.06] dark:text-violet-200">
                <Gem className="h-3 w-3" />
                Premium
              </span>
            </div>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">
              Punya teman untuk membaca arah belajarmu.
            </h2>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-600 dark:text-slate-300/75 sm:text-sm">
              Mentor membaca progresmu dan membantu menentukan langkah belajar berikutnya.
            </p>
          </div>
        </div>

        {!premiumLoading && isPremium ? (
          <Link
            href="/murid/mentor"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#18255b] px-5 py-3 text-xs font-black text-white shadow-lg shadow-violet-900/15 transition hover:-translate-y-0.5 hover:bg-[#223273] dark:bg-white dark:text-[#18255b] dark:hover:bg-violet-50"
          >
            Buka Mentor
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setNotice(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-white/90 px-5 py-3 text-xs font-black text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/[0.07] dark:text-violet-200 dark:hover:bg-white/[0.1]"
          >
            <LockKeyhole className="h-4 w-4" />
            Buka Mentor
          </button>
        )}
      </div>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="relative mt-4 flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-100/90 px-4 py-3 text-violet-950 dark:border-violet-300/15 dark:bg-violet-400/[0.09] dark:text-violet-100"
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black">AI Mentor adalah fitur Premium.</p>
            <p className="mt-0.5 text-[11px] leading-5 text-violet-900/75 dark:text-violet-100/70">
              Aktifkan Premium untuk mendapatkan analisis progres dan langkah belajar yang lebih personal.
            </p>
            <Link
              href="/murid/premium"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-violet-700 underline underline-offset-4 dark:text-violet-200"
            >
              Lihat Premium
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setNotice(false)}
            className="shrink-0 rounded-lg p-1 text-violet-600/70 transition hover:bg-violet-200/60 hover:text-violet-900 dark:text-violet-200/60 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
