"use client";

import { useEffect, useRef } from "react";

/**
 * Autoplay slider — interval 5 detik, pause-aware.
 * Memakai ref supaya callback terbaru selalu dipakai tanpa me-reset timer
 * (tidak menyebabkan re-render Hero saat banner berganti).
 */
export function useAutoplay(
  count: number,
  { interval = 5000, paused = false, onAdvance }: { interval?: number; paused?: boolean; onAdvance: () => void }
) {
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;

  useEffect(() => {
    if (paused || count < 2) return;
    const id = window.setInterval(() => onAdvanceRef.current(), interval);
    return () => window.clearInterval(id);
  }, [paused, count, interval]);
}
