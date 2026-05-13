"use client";

import { useState, useEffect } from "react";
import { Play, Clock, Search, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { value: "", label: "Semua" },
  { value: "PEMBELAJARAN", label: "Pembelajaran" },
  { value: "GRAMMATIKA", label: "Grammatika" },
  { value: "SASTRA", label: "Sastra" },
  { value: "WRITING", label: "Menulis" },
  { value: "SPEAKING", label: "Berbicara" },
  { value: "READING", label: "Membaca" },
  { value: "MEDIA", label: "Media" },
  { value: "UKBI_PREP", label: "UKBI Prep" },
];

const GRADE_RANGES = [
  { value: "", label: "Semua Kelas" },
  { value: "1-2", label: "Kelas 1-2 (SD)" },
  { value: "3-4", label: "Kelas 3-4 (SD)" },
  { value: "5-6", label: "Kelas 5-6 (SD)" },
  { value: "7-9", label: "Kelas 7-9 (SMP)" },
  { value: "10-12", label: "Kelas 10-12 (SMA)" },
];

export default function VideoBelajarPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [grade, setGrade] = useState("");

  useEffect(() => {
    fetchVideos();
  }, [category]);

  async function fetchVideos() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      const res = await fetch(`/api/video?${params}`);
      const data = await res.json();
      setVideos(data.videos || []);
    } catch {}
    setLoading(false);
  }

  const filtered = videos.filter((v) => {
    if (search && !v.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (grade && v.grade !== grade) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Video Belajar</h1>
        <p className="mt-1 text-sm text-gray-600">Koleksi video pembelajaran Bahasa Indonesia</p>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari video..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            {GRADE_RANGES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Play className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">Belum ada video</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((video) => (
            <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gray-100 relative">
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                {video.duration && (
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                    {video.duration}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm line-clamp-2">{video.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{video.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="text-[10px]">
                    {CATEGORIES.find(c => c.value === video.category)?.label || video.category}
                  </Badge>
                  {video.grade && (
                    <Badge variant="outline" className="text-[10px]">
                      Kelas {video.grade}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
