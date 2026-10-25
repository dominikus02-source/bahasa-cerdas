"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Sparkles, Ticket } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

const COUPON_CODE = "bcgurucerdas1000";

/**
 * Promo Guru Cerdas — khusus paket BULANAN.
 * Copy sengaja eksplisit supaya tidak terbaca sebagai harga paket tahunan.
 * Warna sepenuhnya dari token audiens guru (terang & gelap otomatis lewat token).
 */
export default function BannerProgramGuruCerdas() {
  return (
    <section
      className="rounded-bc-card border border-bc-aud/30 bg-bc-aud-soft px-4 py-4 shadow-bc-1 sm:px-6"
      aria-labelledby="guru-coupon-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-bc-surface px-2.5 py-1 text-[10px] font-extrabold tracking-[.11em] text-bc-aud">
            <Sparkles className="h-3.5 w-3.5" />
            PROMO GURU CERDAS
          </span>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 id="guru-coupon-title" className="text-lg font-extrabold text-bc-text sm:text-xl">
              Guru Pro Rp 1.000 / bulan
            </h2>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-bc-aud">
              <CalendarDays className="h-3.5 w-3.5" />
              Paket bulanan
            </span>
          </div>

          <p className="mt-1 text-xs leading-relaxed text-bc-text-2">
            Promo khusus guru untuk langganan bulanan. Tidak berlaku untuk paket tahunan.
          </p>

          <div className="mt-2.5 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-bc-tile border border-bc-border bg-bc-surface px-3 py-2 text-xs">
            <Ticket className="h-4 w-4 shrink-0 text-bc-aud" />
            <span className="text-bc-text-2">Kode kupon</span>
            <code className="break-all font-mono font-extrabold tracking-[.04em] text-bc-text">{COUPON_CODE}</code>
          </div>
        </div>

        <Link
          href="/guru/berlangganan?plan=monthly"
          className={buttonClass({ variant: "accent", className: "shrink-0 sm:self-center" })}
        >
          Lihat Promo <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
