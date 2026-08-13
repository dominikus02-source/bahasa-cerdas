"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Search, Filter, MapPin, Calendar, ChevronRight } from "lucide-react";

interface Community {
  id: string;
  name: string;
  type: string;
  description: string;
  memberCount: number;
  imageUrl?: string;
}

export default function MuridKomunitasDaftarPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    fetch("/api/community")
      .then(r => r.ok ? r.json() : null)
      .then(d => setCommunities(d?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = communities.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || c.type === filterType;
    return matchSearch && matchType;
  });

  const typeLabels: Record<string, string> = {
    MGMP: "MGMP",
    KKG: "KKG",
    PUBLIKASI: "Publikasi",
    STUDY_GROUP: "Study Group",
    LAINNYA: "Lainnya",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Daftar Komunitas</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Bergabung dengan komunitas guru dan siswa Bahasa Indonesia</p>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari komunitas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-12 px-4 rounded-xl border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">Semua Tipe</option>
          <option value="MGMP">MGMP</option>
          <option value="KKG">KKG</option>
          <option value="PUBLIKASI">Publikasi</option>
          <option value="STUDY_GROUP">Study Group</option>
          <option value="LAINNYA">Lainnya</option>
        </select>
      </div>

      {/* Community List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-slate-800/80 flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Belum ada komunitas</p>
          <p className="text-sm text-gray-400 mt-1">Komunitas akan muncul setelah ada yang membuatnya</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-slate-100">{c.name}</h3>
                  <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">{typeLabels[c.type] || c.type}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 line-clamp-2">{c.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Users size={14} />
                  {c.memberCount} anggota
                </div>
                <Link href={`/komunitas/${c.id}`} className="text-violet-600 dark:text-violet-400 text-sm font-medium hover:underline">
                  Lihat →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}