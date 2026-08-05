"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/** Panah kiri/kanan — muncul saat hover (desktop). Mobile pakai swipe. */
export default function AnnouncementControls({
  onPrev,
  onNext,
}: {
  onPrev: () => void;
  onNext: () => void;
}) {
  const cls =
    "absolute top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/85 backdrop-blur border border-zinc-200 shadow-lg shadow-zinc-900/10 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-white transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus-ring md:flex hidden";
  return (
    <>
      <button type="button" onClick={onPrev} aria-label="Banner sebelumnya" className={`${cls} left-3`}>
        <ChevronLeft className="w-5 h-5" aria-hidden="true" />
      </button>
      <button type="button" onClick={onNext} aria-label="Banner berikutnya" className={`${cls} right-3`}>
        <ChevronRight className="w-5 h-5" aria-hidden="true" />
      </button>
    </>
  );
}
