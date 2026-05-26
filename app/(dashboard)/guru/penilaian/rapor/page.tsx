"use client";

import { useEffect, useState } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

function getPredikat(skor: number | undefined): string {
  if (skor === undefined) return "—";
  if (skor >= 85) return "A (Istimewa)";
  if (skor >= 70) return "B (Baik)";
  if (skor >= 60) return "C (Cukup)";
  if (skor >= 40) return "D (Kurang)";
  return "E (Sangat Kurang)";
}

function getColor(skor: number | undefined): string {
  if (skor === undefined) return "text-gray-300";
  if (skor >= 85) return "text-emerald-600";
  if (skor >= 70) return "text-green-600";
  if (skor >= 60) return "text-amber-600";
  return "text-red-600";
}

export default function RaporPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [groupId, setGroupId] = useState("");
  const [siswaId, setSiswaId] = useState("");
  const [siswas, setSiswas] = useState<any[]>([]);
  const [kategoris, setKategoris] = useState<any[]>([]);
  const [nilais, setNilais] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/group").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.groups) setGroups(d.groups);
    });
  }, []);

  useEffect(() => {
    if (!groupId) { setSiswas([]); setKategoris([]); return; }
    Promise.all([
      fetch(`/api/guru/nilai-kategori?groupId=${groupId}`).then(r => r.json()),
      fetch(`/api/group`).then(r => r.json()),
    ]).then(([kData, gData]) => {
      setKategoris(kData.kategori || []);
      const g = gData.groups?.find((gr: any) => gr.id === groupId);
      if (g?.members) setSiswas(g.members.map((m: any) => m.user));
    });
  }, [groupId]);

  useEffect(() => {
    if (!siswaId || !groupId) { setNilais([]); return; }
    setLoading(true);
    fetch(`/api/guru/nilai?groupId=${groupId}&userId=${siswaId}`)
      .then(r => r.json())
      .then(d => setNilais(d.nilais || []))
      .finally(() => setLoading(false));
  }, [siswaId, groupId]);

  const siswa = siswas.find(s => s.id === siswaId);

  const getAvg = (katId: string): number | undefined => {
    const entries = nilais.filter(n => n.kategoriId === katId);
    if (entries.length === 0) return undefined;
    return Math.round(entries.reduce((sum, n) => sum + n.skor, 0) / entries.length);
  };

  const overall = (): number | undefined => {
    const scores = kategoris.map(k => getAvg(k.id)).filter((s): s is number => s !== undefined);
    if (scores.length === 0) return undefined;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const avg = overall();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/guru/penilaian" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={18} className="text-gray-500" />
          </Link>
          <div>
            <h1 className="font-bold text-lg text-gray-900">Rapor Siswa</h1>
            <p className="text-sm text-gray-500">Cetak laporan nilai per siswa</p>
          </div>
        </div>
        <button onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700">
          <Printer size={14} /> Cetak
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 print:hidden">
        <select value={groupId} onChange={e => { setGroupId(e.target.value); setSiswaId(""); }}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
          <option value="">Pilih Kelas</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.grade})</option>)}
        </select>

        <select value={siswaId} onChange={e => setSiswaId(e.target.value)}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
          <option value="">Pilih Siswa</option>
          {siswas.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
        </select>
      </div>

      {siswa && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 print:p-0 print:border-0 shadow-sm print:shadow-none">
          {/* Kop */}
          <div className="text-center mb-6 pb-4 border-b-2 border-gray-200 print:border-gray-800">
            <h2 className="text-lg font-bold text-gray-900">LAPORAN NILAI SISWA</h2>
            <p className="text-sm text-gray-500">BahasaCerdas — {groups.find(g => g.id === groupId)?.name}</p>
          </div>

          {/* Identitas */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-6 text-sm">
            <p><span className="text-gray-500">Nama</span><br /><span className="font-semibold text-gray-900">{siswa.fullName}</span></p>
            <p><span className="text-gray-500">Kelas</span><br /><span className="font-semibold text-gray-900">{groups.find(g => g.id === groupId)?.grade}</span></p>
            {siswa.profile?.nisn && <p><span className="text-gray-500">NISN</span><br /><span className="font-semibold text-gray-900">{siswa.profile.nisn}</span></p>}
            {siswa.profile?.school && <p><span className="text-gray-500">Sekolah</span><br /><span className="font-semibold text-gray-900">{siswa.profile.school}</span></p>}
          </div>

          {/* Nilai per kategori */}
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 font-semibold text-gray-700">Kategori</th>
                <th className="text-center py-2 font-semibold text-gray-700">Nilai</th>
                <th className="text-center py-2 font-semibold text-gray-700">Predikat</th>
                <th className="text-center py-2 font-semibold text-gray-700">Jumlah Entry</th>
              </tr>
            </thead>
            <tbody>
              {kategoris.map(k => {
                const skor = getAvg(k.id);
                const entries = nilais.filter(n => n.kategoriId === k.id);
                return (
                  <tr key={k.id} className="border-b border-gray-100">
                    <td className="py-2.5 font-medium text-gray-800">{k.nama}</td>
                    <td className={`text-center font-bold ${getColor(skor)}`}>{skor ?? "—"}</td>
                    <td className="text-center text-gray-600">{getPredikat(skor)}</td>
                    <td className="text-center text-gray-500">{entries.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Rata-rata */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 flex items-center justify-between">
            <span className="font-semibold text-gray-700">Rata-rata Nilai</span>
            <span className={`text-xl font-bold ${getColor(avg)}`}>
              {avg !== undefined ? `${avg} — ${getPredikat(avg)}` : "—"}
            </span>
          </div>

          {/* Detail nilai */}
          {nilais.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 text-sm mb-2">Riwayat Nilai</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {nilais.map(n => (
                  <div key={n.id} className="flex items-center justify-between text-xs py-1.5 px-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">
                      <span className="font-semibold text-gray-800">{n.kategori?.nama}</span>
                      {n.keterangan && <span className="text-gray-400 ml-1">— {n.keterangan}</span>}
                    </span>
                    <span className={`font-bold ${getColor(n.skor)}`}>{n.skor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TTD */}
          <div className="mt-8 text-right text-sm print:mt-12">
            <p className="text-gray-500">{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p className="mt-8 font-semibold text-gray-800">Guru Mata Pelajaran</p>
            <p className="mt-12 text-gray-600 underline decoration-dotted">( ______________________________ )</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-7 h-7 border-[3px] border-emerald-500 border-t-transparent rounded-full" />
        </div>
      )}

      <style jsx global>{`
        @media print {
          body { background: white !important; font-size: 12pt; }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:border-0 { border: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-gray-800 { border-color: #1f2937 !important; }
          .print\\:mt-12 { margin-top: 3rem !important; }
        }
      `}</style>
    </div>
  );
}
