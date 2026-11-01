"use client";

import Link from "next/link";
import { NaraIcon } from "@/components/shared/FeatureIcons";

const QUICK_TOPICS = ["Arti kata", "Tata bahasa", "Sinonim", "Latihan UKBI"];

export function AIBCHomeCard() {
  return (
    <section aria-label="NARA" className="ai-bc-note px-card bc-tint-mint h-full px-5 py-5 md:p-6 relative overflow-hidden">
      <div className="relative">
        <div className="flex items-center gap-4">
          <div className="shrink-0" aria-hidden="true">
            <NaraIcon size={56} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-bc-success">NARA</p>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--px-text)] leading-tight">
              Teman Berpikir, Berkata, dan Berkarya
            </h2>
          </div>
        </div>

        <p className="mt-3 text-sm text-[var(--px-text-dim)] leading-relaxed">
          Bingung dengan pelajaran? Tanya Nara. Yuk, kita kerjakan bareng!
        </p>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Link
            href="/arena/ai"
            className="px-btn-ghost flex shrink-0 items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold px-5 py-2.5"
            aria-label="Tanya Nara"
          >
            Tanya Nara
            <span aria-hidden="true">→</span>
          </Link>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TOPICS.map((t) => (
              <Link
                key={t}
                href="/arena/ai"
 className="text-[11px] font-medium text-[var(--px-text-dim)] hover:text-[var(--px-text)] bg-[var(--px-glass)] hover:bg-[var(--px-glass-strong)] border border-[var(--px-border)] rounded-full px-3 py-1 transition-colors"
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
