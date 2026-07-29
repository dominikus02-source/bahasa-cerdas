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
      return 0; // newest - already ordered by createdAt desc
    });

    return result;
  }, [items, search, type, sort]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Toko Karya</h1>
            <p className="text-slate-500 mt-1">
              {items.length} karya dari guru Bahasa Indonesia
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
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
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white focus:border-primary focus:outline-none"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="mx-auto text-slate-200" />
            <p className="text-slate-500 mt-3">Toko Karya sedang dikurasi. Produk akan tampil setelah diverifikasi.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item: any) => (
              <Link
                key={item.id}
                href={`/marketplace/${item.id}`}
                className="group"
              >
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all h-full flex flex-col">
                  <div className="h-32 bg-gradient-to-br from-primary-light via-pink-50 to-orange-50 flex items-center justify-center overflow-hidden">
                    {(() => {
                      try {
                        const imgs = JSON.parse(item.images || "[]");
                        if (imgs[0])
                          return (
                            <img
                              src={imgs[0]}
                              alt=""
                              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500 p-2"
                            />
                          );
                      } catch {}
                      return (
                        <span className="text-5xl group-hover:scale-110 transition-transform">
                          {item.type === "RPP"
                            ? "📚"
                            : item.type === "PPT"
                              ? "📊"
                              : item.type === "SOAL"
                                ? "✍️"
                                : item.type === "VIDEO"
                                  ? "🎬"
                                  : item.type === "EBOOK"
                                    ? "📖"
                                    : "📦"}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <span className="text-[10px] px-2 py-0.5 bg-primary-light text-primary rounded-full font-medium w-fit mb-2">
                      {TYPES.find((t) => t.value === item.type)?.label ||
                        item.type}
                    </span>
                    <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    {item.seller && (
                      <p className="text-xs text-slate-400 mt-1">
                        oleh {item.seller.fullName}
                      </p>
                    )}
                    <div className="mt-auto pt-3 flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        {item.price > 0
                          ? `Rp ${item.price.toLocaleString("id")}`
                          : "Gratis"}
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
        )}
      </div>
    </div>
  );
}
