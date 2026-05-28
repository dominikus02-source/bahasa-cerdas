import Link from "next/link";
import Image from "next/image";
import { Download, Eye, ChevronRight, ShoppingBag } from "lucide-react";

const popularWorks = [
  {
    title: "RPP Teks Laporan Percobaan Kelas IX",
    author: "Ibu Siti Rahmawati, S.Pd.",
    type: "RPP",
    price: "Rp 25.000",
    sales: 342,
    rating: 4.9,
  },
  {
    title: "Modul Ajar Cerpen Kurikulum Merdeka",
    author: "Bapak Ahmad Fauzi, M.Pd.",
    type: "Modul",
    price: "Rp 35.000",
    sales: 287,
    rating: 4.8,
  },
  {
    title: "Bank Soal Teks Diskusi 50 Soal HOTS",
    author: "Ibu Dewi Lestari, S.Pd.",
    type: "Soal",
    price: "Rp 20.000",
    sales: 256,
    rating: 4.7,
  },
];

export default function KaryaPopulerSection() {
  return (
    <section className="relative py-20 lg:py-28 bg-zinc-50">
      <div className="section-container">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 lg:mb-16">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
              <ShoppingBag size={12} className="text-primary" />
              <span className="text-xs font-semibold text-primary">
                Toko Karya Guru
              </span>
            </div>
            <h2 className="heading-lg text-zinc-900 mb-4">
              Karya <span className="text-primary">Terpopuler</span> dari Guru
            </h2>
            <p className="text-zinc-500 leading-relaxed">
              Ribuan RPP, modul, dan soal siap pakai dari guru-guru terbaik
              Bahasa Indonesia se-Indonesia.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark transition-colors shrink-0"
          >
            Lihat Semua Karya
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {popularWorks.map((work) => (
            <div
              key={work.title}
              className="group relative bg-white rounded-2xl border border-zinc-100 overflow-hidden card-hover cursor-pointer"
            >
              {/* Top Accent */}
              <div className="h-1.5 bg-gradient-to-r from-primary via-primary-dark to-primary" />

              <div className="p-6 lg:p-8">
                {/* Type Badge */}
                <div className="inline-flex items-center px-3 py-1 rounded-lg bg-primary-light text-primary text-xs font-semibold mb-4">
                  {work.type}
                </div>

                <h3 className="text-base lg:text-lg font-bold text-zinc-900 mb-2 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {work.title}
                </h3>

                <p className="text-xs text-zinc-400 mb-4">{work.author}</p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-5 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Download size={13} />
                    {work.sales} terjual
                  </span>
                  <span className="flex items-center gap-1">
                    ★ {work.rating}
                  </span>
                </div>

                {/* Price & CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                  <span className="text-lg font-bold text-zinc-900">
                    {work.price}
                  </span>
                  <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Lihat Detail →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
