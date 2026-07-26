"use client";

import { useState } from "react";
import { Play } from "lucide-react";

// ── Ganti video promosi di sini ──
// Tempel ID video YouTube (bagian setelah "v=" di URL, atau setelah
// "youtu.be/"). Contoh: https://youtu.be/dQw4w9WgXcQ -> "dQw4w9WgXcQ".
// Kosongkan ("") untuk menampilkan placeholder "segera hadir".
const PROMO_VIDEO_ID = "";

export default function PromoVideoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section className="relative py-16 lg:py-20 bg-white" aria-labelledby="promo-video-heading">
      <div className="section-container">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">Kenali BahasaCerdas</span>
          </div>
          <h2 id="promo-video-heading" className="heading-lg text-zinc-900">
            Lihat <span className="text-primary">BahasaCerdas</span> Bekerja
          </h2>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-200 shadow-xl shadow-zinc-900/5 bg-zinc-100">
            {!PROMO_VIDEO_ID ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
                <Play size={40} strokeWidth={1.5} />
                <p className="text-sm font-medium">Video pengenalan segera hadir.</p>
              </div>
            ) : playing ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${PROMO_VIDEO_ID}?autoplay=1`}
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
                  src={`https://img.youtube.com/vi/${PROMO_VIDEO_ID}/maxresdefault.jpg`}
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
        </div>
      </div>
    </section>
  );
}
