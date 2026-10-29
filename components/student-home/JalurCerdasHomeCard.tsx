"use client";

import { buttonClass } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles, Target, Zap } from "lucide-react";
import { JalurCerdasIcon } from "@/components/shared/FeatureIcons";

export function JalurCerdasHomeCard() {
  return (
    <section aria-label="Jalur Cerdas" className="h-full">
      <Link
        href="/arena/jalur-cerdas"
        className="group px-card bc-tint-blue flex h-full flex-col p-5 transition-transform duration-200 hover:-translate-y-0.5 sm:p-6"
      >
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center">
            <JalurCerdasIcon size={48} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-bc-info">
                Jalur belajar utama
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-bc-success-soft px-2 py-0.5 text-[10px] font-extrabold text-bc-success">
                <CheckCircle2 size={11} />
                Bertahap
              </span>
            </div>

            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-[var(--px-text)]">
              Jalur Cerdas
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--px-text-dim)]">
              Belajar Bahasa Indonesia selangkah demi selangkah, dari dasar sampai makin mahir.
              Tinggal lanjutkan unit berikutnya.
            </p>
          </div>
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[var(--px-text-dim)]">
          <li className="inline-flex items-center gap-1.5">
            <Target size={13} className="text-bc-info" />
            Latihan terarah
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Zap size={13} className="text-bc-warning-strong" />
            Dapatkan XP
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Sparkles size={13} className="text-bc-violet" />
            Progres tersimpan
          </li>
        </ul>

        <div className="mt-auto pt-5">
          <span className={buttonClass({ variant: "secondary", className: "w-full font-extrabold sm:w-auto" })}>
            Lanjutkan Jalur Cerdas
            <ArrowRight size={16} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </section>
  );
}
