"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Sparkles, Ticket } from "lucide-react";

const COUPON_CODE = "BCGURUKUPON1000";

/**
 * Promo Guru Cerdas — khusus paket BULANAN.
 * Copy sengaja eksplisit supaya tidak terbaca sebagai harga paket tahunan.
 */
export default function BannerProgramGuruCerdas() {
  return (
    <section
      className="relative min-h-[132px] overflow-hidden rounded-[24px] border border-blue-200/50 shadow-[0_12px_30px_rgba(37,99,235,.10)] dark:border-blue-950/80"
      style={{ backgroundColor: "#0b3674" }}
      aria-labelledby="guru-coupon-title"
    >
      <Image
        src="/landing/banner-1.webp"
        alt=""
        fill
        sizes="(max-width: 1320px) 100vw, 1320px"
        className="object-cover object-center opacity-70"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(7,28,63,.99) 0%, rgba(12,67,143,.94) 43%, rgba(18,93,190,.66) 72%, rgba(18,93,190,.30) 100%)",
        }}
      />

      <div className="relative z-10 flex min-h-[132px] flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/20 bg-white/10 px-2.5 py-1 text-[10px] font-extrabold tracking-[.11em] text-blue-100">
            <Sparkles className="h-3.5 w-3.5" />
            PROMO GURU CERDAS
          </span>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 id="guru-coupon-title" className="text-lg font-extrabold text-white sm:text-xl">
              Guru Pro Rp 1.000 / bulan
            </h2>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-100">
              <CalendarDays className="h-3.5 w-3.5" />
              Paket bulanan
            </span>
          </div>

          <p className="mt-1 text-xs leading-relaxed text-blue-100/90">
            Promo khusus guru untuk langganan bulanan. Tidak berlaku untuk paket tahunan.
          </p>

          <div className="mt-2.5 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/25 px-3 py-2 text-xs text-white backdrop-blur-sm">
            <Ticket className="h-4 w-4 shrink-0 text-blue-200" />
            <span className="text-blue-100">Kode kupon</span>
            <code className="font-mono font-extrabold tracking-[.04em] text-white">{COUPON_CODE}</code>
          </div>
        </div>

        <Link
          href="/guru/berlangganan?plan=monthly"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-blue-700 shadow-lg shadow-blue-950/20 transition-all hover:bg-blue-50 sm:self-center"
        >
          Lihat Promo <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
