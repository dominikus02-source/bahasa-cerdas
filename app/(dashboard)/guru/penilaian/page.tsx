"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Download, Pencil, Trash2, RefreshCw, X, FileText, FileSpreadsheet, Check, BookOpen, Users as UsersIcon } from "lucide-react";

type Group = { id: string; name: string; grade: string; _count?: { members: number } };
type Kategori = { id: string; groupId: string; nama: string; bobot: number; createdAt: string };
type Siswa = { id: string; fullName: string; avatar?: string; profile?: { nisn?: string; school?: string } };
type NilaiEntry = {
  id: string; userId: string; kategoriId: string; skor: number;
  sumberType: string; sumberId?: string; keterangan?: string;
};

const SUMBER_LABEL: Record<string, string> = {
  PENUGASAN: "Tugas", KARYA: "Karya", QUIZ: "Kuis", MANUAL: "Manual",
};

function getColor(skor: number | undefined | null): string {
  if (skor === undefined || skor === null) return "";
  if (skor >= 85) return "text-emerald-600";
  if (skor >= 70) return "text-green-600";
  if (skor >= 60) return "text-amber-600";
  if (skor >= 40) return "text-orange-600";
  return "text-red-600";
}

export default function PenilaianPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [kategoris, setKategoris] = useState<Kategori[]>([]);
  const [siswas, setSiswas] = useState<Siswa[]>([]);
  const [nilais, setNilais] = useState<NilaiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [populating, setPopulating] = useState(false);

  // Category management modal
  const [showKategoriModal, setShowKategoriModal] = useState(false);
  const [editKategori, setEditKategori] = useState<Kategori | null>(null);
  const [kategoriNama, setKategoriNama] = useState("");
  const [kategoriBobot, setKategoriBobot] = useState(100);

  // Score edit modal
  const [editSiswa, setEditSiswa] = useState<Siswa | null>(null);
  const [editKategoriId, setEditKategoriId] = useState("");
  const [editSkor, setEditSkor] = useState("");
  const [editKeterangan, setEditKeterangan] = useState("");
  const [editSumberType, setEditSumberType] = useState("MANUAL");
  const [editExistingId, setEditExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Group download format
  const [showDownload, setShowDownload] = useState(false);

  useEffect(() => {
    fetch("/api/group").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.groups) setGroups(d.groups);
    }).finally(() => setLoading(false));
  }, []);

  const loadGroupData = useCallback(async (gid: string) => {
    setLoading(true);
    const [kRes, nRes] = await Promise.all([
      fetch(`/api/guru/nilai-kategori?groupId=${gid}`),
      fetch(`/api/guru/nilai?groupId=${gid}`),
    ]);
    const kData = await kRes.json();
    const nData = await nRes.json();
    setKategoris(kData.kategori || []);
    setNilais(nData.nilais || []);

    // Get students from stored group members
    const g = groups.find(gr => gr.id === gid);
    if (g && (g as any).members) {
      setSiswas((g as any).members.map((m: any) => m.user));
    }
    setLoading(false);
  }, [groups]);

  useEffect(() => {
    if (selectedGroupId) loadGroupData(selectedGroupId);
  }, [selectedGroupId, loadGroupData]);

  // ── Category CRUD ──
  const handleSaveKategori = async () => {
    if (!kategoriNama.trim() || !selectedGroupId) return;
    const url = editKategori
      ? `/api/guru/nilai-kategori/${editKategori.id}`
      : "/api/guru/nilai-kategori";
    const method = editKategori ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: selectedGroupId, nama: kategoriNama.trim(), bobot: kategoriBobot }),
    });
    if (res.ok) {
      setShowKategoriModal(false);
      setEditKategori(null);
      setKategoriNama("");
      setKategoriBobot(100);
      loadGroupData(selectedGroupId);
    }
  };

  const handleDeleteKategori = async (id: string) => {
    if (!confirm("Hapus kategori ini? Semua nilai di dalamnya akan ikut terhapus.")) return;
    const res = await fetch(`/api/guru/nilai-kategori/${id}`, { method: "DELETE" });
    if (res.ok) loadGroupData(selectedGroupId);
  };

  // ── Score edit ──
  const openScoreEdit = (siswa: Siswa, katId: string) => {
    const existing = nilais.find(n => n.userId === siswa.id && n.kategoriId === katId);
    setEditSiswa(siswa);
    setEditKategoriId(katId);
    setEditSkor(existing ? String(existing.skor) : "");
    setEditKeterangan(existing?.keterangan || "");
    setEditSumberType(existing?.sumberType || "MANUAL");
    setEditExistingId(existing?.id || null);
  };

  const handleSaveScore = async () => {
    if (!editSiswa || !editKategoriId || !selectedGroupId) return;
    const skor = parseInt(editSkor);
    if (isNaN(skor) || skor < 0 || skor > 100) return;

    setSaving(true);
    const res = await fetch("/api/guru/nilai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: editSiswa.id,
        groupId: selectedGroupId,
        kategoriId: editKategoriId,
        skor,
        sumberType: editSumberType,
        keterangan: editKeterangan || null,
      }),
    });
    if (res.ok) {
      setEditSiswa(null);
      loadGroupData(selectedGroupId);
    }
    setSaving(false);
  };

  // ── Auto-populate ──
  const handleAutoPopulate = async () => {
    if (!selectedGroupId) return;
    setPopulating(true);
    const res = await fetch("/api/guru/nilai/auto-populate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: selectedGroupId }),
    });
    if (res.ok) {
      loadGroupData(selectedGroupId);
    }
    setPopulating(false);
  };

  // ── Helpers ──
  const getSkor = (userId: string, katId: string): number | undefined => {
    const entries = nilais.filter(n => n.userId === userId && n.kategoriId === katId);
    if (entries.length === 0) return undefined;
    return Math.round(entries.reduce((sum, n) => sum + n.skor, 0) / entries.length);
  };

  const getKeterangan = (userId: string, katId: string): string => {
    return nilais.filter(n => n.userId === userId && n.kategoriId === katId).map(n =>
      `${n.skor} (${SUMBER_LABEL[n.sumberType] || n.sumberType}${n.keterangan ? `: ${n.keterangan}` : ""})`
    ).join("; ");
  };

  const overall = (userId: string): number | undefined => {
    const scores = kategoris.map(k => getSkor(userId, k.id)).filter((s): s is number => s !== undefined);
    if (scores.length === 0) return undefined;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 rounded-2xl p-5 text-white mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">Penilaian Siswa</p>
            <p className="text-sm text-emerald-200 mt-0.5">Input nilai latihan, praktik, dan ulangan harian</p>
          </div>
          <BookOpen size={24} />
        </div>
      </div>

      {/* Class Selector */}
      <div className="mb-5">
        <select
          value={selectedGroupId}
          onChange={e => setSelectedGroupId(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px',
          }}
        >
          <option value="">Pilih Kelas</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.name} ({g.grade}) — {g._count?.members || 0} murid</option>
          ))}
        </select>
      </div>

      {selectedGroupId && !loading && (
        <>
          {/* Action Bar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button onClick={() => { setEditKategori(null); setKategoriNama(""); setKategoriBobot(100); setShowKategoriModal(true); }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-50 transition-all">
              <Plus size={14} /> Atur Kategori
            </button>
            <button onClick={handleAutoPopulate} disabled={populating}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-all disabled:opacity-50">
              <RefreshCw size={14} className={populating ? "animate-spin" : ""} /> {populating ? "Memproses..." : "Ambil dari Tugas"}
            </button>
            <div className="relative">
              <button onClick={() => setShowDownload(!showDownload)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all">
                <Download size={14} /> Download
              </button>
              {showDownload && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-10 w-44 overflow-hidden">
                  <a href={`/api/guru/nilai/export?groupId=${selectedGroupId}&format=csv`}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 transition-colors">
                    <FileSpreadsheet size={16} className="text-green-600" /> Excel (CSV)
                  </a>
                  <a href={`/api/guru/nilai/export?groupId=${selectedGroupId}&format=docx`}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 transition-colors">
                    <FileText size={16} className="text-blue-600" /> Word (DOC)
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Category pills */}
          {kategoris.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {kategoris.map(k => (
                <div key={k.id} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
                  <span className="font-semibold text-gray-700">{k.nama}</span>
                  {k.bobot !== 100 && <span className="text-gray-400">B:{k.bobot}%</span>}
                  <button onClick={() => handleDeleteKategori(k.id)} className="text-gray-300 hover:text-red-500 ml-1">
                    <Trash2 size={12} />
                  </button>
                  <button onClick={() => { setEditKategori(k); setKategoriNama(k.nama); setKategoriBobot(k.bobot); setShowKategoriModal(true); }}
                    className="text-gray-300 hover:text-emerald-500">
                    <Pencil size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Score Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600 min-w-[180px] sticky left-0 bg-gray-50">Nama Siswa</th>
                    {kategoris.map(k => (
                      <th key={k.id} className="text-center py-3 px-3 font-semibold text-gray-600 min-w-[100px]">{k.nama}</th>
                    ))}
                    <th className="text-center py-3 px-3 font-semibold text-emerald-700 min-w-[80px] bg-emerald-50/50">Rata-rata</th>
                  </tr>
                </thead>
                <tbody>
                  {siswas.length === 0 ? (
                    <tr>
                      <td colSpan={kategoris.length + 2} className="text-center py-12 text-sm text-gray-400">
                        <UsersIcon size={24} className="mx-auto mb-2 text-gray-300" />
                        Belum ada murid di kelas ini
                      </td>
                    </tr>
                  ) : siswas.map(siswa => {
                    const avg = overall(siswa.id);
                    return (
                      <tr key={siswa.id} className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors">
                        <td className="py-2.5 px-4 sticky left-0 bg-white hover:bg-emerald-50/30">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                              {siswa.avatar ? <img src={siswa.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : siswa.fullName.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-gray-800 truncate">{siswa.fullName}</span>
                          </div>
                        </td>
                        {kategoris.map(k => {
                          const skor = getSkor(siswa.id, k.id);
                          return (
                            <td key={k.id} className="text-center py-2.5 px-3">
                              <button onClick={() => openScoreEdit(siswa, k.id)}
                                className={`inline-block min-w-[40px] px-2 py-1 rounded-lg text-xs font-bold transition-all hover:ring-2 hover:ring-emerald-300 ${getColor(skor)} ${skor !== undefined ? "bg-gray-50" : "text-gray-300 bg-gray-50/50"}`}>
                                {skor !== undefined ? skor : "—"}
                              </button>
                            </td>
                          );
                        })}
                        <td className={`text-center py-2.5 px-3 font-bold text-xs ${getColor(avg)} bg-emerald-50/30`}>
                          {avg !== undefined ? avg : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedGroupId && loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-7 h-7 border-[3px] border-emerald-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* ═══ KATEGORI MODAL ═══ */}
      {showKategoriModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowKategoriModal(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowKategoriModal(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <X size={16} className="text-gray-500" />
            </button>
            <h3 className="font-bold text-gray-900 text-lg mb-4">{editKategori ? "Ubah Kategori" : "Tambah Kategori"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Kategori</label>
                <input value={kategoriNama} onChange={e => setKategoriNama(e.target.value)}
                  placeholder="Latihan / Praktik / Ulangan Harian"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Bobot (%)</label>
                <input type="number" value={kategoriBobot} onChange={e => setKategoriBobot(parseInt(e.target.value) || 100)}
                  min={1} max={100}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400" />
              </div>
              <button onClick={handleSaveKategori}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all">
                {editKategori ? "Simpan" : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SCORE EDIT MODAL ═══ */}
      {editSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setEditSiswa(null)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <button onClick={() => setEditSiswa(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <X size={16} className="text-gray-500" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white font-bold shrink-0">
                {editSiswa.avatar ? <img src={editSiswa.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : editSiswa.fullName.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{editSiswa.fullName}</p>
                <p className="text-xs text-gray-400">{kategoris.find(k => k.id === editKategoriId)?.nama || "Nilai"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Skor (0-100)</label>
                <input type="number" value={editSkor} onChange={e => setEditSkor(e.target.value)}
                  min={0} max={100}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Sumber Nilai</label>
                <select value={editSumberType} onChange={e => setEditSumberType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400">
                  <option value="MANUAL">Input Manual</option>
                  <option value="PENUGASAN">Dari Tugas (Buku Panduan)</option>
                  <option value="KARYA">Dari Karya Siswa</option>
                  <option value="QUIZ">Dari Kuis</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Keterangan (opsional)</label>
                <textarea value={editKeterangan} onChange={e => setEditKeterangan(e.target.value)}
                  placeholder="Misal: Dari tugas bab 3 latihan 1"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 resize-none" />
              </div>
              <button onClick={handleSaveScore} disabled={saving || !editSkor || parseInt(editSkor) < 0 || parseInt(editSkor) > 100}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Check size={16} />}
                {editExistingId ? "Perbarui Nilai" : "Simpan Nilai"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
