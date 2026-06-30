"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Calendar, ArrowRight, User, BookOpen, Search, X } from "lucide-react";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  coverImageUrl: string | null;
  tags: string[];
  readCount: number;
  createdAt: string;
  publishedAt: string | null;
  authorName: string | null;
  authorRole: string | null;
  author: { id: string; fullName: string; avatar: string | null } | null;
};

export default function ArtikelPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const LIMIT = 12;

  const fetchArticles = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (q) params.set("q", q);

      const res = await fetch(`/api/artikel?${params}`);
      const json = await res.json();
      setArticles(json.items || []);
      setTotalPages(json.totalPages || 1);
      setTotal(json.total || 0);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles(page, submittedQuery);
  }, [page, submittedQuery, fetchArticles]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(searchQuery);
    setPage(1);
  };

  const handleReset = () => {
    setSearchQuery("");
    setSubmittedQuery("");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageNavbar />
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 rounded-full text-red-700 text-sm font-medium mb-4">
            <BookOpen size={14} /> Artikel & Wawasan
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900">Artikel dan Wawasan BahasaCerdas</h1>
          <p className="mt-2 text-slate-500 text-lg max-w-2xl mx-auto">
            Baca gagasan, panduan, dan catatan founder tentang literasi, pembelajaran, komunitas guru, dan masa depan Bahasa Indonesia.
          </p>
        </div>

        {/* Search by author */}
        <div className="max-w-xl mx-auto mb-10">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Cari berdasarkan penulis
          </label>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ketik nama penulis, misalnya Washadi, Alexander, atau Dominikus"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              Cari Artikel
            </button>
          </form>
          {submittedQuery && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-slate-500">
                Menampilkan hasil untuk: <strong>{submittedQuery}</strong>
              </span>
              <button
                onClick={handleReset}
                className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1"
              >
                <X size={14} /> Tampilkan Semua
              </button>
            </div>
          )}
        </div>

        {/* Articles */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <BookOpen size={48} className="mx-auto mb-3 text-slate-200" />
            <p>Belum ada artikel dari penulis tersebut.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-6">{total} artikel ditemukan</p>
            <div className="flex flex-col gap-10">
              {articles.map((a, idx) => {
                const thumbnail = a.coverImageUrl || a.coverImage;
                const authorName = a.authorName || a.author?.fullName || "";
                const authorRoleStr = a.authorRole || "";
                return (
                  <Link key={a.id} href={`/artikel/${a.slug}`} className="block">
                    <article className={`bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-red-200 transition-all ${idx === 0 ? "md:grid md:grid-cols-2" : ""}`}>
                      {thumbnail && (
                        <div className={`${idx === 0 ? "h-full min-h-[280px]" : "aspect-video"} bg-slate-100 overflow-hidden`}>
                          <img src={thumbnail} alt={a.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                        </div>
                      )}
                      <div className="p-7 flex flex-col justify-center">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-3">
                          {a.tags?.slice(0, 2).map(t => (
                            <span key={t} className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-medium">{t}</span>
                          ))}
                          <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(a.publishedAt ?? a.createdAt).toLocaleDateString("id")}</span>
                          <span className="flex items-center gap-1">{a.readCount} dibaca</span>
                        </div>
                        <h2 className={`font-bold text-slate-900 hover:text-red-600 transition-colors ${idx === 0 ? "text-2xl" : "text-lg"} line-clamp-2`}>
                          {a.title}
                        </h2>
                        {a.excerpt && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{a.excerpt}</p>}
                        <div className="flex items-center gap-2 mt-4 text-sm text-slate-400">
                          {authorName && (
                            <span className="flex items-center gap-1.5"><User size={14} /> {authorName}</span>
                          )}
                          {authorRoleStr && (
                            <span className="text-xs text-slate-400">{authorRoleStr}</span>
                          )}
                          <span className="ml-auto text-red-600 font-semibold text-xs flex items-center gap-1">
                            Baca Artikel <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    page === 1
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-red-300"
                  }`}
                >
                  Sebelumnya
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                      page === p
                        ? "bg-red-600 text-white"
                        : "bg-white border border-slate-200 text-slate-600 hover:border-red-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    page === totalPages
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-red-300"
                  }`}
                >
                  Berikutnya
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <PageFooter />
    </div>
  );
}
