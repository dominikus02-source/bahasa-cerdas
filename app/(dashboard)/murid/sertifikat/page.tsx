"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Award, Download } from "lucide-react";

export default function MuridSertifikatPage() {
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
        <p className="text-sm text-gray-500 mt-1">Sertifikat UKBI & TKA</p>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Memuat...</div> : certificates.length === 0 ? (
        <div className="text-center py-16">
          <Award size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">Belum ada sertifikat</p>
          <Link href="/murid/ukbi" className="mt-3 inline-block text-sm text-violet-600 font-semibold hover:underline">Ikuti UKBI →</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certificates.map((c: any) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-bold text-gray-900">{c.paket?.title || "Sertifikat"}</h3>
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium mt-1">
                {c.predikat}
              </span>
              {c.pdfUrl && (
                <a href={c.pdfUrl} target="_blank" className="mt-3 inline-flex items-center gap-1 text-sm text-violet-600 font-semibold hover:underline">
                  <Download size={14} /> Unduh PDF
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
