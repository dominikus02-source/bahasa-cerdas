"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Award, Download, Eye, X, Calendar, Filter } from "lucide-react";
import { CertificatePreview } from "@/components/kompetensi/CertificatePreview";

export default function MuridDokumenLatihanPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [filter, setFilter] = useState<"semua" | "UKBI" | "TKA">("semua");

  useEffect(() => {
    fetch("/api/user/sertifikat")
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then(d => setCertificates(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = certificates.filter(c => {
    if (filter === "semua") return true;
    if (filter === "UKBI") return c.paket?.type?.includes("UKBI");
    if (filter === "TKA") return c.paket?.type?.includes("TKA");
    return true;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  const getPredikatColor = (predikat: string) => {
    const colors: Record<string, string> = {
      "Istimewa": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
      "Sangat Unggul": "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
      "Unggul": "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
      "Madya": "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
      "Semenjana": "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
      "Marginal": "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
      "Terbatas": "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
      "A": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
      "B": "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
      "C": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
      "D": "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
    };
    return colors[predikat] || "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300";
  };

  const getTypeLabel = (type: string) => {
    if (type?.includes("UKBI")) return "UKBI";
    if (type?.includes("TKA")) return "TKA";
    return type || "UKBI - TKA";
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dokumen Hasil Latihan</h1>
        <p className="text-sm text-muted-foreground mt-1">Lihat hasil simulasi UKBI/TKA dan dokumen yang diperoleh.</p>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-3 mb-6">
        <p className="text-xs text-amber-700 dark:text-amber-300 text-center font-medium">
          Dokumen ini adalah hasil latihan/simulasi di BahasaCerdas dan bukan sertifikat resmi UKBI/TKA dari lembaga pemerintah.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-card dark:bg-slate-900 rounded-xl border border-border p-3 mb-6 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {(["semua", "UKBI", "TKA"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-surface-muted text-muted-foreground hover:bg-surface"
              }`}
            >
              {f === "semua" ? "Semua" : f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-500/20 dark:to-purple-500/20 flex items-center justify-center">
            <Award size={40} className="text-violet-300 dark:text-violet-400" />
          </div>
          <p className="text-muted-foreground font-medium">Belum ada dokumen hasil latihan</p>
          <p className="text-sm text-muted-foreground mt-1">Selesaikan latihan UKBI/TKA untuk mendapatkan dokumen hasil</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <Link href="/murid/simulasi/ukbi" className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors">
              Mulai UKBI
            </Link>
            <Link href="/murid/simulasi/tka" className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors">
              Mulai TKA
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c: any) => (
            <div 
              key={c.id} 
              className="bg-card dark:bg-slate-900 rounded-2xl border border-border p-5 hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-500/60 transition-all cursor-pointer group"
              onClick={() => setSelectedCert(c)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <Award size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Dokumen Hasil</p>
                  <h3 className="font-bold text-foreground truncate">{c.paket?.title || "UKBI - TKA"}</h3>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${getPredikatColor(c.predikat)}`}>
                  {c.predikat}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-surface-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Skor</p>
                  <p className="font-bold text-foreground">{c.score}</p>
                </div>
                <div className="text-center p-2 bg-surface-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">%</p>
                  <p className="font-bold text-foreground">{c.percentage?.toFixed(1)}%</p>
                </div>
                <div className="text-center p-2 bg-surface-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Tipe</p>
                  <p className="font-bold text-foreground">{getTypeLabel(c.paket?.type)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar size={12} />
                  {formatDate(c.issuedAt)}
                </div>
                <div className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-medium group-hover:text-violet-700 dark:group-hover:text-violet-300">
                  <Eye size={14} />
                  Lihat
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Dokumen Hasil Latihan</h2>
              <button 
                onClick={() => setSelectedCert(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div className="p-4">
              <CertificatePreview certificate={selectedCert} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
