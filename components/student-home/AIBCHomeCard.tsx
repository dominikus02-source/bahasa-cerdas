"use client";

import Image from "next/image";
import Link from "next/link";
import { gambarKarakter } from "@/lib/arena-junior/karakter";

const QUICK_TOPICS = ["Arti kata", "Tata bahasa", "Sinonim", "Latihan UKBI"];

export function AIBCHomeCard() {
  return (
    <section aria-label="AI BC" className="px-card px-5 py-6 md:p-7 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--px-royal)]/25 via-violet-600/15 to-emerald-500/15 pointer-events-none" />
      <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-14 h-14" aria-hidden="true">
            <Image
              src={gambarKarakter("zelby", "reading")}
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-contain drop-shadow"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">AI BC</p>
            <h2 className="text-lg md:text-xl font-extrabold text-[var(--px-text)] leading-tight">
              Teman Belajarmu
            </h2>
          </div>
        </div>

        <p className="mt-3 text-sm text-[var(--px-text-dim)] leading-relaxed">
          Bingung dengan pelajaran? Tanya BC. Kita belajar bareng.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Link
            href="/arena/ai"
            className="px-btn-gold flex items-center justify-center gap-2 text-sm font-bold px-6 py-3"
            aria-label="Tanya AI BC"
          >
            Tanya AI BC
            <span aria-hidden="true">→</span>
          </Link>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TOPICS.map((t) => (
              <Link
                key={t}
                href="/arena/ai"
                className="text-[11px] font-medium text-[var(--px-text-dim)] hover:text-[var(--px-text)] bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1 transition-colors"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}