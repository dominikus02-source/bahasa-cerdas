"use client";

import BannerSlideshow, { type BannerSlide } from "@/components/public/BannerSlideshow";

/**
 * Banner beranda guru — kini slide bergantian:
 * 1. Program Guru Cerdas (promo Guru Pro Rp 1.000/bulan → /guru/berlangganan)
 * 2. Teka-Teki Silang (gim baru → /arena/game/teka-teki-silang)
 *
 * Gambar gim: public/banners/banners-TTS-gim.png (disajikan di /banners/...).
 * Bila gambar belum tersedia, slide menampilkan kartu fallback (tidak kosong).
 */
const SLIDES: BannerSlide[] = [
  {
    src: "/landing/banner-1.webp",
    alt: "Program Guru Cerdas — jadi Guru Pro Rp 1.000/bulan",
    href: "/guru/berlangganan",
    fallbackTitle: "Program Guru Cerdas",
    fallbackDesc: "Jadi Guru Pro Rp 1.000/bulan — akses AI Tools penuh, 500 kredit AI, dan ekspor dokumen tanpa batas.",
  },
  {
    src: "/banners/banners-TTS-gim.png",
    alt: "Teka-Teki Silang — isi kotak, asah kosakata!",
    href: "/arena/game/teka-teki-silang",
    shadow: "0 8px 28px rgba(56,189,248,0.25)",
    fallbackTitle: "Teka-Teki Silang",
    fallbackDesc: "12 level, soal baru tiap main. Isi kotaknya, kumpulkan XP & naikkan peringkatmu!",
  },
];

export default function BannerProgramGuruCerdas() {
  return <BannerSlideshow slides={SLIDES} />;
}
