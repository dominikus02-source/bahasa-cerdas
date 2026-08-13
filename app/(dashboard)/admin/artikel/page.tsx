"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Trash2, Search, Eye, User, Calendar, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Artikel {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  isPublished: boolean;
  readCount: number;
  createdAt: string;
  author: {
    fullName: string;
    email: string;
    avatar: string | null;
  };
}

export default function AdminArtikelPage() {
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchArtikel = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/artikel?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) {
        setApiError(data.error || "Gagal memuat artikel");
        return;
      }
      
      if (data.data) {
        setArtikel(data.data);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (e: any) {
      setApiError(e.message || "Gagal memuat artikel");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtikel();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchArtikel();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/artikel?id=${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: "Artikel berhasil dihapus" });
        setArtikel((prev) => prev.filter((a) => a.id !== deleteId));
        setTotal((t) => t - 1);
      } else {
        setMsg({ type: "error", text: data.error || "Gagal menghapus" });
      }
    } catch (e) {
      setMsg({ type: "error", text: "Gagal menghapus artikel" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="p-2 hover:bg-slate-100 dark:bg-slate-800/70 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Kelola Artikel</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Hapus artikel yang tidak sesuai dengan peraturan BahasaCerdas</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 p-4 rounded-xl border text-sm font-medium ${msg.type === "success" ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"}`}>
          {msg.text}
        </div>
      )}

      {apiError && (
        <div className="mb-4 p-4 rounded-xl border bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 text-sm font-medium">
          {apiError}
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Cari judul atau penulis..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <Button onClick={handleSearch} className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-xl font-semibold">
          Cari
        </Button>
      </div>

      <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Total: {total} artikel
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Memuat artikel...</p>
        </div>
      ) : artikel.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-100 dark:border-slate-800">
          <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-600 dark:text-slate-300 mb-2">Tidak ada artikel</h3>
          <p className="text-sm text-slate-400">Belum ada artikel yang dipublikasikan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {artikel.map((a) => (
            <Card key={a.id} className="p-5 border border-slate-100 dark:border-slate-800 hover:border-red-200 dark:border-red-800 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">{a.title}</h3>
                    {a.isPublished ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                        <Eye className="w-3 h-3" /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Draft
                      </span>
                    )}
                  </div>
                  {a.excerpt && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">{a.excerpt}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {a.author.fullName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(a.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    <span>{a.readCount} dibaca</span>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteId(a.id)}
                  className="p-2.5 hover:bg-red-50 dark:bg-red-950/40 rounded-xl transition-colors shrink-0"
                  title="Hapus artikel"
                >
                  <Trash2 className="w-5 h-5 text-red-500 dark:text-red-400" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium disabled:opacity-50 hover:bg-slate-50 dark:bg-slate-800/50"
          >
            Prev
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium disabled:opacity-50 hover:bg-slate-50 dark:bg-slate-800/50"
          >
            Next
          </button>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Hapus Artikel?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:bg-slate-800/50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
