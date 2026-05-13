import Link from "next/link";
import { Calendar, Clock, ArrowRight, User, BookOpen } from "lucide-react";
import PageNavbar from "@/components/public/PageNavbar";
import { db } from "@/lib/db";

export default async function ArtikelPage() {
  const artikel = await db.artikel.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true, title: true, slug: true, excerpt: true,
      coverImage: true, tags: true, readCount: true, createdAt: true,
      author: { select: { fullName: true } },
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <PageNavbar />
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 rounded-full text-red-700 text-sm font-medium mb-4">
            <BookOpen size={14} /> Artikel & Tips Pendidikan
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900">Artikel BahasaCerdas</h1>
          <p className="mt-2 text-slate-500 text-lg">Tips mengajar, sharing pengalaman, dan wawasan dari guru Bahasa Indonesia</p>
        </div>

        {artikel.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <BookOpen size={48} className="mx-auto mb-3 text-slate-200" />
            <p>Belum ada artikel</p>
          </div>
        ) : (
          <div className="space-y-6">
            {artikel.map((a: any, idx: number) => (
              <Link key={a.id} href={`/artikel/${a.slug}`}>
                <article className={`bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-red-200 transition-all ${idx === 0 ? "md:grid md:grid-cols-2" : ""}`}>
                  {a.coverImage && (
                    <div className={`${idx === 0 ? "h-full min-h-[250px]" : "aspect-video"} bg-slate-100 overflow-hidden`}>
                      <img src={a.coverImage} alt={a.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-6 flex flex-col justify-center">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-3">
                      {a.tags?.slice(0, 2).map((t: string) => (
                        <span key={t} className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-medium">{t}</span>
                      ))}
                      <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(a.createdAt).toLocaleDateString("id")}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {a.readCount} dibaca</span>
                    </div>
                    <h2 className={`font-bold text-slate-900 hover:text-red-600 transition-colors ${idx === 0 ? "text-2xl" : "text-lg"} line-clamp-2`}>
                      {a.title}
                    </h2>
                    {a.excerpt && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{a.excerpt}</p>}
                    <div className="flex items-center gap-2 mt-4 text-sm text-slate-400">
                      {a.author?.fullName && (
                        <span className="flex items-center gap-1.5"><User size={14} /> {a.author.fullName}</span>
                      )}
                      <span className="ml-auto text-red-600 font-semibold text-xs flex items-center gap-1">
                        Baca selengkapnya <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
