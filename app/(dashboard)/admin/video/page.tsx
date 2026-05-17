"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Trash2, Search, Eye, User, Calendar, Play, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Video {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  isPublished: boolean;
  isPremium: boolean;
  views: number;
  createdAt: string;
  creator: {
    fullName: string;
    email: string;
    avatar: string | null;
  } | null;
  playlist: {
    id: string;
    title: string;
  } | null;
}

export default function AdminVideoPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchVideos = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/video?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) {
        setApiError(data.error || "Gagal memuat video");
        return;
      }
      
      if (data.data) {
        setVideos(data.data);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (e: any) {
      setApiError(e.message || "Gagal memuat video");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchVideos();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/video?id=${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "success", text: "Video berhasil dihapus" });
        setVideos((prev) => prev.filter((v) => v.id !== deleteId));
        setTotal((t) => t - 1);
      } else {
        setMsg({ type: "error", text: data.error || "Gagal menghapus" });
      }
    } catch (e) {
      setMsg({ type: "error", text: "Gagal menghapus video" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola Video</h1>
          <p className="text-sm text-slate-500">Hapus video yang tidak sesuai dengan peraturan BahasaCerdas</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 p-4 rounded-xl border text-sm font-medium ${msg.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {apiError && (
        <div className="mb-4 p-4 rounded-xl border bg-red-50 text-red-700 border-red-200 text-sm font-medium">
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
            placeholder="Cari judul atau creator..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <Button onClick={handleSearch} className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-xl font-semibold">
          Cari
        </Button>
      </div>

      <div className="mb-4 text-sm text-slate-500">
        Total: {total} video
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Memuat video...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-600 mb-2">Tidak ada video</h3>
          <p className="text-sm text-slate-400">Belum ada video yang diupload</p>
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((v) => (
            <Card key={v.id} className="p-5 border border-slate-100 hover:border-red-200 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {v.thumbnailUrl ? (
                    <div className="w-32 h-20 rounded-lg bg-slate-100 overflow-hidden shrink-0 relative">
                      <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-32 h-20 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Play className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-slate-900 truncate">{v.title}</h3>
                      {v.isPublished ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                          <Eye className="w-3 h-3" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Draft
                        </span>
                      )}
                      {v.isPremium && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Premium
                        </span>
                      )}
                    </div>
                    {v.description && (
                      <p className="text-sm text-slate-500 line-clamp-1 mb-2">{v.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      {v.creator && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {v.creator.fullName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(v.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span>{v.views} ditonton</span>
                      <span>{formatDuration(v.duration)}</span>
                      {v.playlist && <span className="text-emerald-600">{v.playlist.title}</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteId(v.id)}
                  className="p-2.5 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                  title="Hapus video"
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
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
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium disabled:opacity-50 hover:bg-slate-50"
          >
            Prev
          </button>
          <span className="text-sm text-slate-500">
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium disabled:opacity-50 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Hapus Video?</h3>
                <p className="text-sm text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
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
