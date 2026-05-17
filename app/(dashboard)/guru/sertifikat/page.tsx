"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Award, Download, Eye, X, Calendar, GraduationCap } from "lucide-react";
import { GuruCertificatePreview } from "@/components/kompetensi/GuruCertificatePreview";

export default function GuruSertifikatPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<any>(null);

  useEffect(() => {
    fetch("/api/user/sertifikat")
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then(d => setCertificates(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  const getPredikatColor = (predikat: string) => {
    const colors: Record<string, string> = {
      "Istimewa": "bg-amber-100 text-amber-700",
      "Sangat Unggul": "bg-orange-100 text-orange-700",
      "Unggul": "bg-emerald-100 text-emerald-700",
      "Madya": "bg-cyan-100 text-cyan-700",
      "Semenjana": "bg-slate-100 text-slate-700",
      "A": "bg-emerald-100 text-emerald-700",
      "B": "bg-blue-100 text-blue-700",
      "C": "bg-amber-100 text-amber-700",
      "D": "bg-slate-100 text-slate-700",
    };
    return colors[predikat] || "bg-gray-100 text-gray-700";
  };

  const getTypeLabel = (type: string) => {
    if (type?.includes("UKBI_GURU")) return "UKBI Guru";
    if (type?.includes("TKA_GURU")) return "TKA Guru";
    if (type?.includes("UKBI")) return "UKBI";
    if (type?.includes("TKA")) return "TKA";
    return type || "UKBI - TKA";
  };

  // Filter only Guru certificates (hide student packages)
  const guruCertificates = certificates.filter(c => 
    c.paket?.type?.includes("GURU") || !["UKBI_SMP", "UKBI_SMA", "TKA_SMP", "TKA_SMA"].includes(c.paket?.type)
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Sertifikat Saya</h1>
        <p className="text-sm text-gray-500 mt-1">Sertifikat kompetensi profesional Guru</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat...</div>
      ) : guruCertificates.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
            <Award size={40} className="text-emerald-300" />
          </div>
          <p className="text-gray-500 font-medium">Belum ada sertifikat</p>
          <p className="text-sm text-gray-400 mt-1">Selesaikan latihan UKBI/TKA Guru untuk mendapatkan sertifikat</p>
          <Link href="/guru/ukbi" className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors">
            Mulai Latihan
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guruCertificates.map((c: any) => (
            <div 
              key={c.id} 
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer group"
              onClick={() => setSelectedCert(c)}
            >
              {/* Certificate Preview Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <GraduationCap size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium">Sertifikat</p>
                  <h3 className="font-bold text-gray-900 truncate">{c.paket?.title || "UKBI - TKA Guru"}</h3>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${getPredikatColor(c.predikat)}`}>
                  {c.predikat}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs text-gray-400">Skor</p>
                  <p className="font-bold text-gray-800">{c.score}</p>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs text-gray-400">%</p>
                  <p className="font-bold text-gray-800">{c.percentage?.toFixed(1)}%</p>
                </div>
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs text-gray-400">Tipe</p>
                  <p className="font-bold text-gray-800">{getTypeLabel(c.paket?.type)}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar size={12} />
                  {formatDate(c.issuedAt)}
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium group-hover:text-emerald-700">
                  <Eye size={14} />
                  Lihat
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certificate Modal */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-gray-900">Sertifikat</h2>
              <button 
                onClick={() => setSelectedCert(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <GuruCertificatePreview certificate={selectedCert} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}