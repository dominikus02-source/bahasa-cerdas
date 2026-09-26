"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Award, Eye, X, Calendar, GraduationCap, Search, Download, Filter } from "lucide-react";
import { GuruCertificatePreview } from "@/components/kompetensi/GuruCertificatePreview";

interface GroupOpt { id: string; name: string }
interface RepoItem {
  id: string;
  nama: string;
  jenis: string;
  tanggal: string | null;
  kelas: string;
  paketTitle: string;
  jumlahMurid: number;
  nilaiRataRata: number;
  aiSummary: string | null;
  isCertificate: boolean;
  score: number;
  percentage: number;
  predikat: string | null;
}
interface LegacyDoc {
  id: string;
  user?: { fullName?: string };
  paket?: { title?: string; type?: string };
  predikat?: string;
  score?: number;
  percentage?: number;
  issuedAt?: string;
  isCertificate?: boolean;
}

/**
 * DokumenLatihanView — repository dokumen hasil latihan/simulasi UKBI & TKA murid.
 *
 * Dipakai oleh 2 konteks:
 * - Route legacy /guru/dokumen-latihan (standalone, header title tampil).
 * - Hub /guru/evaluasi-simulasi?tab=dokumen (hub = true, header disembunyikan,
 *   cross-link memakai ?tab= agar tetap di dalam hub).
 */
