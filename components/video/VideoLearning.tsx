"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Clock, Eye, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { VideoCategory } from "@prisma/client";

const CATEGORY_LABELS: Record<string, string> = {
  PEMBELAJARAN: "Pembelajaran",
  GRAMMATIKA: "Grammatika",
  SASTRA: "Sastra",
  WRITING: "Writing",
  SPEAKING: "Speaking",
  READING: "Reading",
  MEDIA: "Media",
  UKBI_PREP: "UKBI Prep",
  LAINNYA: "Lainnya",
};

const GRADE_LABELS: Record<string, string> = {
  "1": "Kelas 1",
  "2": "Kelas 2",
  "3": "Kelas 3",
  "4": "Kelas 4",
  "5": "Kelas 5",
  "6": "Kelas 6",
  "7": "Kelas 7",
  "8": "Kelas 8",
  "9": "Kelas 9",
  "10": "Kelas 10",
  "11": "Kelas 11",
  "12": "Kelas 12",
  "UMUM": "Umum",
};

interface Video {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  category: string;
  grade: string | null;
  views: number;
  source: string;
  creator: { id: string; fullName: string; avatar: string | null } | null;
  createdAt: string;
}

export default function VideoLearning() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [category, setCategory] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "vertical">("grid");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const sidebarRef = useRef<HTMLDivElement>(null);

  const fetchVideos = useCallback(async (resetPage = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (grade) params.set("grade", grade);
      if (resetPage) params.set("page", "1");
      else params.set("page", page.toString());

      const res = await fetch(`/api/video?${params.toString()}`);
      const data = await res.json();

      if (data.videos) {
        if (resetPage) {
          setVideos(data.videos);
          setPage(1);
        } else {
          setVideos(prev => [...prev, ...data.videos]);
        }
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch videos:", error);
    } finally {
      setLoading(false);
    }
  }, [category, grade, page]);

  useEffect(() => {
    fetchVideos(true);
  }, [category, grade]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const scrollSidebar = (direction: "left" | "right") => {
    if (sidebarRef.current) {
      const scrollAmount = 200;
      sidebarRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const getYouTubeThumbnail = (videoUrl: string) => {
    const match = videoUrl.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    return "/placeholder-video.jpg";
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <h1 className="text-xl font-bold text-yellow-400">🎬 Video Pembelajaran</h1>
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari video..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:border-yellow-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-yellow-500 text-slate-900" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("vertical")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "vertical" ? "bg-yellow-500 text-slate-900" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {viewMode === "vertical" ? (
        <div className="flex h-[calc(100vh-140px)]">
          <div className="relative w-16 bg-slate-800 flex flex-col items-center justify-center py-4">
            <button onClick={() => scrollSidebar("left")} className="p-1.5 bg-slate-700 rounded-full hover:bg-slate-600">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div ref={sidebarRef} className="flex-1 overflow-y-auto py-4 space-y-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
              {["PEMBELAJARAN", "GRAMMATIKA", "SASTRA", "WRITING", "SPEAKING", "READING", "MEDIA", "UKBI_PREP", "LAINNYA"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(category === cat ? "" : cat)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${category === cat ? "bg-yellow-500 text-slate-900" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                  title={CATEGORY_LABELS[cat]}
                >
                  {CATEGORY_LABELS[cat].charAt(0)}
                </button>
              ))}
            </div>
            <button onClick={() => scrollSidebar("right")} className="p-1.5 bg-slate-700 rounded-full hover:bg-slate-600">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto snap-y snap-mandatory">
            <div className="grid grid-cols-3 gap-4 p-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className="relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer snap-center bg-slate-800 group"
                >
                  <Image
                    src={video.thumbnailUrl || getYouTubeThumbnail(video.videoUrl)}
                    alt={video.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute top-2 right-2 bg-black/70 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(video.duration)}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="font-bold text-sm line-clamp-2 mb-1">{video.title}</h3>
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>{video.creator?.fullName || "Admin"}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {formatViews(video.views)}
                      </span>
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8" fill="white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="px-4 py-3 border-b border-slate-700">
            <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              <button
                onClick={() => setCategory("")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${!category ? "bg-yellow-500 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
              >
                Semua
              </button>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${category === key ? "bg-yellow-500 text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-7xl mx-auto p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className="bg-slate-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-yellow-500/50 transition-all group"
                >
                  <div className="relative aspect-video">
                    <Image
                      src={video.thumbnailUrl || getYouTubeThumbnail(video.videoUrl)}
                      alt={video.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(video.duration)}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Play className="w-7 h-7" fill="white" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-2">{video.title}</h3>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{video.creator?.fullName || "Admin"}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {formatViews(video.views)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-700 rounded text-xs">{CATEGORY_LABELS[video.category] || video.category}</span>
                      {video.grade && <span className="px-2 py-0.5 bg-slate-700 rounded text-xs">{GRADE_LABELS[video.grade] || video.grade}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
          <div className="w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-black">
              <iframe
                src={selectedVideo.videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4">
              <h2 className="text-xl font-bold mb-2">{selectedVideo.title}</h2>
              <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {formatViews(selectedVideo.views)}x ditonton</span>
                <span>{new Date(selectedVideo.createdAt).toLocaleDateString("id-ID")}</span>
              </div>
              {selectedVideo.description && (
                <p className="text-slate-300 text-sm">{selectedVideo.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}