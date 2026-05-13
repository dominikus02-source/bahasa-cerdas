import Link from "next/link";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

async function getArtikel(slug: string) {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/artikel/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function ArtikelDetailPage({ params }: { params: { slug: string } }) {
  const data = await getArtikel(params.slug);
  const artikel = data?.artikel;

  if (!artikel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Artikel tidak ditemukan</h1>
          <Link href="/artikel" className="mt-4 inline-block text-red-600 font-semibold hover:underline">Lihat semua artikel →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/artikel" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 mb-8">
          <ArrowLeft size={16} /> Kembali ke Artikel
        </Link>

        <article>
          {artikel.coverImage && (
            <div className="aspect-video rounded-2xl overflow-hidden mb-8 bg-slate-100">
              <img src={artikel.coverImage} alt={artikel.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-4">
            {artikel.author?.fullName && (
              <span className="flex items-center gap-1"><User size={12} /> {artikel.author.fullName}</span>
            )}
            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(artikel.createdAt).toLocaleDateString("id")}</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {artikel.readCount} dibaca</span>
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 mb-6">{artikel.title}</h1>

          {artikel.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {artikel.tags.map((t: string) => (
                <span key={t} className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded-full font-medium">{t}</span>
              ))}
            </div>
          )}

          <div className="prose prose-slate max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{artikel.content}</ReactMarkdown>
          </div>
        </article>
      </div>
    </div>
  );
}
