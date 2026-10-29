"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Sparkles, Ticket } from "lucide-react";

const COUPON_CODE = "bcgurucerdas1000";

/**
 * Promo Guru Cerdas — khusus paket BULANAN.
 * Copy sengaja eksplisit supaya tidak terbaca sebagai harga paket tahunan.
 * Foto banner (/landing/banner-1.webp) dipulihkan atas keputusan founder
 * (2026-10-26); scrim & warna teks dari token .bc-media (tokens.css §4), jadi
 * terang & gelap tetap terbaca tanpa varian gelap/hex di komponen.
 */
export default function BannerProgramGuruCerdas() {
  return (
    <section
      className="bc-media min-h-[124px] rounded-bc-card shadow-bc-1 sm:min-h-[132px]"
      aria-labelledby="guru-coupon-title"
    >
      <Image
        src="/landing/banner-1.webp"
        alt=""
        fill
        sizes="(max-width: 1320px) 100vw, 1320px"
        className="object-cover object-center opacity-70"
      />
      <div className="bc-media-scrim bc-media-scrim--banner" />

      <div className="relative z-10 flex min-h-[124px] flex-col justify-between gap-3 px-4 py-4 sm:min-h-[132px] sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <div className="min-w-0">
          <span className="bc-media-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-[.11em]">
            <Sparkles className="h-3.5 w-3.5" />
            PROMO GURU CERDAS
          </span>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 id="guru-coupon-title" className="bc-media-ink text-lg font-extrabold sm:text-xl">
              Guru Pro Rp 1.000 / bulan
            </h2>
            <span className="bc-media-ink-2 inline-flex items-center gap-1 text-xs font-semibold">
              <CalendarDays className="h-3.5 w-3.5" />
              Paket bulanan
            </span>
          </div>

          <p className="bc-media-ink-2 mt-1 text-xs leading-relaxed">
            Promo khusus guru untuk langganan bulanan. Tidak berlaku untuk paket tahunan.
          </p>

          <div className="bc-media-glass mt-2.5 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-bc-tile px-3 py-2 text-xs">
            <Ticket className="bc-media-ink-2 h-4 w-4 shrink-0" />
            <span className="bc-media-ink-2">Kode kupon</span>
            <code className="bc-media-ink break-all font-mono font-extrabold tracking-[.04em]">{COUPON_CODE}</code>
          </div>
        </div>

        <Link
          href="/guru/berlangganan?plan=monthly"
          className="bc-media-cta inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-bc-ctl px-4 py-2.5 text-xs font-extrabold shadow-bc-2 sm:self-center"
        >
          Lihat Promo <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
