"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Brain, Clock } from "lucide-react";

export default function MuridTKAGuruPage() {
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
        <p className="text-sm text-gray-500 mt-1">Tes Kompetensi Akademik Guru</p>
      </div>

      <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-6 mb-8 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <Brain size={36} className="text-violet-200 shrink-0" />
          <div>
            <h2 className="text-lg font-bold mb-1">Kompetensi Akademik</h2>
            <p className="text-violet-200 text-sm">Pedagogik, Profesional, Sosial, Kepribadian</p>
          </div>
        </div>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Memuat...</div> : (
        <div className="grid gap-4">
          {pakets.map((p) => (
            <Link key={p.id} href={`/kompetisi/${p.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-violet-200 transition-all">
              <h3 className="font-bold text-gray-900">{p.title}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                <Clock size={12} /> {p.duration} menit
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
