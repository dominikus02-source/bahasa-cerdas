"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Promo Guru Cerdas yang sengaja dibuat ringkas untuk Beranda Guru.
 * Main Bersama punya announcement card sendiri; banner ini hanya memegang
 * promo Guru Pro Rp 1.000/bulan supaya hierarki beranda tetap sederhana.
 */
export default function BannerProgramGuruCerdas() {
  return (
    <Link
      href="/guru/pengaturan/premium"
      aria-label="Lihat promo Guru Pro Rp 1.000 per bulan"
      className="group relative block min-h-[118px] overflow-hidden rounded-[24px] border border-blue-200/50 shadow-[0_12px_30px_rgba(37,99,235,.10)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-blue-950/80"
      style={{ backgroundColor: "#0b3674" }}
    >
      <Image
        src="/landing/banner-1.webp"
        alt=""
        fill
        sizes="(max-width: 1320px) 100vw, 1320px"
        className="object-cover object-center opacity-75 transition-transform duration-500 group-hover:scale-[1.015]"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(7,28,63,.98) 0%, rgba(12,67,143,.92) 45%, rgba(18,93,190,.62) 72%, rgba(18,93,190,.22) 100%)",
        }}
      />

      <div className="relative z-10 flex min-h-[118px] items-center justify-between gap-5 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/20 bg-white/10 px-2.5 py-1 text-[10px] font-extrabold tracking-[.11em] text-blue-100">
            <Sparkles className="h-3.5 w-3.5" />
            PROMO GURU CERDAS
          </span>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="text-lg font-extrabold text-white sm:text-xl">Guru Pro Rp 1.000/bulan</h2>
            <span className="text-xs font-medium text-blue-100">promo khusus guru</span>
          </div>
          <p className="mt-1 hidden text-xs text-blue-100/90 sm:block">
            Aktifkan fitur premium dan lanjutkan pekerjaan mengajar dengan lebih leluasa.
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-extrabold text-blue-700 shadow-lg shadow-blue-950/20 transition-transform group-hover:translate-x-0.5 sm:px-4">
          Lihat Promo <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
