"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Play, Clock, Eye, User, ArrowLeft, Lock, Film } from "lucide-react";
import PageNavbar from "@/components/public/PageNavbar";

const CATEGORIES: Record<string, string> = {
  PEMBELAJARAN: "Pembelajaran", GRAMMATIKA: "Grammatika", SASTRA: "Sastra",
  WRITING: "Menulis", SPEAKING: "Berbicara", READING: "Membaca",
  MEDIA: "Media", UKBI_PREP: "UKBI Prep",
};

export default function VideoDetailPage() {
  const { id } = useParams();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    fetch(`/api/video/public/${id}`)
      .then(r => r.json())
      .then(d => { setVideo(d.video); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" /></div>;
  if (!video) return <div className="min-h-screen flex items-center justify-center text-slate-500">Video tidak ditemukan</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <PageNavbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link href="/video-belajar" className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white mb-4">
          <ArrowLeft size={16} /> Kembali ke Video
        </Link>

        {/* Video Player */}
        {!video.isPremium ? (
          <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl mb-6">
            {showVideo ? (
              <iframe src={video.videoUrl} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
            ) : (
              <button onClick={() => setShowVideo(true)} className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 group">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white/30 transition-all group-hover:scale-110">
                  <Play size={36} className="text-white ml-1" />
                </div>
              </button>
            )}
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-2xl border border-white/10">
            <div className="text-center">
              <Lock size={48} className="text-white/30 mx-auto mb-3" />
              <p className="text-white/60 text-lg font-semibold">Video Premium</p>
              <p className="text-white/30 text-sm mt-1">Login untuk mengakses video ini</p>
              <Link href="/login" className="mt-4 inline-block px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold">
                Masuk
              </Link>
            </div>
          </div>
        )}

        {/* Video Info */}
        <div className="text-white">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
                {video.creator?.fullName && (
                  <span className="flex items-center gap-1.5">
                    <User size={14} /> {video.creator.fullName}
                  </span>
                )}
                <span className="flex items-center gap-1"><Eye size={14} /> {video.views} ditonton</span>
                {video.duration && <span className="flex items-center gap-1"><Clock size={14} /> {video.duration} menit</span>}
                <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs">{CATEGORIES[video.category] || video.category}</span>
                {video.grade && <span className="text-xs text-white/30">Kelas {video.grade}</span>}
              </div>
            </div>
          </div>

          {video.description && (
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{video.description}</p>
            </div>
          )}

          {video.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {video.tags.map((t: string) => (
                <span key={t} className="text-xs px-3 py-1 bg-white/5 text-white/40 rounded-full">#{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
