"use client";

import { useState } from "react";
import Link from "next/link";
import { Gift, ChevronRight } from "lucide-react";

const BANNER_IMAGE = "/landing/banner-1.webp";

export default function BannerProgramGuruCerdas() {
  const [broken, setBroken] = useState(false);

  return (
    <Link
      href="/guru/berlangganan"
      className="block relative w-full overflow-hidden rounded-2xl shadow-lg group"
      aria-label="Program Guru Cerdas — jadi Guru Pro Rp 1.000/bulan"
    >
      {!broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={BANNER_IMAGE}
          alt="Program Guru Cerdas — jadi Guru Pro Rp 1.000/bulan"
          className="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.03]"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="relative w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 flex items-center px-6 py-10 sm:px-10 sm:py-14">
          <div className="absolute -right-6 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute right-16 -bottom-12 h-32 w-32 rounded-full bg-white/10" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative w-full">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">Promo</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Program Guru Cerdas</h2>
              <p className="text-sm text-emerald-50 mt-1">
                Jadi <strong>Guru Pro</strong> hanya <strong>Rp 1.000/bulan</strong> — akses AI Tools penuh, 500 kredit AI, dan ekspor dokumen tanpa batas.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 bg-white text-emerald-700 font-semibold px-4 py-2 rounded-xl text-sm shrink-0 group-hover:gap-2 transition-all">
              Cek Program <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}
