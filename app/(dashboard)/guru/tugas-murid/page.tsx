"use client";

import { useEffect, useState } from "react";
import { ClipboardList, ArrowLeft, FileText, CheckCircle, Clock, Loader2, Award, Trash2 } from "lucide-react";

interface PenugasanRow {
  id: string; judul: string; jenis: string; unitTitle: string; groupName: string;
  totalMurid: number; selesai: number; praktikMasuk: number; praktikBelumDinilai: number;
}

const JENIS_LABEL: Record<string, string> = { KUIS: "ULANGAN", LATIHAN: "LATIHAN", PRAKTIK: "PRAKTIK", MATERI: "TUGAS" };
const JENIS_COLOR: Record<string, string> = {
  KUIS: "bg-violet-100 text-violet-700",
  LATIHAN: "bg-blue-100 text-blue-700",
  PRAKTIK: "bg-amber-100 text-amber-700",
  MATERI: "bg-emerald-100 text-emerald-700",
};
const JENIS_DESC: Record<string, string> = {
  KUIS: "Ulangan Harian", LATIHAN: "Latihan", PRAKTIK: "Praktik", MATERI: "Tugas Materi",
};
interface MuridRow {
  userId: string; fullName: string; avatar: string | null; status: string; score: number | null;
  praktikUrl: string | null; praktikNilai: number | null; praktikCatatan: string | null; praktikDinilai: boolean;
}