export function DokumenLatihanView({
  hub = false,
  title = "Dokumen Latihan Murid",
}: {
  hub?: boolean;
  title?: string;
}) {
  const [groups, setGroups] = useState<GroupOpt[]>([]);
  const [items, setItems] = useState<RepoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"semua" | "UKBI" | "TKA">("semua");
  const [kelasFilter, setKelasFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCert, setSelectedCert] = useState<LegacyDoc | null>(null);

  const tinjauHref = hub ? "?tab=tinjau" : "/guru/tinjau-simulasi";
  const hasilHref = hub ? "?tab=hasil" : "/guru/hasil-simulasi";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "semua") params.set("jenis", filter);
      if (kelasFilter) params.set("groupId", kelasFilter);
      if (search) params.set("search", search);
      params.set("limit", "100");
      const res = await fetch(`/api/guru/dokumen-siswa?${params}`);
      const d = await res.json();
      if (Array.isArray(d.items)) {
        setItems(d.items);
        setTotal(d.total || 0);
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch {} finally { setLoading(false); }
  }, [filter, kelasFilter, search]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    fetch("/api/guru/simulasi/rekap?summary=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.groups) setGroups(d.groups); })
      .catch(() => {});
  }, []);

  const exportDocs = (format: "csv" | "docx") => {
    const params = new URLSearchParams();
    if (filter !== "semua") params.set("jenis", filter);
    if (kelasFilter) params.set("groupId", kelasFilter);
    params.set("format", format);
    window.open(`/api/guru/dokumen-siswa?${params}`, "_blank");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  const getTypeColor = (jenis: string) => {
    const u = (jenis || "").toUpperCase();
    if (u.includes("UKBI")) return "bg-emerald-100 text-emerald-700";
    if (u.includes("TKA")) return "bg-violet-100 text-violet-700";
    return "bg-slate-100 text-slate-600";
  };
  const getTypeLabel = (jenis: string) => {
    const u = (jenis || "").toUpperCase();
    if (u.includes("UKBI")) return "UKBI";
    if (u.includes("TKA")) return "TKA";
    return jenis || "UKBI/TKA";
  };

  return (
    <div className={hub ? "" : "p-4 sm:p-6"}>
      {/* Header title (khusus standalone) */}
      {!hub && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">Dokumen hasil latihan/simulasi UKBI & TKA murid — dikelompokkan per paket & kelas.</p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
        <p className="text-xs text-amber-700 text-center font-medium">
          Dokumen ini adalah hasil latihan/simulasi di BahasaCerdas dan bukan sertifikat resmi UKBI/TKA dari lembaga pemerintah.
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5 mr-auto">
            {(["semua", "UKBI", "TKA"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f ? "bg-blue-600 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {f === "semua" ? "Semua" : f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400"><Filter size={13} /> Kelas</div>
          <select value={kelasFilter} onChange={(e) => setKelasFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white">
            <option value="">Semua Kelas</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari murid / paket..." className="text-sm border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 bg-white min-w-48" />
          </div>
          <div className="flex gap-1.5 ml-auto">
            <button onClick={() => exportDocs("csv")} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium">CSV</button>
            <button onClick={() => exportDocs("docx")} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium">DOC</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center dark:bg-blue-950/30 dark:border-blue-900/60">
            <Award size={40} className="text-blue-300" />
          </div>
          <p className="text-gray-500 font-medium">Belum ada dokumen latihan murid</p>
          <p className="text-sm text-gray-400 mt-1">Hasil simulasi murid akan muncul di sini setelah mereka menyelesaikan tes.</p>
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-400 mb-3">{total} dokumen tersimpan</div>
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 font-semibold">Dokumen / Paket</th>
                    <th className="px-4 py-3 font-semibold">Jenis</th>
                    <th className="px-4 py-3 font-semibold">Kelas</th>
                    <th className="px-4 py-3 font-semibold">Banyak Murid</th>
                    <th className="px-4 py-3 font-semibold">Rata-rata Nilai</th>
                    <th className="px-4 py-3 font-semibold">Terakhir dikerjakan</th>
                    <th className="px-4 py-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-gray-50 hover:bg-blue-50/45 dark:hover:bg-blue-950/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="bc-guru-icon w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
                            <GraduationCap size={16} className="text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate">{item.paketTitle}</p>
                            <p className="text-xs text-gray-400">{item.nama}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${getTypeColor(item.jenis)}`}>{getTypeLabel(item.jenis)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{item.kelas}</td>
                      <td className="px-4 py-3.5 text-gray-600">{item.jumlahMurid} mrd</td>
                      <td className="px-4 py-3.5">
                        <span className={`font-bold ${item.nilaiRataRata >= 75 ? "text-emerald-600" : item.nilaiRataRata >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                          {item.nilaiRataRata}%
                        </span>
                        {item.predikat && <span className="block text-[10px] text-gray-400">{item.predikat}</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-400 flex items-center gap-1"><Calendar size={12} />{formatDate(item.tanggal)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <button onClick={() => setSelectedCert({ id: item.id, paket: { title: item.paketTitle ?? "", type: item.jenis ?? "UKBI" }, user: { fullName: item.nama }, score: item.score, percentage: item.percentage, predikat: item.predikat ?? undefined, issuedAt: item.tanggal ?? undefined })} className="inline-flex items-center gap-1 text-xs text-blue-700 font-semibold hover:text-blue-800 dark:text-blue-300">
                          <Eye size={14} /> Lihat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Link ke AI Review Center & Pusat Evaluasi (tab lain di dalam hub) */}
      <div className="grid sm:grid-cols-2 gap-3 mt-6">
        <Link href={tinjauHref} className="bc-guru-card rounded-2xl p-4 flex items-center gap-3 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center"><span className="text-lg">🧠</span></div>
          <div>
            <p className="font-bold text-gray-900 text-sm">AI Review Center</p>
            <p className="text-xs text-gray-500">Tinjau hasil uraian Menulis/Berbicara dari penilaian AI.</p>
          </div>
        </Link>
        <Link href={hasilHref} className="bc-guru-card rounded-2xl p-4 flex items-center gap-3 transition-colors">
          <div className="bc-guru-icon w-10 h-10 rounded-xl flex items-center justify-center"><span className="text-lg">📊</span></div>
          <div>
            <p className="font-bold text-gray-900 text-sm">Pusat Evaluasi</p>
            <p className="text-xs text-gray-500">Rekap, insight AI, dan ringkasan kelas.</p>
          </div>
        </Link>
      </div>

      {/* Modal preview legacy certificate */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-gray-900">Dokumen Hasil Latihan</h2>
              <button onClick={() => setSelectedCert(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <GuruCertificatePreview certificate={selectedCert as any} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
