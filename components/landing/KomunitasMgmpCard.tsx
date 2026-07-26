"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import type { MgmpMedia } from "@/lib/site-settings";

function MgmpVideoPlayer({ videoId }: { videoId: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100">
      {playing ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title="Kegiatan MGMP"
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 w-full h-full focus-ring"
          aria-label="Putar video kegiatan MGMP"
        >
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
              <Play size={20} className="text-primary ml-0.5" fill="currentColor" />
            </div>
          </div>
        </button>
      )}
    </div>
  );
}

function MgmpPhotoGrid({ photos }: { photos: { url: string; key: string }[] }) {
  const shown = photos.slice(0, 4);
  return (
    <div className={`grid gap-1.5 rounded-xl overflow-hidden ${shown.length === 1 ? "" : "grid-cols-2"}`}>
      {shown.map((p, i) => (
        <div key={p.key} className={`relative overflow-hidden ${shown.length === 1 ? "aspect-video" : "aspect-square"} ${shown.length === 3 && i === 0 ? "col-span-2 aspect-video" : ""}`}>
          <img src={p.url} alt="Kegiatan MGMP" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

export default function KomunitasMgmpCard({ media }: { media: MgmpMedia }) {
  if (media.type === "video") {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-3 shadow-sm">
        <MgmpVideoPlayer videoId={media.videoId} />
        <div className="flex items-center justify-center pt-3 pb-0.5">
          <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-100">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Kegiatan MGMP
          </div>
        </div>
      </div>
    );
  }

  if (media.type === "photo" && media.photos.length > 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-3 shadow-sm">
        <MgmpPhotoGrid photos={media.photos} />
        <div className="flex items-center justify-center pt-3 pb-0.5">
          <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-100">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Kegiatan MGMP
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <div className="text-center pb-1">
        <div className="text-5xl font-display font-bold text-zinc-900 leading-none">
          Aktif
        </div>
        <div className="text-sm text-zinc-500 mt-2">
          Forum diskusi sudah live di platform
        </div>
        <div className="inline-flex items-center gap-1.5 mt-3 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-100">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live sekarang
        </div>
      </div>
    </div>
  );
}
