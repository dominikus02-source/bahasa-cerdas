import Link from "next/link";
import { Download, ChevronRight, ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";

async function getPopularWorks() {
  try {
    return await db.karya.findMany({
      where: { isPublished: true },
      orderBy: { downloads: "desc" },
      take: 3,
      include: {
        seller: { select: { fullName: true } },
        _count: { select: { purchases: true } },
      },
    });
  } catch {
    return [];
  }
}

export default async function KaryaPopulerSection() {
  const karya = await getPopularWorks();

  return (
    <section className="relative py-20 lg:py-28 bg-zinc-50">
      <div className="section-container">
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

        <div className="grid md:grid-cols-3 gap-6">
          {karya.length > 0 ? (
            karya.map((k: any) => (
              <Link
                key={k.id}
                href={`/marketplace/${k.id}`}
                className="group relative bg-white rounded-2xl border border-zinc-100 overflow-hidden card-hover"
              >
                <div className="h-1.5 bg-gradient-to-r from-primary via-primary-dark to-primary" />
                <div className="p-6 lg:p-8">
                  <div className="inline-flex items-center px-3 py-1 rounded-lg bg-primary-light text-primary text-xs font-semibold mb-4">
                    {k.type}
                  </div>
                  <h3 className="text-base lg:text-lg font-bold text-zinc-900 mb-2 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {k.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mb-4">
                    {k.seller?.fullName || "Guru Bahasa Indonesia"}
                  </p>
                  <div className="flex items-center gap-4 mb-5 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Download size={13} />
                      {k._count?.purchases || k.downloads || 0} terjual
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                    <span className="text-lg font-bold text-zinc-900">
                      {k.price > 0
                        ? `Rp ${k.price.toLocaleString("id")}`
                        : "Gratis"}
                    </span>
                    <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Lihat Detail →
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-200">
              <p className="text-zinc-400">Belum ada karya yang dipublikasikan.</p>
              <Link
                href="/login"
                className="mt-2 inline-block text-sm text-primary font-semibold hover:underline"
              >
                Login & Upload Karya →
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
