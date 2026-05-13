import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";

async function getArtikel() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/artikel?limit=9`, {
      cache: "no-store",
    });
    return await res.json();
  } catch {
    return { data: [] };
  }
}

export default async function ArtikelPage() {
  const { data: artikel } = await getArtikel();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900">Artikel & Tips</h1>
          <p className="mt-3 text-slate-600 text-lg">Karya dari guru Bahasa Indonesia untuk sesama pendidik</p>
        </div>

        {artikel.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg">Belum ada artikel. Guru dapat menulis artikel setelah login.</p>
            <Link href="/login" className="mt-4 inline-block text-red-600 font-semibold hover:underline">Login sebagai Guru →</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artikel.map((a: any) => (
              <Link key={a.id} href={`/artikel/${a.slug}`} className="group">
                <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-red-200 transition-all h-full flex flex-col">
                  {a.coverImage && (
                    <div className="aspect-video bg-slate-100 overflow-hidden">
                      <img src={a.coverImage} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    {a.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {a.tags.slice(0, 3).map((t: string) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-medium">{t}</span>
                        ))}
                      </div>
                    )}
                    <h2 className="font-bold text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2">{a.title}</h2>
                    {a.excerpt && <p className="text-sm text-slate-500 mt-2 line-clamp-2 flex-1">{a.excerpt}</p>}
                    <div className="flex items-center gap-3 mt-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={12} />{new Date(a.createdAt).toLocaleDateString("id")}</span>
                      <span className="flex items-center gap-1"><Clock size={12} />{a.readCount} dibaca</span>
                      {a.author?.fullName && <span>• {a.author.fullName}</span>}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Link href="/" className="text-red-600 font-semibold hover:underline inline-flex items-center gap-1">
            <ArrowRight size={16} /> Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
