"use client";

import AnnouncementSlider from "./AnnouncementSlider";
import { getActiveAnnouncements } from "@/data/landing-announcements";

/**
 * Display Pengumuman Resmi BahasaCerdas — menggantikan screenshot statis di
 * sisi kanan Hero. Maksimal 5 banner, auto-slide 5 detik, swipe/pause/hover.
 */
export default function HeroAnnouncement() {
  const items = getActiveAnnouncements();
  if (items.length === 0) return null;

  return (
    <div className="relative">
      {/* Badge live */}
      <div className="absolute -top-3 -right-3 z-30 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-bold shadow-lg shadow-emerald-500/30 flex items-center gap-1.5">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        LIVE
      </div>

      <div className="rounded-xl border border-zinc-200/70 bg-white/70 backdrop-blur-xl shadow-2xl shadow-zinc-900/10 p-3 sm:p-4">
        <AnnouncementSlider items={items} />
      </div>
    </div>
  );
}