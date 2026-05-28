"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Play, Clock, Eye, Search, Film } from "lucide-react";

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

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} detik`;
  return s > 0 ? `${m}m ${s}d` : `${m} menit`;
}

type Video = {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  category?: string | null;
  grade?: string | null;
  views: number;
  isPremium: boolean;
  creator?: { fullName: string } | null;
};

export default function VideoClient({ initialVideos }: { initialVideos: Video[] }) {
  const [videos] = useState<Video[]>(initialVideos);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = [...videos];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((v) => v.title.toLowerCase().includes(q));
    }

    if (category) {
      result = result.filter((v) => v.category === category);
    }

    return result;
  }, [videos, search, category]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-light rounded-full border border-primary/10 mb-4">
            <Film size={14} className="text-primary" />
            <span className="text-xs text-primary font-medium">
              Video Pembelajaran Bahasa Indonesia
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            Belajar dari Video
          </h1>
          <p className="text-gray-500 text-base">
            {videos.length} video untuk guru dan murid Bahasa Indonesia
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none"
              placeholder="Cari video..."
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                category === c.value
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Film size={48} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400">Belum ada video</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((video: any) => (
              <Link
                key={video.id}
                href={`/video-belajar/${video.id}`}
                className="group"
              >
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all h-full">
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <Play size={32} className="text-gray-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110 shadow-lg">
                        <Play size={24} className="text-primary ml-0.5" />
                      </div>
                    </div>
                    {video.duration && (
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock size={10} /> {formatDuration(video.duration)}
                      </span>
                    )}
                    {video.isPremium && (
                      <span className="absolute top-2 left-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] px-2 py-0.5 rounded-md font-bold shadow-sm">
                        Premium
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {video.description}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Eye size={11} /> {video.views}
                      </span>
                      {video.grade && <span>• Kelas {video.grade}</span>}
                      {video.creator?.fullName && (
                        <span>• {video.creator.fullName}</span>
                      )}
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
