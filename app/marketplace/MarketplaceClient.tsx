"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ShoppingBag, Download, ChevronRight } from "lucide-react";

const TYPES = [
  { value: "", label: "Semua" },
  { value: "RPP", label: "Rencana Pembelajaran" },
  { value: "MODUL", label: "Rencana Pembelajaran (Modul)" },
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

type Item = {
  id: string;
  title: string;
  type: string;
  price: number;
  description?: string | null;
  images?: string;
  downloads: number;
  seller?: { fullName: string } | null;
};

export default function MarketplaceClient({ initialItems }: { initialItems: Item[] }) {
  const [items] = useState<Item[]>(initialItems);
  const [type, setType] = useState("");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = [...items];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.title.toLowerCase().includes(q));
    }

    if (type) {
      result = result.filter((i) => i.type === type);
    }

    result.sort((a, b) => {
      if (sort === "popular") return b.downloads - a.downloads;
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return 0;
    });

    return result;
  }, [items, search, type, sort]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
        {/* Hero */}
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl border border-primary/10 px-6 py-8 mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Toko Karya</h1>
          <p className="text-slate-500">
            {items.length} karya dari guru Bahasa Indonesia — RPP, PPT, Bank Soal, Video, dan lainnya.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              placeholder="Cari karya..."
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white focus:border-primary focus:outline-none"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white focus:border-primary focus:outline-none"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="mx-auto text-slate-200" />
            <p className="text-slate-500 mt-3">
              {items.length === 0
                ? "Toko Karya sedang dikurasi. Produk akan tampil setelah diverifikasi."
                : "Tidak ada karya yang cocok dengan pencarian Anda."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item: any) => {
              const imgs = (() => { try { return JSON.parse(item.images || "[]"); } catch { return []; } })();
              return (
                <Link key={item.id} href={`/marketplace/${item.id}`} className="group">
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all h-full flex flex-col">
                    <div className="h-32 bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center overflow-hidden">
                      {imgs[0] ? (
                        <img src={imgs[0]} alt="" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 p-2" />
                      ) : (
                        <ShoppingBag size={32} className="text-zinc-200" />
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <span className="text-[10px] px-2 py-0.5 bg-primary-light text-primary rounded-full font-medium w-fit mb-2">
                        {TYPES.find((t) => t.value === item.type)?.label || item.type}
                      </span>
                      <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      {item.seller && (
                        <p className="text-xs text-slate-400 mt-1">oleh {item.seller.fullName}</p>
                      )}
                      <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100">
                        <span className="text-base font-bold text-slate-900">
                          {item.price > 0 ? `Rp ${item.price.toLocaleString("id")}` : "Gratis"}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Download size={10} /> {item.downloads}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
