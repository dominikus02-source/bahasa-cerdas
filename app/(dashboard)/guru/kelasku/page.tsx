"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Users, Plus, Copy, ChevronLeft, Trash2, Edit3,
  CheckCircle, Clock, BookOpen, Gamepad2, GraduationCap,
  MoreVertical, X, Eye, EyeOff, RefreshCw, Search, Crown, AlertCircle,
  Share2, MessageCircle, Send, Megaphone, FileText, ClipboardList, Presentation, Trophy, TrendingUp, Sparkles
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GRADE_OPTIONS as KURIKULUM_GRADES } from "@/lib/kurikulum/jenjang";

interface MemberProgress {
  id: string;
  userId: string;
  user: { id: string; fullName: string; avatar: string | null; email: string };
  joinedAt: string;
  progress: any[];
  quizResults: any[];
  ukbiCount: number;
  tkaCount: number;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  grade: string;
  tahunAjaran: string | null;
  accessCode: string;
  memberCount: number;
  isActive: boolean;
  members: MemberProgress[];
  createdAt: string;
}

export default function KelasKuPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showGroup, setShowGroup] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", description: "", grade: "X", tahunAjaran: "" });
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [newGroupCode, setNewGroupCode] = useState<{ code: string; name: string; id: string } | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, any>>({});
  const [detailTab, setDetailTab] = useState<"overview" | "tugas" | "nilai" | "pengumuman" | "materi">("overview");
  const [fabOpen, setFabOpen] = useState(false);
  const [showPengumuman, setShowPengumuman] = useState(false);
  const [pengumumanForm, setPengumumanForm] = useState({ judul: "", deskripsi: "", tenggat: "" });
  const [pengumumanGroupId, setPengumumanGroupId] = useState("");
  const [sendingPengumuman, setSendingPengumuman] = useState(false);
  const [pengumumanError, setPengumumanError] = useState("");

  const loadDetail = async (groupId: string) => {
    try {
      const res = await fetch(`/api/guru/kelasku/${groupId}`);
      if (!res.ok) return;
      const data = await res.json();
      setDetailMap(prev => ({ ...prev, [groupId]: data }));
    } catch { /* gagal diam */ }
  };

  useEffect(() => {
    groups.forEach(g => {
      if (detailMap[g.id]) return;
      loadDetail(g.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/group");
      const data = await res.json();
      if (data.groups) setGroups(data.groups);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Live poll: refresh group detail setiap 5 detik saat modal terbuka
  useEffect(() => {
    if (!showGroup) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    pollingRef.current = setInterval(() => {
      fetch(`/api/group/${showGroup}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.group) {
            setGroups(prev => prev.map(g => g.id === showGroup ? {
              ...g,
              memberCount: data.group.members?.length || 0,
              members: data.group.members || [],
            } : g));
          }
        })
        .catch(() => {});
    }, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [showGroup]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membuat kelas");
        return;
      }
      if (data.group) {
        setShowCreate(false);
        setCreateForm({ name: "", description: "", grade: "X", tahunAjaran: "" });
        setError("");
        setNewGroupCode({ code: data.group.accessCode, name: data.group.name, id: data.group.id });
        fetchGroups();
      }
    } catch (e) {
      setError("Gagal membuat kelas. Periksa koneksi Anda.");
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const confirmDeleteGroup = async () => {
    if (!confirmDelete || deleting) return;
    const groupId = confirmDelete.id;
    setDeleting(true);
    try {
      const res = await fetch(`/api/group/${groupId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      // Remove from the active list without a full reload.
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setConfirmDelete(null);
      setToast("Kelas berhasil dihapus dari daftar aktif.");
    } catch {
      setToast("Kelas belum berhasil dihapus. Silakan coba lagi.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleRefreshCode = async (groupId: string) => {
    try {
      await fetch(`/api/group/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      fetchGroups();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendPengumuman = async () => {
    if (!pengumumanGroupId || sendingPengumuman) return;
    if (!pengumumanForm.judul.trim()) { setPengumumanError("Judul wajib diisi"); return; }
    setPengumumanError("");
    setSendingPengumuman(true);
    try {
      const res = await fetch("/api/guru/pengumuman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: pengumumanGroupId,
          judul: pengumumanForm.judul.trim(),
          deskripsi: pengumumanForm.deskripsi.trim(),
          tenggat: pengumumanForm.tenggat || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setPengumumanError(data.error || "Gagal mengirim pengumuman"); return; }
      setShowPengumuman(false);
      setPengumumanForm({ judul: "", deskripsi: "", tenggat: "" });
      setPengumumanGroupId("");
      setToast("Pengumuman terkirim ke murid kelas!");
      if (pengumumanGroupId) loadDetail(pengumumanGroupId);
    } catch {
      setPengumumanError("Gagal mengirim pengumuman. Periksa koneksi Anda.");
    } finally {
      setSendingPengumuman(false);
    }
  };

  const filteredGroups = groups.filter(
    (g) =>
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.grade.toLowerCase().includes(search.toLowerCase())
  );

  const selectedGroup = groups.find((g) => g.id === showGroup);

  const shareToWA = (code: string, name: string) => {
    const text = encodeURIComponent(
      `Gabung kelas ${name} di BahasaCerdas!\n\nKode kelas: ${code}\n\nCara gabung:\n1. Buka https://www.bahasacerdas.com/gabung-kelas\n2. Masukkan kode: ${code}\n3. Klik Gabung`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareToBeranda = (code: string, name: string) => {
    const text = `Kode kelas ${name}: ${code}`;
    navigator.clipboard.writeText(text);
    setToast("Kode tersalin! Tempel di pengumuman beranda");
  };
  // Daftar kelas diambil dari sumber tunggal di lib/kurikulum/jenjang.ts.
  // Sebelumnya di-hardcode VII–XII saja, sehingga guru TK/SD tidak bisa membuat
  // kelas sama sekali — dan tanpa kelas TK/SD, Arena Junior tidak punya jenjang.
  const GRADE_OPTIONS = [
    ...KURIKULUM_GRADES.map((g) => ({ value: g.value, label: g.label })),
    { value: "Lainnya", label: "Lainnya" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/guru/beranda" className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-600" />
            KelasKu
          </h1>
          <p className="text-sm text-slate-500">Kelola kelas dan pantau progress murid</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Buat Kelas
        </Button>
      </div>

      {groups.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kelas..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Memuat kelas...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-600 mb-2">Belum ada kelas</h3>
          <p className="text-sm text-slate-400 mb-4">Buat kelas pertama dan bagikan kode ke murid</p>
          <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Buat Kelas
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              onClick={() => setShowGroup(group.id)}
              className="p-5 border border-slate-100 hover:shadow-lg hover:border-emerald-200 cursor-pointer transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {group.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900">{group.name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                      Kelas {group.grade}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {group.memberCount || group.members?.length || 0} murid ·{" "}
                    {group.tahunAjaran || "Th. Ajaran aktif"}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {group.members?.filter((m) => m.ukbiCount > 0).length || 0} UKBI
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {group.members?.filter((m) => m.tkaCount > 0).length || 0} TKA
                    </span>
                    <span className="flex items-center gap-1">
                      <Gamepad2 className="w-3.5 h-3.5" />
                      {group.members?.reduce((acc, m) => acc + (m.quizResults?.length || 0), 0)} Kuis
                    </span>
                  </div>
                  {detailMap[group.id]?.stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                        <p className="text-sm font-bold text-slate-800">{detailMap[group.id].stats.totalMurid}</p>
                        <p className="text-[10px] text-slate-400">Murid</p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center">
                        <p className="text-sm font-bold text-emerald-700">{detailMap[group.id].stats.tugasAktif}</p>
                        <p className="text-[10px] text-slate-400">Tugas Aktif</p>
                      </div>
                      <div className="rounded-xl bg-blue-50 px-3 py-2 text-center">
                        <p className="text-sm font-bold text-blue-700">{detailMap[group.id].stats.pengumuman}</p>
                        <p className="text-[10px] text-slate-400">Pengumuman</p>
                      </div>
                      <div className="rounded-xl bg-amber-50 px-3 py-2 text-center">
                        <p className="text-sm font-bold text-amber-700">{detailMap[group.id].stats.nilaiRata ?? "—"}</p>
                        <p className="text-[10px] text-slate-400">Nilai Rata²</p>
                      </div>
                      <div className="rounded-xl bg-violet-50 px-3 py-2 text-center">
                        <p className="text-sm font-bold text-violet-700">{detailMap[group.id].stats.progressMurid}%</p>
                        <p className="text-[10px] text-slate-400">Progress</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl">
                    <span className="font-mono font-bold text-sm text-slate-700">{group.accessCode}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopy(group.accessCode); }}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(group); }}
                    className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Buat Kelas Baru
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Kelas</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Contoh: Bahasa Indonesia X IPA 1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tingkat/Kelas</label>
                  <select
                    value={createForm.grade}
                    onChange={(e) => setCreateForm({ ...createForm, grade: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  >
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tahun Ajaran</label>
                  <input
                    value={createForm.tahunAjaran}
                    onChange={(e) => setCreateForm({ ...createForm, tahunAjaran: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="2025/2026"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Deskripsi singkat..."
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border-2 border-slate-200 text-slate-600 font-bold rounded-xl">
                  Batal
                </button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                  {creating ? "Membuat..." : "Buat Kelas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {newGroupCode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative animate-in fade-in zoom-in">
            <button
              onClick={() => setNewGroupCode(null)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Kelas Berhasil Dibuat!</h2>
            <p className="text-sm text-slate-500 mb-6">
              Bagikan kode ini ke muridmu untuk bergabung
            </p>

            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 mb-6 text-white">
              <p className="text-xs font-medium text-emerald-100 mb-2 uppercase tracking-wider">Kode Kelas</p>
              <p className="text-5xl font-bold font-mono tracking-widest mb-3 select-all">
                {newGroupCode.code}
              </p>
              <div className="w-12 h-0.5 bg-emerald-400/50 mx-auto mb-3" />
              <p className="text-sm font-medium text-emerald-100">
                {newGroupCode.name}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newGroupCode.code);
                  setCopied(newGroupCode.code);
                  setTimeout(() => setCopied(""), 2000);
                }}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                {copied === newGroupCode.code ? (
                  <><CheckCircle className="w-4 h-4" /> Tersalin!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Salin Kode</>
                )}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => shareToWA(newGroupCode.code, newGroupCode.name)}
                  className="py-3 px-4 rounded-xl border-2 border-green-500 text-green-700 font-semibold hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Bagikan WA
                </button>
                <button
                  onClick={() => shareToBeranda(newGroupCode.code, newGroupCode.name)}
                  className="py-3 px-4 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Ke Beranda
                </button>
              </div>

              <button
                onClick={() => setNewGroupCode(null)}
                className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowGroup(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedGroup.name}</h2>
                <p className="text-sm text-slate-500">
                  Kelas {selectedGroup.grade} · <span className="font-semibold text-emerald-600">{selectedGroup.members?.length || 0}</span> murid
                  {selectedGroup.members && selectedGroup.members.length > 0 && (
                    <span className="inline-flex items-center gap-1 ml-2 text-[10px] text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      LIVE
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 rounded-xl">
                  <span className="font-mono font-bold text-sm text-emerald-700">{selectedGroup.accessCode}</span>
                  <button onClick={() => handleCopy(selectedGroup.accessCode)} className="p-1 hover:bg-emerald-200 rounded">
                    {copied === selectedGroup.accessCode ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </button>
                </div>
                <button onClick={() => setShowGroup(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              Bagikan kode di atas ke murid untuk bergabung. Kode tidak berubah kecuali di-reset.
            </p>

            {/* ── Tab bar ── */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {([["overview", "Overview", <Eye key="o" size={14} />], ["tugas", "Tugas", <ClipboardList key="t" size={14} />], ["nilai", "Nilai", <TrendingUp key="n" size={14} />], ["pengumuman", "Pengumuman", <Megaphone key="p" size={14} />], ["materi", "Materi", <Presentation key="m" size={14} />]] as const).map(([tab, label, icon]) => (
                <button key={tab} onClick={() => setDetailTab(tab)}
                  className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${detailTab === tab ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  {icon} {label}
                </button>
              ))}
            </div>

            {detailTab === "overview" && (<>
            {(() => {
              const ketuaMember = selectedGroup.members?.find((m: any) => m.role === "ketua");
              return ketuaMember ? (
                <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <Crown className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="text-sm text-amber-900">
                    <strong>{ketuaMember.user.fullName}</strong> — Ketua Kelas
                  </span>
                </div>
              ) : null;
            })()}

            {(!selectedGroup.members || selectedGroup.members.length === 0) ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Belum ada murid yang bergabung</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-slate-700 mb-3">Daftar Murid</h3>
                {selectedGroup.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm">
                      {member.user.avatar ? (
                        <img src={member.user.avatar} alt={member.user.fullName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        member.user.fullName.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{member.user.fullName}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          {member.progress?.length || 0} tes
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {member.ukbiCount} UKBI
                        </span>
                        <span className="flex items-center gap-1">
                          <Gamepad2 className="w-3 h-3" />
                          {member.quizResults?.length || 0} kuis
                        </span>
                      </div>
                    </div>
                    {member.progress?.length > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-emerald-600">Skor terbaik</p>
                        <p className="text-sm font-bold text-slate-900">
                          {Math.round(
                            (member.progress.reduce((max: number, p: any) =>
                              Math.max(max, p.percentage || 0), 0) / Math.max(member.progress.length, 1))
                          )}%
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            </>
            )}

            {detailTab === "tugas" && (() => {
              const d = detailMap[selectedGroup.id];
              const quizList = d?.tugasQuiz || [];
              const penugasanList = d?.tugasPenugasan || [];
              return (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-700">Tugas Kelas</h3>
                    <Link href="/guru/bank-soal" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">Kirim tugas baru →</Link>
                  </div>
                  {quizList.length === 0 && penugasanList.length === 0 && (
                    <p className="text-center py-10 text-slate-400 text-sm">Belum ada tugas untuk kelas ini</p>
                  )}
                  {quizList.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <ClipboardList className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{t.quiz.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {t.isPublished ? "Dipublikasikan" : "Draf"} · {t._count.submissions} pengumpulan
                          {t.dueDate ? ` · Tenggat ${new Date(t.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}` : ""}
                        </p>
                      </div>
                      <Link href={`/guru/kuis/${t.quiz.id}/results`} className="text-xs font-semibold text-emerald-600 hover:underline shrink-0">Hasil</Link>
                    </div>
                  ))}
                  {penugasanList.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{t.judul}</p>
                        <p className="text-[11px] text-slate-400">
                          {t.jenis} · {t._count.submissions} pengumpulan
                          {t.tenggat ? ` · Tenggat ${new Date(t.tenggat).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {detailTab === "nilai" && (() => {
              const d = detailMap[selectedGroup.id];
              const stats = d?.stats;
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-amber-50 p-4 text-center">
                      <p className="text-xl font-bold text-amber-700">{stats?.nilaiRata ?? "—"}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Nilai Rata-rata</p>
                    </div>
                    <div className="rounded-2xl bg-violet-50 p-4 text-center">
                      <p className="text-xl font-bold text-violet-700">{stats?.progressMurid ?? 0}%</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Murid Aktif Belajar</p>
                    </div>
                  </div>
                  <Link href={`/guru/penilaian?groupId=${selectedGroup.id}`} className="block w-full py-2.5 text-center rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all">
                    Buka Penilaian Kelas
                  </Link>
                  <Link href={`/guru/gradebook?groupId=${selectedGroup.id}`} className="block w-full py-2.5 text-center rounded-xl border-2 border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-all">
                    Buka Buku Nilai
                  </Link>
                </div>
              );
            })()}

            {detailTab === "pengumuman" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-700">Pengumuman Kelas</h3>
                  <button onClick={() => { setPengumumanError(""); setShowPengumuman(true); }}
                    className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1">
                    <Megaphone size={12} /> Buat Pengumuman
                  </button>
                </div>
                {(() => {
                  const pengList = detailMap[selectedGroup.id]?.pengumuman || [];
                  if (pengList.length === 0) return <p className="text-center py-10 text-slate-400 text-sm">Belum ada pengumuman</p>;
                  return (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {pengList.map((p: any) => (
                        <div key={p.id} className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-sm font-semibold text-slate-900">{p.judul}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(p.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} · {p._count.submissions} murid merespons
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {detailTab === "materi" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-700">Materi Kelas</h3>
                  <Link href="/guru/materi-ajar" className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1">
                    Tambah materi →
                  </Link>
                </div>
                {(() => {
                  const materiList = detailMap[selectedGroup.id]?.materis || [];
                  if (materiList.length === 0) return <p className="text-center py-10 text-slate-400 text-sm">Belum ada materi dikirim</p>;
                  return (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {materiList.map((mt: any) => (
                        <div key={mt.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                            <Presentation className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{mt.materi.title}</p>
                            <p className="text-[11px] text-slate-400 truncate">{new Date(mt.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</p>
                          </div>
                          <Link href={`/arena/materi/${mt.materi.id}`} className="text-xs font-semibold text-emerald-600 hover:underline shrink-0">Buka</Link>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Hapus kelas?</h2>
            <p className="text-sm text-slate-500 mb-5">
              Kelas <span className="font-semibold text-slate-700">{confirmDelete.name}</span> akan dihapus dari daftar
              kelas aktif. Data murid, tugas, dan nilai yang sudah terkait <span className="font-semibold">tidak dihapus permanen</span>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteGroup}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Menghapus..." : "Hapus Kelas"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAB: Apa yang ingin dibuat? ── */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2">
        {fabOpen && (
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 w-56 animate-in fade-in zoom-in">
            <p className="text-[11px] font-bold text-slate-400 px-3 pt-2 pb-1 uppercase tracking-wider">Apa yang ingin dibuat?</p>
            <button onClick={() => { setFabOpen(false); setShowGroup(null); setShowCreate(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-emerald-50 transition-colors text-left">
              <GraduationCap size={16} className="text-emerald-600" /> Kelas Baru
            </button>
            <button onClick={() => { setFabOpen(false); setPengumumanGroupId(showGroup || ""); setShowPengumuman(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-emerald-50 transition-colors text-left">
              <Megaphone size={16} className="text-emerald-600" /> Pengumuman
            </button>
            <Link href="/guru/bank-soal" onClick={() => setFabOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-emerald-50 transition-colors text-left">
              <ClipboardList size={16} className="text-emerald-600" /> Tugas
            </Link>
            <Link href="/guru/bank-soal" onClick={() => setFabOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-emerald-50 transition-colors text-left">
              <FileText size={16} className="text-emerald-600" /> Asesmen
            </Link>
            <Link href="/guru/materi-ajar" onClick={() => setFabOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-emerald-50 transition-colors text-left">
              <Presentation size={16} className="text-emerald-600" /> Materi
            </Link>
          </div>
        )}
        <button onClick={() => setFabOpen(v => !v)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all ${fabOpen ? "bg-slate-700 rotate-45" : "bg-emerald-600 hover:bg-emerald-700"}`}>
          <Plus size={24} className="text-white" />
        </button>
      </div>

      {/* ── Pengumuman modal ── */}
      {showPengumuman && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[65] p-4" onClick={() => setShowPengumuman(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-emerald-600" />
              Buat Pengumuman
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              {pengumumanGroupId ? `Dikirim ke kelas: ${groups.find(g => g.id === pengumumanGroupId)?.name || ""}` : "Pilih kelas dulu dari daftar kelas."}
            </p>
            {!pengumumanGroupId && (
              <select value={pengumumanGroupId} onChange={(e) => setPengumumanGroupId(e.target.value)}
                className="w-full h-11 px-4 mb-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500">
                <option value="">Pilih kelas...</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.grade})</option>)}
              </select>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Judul</label>
                <input value={pengumumanForm.judul} onChange={(e) => setPengumumanForm({ ...pengumumanForm, judul: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Isi</label>
                <textarea value={pengumumanForm.deskripsi} onChange={(e) => setPengumumanForm({ ...pengumumanForm, deskripsi: e.target.value })}
                  rows={3} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tenggat (opsional)</label>
                <input type="date" value={pengumumanForm.tenggat} onChange={(e) => setPengumumanForm({ ...pengumumanForm, tenggat: e.target.value })}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500" />
              </div>
              {pengumumanError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pengumumanError}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowPengumuman(false)} className="flex-1 py-2.5 border-2 border-slate-200 text-slate-600 font-bold rounded-xl">
                  Batal
                </button>
                <button onClick={handleSendPengumuman} disabled={sendingPengumuman || !pengumumanGroupId}
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {sendingPengumuman ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Send size={14} />}
                  Kirim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-8 z-[70] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg max-w-[90%] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}