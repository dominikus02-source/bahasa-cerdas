"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Users, CheckCircle, XCircle, Clock, Trash2, Eye, Loader2, MessageSquare, RefreshCw } from "lucide-react";

type CommunityStatus = "PENDING" | "APPROVED" | "REJECTED";

export default function AdminKomunitasPage() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [filter, setFilter] = useState<CommunityStatus | "ALL">("PENDING");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [showDetail, setShowDetail] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/komunitas${filter !== "ALL" ? `?status=${filter}` : ""}`);
      const data = await res.json();
      if (data.communities) setCommunities(data.communities);
      if (data.stats) setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
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
    } catch (e) {
      console.error(e);
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
      }
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus komunitas ini?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/komunitas?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  const filters: { id: CommunityStatus | "ALL"; label: string; count: number; color: string }[] = [
    { id: "PENDING", label: "Menunggu Review", count: stats.pending, color: "bg-amber-100 text-amber-700 border-amber-200" },
    { id: "APPROVED", label: "Disetujui", count: stats.approved, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    { id: "REJECTED", label: "Ditolak", count: stats.rejected, color: "bg-red-100 text-red-700 border-red-200" },
    { id: "ALL", label: "Semua", count: stats.total, color: "bg-gray-100 text-gray-700 border-gray-200" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Kelola Komunitas</h1>
        <p className="mt-1 text-sm text-gray-600">Review, setujui, atau tolak komunitas baru</p>
      </div>

      {/* Stats & Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${filter === f.id ? `${f.color} ring-2 ring-offset-1 ring-current` : "bg-white border-gray-200 hover:border-gray-300"}`}
          >
            <p className="text-2xl font-bold">{f.count}</p>
            <p className="text-sm font-medium mt-1">{f.label}</p>
          </button>
        ))}
      </div>

      {/* Community List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-red-500" /></div>
      ) : communities.length === 0 ? (
        <Card className="py-16 text-center">
          <Users className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 font-semibold">Tidak ada komunitas</h3>
          <p className="mt-2 text-sm text-gray-500">
            {filter === "PENDING" ? "Belum ada komunitas menunggu review" : `Belum ada komunitas ${filter.toLowerCase()}`}
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
                      {c.status === "APPROVED" ? "Disetujui" : c.status === "REJECTED" ? "Ditolak" : "Menunggu Review"}
                    </Badge>
                    {c.isVerified && <Badge variant="gold">Verified</Badge>}
                  </div>

                  <h3 className="font-semibold text-gray-900 text-lg">{c.name}</h3>
                  {c.description && <p className="text-sm text-gray-500 mt-1">{c.description}</p>}

                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-400">
                    {c.region && <span>📍 {c.region}</span>}
                    {c.province && <span>🏛️ {c.province}</span>}
                    {c.city && <span>🏙️ {c.city}</span>}
                    {c.school && <span>🏫 {c.school}</span>}
                    <span className="flex items-center gap-1"><Users size={14} /> {c.memberCount} anggota</span>
                    <span>📝 {c.postCount} postingan</span>
                  </div>

                  {c.creator && (
                    <p className="text-xs text-gray-400 mt-2">Dibuat oleh: {c.creator.fullName} ({c.creator.email})</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>

                  {c.status === "REJECTED" && c.reviewNote && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-700 flex items-center gap-1"><XCircle size={14} /> Alasan Penolakan:</p>
                      <p className="text-sm text-red-600 mt-1">{c.reviewNote}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setShowDetail(c)}>
                    <Eye size={14} /> Detail
                  </Button>

                  {c.status === "PENDING" && (
                    <>
                      <Button size="sm" onClick={() => handleApprove(c.id)} disabled={actionLoading === c.id} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {actionLoading === c.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        {actionLoading === c.id ? "..." : "Setujui"}
                      </Button>
                      <Button size="sm" onClick={() => { setRejectId(c.id); setRejectNote(""); setShowRejectModal(true); }} disabled={actionLoading === c.id} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                        <XCircle size={14} /> Tolak
                      </Button>
                    </>
                  )}

                  <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} disabled={actionLoading === c.id} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    {actionLoading === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Tolak Komunitas" className="max-w-md">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-700 flex items-center gap-1"><MessageSquare size={14} /> Berikan alasan penolakan agar pembuat komunitas tahu apa yang perlu diperbaiki.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Alasan Penolakan *</label>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 text-sm"
              rows={4}
              placeholder="Contoh: Nama komunitas terlalu umum, deskripsi tidak jelas, dll."
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowRejectModal(false)} className="flex-1">Batal</Button>
            <Button onClick={handleReject} disabled={!rejectNote.trim() || actionLoading === rejectId} variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50">
              {actionLoading === rejectId ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              {actionLoading === rejectId ? "Memproses..." : "Tolak Komunitas"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {showDetail && (
        <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Detail Komunitas" className="max-w-lg">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold">{showDetail.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{showDetail.description || "Tidak ada deskripsi"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="font-medium text-gray-400">Tipe</p><p>{showDetail.type}</p></div>
              <div><p className="font-medium text-gray-400">Status</p><p>{showDetail.status}</p></div>
              {showDetail.region && <div><p className="font-medium text-gray-400">Wilayah</p><p>{showDetail.region}</p></div>}
              {showDetail.province && <div><p className="font-medium text-gray-400">Provinsi</p><p>{showDetail.province}</p></div>}
              {showDetail.city && <div><p className="font-medium text-gray-400">Kota</p><p>{showDetail.city}</p></div>}
              {showDetail.school && <div><p className="font-medium text-gray-400">Sekolah</p><p>{showDetail.school}</p></div>}
              <div><p className="font-medium text-gray-400">Anggota</p><p>{showDetail.memberCount}</p></div>
              <div><p className="font-medium text-gray-400">Postingan</p><p>{showDetail.postCount}</p></div>
            </div>
            {showDetail.creator && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-400">Pembuat</p>
                <p className="text-sm">{showDetail.creator.fullName}</p>
                <p className="text-xs text-gray-400">{showDetail.creator.email}</p>
              </div>
            )}
            {showDetail.reviewNote && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-700">Alasan Penolakan</p>
                <p className="text-sm text-red-600 mt-1">{showDetail.reviewNote}</p>
              </div>
            )}
            <p className="text-xs text-gray-400">Dibuat: {new Date(showDetail.createdAt).toLocaleString("id-ID")}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
