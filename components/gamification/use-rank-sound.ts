"use client";

import { useCallback, useRef } from "react";

/**
 * useRankSound — placeholder hook suara Rank Up.
 *
 * Belum ada aset audio resmi; hook ini menyediakan API yang stabil
 * (playRankUp / playClick) agar nanti tinggal disambungkan ke WebAudio
 * atau file MP3 tanpa mengubah komponen pemanggil. Best-effort, tidak
 * pernah throw.
 */
export function useRankSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    try {
      if (!ctxRef.current) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) ctxRef.current = new Ctor();
      }
      return ctxRef.current;
    } catch {
      return null;
    }
  }, []);

  /** Suara kemenangan sederhana (arpeggio) — pengganti aset suara resmi. */
  const playRankUp = useCallback(() => {
    try {
      const ctx = getCtx();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    } catch {
      // best-effort
    }
  }, [getCtx]);

  /** Suara klik ringan untuk tombol. */
  const playClick = useCallback(() => {
    try {
      const ctx = getCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 660;
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch {
      // best-effort
    }
  }, [getCtx]);

  return { playRankUp, playClick };
}
