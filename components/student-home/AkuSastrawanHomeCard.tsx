"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Feather, Gem, LockKeyhole, Sparkles, X } from "lucide-react";
import { useHomeData } from "./home-data";

export function AkuSastrawanHomeCard() {
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
    <section aria-label="AKU SASTRAWAN" className="px-card flex h-full flex-col p-5 sm:p-6">
      <div className="flex min-w-0 items-start gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-bc-icon bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
          <Feather className="h-6 w-6" />
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600 ring-2 ring-bc-surface dark:bg-amber-950/50 dark:text-amber-300">
            <Gem className="h-3 w-3" />
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">
              AKU SASTRAWAN
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-300/40 bg-violet-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-violet-700 dark:border-violet-400/30 dark:bg-violet-950/30 dark:text-violet-200">
              <Gem className="h-3 w-3" />
              Premium
            </span>
          </div>
          <h2 className="mt-1 text-lg font-extrabold leading-snug tracking-tight text-[var(--px-text)] sm:text-xl">
            Ruang menulis cerpen dan novel.
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--px-text-dim)]">
            Kurikulum interaktif, Writing Studio, dan AI Writing Coach untuk mengembangkan ceritamu.
          </p>
        </div>
      </div>

      <div className="mt-auto pt-4">
        {!premiumLoading && isPremium ? (
          <Link href="/aku-sastrawan" className="px-btn-ghost inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold">
            Mulai menulis
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setNotice(true)}
            className="px-btn-ghost inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold"
          >
            <LockKeyhole className="h-4 w-4" />
            Mulai menulis
          </button>
        )}
      </div>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex items-start gap-3 rounded-bc-tile border border-violet-300/40 bg-violet-50 px-4 py-3 text-bc-text dark:border-violet-400/30 dark:bg-violet-950/30"
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black">AKU SASTRAWAN adalah fitur Premium.</p>
            <p className="mt-0.5 text-[11px] leading-5 text-bc-text-2">
              Aktifkan Premium untuk membuka kurikulum cerpen & novel, Writing Studio, dan AI Writing Coach.
            </p>
            <Link
              href="/murid/premium"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-violet-700 underline underline-offset-4 dark:text-violet-300"
            >
              Lihat Premium
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setNotice(false)}
            className="shrink-0 rounded-bc-xs p-1 text-bc-text-2 transition hover:bg-bc-surface-2 hover:text-bc-text"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  );
}
