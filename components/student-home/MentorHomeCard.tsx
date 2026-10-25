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
    <section aria-label="NARA Mentor" className="px-card flex h-full flex-col p-5 sm:p-6">
      <div className="flex min-w-0 items-start gap-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-bc-icon bg-bc-violet-soft text-bc-violet">
          <Brain className="h-6 w-6" />
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-bc-warning-soft text-bc-warning-strong ring-2 ring-bc-surface">
            <Crown className="h-3 w-3" />
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-bc-violet">
              NARA Mentor
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-bc-violet/30 bg-bc-violet-soft px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-bc-violet">
              <Gem className="h-3 w-3" />
              Premium
            </span>
          </div>
          <h2 className="mt-1 text-lg font-extrabold leading-snug tracking-tight text-[var(--px-text)] sm:text-xl">
            Punya teman untuk membaca arah belajarmu.
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--px-text-dim)]">
            Mentor membaca progresmu dan membantu menentukan langkah belajar berikutnya.
          </p>
        </div>
      </div>

      <div className="mt-auto pt-4">
        {!premiumLoading && isPremium ? (
          <Link href="/murid/mentor" className="px-btn-ghost inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold">
            Buka NARA Mentor
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setNotice(true)}
            className="px-btn-ghost inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold"
          >
            <LockKeyhole className="h-4 w-4" />
            Buka NARA Mentor
          </button>
        )}
      </div>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex items-start gap-3 rounded-bc-tile border border-bc-violet/30 bg-bc-violet-soft px-4 py-3 text-bc-text"
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-bc-violet" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black">NARA Mentor adalah fitur Premium.</p>
            <p className="mt-0.5 text-[11px] leading-5 text-bc-text-2">
              Aktifkan Premium untuk mendapatkan analisis progres dan langkah belajar yang lebih personal.
            </p>
            <Link
              href="/murid/premium"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-bc-violet underline underline-offset-4"
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
