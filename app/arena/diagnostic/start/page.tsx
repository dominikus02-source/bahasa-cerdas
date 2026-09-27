"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, FileText, GraduationCap, Loader2, Sparkles } from "lucide-react";

type SourceId = "BANK_SOAL" | "UKBI" | "TKA";

const SOURCES: {
  id: SourceId;
  label: string;
  eyebrow: string;
  description: string;
  detail: string;
  icon: typeof BookOpen;
}[] = [
  {
    id: "BANK_SOAL",
    label: "Bank Soal BC",
    eyebrow: "REKOMENDASI",
    description: "Soal Bahasa Indonesia dari bank soal BahasaCerdas.",
    detail: "Cocok untuk pemetaan kemampuan belajar harian.",
    icon: BookOpen,
  },
  {
    id: "UKBI",
    label: "UKBI",
    eyebrow: "STANDAR BAHASA",
    description: "Butir UKBI terverifikasi untuk kemampuan berbahasa.",
    detail: "Membaca, menyimak, kaidah, menulis, dan berbicara.",
    icon: GraduationCap,
  },
  {
    id: "TKA",
    label: "TKA",
    eyebrow: "ASESMEN",
    description: "Butir TKA Bahasa Indonesia yang sudah terverifikasi.",
    detail: "Literasi membaca, tata bahasa, sastra, dan menulis.",
    icon: FileText,
  },
];

export default function DiagnosticStartPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<SourceId>("BANK_SOAL");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const response = await fetch("/api/player/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", source: selected, size: 10 }),
      });
      const data = await response.json();
      if (!response.ok || data.mode !== "DIAGNOSTIC" || typeof data.sessionId !== "string") {
        throw new Error(
          data.reasonText ||
          data.error ||
          "Sumber tes ini belum tersedia. Coba sumber lain."
        );
      }
      router.push(`/arena/diagnostic/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tes belum bisa dimulai.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <main className="relative min-h-[calc(100vh-80px)] overflow-hidden px-4 py-6 sm:px-6 md:py-10">
      <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/murid/beranda")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <ArrowLeft size={15} />
            Beranda
          </button>
          <span className="rounded-full bg-violet-500/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">
            Tes Awal
          </span>
        </div>

        <section className="relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_24px_80px_-36px_rgba(76,29,149,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-[#111a32]/90 sm:p-8 md:p-10">
          <div className="absolute right-8 top-8 hidden h-20 w-20 rotate-6 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20 sm:flex">
            <Sparkles size={30} />
          </div>

          <div className="max-w-xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">
              KENALI KEMAMPUANMU
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Pilih cara kamu ingin dipetakan.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300/80 sm:text-base">
              Tes ini bukan ujian untuk menentukan nilai. BC memakainya untuk membaca kemampuanmu,
              lalu hasilnya dipakai untuk mengarahkan latihan dan Mentor AI.
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {SOURCES.map((source) => {
              const Icon = source.icon;
              const active = selected === source.id;
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => setSelected(source.id)}
                  className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                    active
                      ? "border-violet-400 bg-violet-50 shadow-md shadow-violet-500/10 dark:border-violet-400/70 dark:bg-violet-500/10"
                      : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-violet-400/40"
                  }`}
                >
                  {active && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white">
                      <CheckCircle2 size={14} />
                    </span>
                  )}
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    active
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-violet-600 dark:bg-white/10 dark:text-violet-300"
                  }`}>
                    <Icon size={19} />
                  </span>
                  <p className="mt-4 text-[9px] font-extrabold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">
                    {source.eyebrow}
                  </p>
                  <h2 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">{source.label}</h2>
                  <p className="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300/70">{source.description}</p>
                  <p className="mt-3 text-[10px] font-semibold leading-4 text-slate-500 dark:text-slate-400">{source.detail}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">10 soal · sekitar 5–8 menit</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Jawab sebisamu. Hasil akan menjadi titik awal perkembanganmu.
              </p>
            </div>
            <button
              type="button"
              onClick={start}
              disabled={starting}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-6 text-sm font-extrabold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-wait disabled:opacity-70"
            >
              {starting ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
              {starting ? "Menyiapkan tes..." : "Mulai Tes Awal"}
            </button>
          </div>

          {error && (
            <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              {error}
            </div>
          )}
        </section>

        <p className="mx-auto mt-5 max-w-xl text-center text-[11px] leading-5 text-slate-500 dark:text-slate-400">
          Setelah tes selesai, kamu bisa melihat kemampuan, tren, dan area yang masih perlu dilatih di Profil.
          Data tes juga menjadi salah satu bukti yang dipakai Mentor AI.
        </p>
      </div>
    </main>
  );
}
