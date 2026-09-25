"use client";

import BannerSlideshow, { type BannerSlide } from "@/components/public/BannerSlideshow";

/**
 * Promo Guru Cerdas — dipertahankan sebagai satu banner ringan di Beranda Guru.
 * Fitur Main Bersama punya pengumuman tersendiri di bawahnya, jadi banner ini
 * khusus untuk promo Guru Pro Rp 1.000/bulan agar tidak terjadi duplikasi pesan.
 */
const SLIDES: BannerSlide[] = [
  {
    src: "/landing/banner-1.webp",
    alt: "Program Guru Cerdas — Guru Pro Rp 1.000 per bulan",
    href: "/guru/pengaturan/premium",
    shadow: "0 12px 30px rgba(37,99,235,0.12)",
    fallbackTitle: "Program Guru Cerdas",
    fallbackDesc:
      "Nikmati promo Guru Pro Rp 1.000/bulan dan akses fitur premium BahasaCerdas.",
  },
];

export default function BannerProgramGuruCerdas() {
  return (
    <BannerSlideshow
      slides={SLIDES}
      className="border border-blue-100 bg-white shadow-[0_12px_30px_rgba(37,99,235,.08)] dark:border-blue-950/80 dark:bg-[#0b1d34]"
    />
  );
}
