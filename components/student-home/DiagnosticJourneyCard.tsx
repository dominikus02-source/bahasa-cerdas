"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Brain, CheckCircle2, PenLine, Sparkles } from "lucide-react";

type DailyDiagnostic = {
  status: "AVAILABLE" | "QUIZ" | "WRITING" | "DONE" | "UNAVAILABLE";
  dayKey?: string;
  title?: string;
  subtitle?: string;
  estimatedMinutes?: number;
  answeredCount?: number;
  totalQuestions?: number;
  remainingQuestions?: number;
};

export function DiagnosticJourneyCard() {
  const [data, setData] = useState<DailyDiagnostic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/player/diagnostic/daily")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data || data.status === "UNAVAILABLE") return null;

  const active = data.status === "QUIZ" || data.status === "WRITING";
  const done = data.status === "DONE";

  return (
    <section
      aria-label="Quest kemampuan harian"
      className="relative overflow-hidden rounded-[1.75rem] border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-5 shadow-[0_20px_55px_-38px_rgba(79,70,229,0.75)] dark:border-white/10 dark:from-[#101a36] dark:via-[#10182d] dark:to-[#0b2438] sm:p-6"
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 shadow-[0_18px_40px_-16px_rgba(124,58,237,0.8)]">
            {data.status === "WRITING" ? <PenLine className="h-7 w-7 text-white" /> : <Brain className="h-7 w-7 text-white" />}
            <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#ffd24a] text-[#3b2400] shadow-sm dark:border-[#101a36]">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
              {done ? "Perjalananmu" : "Quest Kemampuan"}
            </span>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">
              {done ? "Quest hari ini selesai." : active ? "Lanjutkan petualanganmu." : "Kenali kemampuanmu sedikit demi sedikit."}
            </h2>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-600 dark:text-slate-300/75 sm:text-sm">
              {done
                ? "Bukti belajar hari ini sudah masuk ke Perkembanganmu."
                : data.status === "WRITING"
                  ? "Satu tantangan terakhir: tunjukkan caramu menggunakan bahasa."
                  : "Beberapa tantangan singkat. Besok kita lanjut lagi dengan tantangan yang berbeda."}
            </p>
          </div>
        </div>

        {done ? (
          <Link href="/murid/progresku" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#18255b] px-5 py-3 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 dark:bg-white dark:text-[#18255b]">
            Lihat perkembangan
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link href="/murid/tes-awal" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#18255b] px-5 py-3 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 dark:bg-white dark:text-[#18255b]">
            {active ? "Lanjutkan" : "Mulai quest"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {active && (
        <div className="relative mt-5 flex items-center gap-3 rounded-2xl border border-white/60 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/[0.045]">
          {data.status === "WRITING" ? (
            <>
              <PenLine className="h-4 w-4 text-fuchsia-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Tantangan Menulis</span>
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Tantangan {data.answeredCount ?? 0}/{data.totalQuestions ?? 4}</span>
            </>
          )}
          <span className="ml-auto text-[10px] font-bold text-slate-400 dark:text-slate-500">±7 menit</span>
        </div>
      )}

      {done && (
        <div className="relative mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/[0.07] dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Besok akan muncul quest kemampuan berikutnya.
        </div>
      )}
    </section>
  );
}
