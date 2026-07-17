"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Volume2, Loader2, CheckCircle2 } from "lucide-react";

interface ListeningAudioPlayerProps {
  src: string;
  /** Berapa kali audio boleh diputar. Default 1 (sesuai UKBI Adaptif). */
  maxPlays?: number;
  /** Kunci unik agar hitungan putar tersimpan per soal (tahan refresh). */
  storageKey?: string;
}

/**
 * Pemutar audio Mendengarkan dengan kontrol terbatas:
 * - Tidak ada seek/scrub, tidak ada kontrol native.
 * - Sekali "Putar" = audio jalan sampai selesai (dihitung 1× pemutaran).
 * - Setelah mencapai `maxPlays`, tombol dinonaktifkan permanen.
 * Hitungan pemutaran disimpan di sessionStorage agar tidak reset saat refresh.
 */
export default function ListeningAudioPlayer({ src, maxPlays = 1, storageKey }: ListeningAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const key = storageKey ? `ukbi-listen-plays:${storageKey}` : null;
  const [playsUsed, setPlaysUsed] = useState(0);
  const [state, setState] = useState<"idle" | "loading" | "playing" | "ended">("idle");

  useEffect(() => {
    if (!key) return;
    const saved = Number(sessionStorage.getItem(key) || "0");
    if (saved > 0) setPlaysUsed(saved);
  }, [key]);

  const remaining = Math.max(0, maxPlays - playsUsed);
  const canPlay = remaining > 0 && state !== "playing" && state !== "loading";

  const play = async () => {
    if (!canPlay || !audioRef.current) return;
    try {
      setState("loading");
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      const next = playsUsed + 1;
      setPlaysUsed(next);
      if (key) sessionStorage.setItem(key, String(next));
      setState("playing");
    } catch {
      setState("idle");
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-indigo-500" />
        <span className="text-xs font-semibold text-indigo-700 sm:text-sm">
          Simak audio dengan saksama — hanya dapat diputar {maxPlays}×
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={play}
          disabled={!canPlay}
          aria-label="Putar audio"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all ${
            canPlay
              ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
              : "cursor-not-allowed bg-slate-200 text-slate-400"
          }`}
        >
          {state === "loading" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : state === "playing" ? (
            <span className="flex h-4 items-end gap-0.5" aria-hidden>
              <span className="w-1 animate-[pulse_0.7s_ease-in-out_infinite] rounded-full bg-white" style={{ height: "60%" }} />
              <span className="w-1 animate-[pulse_0.7s_ease-in-out_0.15s_infinite] rounded-full bg-white" style={{ height: "100%" }} />
              <span className="w-1 animate-[pulse_0.7s_ease-in-out_0.3s_infinite] rounded-full bg-white" style={{ height: "70%" }} />
            </span>
          ) : (
            <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
          )}
        </button>

        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800">
            {state === "playing"
              ? "Sedang memutar…"
              : remaining > 0
              ? "Ketuk untuk memutar audio"
              : "Batas pemutaran tercapai"}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
            {remaining === 0 && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
            Sisa pemutaran: {remaining} dari {maxPlays}
          </p>
        </div>
      </div>

      {/* Elemen audio tersembunyi — tanpa kontrol native, tak bisa di-seek. */}
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onEnded={() => setState("ended")}
        onPlaying={() => setState("playing")}
        className="hidden"
      />
    </div>
  );
}
