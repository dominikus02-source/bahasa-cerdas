"use client";

import { useState, useEffect } from "react";
import { Search, BookOpen, Info } from "lucide-react";
import PublicNavbar from "@/components/public/PublicNavbar";

export default function KamusPage() {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setEntries([]); return; }
    setLoading(true);
    fetch(`/api/kamus?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(d => setEntries(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <PublicNavbar />
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-semibold mb-4">
            <BookOpen size={16} /> Kamus Bahasa Indonesia
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900">KBBI Online</h1>
          <p className="mt-3 text-slate-600">Cari arti kata dalam Bahasa Indonesia</p>
        </div>

        <div className="relative max-w-xl mx-auto mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kata..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 text-lg focus:border-red-500 focus:outline-none shadow-lg"
            autoFocus
          />
        </div>

        {loading && <div className="text-center text-slate-400 py-8">Mencari...</div>}

        {!loading && query.length >= 2 && entries.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Info size={40} className="mx-auto mb-3" />
            <p>Kata "{query}" tidak ditemukan</p>
          </div>
        )}

        {entries.length > 0 && (
          <div className="space-y-4">
            {entries.map((e: any) => (
              <div key={e.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-slate-900">{e.kata}</h3>
                  {e.jenisKata && (
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">{e.jenisKata}</span>
                  )}
                </div>
                <p className="text-slate-700">{e.definisi}</p>
                {e.contoh && <p className="text-sm text-slate-500 mt-2 italic">Contoh: {e.contoh}</p>}
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  {e.sinonim && <span className="text-emerald-600"><strong>Sinonim:</strong> {e.sinonim}</span>}
                  {e.antonim && <span className="text-red-600"><strong>Antonim:</strong> {e.antonim}</span>}
                </div>
                {e.serapanDari && <p className="text-xs text-slate-400 mt-2">Serapan dari: {e.serapanDari}</p>}
              </div>
            ))}
          </div>
        )}

        {entries.length === 0 && query.length < 2 && (
          <div className="text-center py-12 text-slate-400">
            <BookOpen size={48} className="mx-auto mb-3 text-slate-200" />
            <p>Ketik minimal 2 huruf untuk mencari</p>
          </div>
        )}
      </div>
    </div>
  );
}
