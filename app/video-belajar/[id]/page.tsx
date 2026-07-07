"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Play, Clock, Eye, User, ArrowLeft, Lock, Film, Share2, Calendar, Tag } from "lucide-react";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import ShareButton from "@/components/shared/ShareButton";
import SafeMediaImage from "@/components/shared/safe-media-image";

const CATEGORIES: Record<string, string> = {
  PEMBELAJARAN: "Pembelajaran", GRAMMATIKA: "Grammatika", SASTRA: "Sastra",
  WRITING: "Menulis", SPEAKING: "Berbicara", READING: "Membaca",
  MEDIA: "Media", UKBI_PREP: "UKBI Prep",
};

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} detik`;
  return s > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${m} menit`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function VideoDetailPage() {
  const { id } = useParams();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetch("/api/user/me").then(r => r.ok ? r.json() : null).then(d => setCurrentUser(d?.user || null));
    fetch(`/api/video/public/${id}`)
      .then(r => r.json())
      .then(d => { setVideo(d.video); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const isUpload = video?.source === "UPLOAD";
  const canAccess = !video?.isPremium || currentUser?.isPremium || currentUser?.isFounder;

  if (loading) return (
    <div className="min-h-screen bg-white">
      <PageNavbar />
      <div className="flex items-center justify-center pt-32">
        <div className="w-10 h-10 border-[3px] border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!video) return (
    <div className="min-h-screen bg-white">
      <PageNavbar />
      <div className="max-w-5xl mx-auto px-4 pt-24 text-center">
        <Film className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h2 className="font-bold text-xl text-gray-800 mb-2">Video tidak ditemukan</h2>
        <Link href="/video-belajar" className="text-red-500 hover:underline text-sm">Kembali ke daftar video</Link>
      </div>
      <PageFooter />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9F9FB]">
      <PageNavbar />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Back + Share */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/video-belajar" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-500 transition-colors">
            <ArrowLeft size={16} /> Kembali
          </Link>
          <div className="flex items-center gap-2">
            <ShareButton url={`/video-belajar/${video.id}`} title={video.title} />
          </div>
        </div>

        <div className="lg:flex lg:gap-6">
          {/* Left: Player + Title + Description */}
          <div className="lg:flex-1 lg:min-w-0">
            {/* Video Player */}
            {canAccess ? (
              <div className="relative bg-black rounded-2xl overflow-hidden shadow-lg shadow-black/10 mb-4">
                <div className="aspect-video relative">
                  {showVideo ? (
                    isUpload ? (
                      <video
                        ref={videoRef}
                        src={video.videoUrl}
                        className="w-full h-full object-contain bg-black"
                        controls
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <iframe
                        src={video.videoUrl}
                        className="w-full h-full"
                        allow="autoplay; fullscreen"
                        allowFullScreen
                      />
                    )
                  ) : (
                    <button
                      onClick={() => setShowVideo(true)}
                      className="absolute inset-0 w-full h-full flex items-center justify-center bg-black group"
                    >
                      {/* Thumbnail background */}
                      {video.thumbnailUrl && (
                        <SafeMediaImage
                          src={video.thumbnailUrl}
                          alt={video.title}
                          fallbackType="video"
                          containerClassName="absolute inset-0 w-full h-full"
                          className="opacity-80"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      {/* Play button */}
                      <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:bg-white transition-all duration-200">
                        <Play size={32} className="text-red-500 ml-1" />
                      </div>
                      {/* Duration badge */}
                      {video.duration && (
                        <span className="absolute bottom-3 right-3 z-10 bg-black/80 text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                          <Clock size={12} /> {formatDuration(video.duration)}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-gray-200">
                <div className="text-center">
                  <Lock size={48} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 text-lg font-semibold">Video Premium</p>
                  <p className="text-gray-400 text-sm mt-1">{currentUser ? "Upgrade ke PRO untuk mengakses video ini" : "Login untuk mengakses video ini"}</p>
                  <Link href={currentUser ? "/guru/pengaturan/premium" : "/login"} className="mt-4 inline-block px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-md">
                    {currentUser ? "Upgrade PRO" : "Masuk"}
                  </Link>
                </div>
              </div>
            )}

            {/* Title — desktop only here, mobile below */}
            <div className="hidden lg:block mb-4">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{video.title}</h1>
            </div>

            {/* Description — desktop */}
            {video.description && (
              <div className="hidden lg:block bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80 mb-4">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{video.description}</p>
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="lg:w-80 xl:w-96 shrink-0 space-y-3">
            {/* Title — mobile */}
            <div className="lg:hidden">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{video.title}</h1>
            </div>

            {/* Creator Card */}
            {video.creator?.fullName && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Pembuat</p>
                <Link href={`/profile/${video.creator.id}`} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {video.creator.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 group-hover:text-red-500 transition-colors">{video.creator.fullName}</p>
                    <p className="text-xs text-gray-400">Guru Bahasa Indonesia</p>
                  </div>
                </Link>
              </div>
            )}

            {/* Stats Card */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Detail</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-sm">
                  <Eye size={15} className="text-gray-400 shrink-0" />
                  <span className="text-gray-600">{video.views.toLocaleString("id-ID")} ditonton</span>
                </div>
                {video.duration && (
                  <div className="flex items-center gap-3 text-sm">
                    <Clock size={15} className="text-gray-400 shrink-0" />
                    <span className="text-gray-600">{formatDuration(video.duration)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar size={15} className="text-gray-400 shrink-0" />
                  <span className="text-gray-600">{formatDate(video.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Tag size={15} className="text-gray-400 shrink-0" />
                  <span className="text-gray-600">{CATEGORIES[video.category] || video.category}</span>
                </div>
                {video.grade && (
                  <div className="flex items-center gap-3 text-sm">
                    <User size={15} className="text-gray-400 shrink-0" />
                    <span className="text-gray-600">Kelas {video.grade}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {video.tags?.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {video.tags.map((t: string) => (
                    <span key={t} className="text-[11px] px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg font-medium">#{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description — mobile (below the 2-col layout) */}
        {video.description && (
          <div className="lg:hidden bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80 mt-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Deskripsi</p>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{video.description}</p>
          </div>
        )}
      </div>

      <PageFooter />
    </div>
  );
}
