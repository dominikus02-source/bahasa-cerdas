"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Brain, Clock } from "lucide-react";

export default function MuridTKAUTBKPage() {
  const [pakets, setPakets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kompetensi?limit=20")
      .then(r => r.json())
      .then(d => setPakets(d.data?.filter((p: any) => p.type === "TKA_UTBK") || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">TKA UTBK</h1>
        <p className="text-sm text-gray-500 mt-1">Tes Kompetensi Akademik untuk UTBK</p>
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">Memuat...</div> : (
        <div className="grid gap-4">
          {pakets.map((p: any) => (
            <Link key={p.id} href={`/kompetisi/${p.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg">
              <h3 className="font-bold text-gray-900">{p.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{p.description}</p>
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
