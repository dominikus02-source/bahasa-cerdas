"use client";

import { useState, useEffect } from "react";
import { Search, BookOpen, Info, ChevronRight, Volume2, Bookmark } from "lucide-react";
import PublicNavbar from "@/components/public/PageNavbar";

export default function KamusPage() {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("bc-kamus-recent");
    if (saved) setRecent(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (query.length < 2) { setEntries([]); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/kamus?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(d => {
          setEntries(d.data || []);
          if (d.data?.length > 0) {
            const updated = [query, ...recent.filter(r => r !== query)].slice(0, 5);
            setRecent(updated);
            localStorage.setItem("bc-kamus-recent", JSON.stringify(updated));
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const playSound = (word: string) => {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(word);
      utter.lang = 'id-ID';
      utter.rate = 0.8;
      speechSynthesis.speak(utter);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <PublicNavbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
            <BookOpen size={14} /> Kamus Besar Bahasa Indonesia
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900">Cari Kata</h1>
          <p className="mt-2 text-slate-500">Temukan arti kata dalam Bahasa Indonesia</p>
        </div>

        {/* Search */}
        <div className="relative max-w-2xl mx-auto mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ketik kata..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 text-lg focus:border-emerald-500 focus:outline-none shadow-lg bg-white"
            autoFocus
          />
        </div>

        {/* Recent searches */}
        {query.length < 2 && recent.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Pencarian Terakhir</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <button key={r} onClick={() => setQuery(r)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* No results */}
        {!loading && query.length >= 2 && entries.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            <Info size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">Kata "{query}" tidak ditemukan</p>
            <p className="text-sm text-slate-400 mt-1">Coba kata lain atau periksa ejaan</p>
          </div>
        )}

        {/* Results */}
        {entries.length > 0 && (
          <div className="space-y-4">
            {entries.map((e: any) => (
              <div key={e.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all">
                {/* Word header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold text-slate-900">{e.kata}</h3>
                        {e.jenisKata && (
                          <span className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium italic">
                            {e.jenisKata}
                          </span>
                        )}
                        <button onClick={() => playSound(e.kata)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="Dengarkan">
                          <Volume2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Definition */}
                <div className="px-5 pb-3">
                  <p className="text-slate-700 leading-relaxed text-justify">{e.definisi}</p>
                </div>

                {/* Example sentence */}
                {e.contoh && (
                  <div className="mx-5 mb-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-medium mb-0.5">Contoh:</p>
                    <p className="text-sm text-emerald-800 italic">"{e.contoh}"</p>
                  </div>
                )}

                {/* Synonyms & Antonyms */}
                {(e.sinonim || e.antonim) && (
                  <div className="px-5 pb-5 flex flex-wrap gap-4 text-sm">
                    {e.sinonim && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">Sinonim:</span>
                        <span className="text-emerald-700 font-medium">{e.sinonim}</span>
                      </div>
                    )}
                    {e.antonim && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">Antonim:</span>
                        <span className="text-red-600 font-medium">{e.antonim}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                {e.serapanDari && (
                  <div className="px-5 pb-5">
                    <span className="text-xs text-slate-400">Serapan dari: {e.serapanDari}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick tips */}
        {entries.length === 0 && query.length < 2 && (
          <div className="text-center py-12">
            <BookOpen size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400">Ketik minimal 2 huruf untuk mencari</p>
          </div>
        )}
      </div>
    </div>
  );
}
