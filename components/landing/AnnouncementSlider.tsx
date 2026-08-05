"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAutoplay } from "./Autoplay";
import AnnouncementControls from "./AnnouncementControls";
import AnnouncementIndicator from "./AnnouncementIndicator";
import type { LandingAnnouncement } from "@/data/landing-announcements";

const DURATION_MS = 500;
const AUTOPLAY_MS = 5000;

export default function AnnouncementSlider({ items }: { items: LandingAnnouncement[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(0);

  const next = useCallback(() => setIndex((i) => (i + 1) % items.length), [items.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + items.length) % items.length), [items.length]);
  const goTo = useCallback((i: number) => setIndex(i), []);

  useAutoplay(items.length, { interval: AUTOPLAY_MS, paused, onAdvance: next });

  if (items.length === 0) return null;
  const item = items[index];

  const overlay = (b: LandingAnnouncement) => (
    <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5 bg-gradient-to-t from-black/80 via-black/45 to-transparent">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-white font-bold text-base sm:text-lg leading-snug line-clamp-2">{b.title}</h3>
          <p className="text-white/85 text-xs sm:text-sm mt-1 line-clamp-2 leading-relaxed">{b.subtitle}</p>
        </div>
        {b.buttonText && (
          <span className="shrink-0 inline-flex items-center gap-1.5 bg-white text-zinc-900 font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-lg shadow-lg group-hover:gap-2.5 transition-all">
            {b.buttonText}
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
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
      aria-label="Pengumuman BahasaCerdas"
      aria-live={paused ? "polite" : "off"}
      tabIndex={0}
    >
      <div
        className="relative overflow-hidden rounded-xl border border-zinc-200/70 shadow-xl shadow-zinc-900/5 bg-zinc-100"
        style={{ aspectRatio: item.aspectRatio || "16 / 9" }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={item.id}
            className="absolute inset-0"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: DURATION_MS / 1000, ease: "easeInOut" }}
          >
            {item.link ? (
              <Link
                href={item.link}
                className="relative block w-full h-full"
                aria-label={`${item.title} — ${item.subtitle}`}
              >
                <Image
                  src={item.image}
                  alt=""
                  fill
                  priority={index === 0}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
                {overlay(item)}
              </Link>
            ) : (
              <div className="relative w-full h-full" style={{ background: item.backgroundColor }}>
                <Image
                  src={item.image}
                  alt=""
                  fill
                  priority={index === 0}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
                {overlay(item)}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <AnnouncementControls onPrev={prev} onNext={next} />
      </div>

      <AnnouncementIndicator count={items.length} current={index} onChange={goTo} />

      {/* Preload semua banner supaya tidak flicker saat berganti */}
      <div className="hidden" aria-hidden="true">
        {items.map((b) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={b.id} src={b.image} alt="" />
        ))}
      </div>
    </div>
  );
}
