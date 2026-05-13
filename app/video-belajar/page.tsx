"use client";

import { useState, useEffect } from "react";
import { Play, Search, Clock, Film } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { value: "", label: "Semua" },
  { value: "PEMBELAJARAN", label: "Pembelajaran" },
  { value: "GRAMMATIKA", label: "Grammatika" },
  { value: "SASTRA", label: "Sastra" },
  { value: "WRITING", label: "Menulis" },
  { value: "SPEAKING", label: "Berbicara" },
  { value: "READING", label: "Membaca" },
  { value: "UKBI_PREP", label: "UKBI Prep" },
];

export default function VideoBelajarPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchVideos();
  }, [category]);

  async function fetchVideos() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      const res = await fetch(`/api/video/public?${params}`);
      const data = await res.json();
      setVideos(data.videos || []);
    } catch {}
    setLoading(false);
  }

  const filtered = videos.filter(
    (v) => !search || v.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
            <Film size={16} /> Video Pembelajaran
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900">Belajar dari Video</h1>
          <p className="mt-3 text-slate-600">Video pembelajaran Bahasa Indonesia untuk semua jenjang</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari video..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          >
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Film size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500">Belum ada video</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((video: any) => (
              <div key={video.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow group">
                <Link href={video.isPremium ? "/login" : `/video-belajar/${video.id}`} className="block">
                  <div className="aspect-video bg-slate-100 relative">
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play size={40} className="text-slate-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        <Play size={24} className="text-red-600 ml-1" />
                      </div>
                    </div>
                    {video.duration && (
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                        <Clock size={10} /> {video.duration}
                      </span>
                    )}
                    {video.isPremium && (
                      <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">PREMIUM</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2 text-slate-900">{video.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{video.description}</p>
                    <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-400">
                      <span className="px-2 py-0.5 bg-slate-100 rounded">{CATEGORIES.find(c => c.value === video.category)?.label || video.category}</span>
                      {video.grade && <span>• Kelas {video.grade}</span>}
                      <span className="ml-auto">{video.views} ditonton</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