export default function TugasMuridPage() {
  const [list, setList] = useState<PenugasanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<PenugasanRow | null>(null);
  const [murid, setMurid] = useState<MuridRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [grade, setGrade] = useState<Record<string, { nilai: string; catatan: string; saving?: boolean; done?: boolean }>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hapusTugas = async (p: PenugasanRow) => {
    if (!window.confirm(`Hapus "${p.judul}" dari kelas ${p.groupName}? Pengerjaan murid yang sudah masuk akan ikut terhapus.`)) return;
    setDeletingId(p.id);
    try {
      const res = await fetch(`/api/guru/penugasan/${p.id}`, { method: "DELETE" });
      if (res.ok) setList(prev => prev.filter(x => x.id !== p.id));
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetch("/api/guru/penugasan").then(r => r.json()).then(d => setList(d.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openDetail = async (p: PenugasanRow) => {
    setActive(p); setDetailLoading(true); setMurid([]);
    try {
      const d = await fetch(`/api/guru/penugasan/${p.id}`).then(r => r.json());
      const rows: MuridRow[] = d.data?.murid || [];
      setMurid(rows);
      const g: typeof grade = {};
      for (const m of rows) g[m.userId] = { nilai: m.praktikNilai != null ? String(m.praktikNilai) : "", catatan: m.praktikCatatan || "" };
      setGrade(g);
    } catch {}
    setDetailLoading(false);
  };

  const savePraktik = async (userId: string) => {
    if (!active) return;
    const g = grade[userId];
    const nilai = Number(g?.nilai);
    if (Number.isNaN(nilai)) return;
    setGrade(s => ({ ...s, [userId]: { ...s[userId], saving: true } }));
    try {
      const res = await fetch(`/api/guru/penugasan/${active.id}/nilai-praktik`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, nilai, catatan: g.catatan }),
      });
      if (!res.ok) throw new Error();
      setGrade(s => ({ ...s, [userId]: { ...s[userId], saving: false, done: true } }));
      setMurid(rows => rows.map(r => r.userId === userId ? { ...r, praktikDinilai: true, praktikNilai: nilai } : r));
    } catch {
      setGrade(s => ({ ...s, [userId]: { ...s[userId], saving: false } }));
    }
  };

  if (active) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <button onClick={() => setActive(null)} className="flex items-center gap-1 text-sm text-slate-500 mb-4"><ArrowLeft className="w-4 h-4" /> Kembali</button>
        <h1 className="text-lg font-bold text-slate-900">{active.judul}</h1>
        <p className="text-xs text-slate-500 mb-5">{active.groupName} · {JENIS_DESC[active.jenis] || "Tugas Materi"}</p>

        {detailLoading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto" /></div>
        ) : (
          <div className="space-y-2">
            {murid.map(m => (
              <div key={m.userId} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0">{m.fullName?.charAt(0) || "?"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{m.fullName}</p>
                    <p className="text-[11px] text-slate-400">
                      {m.status === "COMPLETED"
                        ? <>Latihan/Kuis: <span className="font-bold text-slate-700">{m.score ?? 0}</span></>
                        : "Belum mengerjakan"}
                    </p>
                  </div>
                  {m.status === "COMPLETED"
                    ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                    : <Clock className="w-5 h-5 text-slate-300" />}
                </div>

                {/* Praktik review (hanya untuk jenis yang benar-benar punya praktik) */}
                {(active.jenis === "MATERI" || active.jenis === "PRAKTIK") && (
                  <div className="mt-2 pt-3 border-t border-slate-50">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1"><Award size={12} /> Praktik</p>
                    {m.praktikUrl ? (
                      <>
                        <a href={m.praktikUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-violet-700 font-medium mb-2 bg-violet-50 px-2.5 py-1.5 rounded-lg">
                          <FileText size={13} /> Lihat berkas praktik
                        </a>
                        <div className="flex items-end gap-2">
                          <div className="w-20">
                            <label className="block text-[10px] text-slate-400 mb-0.5">Nilai (0–100)</label>
                            <input type="number" min={0} max={100} value={grade[m.userId]?.nilai ?? ""}
                              onChange={e => setGrade(s => ({ ...s, [m.userId]: { ...s[m.userId], nilai: e.target.value } }))}
                              className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm" />
                          </div>
                          <input placeholder="Catatan (opsional)" value={grade[m.userId]?.catatan ?? ""}
                            onChange={e => setGrade(s => ({ ...s, [m.userId]: { ...s[m.userId], catatan: e.target.value } }))}
                            className="flex-1 h-9 px-2 rounded-lg border border-slate-200 text-sm" />
                          <button onClick={() => savePraktik(m.userId)} disabled={grade[m.userId]?.saving || !grade[m.userId]?.nilai}
                            className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50">
                            {grade[m.userId]?.saving ? "..." : m.praktikDinilai || grade[m.userId]?.done ? "Ubah" : "Nilai"}
                          </button>
                        </div>
                        {(m.praktikDinilai || grade[m.userId]?.done) && <p className="text-[11px] text-emerald-600 mt-1">Sudah dinilai ✓ (masuk rekap)</p>}
                      </>
                    ) : (
                      <p className="text-xs text-slate-400">Murid belum mengunggah hasil praktik.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {murid.length === 0 && <p className="text-center text-slate-400 py-10 text-sm">Belum ada murid di kelas ini.</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow"><ClipboardList className="w-5 h-5 text-white" /></div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Tugas Murid</h1>
          <p className="text-xs text-slate-500">Pantau pengerjaan & nilai praktik</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 h-20 animate-pulse" />)}</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Belum ada tugas terkirim</p>
          <p className="text-xs text-slate-400 mt-1">Kirim tugas dari Buku Ajar → bab → Kirim ke Kelas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(p => (
            <div key={p.id} className="group relative">
              <button onClick={() => openDetail(p)} className="w-full text-left bg-white rounded-2xl border border-slate-100 p-4 hover:border-emerald-200 transition-colors">
                <div className="flex items-start justify-between mb-1.5">
                  <h3 className="font-bold text-sm text-slate-900 flex-1 min-w-0 truncate mr-2">{p.judul}</h3>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${JENIS_COLOR[p.jenis] || JENIS_COLOR.MATERI}`}>
                    {JENIS_LABEL[p.jenis] || "TUGAS"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{p.groupName}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><CheckCircle size={12} /> {p.selesai}/{p.totalMurid} selesai</span>
                  {(p.jenis === "MATERI" || p.jenis === "PRAKTIK") && p.praktikMasuk > 0 && (
                    <span className={`flex items-center gap-1 ${p.praktikBelumDinilai > 0 ? "text-amber-600 font-semibold" : ""}`}>
                      <FileText size={12} /> {p.praktikBelumDinilai > 0 ? `${p.praktikBelumDinilai} praktik perlu dinilai` : "praktik dinilai"}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => hapusTugas(p)}
                disabled={deletingId === p.id}
                title="Hapus tugas terkirim"
                className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
              >
                {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
