"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Brain, Clock, BookOpen, ChevronRight, Award } from "lucide-react";

export default function TKAGuruPage() {
  const [pakets, setPakets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kompetensi?type=TKA&limit=20")
      .then(r => r.json())
      .then(d => setPakets(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">TKA Guru</h1>
        <p className="text-sm text-gray-600 mt-1">Tes Kompetensi Akademik untuk persiapan sertifikasi guru</p>
      </div>

      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 mb-8 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <Brain size={40} className="text-emerald-200 shrink-0" />
          <div>
            <h2 className="text-xl font-bold mb-2">Kompetensi Akademik Guru</h2>
            <p className="text-emerald-200 text-sm">Pedagogik, Profesional, Sosial, Kepribadian — standar sertifikasi</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {["Pedagogik", "Profesional", "Sosial", "Kepribadian"].map((k) => (
            <div key={k} className="text-center bg-white/10 rounded-xl p-2">
              <p className="text-xs font-medium text-emerald-200">{k}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat paket TKA...</div>
      ) : pakets.length === 0 ? (
        <div className="text-center py-16">
          <Brain size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">Belum ada paket TKA tersedia</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pakets.map((p) => (
            <Link key={p.id} href={`/kompetisi/${p.id}`}
              className="block bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-emerald-200 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.mode === "LATIHAN" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>
                  {p.mode === "LATIHAN" ? "Latihan" : "Simulasi"}
                </span>
                <span className="text-xs text-gray-400">{p.duration} menit</span>
              </div>
              <h3 className="font-bold text-gray-900">{p.title}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                <Clock size={12} /> {p.duration} menit
                {p.passingScore && <><Award size={12} /> Lulus: {p.passingScore}%</>}
              </div>
              <p className="text-xs font-bold text-emerald-600 mt-3">Mulai →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
