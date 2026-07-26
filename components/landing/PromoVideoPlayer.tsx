"use client";

import { useState } from "react";
import { Play } from "lucide-react";

export default function PromoVideoPlayer({ videoId }: { videoId: string | null }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-200 shadow-xl shadow-zinc-900/5 bg-zinc-100">
      {!videoId ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
          <Play size={40} strokeWidth={1.5} />
          <p className="text-sm font-medium">Video pengenalan segera hadir.</p>
        </div>
      ) : playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          title="Video pengenalan BahasaCerdas"
          className="absolute inset-0 w-full h-full"
          allow="accelerate-compute; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 w-full h-full focus-ring"
          aria-label="Putar video pengenalan BahasaCerdas"
        >
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
              <Play size={28} className="text-primary ml-1" fill="currentColor" />
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
