"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Award, Download, FileText, ChevronRight } from "lucide-react";

export default function SertifikatPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/sertifikat")
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then(d => setCertificates(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Sertifikat Saya</h1>
        <p className="text-sm text-gray-600 mt-1">Sertifikat yang diperoleh dari UKBI & TKA</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat...</div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-16">
          <Award size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">Belum ada sertifikat</p>
          <p className="text-sm text-gray-400 mt-1">Selesaikan simulasi UKBI atau TKA untuk mendapatkan sertifikat</p>
          <Link href="/murid/ukbi" className="mt-4 inline-block text-violet-600 font-semibold hover:underline">Mulai UKBI →</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certificates.map((c: any) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <Award size={28} className="text-white" />
                </div>
                {c.pdfUrl && (
                  <a href={c.pdfUrl} target="_blank" className="text-sm text-violet-600 font-semibold hover:underline flex items-center gap-1">
                    <Download size={14} /> Unduh
                  </a>
                )}
              </div>
              <h3 className="font-bold text-gray-900">{c.paket?.title || "Sertifikat"}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Simulasi</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  c.predikat?.includes("Istimewa") || c.predikat?.includes("A") ? "bg-amber-50 text-amber-700" :
                  c.predikat?.includes("Unggul") || c.predikat?.includes("B") ? "bg-emerald-50 text-emerald-700" :
                  c.predikat?.includes("Madya") || c.predikat?.includes("C") ? "bg-blue-50 text-blue-700" :
                  "bg-slate-50 text-slate-600"
                }`}>
                  {c.predikat}
                </span>
                <span className="text-xs text-gray-400">Skor: {c.score || c.percentage}</span>
              </div>
              {c.issuedAt && (
                <p className="text-xs text-gray-400 mt-3">Diterbitkan: {new Date(c.issuedAt).toLocaleDateString("id")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
