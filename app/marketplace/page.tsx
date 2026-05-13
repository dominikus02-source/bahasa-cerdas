"use client";

import { useState, useEffect } from "react";
import { Search, ShoppingBag, Filter, Star, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TYPES = [
  { value: "", label: "Semua Karya" },
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

export default function MarketplacePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchItems();
  }, [type, sort]);

  async function fetchItems() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort, limit: "24" });
      if (type) params.set("type", type);
      const res = await fetch(`/api/marketplace/browse?${params}`);
      const data = await res.json();
      setItems(data.data || []);
    } catch {}
    setLoading(false);
  }

  const filtered = items.filter((i) =>
    !search || i.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold mb-4">
            <ShoppingBag size={16} /> Toko Karya Guru
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900">Belanja Karya Guru</h1>
          <p className="mt-3 text-slate-600">RPP, Modul, Soal, dan lainnya untuk mengajar Bahasa Indonesia</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari karya..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-red-500 focus:outline-none"
            />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm">
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500">Belum ada karya tersedia</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item: any) => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
                <Badge className="bg-red-50 text-red-700 border-0 mb-3">
                  {TYPES.find((t) => t.value === item.type)?.label || item.type}
                </Badge>
                <h3 className="font-bold text-slate-900 line-clamp-2">{item.title}</h3>
                {item.seller && (
                  <p className="text-xs text-slate-500 mt-1">oleh {item.seller.fullName}</p>
                )}
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Download size={12} /> {item.downloads}</span>
                  <span className="flex items-center gap-1"><Star size={12} /> {item._count?.purchases || 0} terjual</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-lg font-bold text-red-600">
                    {item.price > 0 ? `Rp ${item.price.toLocaleString("id")}` : "Gratis"}
                  </span>
                  <span className="text-xs text-slate-400">Login untuk beli</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
