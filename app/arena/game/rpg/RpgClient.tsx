/**
 * RPG Play Client — Pendekar Suryakerta (P2.8 Premium Early Access).
 *
 * Fase: SPLASH → STARTING → PLAYING (atau ERROR).
 *
 * - Splash: branded transition + SATU aksi nyata ("Mulai Petualangan").
 *   Tanpa fake progress bar — indikator hanya tampil saat cek nyata jalan.
 * - Audio: startBGM() dari lib/game/sound.ts saat tap (gesture browser);
 *   fail-open — game tetap jalan sunyi bila audio gagal/tidak ada file.
 * - STARTING: cek nyata GET /api/rpg/state (server terjangkau + gate lolos).
 *   Gagal → ERROR fail-closed (tidak pernah mount RPG client-only).
 * - PLAYING: RPGGame (runtime otoritatif existing) + BGM dunia berlanjut.
 * - Analytics funnel: splash_started / launch_authorized / runtime_started.
 *
 * TIDAK ada logika akses di sini — page.tsx (server) sudah mengizinkan.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Crown, Play, RotateCcw, Shield, Volume2, VolumeX } from "lucide-react";
import { RPGGame } from "@/src/game/rpg/ui/RPGGame";
import { isSoundOn, startBGM, stopBGM, toggleSound } from "@/lib/game/sound";
import { trackProductEvent } from "@/lib/analytics/product-track";
import { RPG_SPLASH_BG_PATH, RPG_TAGLINE } from "./rpg-launch";

interface RpgClientProps {
  /** Server-resolved Prisma user identity; never supplied by browser storage. */
  playerId: string;
  playerName: string;
}

type Phase = "splash" | "starting" | "playing" | "error";

export default function RpgClient({ playerId, playerName }: RpgClientProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("splash");
  const [bgBroken, setBgBroken] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [errorDetail, setErrorDetail] = useState("");
  const splashTracked = useRef(false);

  useEffect(() => {
    setSoundOn(isSoundOn());
    if (!splashTracked.current) {
      splashTracked.current = true;
      trackProductEvent("rpg_splash_started", { game: "rpg" });
    }
  }, []);

  // BGM berhenti saat keluar dari game (unmount). Selama bermain, BGM dunia
  // berlanjut dari splash — satu-satunya audio manager (lib/game/sound.ts).
  useEffect(() => {
    return () => {
      stopBGM();
    };
  }, []);

  const handleBack = useCallback(() => {
    router.push("/arena/game");
  }, [router]);

  const handleStart = useCallback(async () => {
    trackProductEvent("rpg_launch_authorized", { game: "rpg" });
    // Audio init di dalam gesture tap (aturan autoplay browser). Gagal = sunyi.
    try {
      startBGM();
    } catch {
      // fail open — lanjut tanpa audio
    }
    setPhase("starting");
    setErrorDetail("");
    try {
      const res = await fetch("/api/rpg/state", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const code = (body as { error?: { code?: string } } | null)?.error?.code;
        if (code === "PREMIUM_REQUIRED") {
          router.push("/arena/game");
          return;
        }
        throw new Error(code ? `Server: ${code}` : `HTTP ${res.status}`);
      }
      trackProductEvent("rpg_runtime_started", { game: "rpg" });
      setPhase("playing");
    } catch (err) {
      setErrorDetail(err instanceof Error ? err.message : "unknown");
      setPhase("error");
    }
  }, [router]);

  const handleToggleSound = useCallback(() => {
    try {
      setSoundOn(toggleSound());
    } catch {
      // fail open — abaikan
    }
  }, []);

  if (phase === "playing") {
    return (
      <div className="game-env game-env-rpg game-fullscreen relative">
        <button
          onClick={handleBack}
          className="game-back-btn fixed top-3 left-3 z-[70]"
          aria-label="Kembali ke Game Hub"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <RPGGame playerId={playerId} playerName={playerName} />
      </div>
    );
  }

  const showBg = !bgBroken;

  return (
    <div className="game-env game-env-rpg game-fullscreen relative overflow-hidden bg-slate-950">
      {/* Latar splash: artwork kontrak bila ada, gradient bila belum */}
      {showBg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={RPG_SPLASH_BG_PATH}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setBgBroken(true)}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/55 to-slate-950" />

      <button
        onClick={handleBack}
        className="game-back-btn fixed top-3 left-3 z-[70]"
        aria-label="Kembali ke Game Hub"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <button
        onClick={handleToggleSound}
        className="game-back-btn fixed top-3 right-3 z-[70]"
        aria-label={soundOn ? "Matikan suara" : "Nyalakan suara"}
      >
        {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-800 shadow-2xl ring-1 ring-white/20">
          <Shield size={40} className="text-white" />
        </div>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-amber-950">
          <Crown size={12} /> Premium
        </div>
        <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
          Pendekar Suryakerta
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-300">
          {RPG_TAGLINE}
        </p>

        {phase === "error" ? (
          <div className="mt-6 w-full max-w-xs rounded-2xl border border-red-400/30 bg-red-500/10 p-4">
            <p className="text-sm font-bold text-red-200">Gagal menghubungi server</p>
            <p className="mt-1 text-xs text-red-200/70">
              {errorDetail || "Coba lagi sesaat lagi."} Progres tersimpan aman di server.
            </p>
            <button
              onClick={handleStart}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 active:scale-[0.98]"
            >
              <RotateCcw size={15} /> Coba Lagi
            </button>
          </div>
        ) : (
          <button
            onClick={handleStart}
            disabled={phase === "starting"}
            className="mt-6 inline-flex min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-amber-950 shadow-xl transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70"
          >
            {phase === "starting" ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-950/30 border-t-amber-950" />
                Menghubungi server…
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" /> Mulai Petualangan
              </>
            )}
          </button>
        )}
        <p className="mt-3 text-[11px] text-slate-500">
          Solo · ~10 menit · Progres tersimpan otomatis
        </p>
      </div>
    </div>
  );
}
