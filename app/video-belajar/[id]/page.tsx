"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Play, Clock, Eye, User, ArrowLeft, Lock, Film, Share2 } from "lucide-react";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import ShareButton from "@/components/shared/ShareButton";

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" /></div>;
  if (!video) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Video tidak ditemukan</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <PageNavbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link href="/video-belajar" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 mb-4 transition-colors">
          <ArrowLeft size={16} /> Kembali ke Video
        </Link>

        {/* Video Player */}
        {!video.isPremium ? (
          <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-xl mb-6">
            {showVideo ? (
              <iframe src={video.videoUrl} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
            ) : (
              <button onClick={() => setShowVideo(true)} className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 group">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white/30 transition-all group-hover:scale-110">
                  <Play size={36} className="text-white ml-1" />
                </div>
              </button>
            )}
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg border border-gray-200">
            <div className="text-center">
              <Lock size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 text-lg font-semibold">Video Premium</p>
              <p className="text-gray-400 text-sm mt-1">Login untuk mengakses video ini</p>
              <Link href="/login" className="mt-4 inline-block px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-md">
                Masuk
              </Link>
            </div>
          </div>
        )}

        {/* Video Info */}
        <div className="text-gray-900">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2 text-gray-900">{video.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                {video.creator?.fullName && (
                  <span className="flex items-center gap-1.5">
                    <User size={14} /> {video.creator.fullName}
                  </span>
                )}
                <span className="flex items-center gap-1"><Eye size={14} /> {video.views} ditonton</span>
                {video.duration && <span className="flex items-center gap-1"><Clock size={14} /> {video.duration} menit</span>}
                <span className="px-2.5 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">{CATEGORIES[video.category] || video.category}</span>
                {video.grade && <span className="text-xs text-gray-400">Kelas {video.grade}</span>}
                <ShareButton url={`/video-belajar/${video.id}`} title={video.title} />
              </div>
            </div>
          </div>

          {video.description && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{video.description}</p>
            </div>
          )}

          {video.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {video.tags.map((t: string) => (
                <span key={t} className="text-xs px-3 py-1 bg-gray-100 text-gray-500 rounded-full">#{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <PageFooter />
    </div>
  );
}
