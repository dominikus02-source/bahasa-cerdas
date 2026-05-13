"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Clock, Eye, Search, Film } from "lucide-react";
import PageNavbar from "@/components/public/PageNavbar";

export default function VideoBelajarPage() {
  const CATEGORIES = [
    { value: "", label: "Semua Kategori", icon: "🎬" },
    { value: "PEMBELAJARAN", label: "Pembelajaran", icon: "📚" },
    { value: "GRAMMATIKA", label: "Grammatika", icon: "📝" },
    { value: "SASTRA", label: "Sastra", icon: "📖" },
    { value: "WRITING", label: "Menulis", icon: "✏️" },
    { value: "SPEAKING", label: "Berbicara", icon: "🎤" },
    { value: "READING", label: "Membaca", icon: "👁️" },
    { value: "UKBI_PREP", label: "UKBI Prep", icon: "🎯" },
  ];

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchVideos(); }, [category]);

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

  const filtered = videos.filter((v) =>
    !search || v.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <PageNavbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10 mb-4">
            <Film size={14} className="text-blue-400" />
            <span className="text-xs text-white/70 font-medium">Video Pembelajaran Bahasa Indonesia</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Belajar dari Video</h1>
          <p className="text-white/50">Koleksi video untuk guru dan murid Bahasa Indonesia</p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:border-blue-500 focus:outline-none"
              placeholder="Cari video..." />
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                category === c.value
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}>
              <span>{c.icon}</span> {c.label}
            </button>
          ))}
        </div>

        {/* Video Grid */}
        {loading ? (
          <div className="text-center py-20 text-white/30">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Film size={48} className="mx-auto text-white/10 mb-3" />
            <p className="text-white/30">Belum ada video</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((video: any) => (
              <Link key={video.id} href={video.isPremium ? "/login" : `/video-belajar/${video.id}`} className="group">
                <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all h-full">
                  <div className="aspect-video bg-black/30 relative overflow-hidden">
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play size={32} className="text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110">
                        <Play size={24} className="text-white ml-0.5" />
                      </div>
                    </div>
                    {video.duration && (
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white/80 text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                        <Clock size={10} /> {video.duration}
                      </span>
                    )}
                    {video.isPremium && (
                      <span className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">Premium</span>
                    )}
                  </div>
                  <div className="p-3.5">
                    <h3 className="font-semibold text-sm text-white line-clamp-2 group-hover:text-blue-400 transition-colors">{video.title}</h3>
                    <p className="text-xs text-white/40 mt-1 line-clamp-1">{video.description}</p>
                    <div className="flex items-center gap-2 mt-2.5 text-[11px] text-white/30">
                      <span className="flex items-center gap-1"><Eye size={11} /> {video.views}</span>
                      {video.grade && <span>• Kelas {video.grade}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
