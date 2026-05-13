"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Briefcase, MapPin, Building, Clock, Search, ExternalLink, ChevronRight } from "lucide-react";
import PublicNavbar from "@/components/public/PublicNavbar";

export default function LokerPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchLoker(); }, []);

  async function fetchLoker() {
    try {
      const res = await fetch("/api/loker");
      const d = await res.json();
      setData(d.data || []);
    } catch {}
    setLoading(false);
  }

  const filtered = data.filter((l) => !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.sekolah.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <PublicNavbar />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
            <Briefcase size={14} /> Lowongan Guru Bahasa Indonesia
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900">Lowongan Pekerjaan</h1>
          <p className="mt-2 text-slate-500">Temukan lowongan guru Bahasa Indonesia dari berbagai sekolah</p>
        </div>

        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari lowongan atau sekolah..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:outline-none" />
        </div>

        {loading ? <div className="text-center py-12 text-slate-400">Memuat...</div> : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500">Belum ada lowongan tersedia</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((l: any) => (
              <div key={l.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="font-bold text-slate-900 text-lg">{l.title}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Building size={14} /> {l.sekolah}</span>
                      <span className="flex items-center gap-1"><MapPin size={14} /> {l.lokasi}</span>
                      <span className="flex items-center gap-1"><Clock size={14} /> {new Date(l.createdAt).toLocaleDateString("id")}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-3 leading-relaxed">{l.description}</p>
                    {l.requirements && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-700 mb-1">Syarat:</p>
                        <p className="text-sm text-slate-500 whitespace-pre-wrap">{l.requirements}</p>
                      </div>
                    )}
                    {l.salary && <p className="text-sm font-semibold text-emerald-600 mt-3">{l.salary}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100">
                  {l.applicationUrl ? (
                    <a href={l.applicationUrl} target="_blank" className="inline-flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                      Lamar Sekarang <ExternalLink size={14} />
                    </a>
                  ) : l.contact ? (
                    <span className="text-sm text-slate-500">Kontak: {l.contact}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
