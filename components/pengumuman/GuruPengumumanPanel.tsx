"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown, Plus, X, Trash2, Clock, Users,
  Link2, Upload, Loader2, ExternalLink, Megaphone, Paperclip,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Group {
  id: string;
  name: string;
  grade: string;
  _count?: { members: number };
  members?: unknown[];
}
interface Pengumuman {
  id: string;
  judul: string;
  deskripsi: string | null;
  tenggat: string | null;
  lampiran: string | null;
  lampiranNama: string | null;
  createdAt: string;
  _count?: { submissions: number };
}
interface Submission {
  id: string;
  karyaUrl: string;
  catatan: string | null;
  submittedAt: string;
  user: { id: string; fullName: string; avatar?: string };
}

const LAMPIRAN_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function formatTanggal(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function GuruPengumumanPanel({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [groupOpen, setGroupOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Pengumuman | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tenggat, setTenggat] = useState("");
  const [lampiran, setLampiran] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetch("/api/group")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const gs = data?.groups || data || [];
        setGroups(gs);
        if (gs.length > 0) setActiveGroup(gs[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchPengumuman = useCallback(() => {
    if (!activeGroup) return;
    fetch(`/api/guru/pengumuman?groupId=${activeGroup}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.group) return;
        setMemberCount(data.group._count?.members || 0);
        setPengumuman(data.group.pengumumans || []);
      })
      .catch(() => {});
  }, [activeGroup]);

  useEffect(() => {
    if (activeGroup) fetchPengumuman();
  }, [activeGroup, fetchPengumuman]);

  const openDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setSubmissions([]);
      return;
    }
    setExpandedId(id);
    setLoadingSubs(true);
    setSubmissions([]);
    try {
      const res = await fetch(`/api/guru/pengumuman/${id}`);
      const data = await res.json();
      setSubmissions(data?.pengumuman?.submissions || []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoadingSubs(false);
    }
  };

  const uploadLampiran = async (file: File): Promise<string | null> => {
    setUploadingFile(true);
    try {
      if (!LAMPIRAN_MIMES.includes(file.type)) {
        setError("Lampiran harus berupa file PDF atau DOCX.");
        return null;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError("Ukuran file maksimal 20 MB.");
        return null;
      }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const suId = user?.id || userId;
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const fileName = `${suId}/pengumuman/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file, { cacheControl: "31536000", upsert: false });
      if (uploadError || !uploadData) {
        setError(uploadError?.message?.toLowerCase().includes("row-level security")
          ? "Izin upload ditolak. Hubungi admin untuk mengaktifkan izin storage."
          : "Gagal mengunggah lampiran.");
        return null;
      }
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(uploadData.path);
      return urlData.publicUrl;
    } catch {
      setError("Gagal mengunggah lampiran.");
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreate = async () => {
    if (!activeGroup || !judul.trim() || saving) return;
    setSaving(true);
    setError("");
    let lampiranUrl = "";
    let lampiranNama = "";
    if (lampiran) {
      const url = await uploadLampiran(lampiran);
      if (!url) {
        setSaving(false);
        return;
      }
      lampiranUrl = url;
      lampiranNama = lampiran.name;
    }
    try {
      const res = await fetch("/api/guru/pengumuman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: activeGroup,
          judul: judul.trim(),
          deskripsi: deskripsi.trim(),
          tenggat: tenggat || undefined,
          lampiran: lampiranUrl || undefined,
          lampiranNama: lampiranNama || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Gagal membuat pengumuman.");
        return;
      }
      setShowCreate(false);
      setJudul("");
      setDeskripsi("");
      setTenggat("");
      setLampiran(null);
      fetchPengumuman();
    } catch {
      setError("Gagal membuat pengumuman.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/guru/pengumuman/${confirmDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmDelete(null);
        if (expandedId === confirmDelete.id) {
          setExpandedId(null);
          setSubmissions([]);
        }
        fetchPengumuman();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Gagal menghapus pengumuman.");
      }
    } catch {
      setError("Gagal menghapus pengumuman.");
    } finally {
      setDeleting(false);
    }
  };

  const activeGroupData = groups.find((g) => g.id === activeGroup);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-emerald-200" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">Papan Pengumuman</h3>
            <p className="text-[10px] text-emerald-200">Tugas &amp; pengumuman kelas</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setError(""); }}
            disabled={!activeGroup}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40"
          >
            <Plus size={13} /> Buat
          </button>
        </div>
      </div>

      {/* Group Selector */}
      <div className="px-3 pt-3 relative">
        <button
          onClick={() => setGroupOpen(!groupOpen)}
          className="flex items-center justify-between w-full px-3 py-2 bg-emerald-50 rounded-xl text-sm font-semibold text-gray-700 hover:bg-emerald-100 transition-colors"
        >
          <span className="truncate">{activeGroupData?.name || "Pilih kelas..."}</span>
          <ChevronDown size={14} className={`transition-transform shrink-0 ${groupOpen ? "rotate-180" : ""}`} />
        </button>
        {groupOpen && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => { setActiveGroup(g.id); setGroupOpen(false); setExpandedId(null); setSubmissions([]); }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-emerald-50 transition-colors ${
                  activeGroup === g.id ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-700"
                }`}
              >
                <span>{g.name}</span>
                <span className="text-[10px] text-gray-400 ml-2">{g.grade}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2.5">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
          </div>
        ) : !activeGroup ? (
          <div className="text-center text-xs text-gray-400 py-10">Pilih kelas untuk melihat pengumuman</div>
        ) : pengumuman.length === 0 ? (
          <div className="text-center py-10">
            <Megaphone className="w-8 h-8 text-emerald-200 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Belum ada pengumuman untuk kelas ini</p>
            <button
              onClick={() => { setShowCreate(true); setError(""); }}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors"
            >
              Buat Pengumuman Pertama
            </button>
          </div>
        ) : (
          pengumuman.map((p) => {
            const done = p._count?.submissions || 0;
            const expanded = expandedId === p.id;
            const lewat = p.tenggat && new Date(p.tenggat).getTime() < Date.now();
            return (
              <div key={p.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => openDetail(p.id)}
                  className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{p.judul}</p>
                  {p.deskripsi && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-wrap">{p.deskripsi}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {p.tenggat && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        lewat ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                      }`}>
                        <Clock size={11} /> {lewat ? "Lewat" : "Tenggat"} {formatTanggal(p.tenggat)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold">
                      <Users size={11} /> {done}/{memberCount} kumpul
                    </span>
                    {p.lampiran && (
                      <a
                        href={p.lampiran}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-semibold hover:bg-sky-100"
                      >
                        <Paperclip size={11} /> {p.lampiranNama || "Lampiran"}
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">{formatTanggal(p.createdAt)}</p>
                </button>

                {expanded && (
                  <div className="px-3 pb-3 border-t border-gray-50 pt-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Pengumpulan ({done})</p>
                    {loadingSubs ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                      </div>
                    ) : submissions.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-3">Belum ada yang mengumpulkan</p>
                    ) : (
                      <div className="space-y-2">
                        {submissions.map((s) => (
                          <div key={s.id} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-[8px] font-bold shrink-0 overflow-hidden">
                              {s.user.avatar ? (
                                <img src={s.user.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                s.user.fullName.charAt(0)
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-800">{s.user.fullName}</p>
                              {s.catatan && <p className="text-[11px] text-gray-500 line-clamp-2">{s.catatan}</p>}
                              <a
                                href={s.karyaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold hover:underline"
                              >
                                <ExternalLink size={11} /> Lihat karya
                              </a>
                            </div>
                            <span className="text-[9px] text-gray-400 shrink-0">
                              {new Date(s.submittedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="px-3 pb-2 flex justify-end">
                  <button
                    onClick={() => { setConfirmDelete(p); setError(""); }}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={11} /> Hapus
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { if (!saving) setShowCreate(false); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Buat Pengumuman</h3>
              <button onClick={() => { if (!saving) setShowCreate(false); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {error && <p className="text-xs text-red-500 font-medium mb-3">{error}</p>}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Judul *</label>
                <input
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="cth: Kumpulkan puisi bertema kemerdekaan"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Instruksi / Deskripsi</label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Jelaskan tugasnya..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tenggat (opsional)</label>
                <input
                  type="datetime-local"
                  value={tenggat}
                  onChange={(e) => setTenggat(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Lampiran Referensi (PDF/DOCX, opsional)</label>
                <label className="flex items-center gap-2 px-3.5 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors">
                  <Upload size={16} />
                  <span className="truncate">{lampiran ? lampiran.name : "Pilih file..."}</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    className="hidden"
                    onChange={(e) => setLampiran(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { if (!saving) setShowCreate(false); }}
                disabled={saving}
                className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !judul.trim() || uploadingFile}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {(saving || uploadingFile) && <Loader2 size={14} className="animate-spin" />}
                {(saving || uploadingFile) ? "Menyimpan..." : "Terbitkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { if (!deleting) setConfirmDelete(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="font-bold text-gray-900 mb-1">Hapus Pengumuman?</h3>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">"{confirmDelete.judul}" beserta semua pengumpulannya akan dihapus.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
