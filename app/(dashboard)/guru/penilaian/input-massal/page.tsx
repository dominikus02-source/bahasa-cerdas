"use client";

import { useEffect, useState } from "react";
import { Check, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function InputMassalPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [groupId, setGroupId] = useState("");
  const [kategoris, setKategoris] = useState<any[]>([]);
  const [kategoriId, setKategoriId] = useState("");
  const [siswas, setSiswas] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/group").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.groups) setGroups(d.groups);
    });
  }, []);

  useEffect(() => {
    if (!groupId) { setKategoris([]); setSiswas([]); return; }
    Promise.all([
      fetch(`/api/guru/nilai-kategori?groupId=${groupId}`).then(r => r.json()),
      fetch(`/api/group`).then(r => r.json()),
    ]).then(([kData, gData]) => {
      setKategoris(kData.kategori || []);
      const g = gData.groups?.find((gr: any) => gr.id === groupId);
      if (g?.members) setSiswas(g.members.map((m: any) => m.user));
    });
  }, [groupId]);

  const handleSave = async () => {
    if (!groupId || !kategoriId) return;
    setSaving(true);
    setSaved(false);

    const payload = {
      groupId,
      kategoriId,
      scores: siswas.map(s => ({
        userId: s.id,
        skor: scores[s.id] ? parseInt(scores[s.id]) : null,
      })).filter(s => s.skor !== null),
    };

    const res = await fetch("/api/guru/nilai/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/guru/penilaian" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} className="text-gray-500" />
        </Link>
        <div>
          <h1 className="font-bold text-lg text-gray-900">Input Nilai Massal</h1>
          <p className="text-sm text-gray-500">Isi nilai satu kategori untuk semua siswa sekaligus</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <select value={groupId} onChange={e => setGroupId(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
          <option value="">Pilih Kelas</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.name} ({g.grade}) — {g._count?.members || 0} murid</option>
          ))}
        </select>

        <select value={kategoriId} onChange={e => setKategoriId(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
          <option value="">Pilih Kategori</option>
          {kategoris.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </select>
      </div>

      {groupId && kategoriId && siswas.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">{siswas.length} siswa</span>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all">
              {saving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                : saved ? <Check size={14} className="text-white" /> : <Save size={14} />}
              {saved ? "Tersimpan!" : "Simpan Semua"}
            </button>
          </div>
          <div className="overflow-y-auto max-h-[60vh]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Nama</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 w-32">Nilai (0-100)</th>
                </tr>
              </thead>
              <tbody>
                {siswas.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-emerald-50/30">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {s.fullName.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800">{s.fullName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <input type="number" value={scores[s.id] || ""} onChange={e => setScores(prev => ({ ...prev, [s.id]: e.target.value }))}
                        min={0} max={100} placeholder="—"
                        className="w-20 text-center px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {groupId && kategoriId && siswas.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-400 text-sm">Belum ada siswa di kelas ini</p>
        </div>
      )}
    </div>
  );
}
