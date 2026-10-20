"use client";

import { useEffect, useRef, useState } from "react";
import { Music, VolumeX } from "lucide-react";

interface BackgroundMusicProps {
  playing: boolean;
}

/**
 * Musik latar sederhana untuk Main Bersama.
 * Menggunakan Web Audio API untuk generate nada lembut.
 * Tidak memerlukan file audio eksternal.
 */
export function BackgroundMusic({ playing }: BackgroundMusicProps) {
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!playing || muted) {
      ctxRef.current?.suspend();
      return;
    }

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!ctxRef.current) {
      ctxRef.current = new AudioCtx();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.gain.value = 0.08;
      gainRef.current.connect(ctxRef.current.destination);
    }

    const ctx = ctxRef.current;
    const gain = gainRef.current!;
    ctx.resume();

    // Simple ambient pad
    const playNote = (freq: number, delay: number) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      noteGain.gain.value = 0;
      noteGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.5);
      noteGain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 4);
      osc.connect(noteGain);
      noteGain.connect(gain);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 4.5);
    };

    const notes = [261.63, 329.63, 392.00, 523.25]; // C4 E4 G4 C5
    let i = 0;
    const interval = setInterval(() => {
      playNote(notes[i % notes.length], 0);
      i++;
    }, 3000);

    return () => clearInterval(interval);
  }, [playing, muted]);

  if (!playing) return null;

  return (
    <button
      type="button"
      className="mb-music-toggle"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? "Nyalakan musik" : "Matikan musik"}
    >
      {muted ? <VolumeX size={16} /> : <Music size={16} />}
    </button>
  );
}
