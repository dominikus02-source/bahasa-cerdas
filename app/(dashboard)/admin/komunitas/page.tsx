"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Users, CheckCircle, XCircle, Clock, Archive, Eye, Loader2, MessageSquare, AlertCircle } from "lucide-react";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

type CommunityStatus = "PENDING" | "APPROVED" | "REJECTED";

export default function AdminKomunitasPage() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [filter, setFilter] = useState<CommunityStatus | "ALL">("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [showDetail, setShowDetail] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = `/api/admin/komunitas${filter !== "ALL" ? `?status=${filter}` : ""}`;
      console.log("Fetching:", url);
      const res = await fetchWithTimeout(url);
      const data = await res.json();
      console.log("Response:", data);

      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }

      if (data.communities) setCommunities(data.communities);
      if (data.stats) setStats(data.stats);
    } catch (e: any) {
      setError(e.message || "Gagal fetch data");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/komunitas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "approve" }),
      });
      const data = await res.json();
      if (data.success) fetchData();
      else setError(data.error || "Gagal menyetujui");
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) return;
    setActionLoading(rejectId);
    try {
      const res = await fetch("/api/admin/komunitas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rejectId, action: "reject", reviewNote: rejectNote }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRejectModal(false);
        setRejectNote("");
        fetchData();
      } else {
        setError(data.error || "Gagal menolak");
      }
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(null);
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Yakin mengarsipkan komunitas ini?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/komunitas?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) fetchData();
      else setError(data.error || "Gagal mengarsipkan");
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(null);
  };

  const filters: { id: CommunityStatus | "ALL"; label: string; count: number; color: string }[] = [
    { id: "PENDING", label: "Menunggu Peninjauan", count: stats.pending, color: "bg-amber-100 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
    { id: "APPROVED", label: "Disetujui", count: stats.approved, color: "bg-emerald-100 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
    { id: "REJECTED", label: "Ditolak", count: stats.rejected, color: "bg-red-100 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" },
    { id: "ALL", label: "Semua", count: stats.total, color: "bg-gray-100 dark:bg-slate-800/80 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Kelola Komunitas</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">Review, setujui, atau tolak komunitas baru</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Gagal</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button onClick={fetchData} className="text-xs text-red-500 dark:text-red-400 underline mt-1">Coba lagi</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${filter === f.id ? `${f.color} ring-2 ring-offset-1 ring-current` : "bg-white dark:bg-slate-800/90 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:border-slate-600"}`}
          >
            <p className="text-2xl font-bold">{f.count}</p>
            <p className="text-sm font-medium mt-1">{f.label}</p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-red-500 dark:text-red-400" /></div>
      ) : communities.length === 0 ? (
        <Card className="py-16 text-center">
          <Users className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 font-semibold">Tidak ada komunitas</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            {filter === "PENDING" ? "Belum ada komunitas menunggu peninjauan" : `Belum ada komunitas ${filter.toLowerCase()}`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {communities.map((c) => (
            <Card key={c.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant={c.type === "MGMP" ? "default" : c.type === "KKG" ? "secondary" : "outline"}>{c.type}</Badge>
                    <Badge variant={c.status === "APPROVED" ? "success" : c.status === "REJECTED" ? "destructive" : "warning"}>
                      {c.status === "APPROVED" ? "Disetujui" : c.status === "REJECTED" ? "Ditolak" : "Menunggu Peninjauan"}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-lg">{c.name}</h3>
                  {c.description && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{c.description}</p>}
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-400">
                    {c.region && <span>📍 {c.region}</span>}
                    {c.province && <span>🏛️ {c.province}</span>}
                    {c.city && <span>🏙️ {c.city}</span>}
                    <span className="flex items-center gap-1"><Users size={14} /> {c.memberCount} anggota</span>
                  </div>
                  {c.creator && <p className="text-xs text-gray-400 mt-2">Oleh: {c.creator.fullName}</p>}
                  {c.status === "REJECTED" && c.reviewNote && (
                    <div className="mt-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">Alasan Penolakan:</p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">{c.reviewNote}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setShowDetail(c)}><Eye size={14} /></Button>
                  {c.status === "PENDING" && (
                    <>
                      <Button size="sm" onClick={() => handleApprove(c.id)} disabled={actionLoading === c.id} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {actionLoading === c.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Setujui
                      </Button>
                      <Button size="sm" onClick={() => { setRejectId(c.id); setRejectNote(""); setShowRejectModal(true); }} disabled={actionLoading === c.id} variant="outline" className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-950/40">
                        <XCircle size={14} /> Tolak
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleArchive(c.id)} disabled={actionLoading === c.id} className="text-amber-500 dark:text-amber-400 hover:text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:bg-amber-950/40">
                    {actionLoading === c.id ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                    Arsipkan
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Tolak Komunitas" className="max-w-md">
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-1"><MessageSquare size={14} /> Berikan alasan penolakan.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Alasan Penolakan *</label>
            <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} className="w-full rounded-lg border px-4 py-2 text-sm" rows={4} placeholder="Contoh: Nama terlalu umum..." />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowRejectModal(false)} className="flex-1">Batal</Button>
            <Button onClick={handleReject} disabled={!rejectNote.trim() || actionLoading === rejectId} variant="outline" className="flex-1 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-950/40">
              {actionLoading === rejectId ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              Tolak
            </Button>
          </div>
        </div>
      </Modal>

      {showDetail && (
        <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Detail Komunitas" className="max-w-lg">
          <div className="space-y-4">
            <h3 className="text-lg font-bold">{showDetail.name}</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">{showDetail.description || "-"}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="font-medium text-gray-400">Tipe</p><p>{showDetail.type}</p></div>
              <div><p className="font-medium text-gray-400">Status</p><p>{showDetail.status}</p></div>
              {showDetail.province && <div><p className="font-medium text-gray-400">Provinsi</p><p>{showDetail.province}</p></div>}
              {showDetail.city && <div><p className="font-medium text-gray-400">Kota</p><p>{showDetail.city}</p></div>}
            </div>
            {showDetail.creator && (
              <div className="bg-gray-50 dark:bg-slate-800/60 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-400">Pembuat</p>
                <p className="text-sm">{showDetail.creator.fullName}</p>
                <p className="text-xs text-gray-400">{showDetail.creator.email}</p>
              </div>
            )}
            {showDetail.reviewNote && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Alasan Penolakan</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{showDetail.reviewNote}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
