"use client";

import { useState, useEffect, useCallback } from "react";
import { ShoppingBag, Search, Trash2, Eye, Clock, Loader2, ArrowLeft, ArrowRight, DollarSign, User } from "lucide-react";

interface MarketplaceProduct {
  id: string;
  title: string;
  description: string;
  type: string;
  price: number;
  isPublished: boolean;
  isPremium: boolean;
  downloads: number;
  grade: string | null;
  subject: string | null;
  createdAt: string;
  seller: { id: string; fullName: string; email: string };
  _count: { purchases: number };
}

const typeLabel: Record<string, string> = {
  RPP: "RPP", MODUL: "Modul", PPT: "PPT", SOAL: "Soal", VIDEO: "Video", EBOOK: "Ebook", ADMINISTRASI: "Administrasi", LAINNYA: "Lainnya",
};

export default function AdminKaryaPage() {
  const [karya, setKarya] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchKarya = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/karya?${params}`);
      const data = await res.json();
      setKarya(data.karya || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch { setKarya([]); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchKarya(); }, [fetchKarya]);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus produk ini?")) return;
    setDeleting(id);
    await fetch("/api/admin/karya", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setDeleting(null);
    fetchKarya();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Toko Guru</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{total} produk marketplace</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : karya.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Belum ada produk guru yang terdaftar.</p>
          <p className="text-xs text-slate-400 mt-1">Produk marketplace akan muncul setelah guru mempublikasikan materi di Toko Karya.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Produk</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Guru</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Harga</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Terjual</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Tanggal</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {karya.map((k) => (
                <tr key={k.id} className="border-b border-gray-50 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-slate-100 truncate max-w-[200px]">{k.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{typeLabel[k.type] || k.type}{k.grade ? ` · ${k.grade}` : ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700 dark:text-slate-200">{k.seller.fullName}</p>
                    <p className="text-xs text-gray-400">{k.seller.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-700 dark:text-slate-200">
                      <DollarSign size={12} />
                      {k.price > 0 ? `Rp${k.price.toLocaleString("id")}` : "Gratis"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${k.isPublished ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                      {k.isPublished ? "Diterbitkan" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{k._count.purchases}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">
                    {new Date(k.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(k.id)}
                      disabled={deleting === k.id}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting === k.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40">
                <ArrowLeft size={12} /> Sebelumnya
              </button>
              <span className="text-xs text-gray-400">Halaman {page} dari {pages}</span>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40">
                Selanjutnya <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
