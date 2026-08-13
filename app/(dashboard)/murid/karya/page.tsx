import Link from "next/link";
import { PenLine, Sparkles } from "lucide-react";
import KaryaFeed from "@/components/student-karya/KaryaFeed";
import KaryaSayaCard from "@/components/student-karya/KaryaSayaCard";
import FeaturedWorks from "@/components/student-karya/FeaturedWorks";

/**
 * Karya — route KANONIK produk Karya di Student Shell (murid).
 * KARYA 3.0 "PANGGUNG KARYA": hero showcase → Karya Saya → Karya Unggulan →
 * feed stage (grid 3/2/1, filter + search + tantangan mingguan + AI BC).
 * Feed tetap implementasi TUNGGAL KaryaFeed (dipakai juga mirror /arena/feed
 * untuk APK + preview guru — variant compact). Hanya presentation; tidak ada
 * perubahan API/DB/logika. Gate auth/onboarding ditangani layout (murid).
 */
export default function MuridKaryaPage() {
  return (
    <div className="arena-page">
      {/* HERO — PANGGUNG KARYA */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 px-5 py-8 text-white shadow-lg shadow-violet-500/20 md:px-8 md:py-12">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 dark:bg-slate-900/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full bg-fuchsia-400/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute right-8 top-6 h-10 w-10 rotate-12 rounded-xl bg-white/10 dark:bg-slate-900/10" aria-hidden />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/85 md:text-[11px]">
            <Sparkles size={12} /> Panggung Karya
          </p>
          <h1 className="mt-2 max-w-2xl text-2xl font-extrabold leading-tight md:text-4xl md:leading-[1.15]">
            Ide yang kamu buat layak untuk dilihat.
          </h1>
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">
            Tulis puisi, cerpen, artikel, anekdot, pantun, atau opini — lalu bagikan ke teman-temanmu.
            Kumpulkan apresiasi, dan tampilkan karyamu di Panggung Karya.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/murid/karya/tulis"
 className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800/90 px-5 py-2.5 text-sm font-extrabold text-violet-700 dark:text-violet-300 shadow-sm transition-all hover:bg-violet-50"
            >
              <PenLine size={15} /> Buat Karya
            </Link>
            <a
              href="#karya-saya"
 className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/15 dark:bg-slate-900/15 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-white/25 "
            >
              Karya Saya
            </a>
          </div>
        </div>
      </section>

      {/* KARYA SAYA — ringkasan karya milik user */}
      <KaryaSayaCard />

      {/* KARYA UNGGULAN — curated by engagement */}
      <FeaturedWorks />

      {/* FEED PANGGUNG — Jelajahi Karya */}
      <div className="mt-6">
        <KaryaFeed variant="stage" />
      </div>
    </div>
  );
}
