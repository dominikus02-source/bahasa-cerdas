"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Gamepad2 } from "lucide-react";

/**
 * Banner slide bergantian (karousel ringan) untuk banner gambar.
 *
 * Semua slide dirender dalam satu sel grid yang sama (col-start-1 row-start-1)
 * sehingga kontainer setinggi slide tertinggi — tidak ada lompatan layout saat
 * ganti banner dan gambar tidak di-crop (memakai rasio asli `w-full h-auto`).
 *
 * - Autoplay 5 detik, jeda saat hover/fokus, geser (swipe) di layar sentuh.
 * - Titik navigasi di pojok bawah — klik untuk pindah slide.
 * - Bila salah satu gambar gagal dimuat, slide itu menampilkan kartu fallback
 *   bertuliskan judul gim (bukan kotak kosong/404).
 */

export interface BannerSlide {
  src: string;
  alt: string;
  href: string;
  /** Warna bayangan glow slide ini (opsional). */
  shadow?: string;
  /** Judul cadangan bila gambar gagal dimuat. */
  fallbackTitle: string;
  fallbackDesc?: string;
}

const AUTOPLAY_MS = 5000;

export default function BannerSlideshow({
  slides,
  className = "",
}: {
  slides: BannerSlide[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [broken, setBroken] = useState<Record<number, boolean>>({});
  const touchX = useRef(0);

  const next = useCallback(() => setIndex((i) => (i + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;
  const slide = slides[index];

  return (
    <div
      className={`group relative w-full overflow-hidden rounded-[20px] ${className}`}
      style={slide.shadow ? { boxShadow: slide.shadow } : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 42) (dx < 0 ? next() : prev());
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      }}
      role="region"
      aria-roledescription="karousel"
      aria-label="Banner gim"
      aria-live={paused ? "polite" : "off"}
      tabIndex={0}
    >
      <div className="grid">
        {slides.map((s, i) => (
          <Link
            key={`${s.href}-${i}`}
            href={s.href}
            aria-label={s.alt}
            tabIndex={i === index ? 0 : -1}
            aria-hidden={i !== index}
            className={`col-start-1 row-start-1 block relative w-full transition-opacity duration-500 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {!broken[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.src}
                alt={s.alt}
                className="block w-full h-auto transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
                onError={() => setBroken((b) => ({ ...b, [i]: true }))}
              />
            ) : (
              <div
                className="w-full min-h-[120px] flex items-center gap-3 p-5"
                style={{ background: "linear-gradient(120deg, #0B0A1A, #2D1566)" }}
              >
                <div className="w-11 h-11 rounded-xl bg-violet-500/25 flex items-center justify-center shrink-0">
                  <Gamepad2 size={22} className="text-violet-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-extrabold text-white">{s.fallbackTitle}</p>
                  <p className="text-[11px] text-white/70 mt-0.5">
                    {s.fallbackDesc || "Main sekarang — seru dan tambah XP!"}
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg">
                  Main <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-black/35 backdrop-blur px-2.5 py-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Tampilkan banner ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
