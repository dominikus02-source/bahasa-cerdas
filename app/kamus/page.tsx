"use client";

import { useState } from "react";
import { Search, BookOpen, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function KamusPage() {
  const [query, setQuery] = useState("");

  const searchKBBI = () => {
    if (!query.trim()) return;
    window.open(`https://kbbi.web.id/${encodeURIComponent(query.trim())}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
            <BookOpen size={16} /> Kamus Besar Bahasa Indonesia
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900">KBBI Online</h1>
          <p className="mt-3 text-slate-600">Cari arti kata dalam Bahasa Indonesia</p>
        </div>

        <div className="relative max-w-xl mx-auto mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchKBBI()}
            placeholder="Cari kata..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 text-lg focus:border-emerald-500 focus:outline-none shadow-lg"
            autoFocus
          />
        </div>

        <div className="text-center">
          <button onClick={searchKBBI} disabled={!query.trim()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40 shadow-lg">
            <ExternalLink size={18} /> Cari di KBBI Web.id
          </button>
          <p className="text-xs text-slate-400 mt-3">Akan membuka halaman eksternal kbbi.web.id</p>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-400 mb-3">Atau tanya AI BC:</p>
          <Link href="/ai-bc" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:underline">
            Tanya AI BC <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
