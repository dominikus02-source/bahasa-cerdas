import Link from "next/link";
import { Download, ChevronRight, ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";

async function getPopularWorks() {
  try {
    const seedUser = await db.user.findUnique({ where: { email: "guru@demo.com" }, select: { id: true } })
    const where: any = { isPublished: true }
    if (seedUser) where.sellerId = { not: seedUser.id }
    return await db.karya.findMany({
      where,
      orderBy: { downloads: "desc" },
      take: 6,
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
    <section className="relative py-14 lg:py-20 bg-zinc-50">
      <div className="section-container">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 lg:mb-16">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
              <ShoppingBag size={12} className="text-primary" />
              <span className="text-xs font-semibold text-primary">
                Berkarya
              </span>
            </div>
            <h2 className="heading-lg text-zinc-900 mb-4">
              Ruang untuk <span className="text-primary">berkarya</span>
            </h2>
            <p className="text-zinc-500 leading-relaxed">
              Guru berbagi pengetahuan. Murid belajar menciptakan. Bahasa Indonesia
              tumbuh melalui karya — dari perangkat ajar hingga karya tulis siswa.
            </p>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-2">
            <Link
              href="/marketplace"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark transition-colors shrink-0"
            >
              Lihat Semua Karya
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/arena/tulis"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-primary transition-colors shrink-0"
            >
              Mulai menulis karyamu
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {karya.length > 0 ? (
            karya.map((k: any) => {
              const imgs = (() => { try { return JSON.parse(k.images || "[]"); } catch { return []; } })();
              return (
                <Link
                  key={k.id}
                  href={`/marketplace/${k.id}`}
                  className="group relative bg-white rounded-2xl border border-zinc-100 overflow-hidden card-hover"
                >
                  <div className="h-32 bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center overflow-hidden">
                    {imgs[0] ? (
                      <img
                        src={imgs[0]}
                        alt=""
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 p-2"
                      />
                    ) : (
                      <ShoppingBag size={32} className="text-zinc-200" />
                    )}
                  </div>
                  <div className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-primary-light text-primary text-[10px] font-semibold mb-2">
                      {k.type}
                    </span>
                    <h3 className="text-sm font-semibold text-zinc-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-1">
                      {k.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mb-3">
                      {k.seller?.fullName || "Guru Bahasa Indonesia"}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                      <span className="text-base font-bold text-zinc-900">
                        {k.price > 0
                          ? `Rp ${k.price.toLocaleString("id")}`
                          : "Gratis"}
                      </span>
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <Download size={10} />
                        {k._count?.purchases || k.downloads || 0}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-200">
              <p className="text-zinc-400">Toko Karya sedang dikurasi.</p>
              <p className="text-sm text-zinc-300 mt-1">Produk akan tampil setelah diverifikasi.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
