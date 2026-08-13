"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Search, Trash2, Eye, Clock, Heart, MessageCircle, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

const typeLabel: Record<string, string> = {
  PUISI: "Puisi", CERPEN: "Cerpen", ARTIKEL: "Artikel", ANEKDOT: "Anekdot", PANTUN: "Pantun", OPINI: "Opini",
};

export default function AdminKaryaPage() {
  const [karya, setKarya] = useState<any[]>([]);
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
    if (!confirm("Hapus karya ini?")) return;
    setDeleting(id);
    await fetch("/api/admin/karya", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setDeleting(null);
    fetchKarya();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Karya Siswa</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{total} total karya</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari judul karya..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Memuat...</div>
        ) : karya.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">Belum ada karya siswa</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
                    <th className="pb-3 pl-4 pt-3 font-medium">Judul</th>
                    <th className="pb-3 pt-3 font-medium">Penulis</th>
                    <th className="pb-3 pt-3 font-medium">Tipe</th>
                    <th className="pb-3 pt-3 font-medium">Engagement</th>
                    <th className="pb-3 pt-3 font-medium">Dibuat</th>
                    <th className="pb-3 pt-3 font-medium w-20">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {karya.map((k: any) => (
                    <tr key={k.id} className="border-b border-slate-50 hover:bg-slate-50 dark:bg-slate-800/50">
                      <td className="py-3 pl-4">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[250px]">{k.title}</p>
                      </td>
                      <td className="py-3 text-xs text-slate-600 dark:text-slate-300">{k.user?.fullName || "—"}</td>
                      <td className="py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:text-violet-300 font-medium">
                          {typeLabel[k.type] || k.type}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1"><Heart size={11} /> {k._count?.likes || 0}</span>
                          <span className="flex items-center gap-1"><MessageCircle size={11} /> {k._count?.comments || 0}</span>
                          <span className="flex items-center gap-1"><Eye size={11} /> {k.viewsCount || 0}</span>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-slate-400">{new Date(k.createdAt).toLocaleDateString("id-ID")}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/arena/feed/${k.id}`} className="p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800/70 text-slate-400 hover:text-slate-600 dark:text-slate-300">
                            <Eye size={14} />
                          </Link>
                          <button onClick={() => handleDelete(k.id)} disabled={deleting === k.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:bg-red-950/40 text-slate-400 hover:text-red-500 dark:text-red-400 disabled:opacity-50">
                            {deleting === k.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400">Halaman {page} dari {pages}</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-800/50 disabled:opacity-50 flex items-center gap-1"><ArrowLeft size={12} /> Sebelumnya</button>
                  <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-800/50 disabled:opacity-50 flex items-center gap-1">Selanjutnya <ArrowRight size={12} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
