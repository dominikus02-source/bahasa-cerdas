"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, ShoppingBag, Star, Download, Filter, ChevronRight } from "lucide-react";

const TYPES = [
  { value: "", label: "Semua" },
  { value: "RPP", label: "RPP" },
  { value: "MODUL", label: "Modul Ajar" },
  { value: "PPT", label: "PPT" },
  { value: "SOAL", label: "Bank Soal" },
  { value: "VIDEO", label: "Video" },
  { value: "EBOOK", label: "Ebook" },
  { value: "ADMINISTRASI", label: "Administrasi" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "popular", label: "Terpopuler" },
  { value: "price_asc", label: "Termurah" },
  { value: "price_desc", label: "Termahal" },
];

import PageNavbar from "@/components/public/PageNavbar";

export default function MarketplacePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { fetchItems(); }, [type, sort, page]);

  async function fetchItems() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort, limit: "24", page: String(page) });
      if (type) params.set("type", type);
      const res = await fetch(`/api/marketplace/browse?${params}`);
      const data = await res.json();
      setItems(data.data || []);
      setTotalPages(data.totalPages || 1);
    } catch {}
    setLoading(false);
  }

  const filtered = items.filter((i) =>
    !search || i.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <PageNavbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Toko Karya</h1>
            <p className="text-slate-500 mt-1">Belanja karya dari guru Bahasa Indonesia</p>
          </div>
          <Link href="/cart" className="relative p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
            <ShoppingBag size={20} className="text-slate-600" />
          </Link>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-red-500 focus:outline-none"
              placeholder="Cari karya..." />
          </div>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white">
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="mx-auto text-slate-200" />
            <p className="text-slate-500 mt-3">Belum ada karya</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((item: any) => (
                <Link key={item.id} href={`/marketplace/${item.id}`} className="group">
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-red-200 transition-all h-full flex flex-col">
                    <div className="h-32 bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 flex items-center justify-center">
                      <span className="text-5xl group-hover:scale-110 transition-transform">
                        {item.type === "RPP" ? "📚" : item.type === "PPT" ? "📊" : item.type === "SOAL" ? "✍️" : item.type === "VIDEO" ? "🎬" : item.type === "EBOOK" ? "📖" : "📦"}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-medium w-fit mb-2">
                        {TYPES.find(t => t.value === item.type)?.label || item.type}
                      </span>
                      <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-red-600 transition-colors">{item.title}</h3>
                      {item.seller && <p className="text-xs text-slate-400 mt-1">oleh {item.seller.fullName}</p>}
                      <div className="mt-auto pt-3 flex items-center justify-between">
                        <span className="text-lg font-bold text-red-600">
                          {item.price > 0 ? `Rp ${item.price.toLocaleString("id")}` : "Gratis"}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Download size={12} /> {item.downloads}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${p === page ? "bg-red-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
