import Link from "next/link";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PageNavbar from "@/components/public/PageNavbar";

async function getArtikel(slug: string) {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/artikel/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export default async function ArtikelDetailPage({ params }: { params: { slug: string } }) {
  const data = await getArtikel(params.slug);
  const artikel = data?.artikel;

  if (!artikel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Artikel tidak ditemukan</h1>
          <Link href="/artikel" className="mt-4 inline-block text-red-600 font-semibold hover:underline">Lihat semua artikel →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <PageNavbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/artikel" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-red-600 mb-8 transition-colors">
          <ArrowLeft size={16} /> Kembali ke Artikel
        </Link>

        <article>
          {artikel.coverImage && (
            <div className="aspect-video rounded-2xl overflow-hidden mb-8 bg-slate-100 shadow-lg">
              <img src={artikel.coverImage} alt={artikel.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-4">
            {artikel.author?.fullName && (
              <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                <User size={12} /> {artikel.author.fullName}
              </span>
            )}
            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(artikel.createdAt).toLocaleDateString("id", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {artikel.readCount} dibaca</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-6">{artikel.title}</h1>

          {artikel.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {artikel.tags.map((t: string) => (
                <span key={t} className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded-full font-medium">{t}</span>
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-sm">
            <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-red-600">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{artikel.content}</ReactMarkdown>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            <Link href="/artikel" className="text-sm text-red-600 font-semibold hover:underline flex items-center gap-1">
              <ArrowLeft size={14} /> Artikel Lainnya
            </Link>
            {artikel.readCount && (
              <span className="text-xs text-slate-400">{artikel.readCount} kali dibaca</span>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
